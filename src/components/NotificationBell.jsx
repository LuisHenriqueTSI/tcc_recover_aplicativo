import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/messages';
import { listItems, markItemAsResolved, bumpItemFeedPriority } from '../services/items';
import { triggerLocalNotification } from '../services/pushNotifications';
import COLORS from '../constants/theme';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 horas (2 dias)
const DISMISSED_CHECK_KEY = '@pet_found_dismissed_timestamps';

// Busca itens perdidos do usuário que precisam de checagem (espaçados a cada 2 dias)
async function getPendingNotificationItems(userId) {
  if (!userId) return [];
  try {
    const items = await listItems({ owner_id: userId, resolved: false });
    if (!items || items.length === 0) return [];

    let dismissedMap = {};
    try {
      const stored = await AsyncStorage.getItem(DISMISSED_CHECK_KEY);
      if (stored) dismissedMap = JSON.parse(stored);
    } catch (_) {}

    const now = Date.now();

    // Filtra apenas itens com status 'lost' que tenham mais de 2 dias de publicação ou da última checagem
    const dueItems = items.filter((item) => {
      if (item.status !== 'lost') return false;

      const lastDismissedTime = dismissedMap[item.id] ? new Date(dismissedMap[item.id]).getTime() : 0;
      const lastPromptedTime = item.extra_fields?.last_prompted_at
        ? new Date(item.extra_fields.last_prompted_at).getTime()
        : 0;
      const creationTime = item.created_at ? new Date(item.created_at).getTime() : now;

      const mostRecentCheck = Math.max(lastDismissedTime, lastPromptedTime, creationTime);

      // Pergunta apenas se passaram 2 dias (48h) desde o registro ou última resposta
      return (now - mostRecentCheck) >= TWO_DAYS_MS;
    });

    return dueItems;
  } catch (error) {
    console.log('[NotificationBell] Erro ao filtrar itens pendentes:', error.message);
    return [];
  }
}

export default function NotificationBell({ style }) {
  const { user, isAdmin } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Atualiza notificações periodicamente
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    const [pending, unread] = await Promise.all([
      getPendingNotificationItems(user.id),
      getUnreadCount(user.id),
    ]);
    setPendingItems(pending || []);
    setUnreadCount(unread || 0);
    setLoading(false);
  }

  const handleTestPush = () => {
    setModalVisible(false);
    Alert.alert(
      '🧪 Testar Push no Celular',
      'Escolha a forma de disparo:',
      [
        {
          text: 'Disparar Agora',
          onPress: async () => {
            await triggerLocalNotification({
              title: '🚨 Alerta WeFIND: Cão Perdido',
              body: '🐾 Cão ("Thor", Labrador) perdido no seu bairro. Toque para abrir detalhes e fotos.',
              data: { type: 'nearby_lost_pet' },
              delaySeconds: 0,
            });
            Alert.alert('🔔 Push Disparado!', 'Verifique a barra de notificações do seu celular!');
          },
        },
        {
          text: 'Disparar em 4s (Para Minimizar)',
          onPress: async () => {
            await triggerLocalNotification({
              title: '🚨 Alerta WeFIND: Cão Perdido',
              body: '🐾 Cão ("Thor", Labrador) perdido no seu bairro. Toque para abrir detalhes e fotos.',
              data: { type: 'nearby_lost_pet' },
              delaySeconds: 4,
            });
            Alert.alert('⏳ Agendado!', 'Você tem 4 segundos para ir para a tela inicial do celular e ver o push descer com som!');
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  async function handleYes(item) {
    setLoading(true);
    try {
      await markItemAsResolved(item.id, user.id);
      setPendingItems(prev => prev.filter(i => i.id !== item.id));
      Alert.alert('🎉 Parabéns!', 'Ficamos muito felizes que você reencontrou seu animal!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível marcar como resolvido: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleNo(item) {
    setLoading(true);
    try {
      // Impulsiona a publicação para o topo do feed
      await bumpItemFeedPriority(item.id, item.extra_fields);

      // Salva timestamp localmente para garantir o intervalo de 2 dias
      let dismissedMap = {};
      try {
        const stored = await AsyncStorage.getItem(DISMISSED_CHECK_KEY);
        if (stored) dismissedMap = JSON.parse(stored);
      } catch (_) {}
      dismissedMap[item.id] = new Date().toISOString();
      await AsyncStorage.setItem(DISMISSED_CHECK_KEY, JSON.stringify(dismissedMap));

      setPendingItems(prev => prev.filter(i => i.id !== item.id));
      Alert.alert(
        '🚀 Publicação Impulsionada!',
        'Que bom que você continua as buscas! Sua publicação foi colocada no topo do feed para alcançar mais pessoas.'
      );
    } catch (e) {
      console.log('[NotificationBell] Erro ao impulsionar publicação:', e.message);
      setPendingItems(prev => prev.filter(i => i.id !== item.id));
    } finally {
      setLoading(false);
    }
  }

  const notificationCount = (pendingItems?.length || 0) + (unreadCount || 0);

  return (
    <View style={[{ minWidth: 40, alignItems: 'center', justifyContent: 'center' }, style]}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.bellButton}>
        <MaterialIcons name="notifications" size={28} color="#fff" style={{ textShadowColor: '#000', textShadowRadius: 2 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 2, right: 2 }}>
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.overlay} onPress={() => setModalVisible(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Notificações</Text>

          {isAdmin && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginBottom: 12,
              }}
              onPress={handleTestPush}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
                <MaterialIcons name="notifications-active" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B' }}>
                    Testar Notificação Push (Admin)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#B91C1C' }}>
                    Tocar som e exibir banner no topo do celular
                  </Text>
                </View>
              </View>
              <MaterialIcons name="play-arrow" size={20} color="#DC2626" />
            </TouchableOpacity>
          )}
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.notificationBox} onPress={() => { setModalVisible(false); }}>
                  <View style={styles.notificationRow}>
                    <MaterialIcons name="chat" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notificationTitle}>{unreadCount === 1 ? 'Nova mensagem' : `${unreadCount} novas mensagens`}</Text>
                      <Text style={styles.notificationDesc}>Clique para ver suas mensagens</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              <FlatList
                data={pendingItems}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.notificationBox}>
                    <View style={styles.notificationRow}>
                      <MaterialIcons name="search" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notificationTitle}>Você encontrou seu animal?</Text>
                        <Text style={styles.notificationDesc}>{item.title}{item.location ? ` - 📍 ${item.location}` : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleYes(item)} disabled={loading}>
                        <Text style={styles.actionButtonText}>{loading ? 'Salvando...' : 'Sim! 🎉'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => handleNo(item)} disabled={loading}>
                        <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>Ainda não</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={pendingItems.length === 0 && unreadCount === 0 ? (
                  <Text style={styles.emptyText}>Nenhuma notificação</Text>
                ) : null}
              />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    padding: 4,
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    position: 'absolute',
    top: 80,
    right: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    zIndex: 10,
    minHeight: 120,
    maxHeight: 400,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  notificationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: COLORS.primary,
  },
  notificationDesc: {
    fontSize: 13,
    color: '#344A51',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2E9B63',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DEE1',
    marginRight: 0,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#66787E',
    marginTop: 24,
    fontSize: 14,
  },
});
