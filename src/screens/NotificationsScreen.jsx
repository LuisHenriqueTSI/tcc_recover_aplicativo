import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getConversations, markMessagesAsRead } from '../services/messages';
import { listItems, cleanupExpiredItems } from '../services/items';
import { getUserNotifications, markAllNotificationsRead, markNotificationRead, buildRenewalAlerts, createNotification } from '../services/notifications';
import { triggerLocalNotification } from '../services/pushNotifications';
import { renewItem } from '../services/items';
import COLORS from '../constants/theme';

function getRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} horas atrás`;
  if (diff < 172800) return 'Ontem';
  return date.toLocaleDateString();
}

export default function NotificationsScreen({ navigation, onNotificationsUpdated }) {
  const { user, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [renewingItemId, setRenewingItemId] = useState(null);

  const systemUnreadCount = systemAlerts.filter(notification => !notification.read).length;
  const unreadCount = systemUnreadCount;
  const notificationSections = [
    {
      key: 'system',
      title: 'Alertas e Atualizações',
      subtitle: 'Toque para abrir os detalhes ou renovar publicações.',
      data: systemAlerts,
      markable: true,
    },
    {
      key: 'messages',
      title: 'Mensagens Recentes',
      subtitle: 'Toque para abrir a conversa.',
      data: messageNotifications,
      markable: true,
    },
  ].filter(section => section.data.length > 0);

  const notificationRows = notificationSections.flatMap(section => [
    { id: `section_${section.key}`, isSection: true, ...section },
    ...section.data.map(notification => ({
      ...notification,
      sectionKey: section.key,
      markable: section.markable,
    })),
  ]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await cleanupExpiredItems();
      await fetchNotifications();
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
    };
    load();
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    const conversations = await getConversations(user.id);
    const unreadMsgs = conversations.filter(c => c.unread);
    const systemAlertsData = await getUserNotifications(user.id);

    const mappedMessageNotifications = unreadMsgs.map(msg => ({
      id: msg.itemId + '_' + msg.otherId,
      type: 'message',
      title: 'Nova mensagem',
      message: `Nova mensagem sobre o pet "${msg.itemTitle || 'sem nome'}" de ${msg.otherName}`,
      time: getRelativeTime(msg.lastMessageAt),
      read: false,
      otherId: msg.otherId,
      icon: 'chat-bubble',
      iconColor: colors.primary,
      bgColor: isDark ? 'rgba(5, 150, 105, 0.15)' : colors.primaryLight,
    }));

    setMessageNotifications(mappedMessageNotifications);

    let items = await listItems({ owner_id: user.id, resolved: false });
    items = (items || []).filter(item => item && item.id);
    const renewalAlerts = buildRenewalAlerts(items);
    const mappedSystemAlerts = [...renewalAlerts, ...(systemAlertsData || [])]
      .filter(alert => alert && (alert.type === 'renewal_reminder' || alert.type === 'item_removed' || alert.type === 'nearby_lost_pet' || alert.type === 'match' || alert.type === 'sighting'))
      .map(alert => ({
        ...alert,
        icon: alert.type === 'renewal_reminder'
          ? 'schedule'
          : alert.type === 'nearby_lost_pet'
          ? 'radar'
          : alert.type === 'match'
          ? 'auto-awesome'
          : alert.type === 'sighting'
          ? 'visibility'
          : 'info-outline',
        iconColor: alert.type === 'renewal_reminder'
          ? '#D97706'
          : alert.type === 'nearby_lost_pet'
          ? '#DC2626'
          : alert.type === 'match'
          ? '#8B5CF6'
          : alert.type === 'sighting'
          ? colors.primary
          : '#DC2626',
        bgColor: alert.type === 'renewal_reminder'
          ? (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7')
          : alert.type === 'nearby_lost_pet'
          ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2')
          : alert.type === 'match'
          ? (isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF')
          : (isDark ? 'rgba(5, 150, 105, 0.15)' : colors.primaryLight),
      }));

    setSystemAlerts(mappedSystemAlerts);
    setLoading(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setSystemAlerts(prev => prev.map(item => ({ ...item, read: true })));
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível marcar todas as notificações como lidas.');
    }
  }

  async function handleNotificationPress(notification) {
    if (notification.type === 'renewal_reminder' && notification.itemId) {
      try {
        setRenewingItemId(notification.itemId);
        await renewItem(notification.itemId);
        await markNotificationRead(notification.id.replace('system_', ''));
        await fetchNotifications();
        if (typeof onNotificationsUpdated === 'function') {
          onNotificationsUpdated();
        }
        Alert.alert('Sucesso', 'Publicação renovada com sucesso!');
      } catch (err) {
        Alert.alert('Erro', err?.message || 'Falha ao renovar publicação.');
      } finally {
        setRenewingItemId(null);
      }
      return;
    }

    if (notification.type === 'item_removed' && notification.itemId) {
      await markNotificationRead(notification.id.replace('system_', ''));
      navigation.navigate('ItemDetail', { itemId: notification.itemId });
      return;
    }

    const targetItemId = notification.item_id || notification.itemId;
    if ((notification.type === 'nearby_lost_pet' || notification.type === 'match' || notification.type === 'sighting') && targetItemId) {
      const normalizedId = String(notification.id).replace('system_', '');
      if (/^\d+$/.test(normalizedId)) {
        await markNotificationRead(normalizedId);
      }
      navigation.navigate('ItemDetail', { itemId: targetItemId });
      return;
    }

    if (notification.type === 'message') {
      if (notification.otherId) {
        await markMessagesAsRead(user.id, notification.otherId);
      }
      setMessageNotifications(prev => prev.filter(item => item.id !== notification.id));
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
      return;
    }

    if (notification.id?.startsWith('system_')) {
      const normalizedId = notification.id.replace('system_', '');
      if (/^\d+$/.test(normalizedId)) {
        await markNotificationRead(normalizedId);
      }
      await fetchNotifications();
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
    }
  }

  async function handleTestLostPetNotification() {
    Alert.alert(
      '🧪 Testar Notificação Push',
      'Como deseja testar o alerta no seu aparelho?',
      [
        {
          text: 'Disparar Agora',
          onPress: () => executeTestNotification(0),
        },
        {
          text: 'Disparar em 4s (Para minimizar o app)',
          onPress: () => executeTestNotification(4),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  async function executeTestNotification(delaySeconds = 0) {
    try {
      // Dispara notificação com banner e som no aparelho
      await triggerLocalNotification({
        title: '🚨 Alerta WeFIND: Cão Perdido',
        body: '🐾 Cão ("Thor", Labrador) perdido no seu bairro. Toque para abrir detalhes e fotos.',
        data: {
          itemId: systemAlerts[0]?.itemId || null,
          type: 'nearby_lost_pet',
        },
        delaySeconds,
      });

      // Insere na caixa de notificações in-app
      if (user?.id) {
        await createNotification({
          user_id: user.id,
          type: 'nearby_lost_pet',
          title: '🚨 Alerta WeFIND: Cão Perdido',
          message: '🐾 Cão ("Thor", Labrador) perdido nas proximidades. Toque para abrir detalhes e fotos.',
          item_id: systemAlerts[0]?.itemId || null,
        });
        await fetchNotifications();
        if (typeof onNotificationsUpdated === 'function') {
          onNotificationsUpdated();
        }
      }

      if (delaySeconds > 0) {
        Alert.alert(
          '⏳ Notificação agendada!',
          'Você tem 4 segundos para minimizar o aplicativo (ir para a tela inicial do celular) e ver a notificação push descer com som!'
        );
      } else {
        Alert.alert(
          '🔔 Notificação Disparada!',
          'Verifique a barra de notificações do seu celular (desça o topo da tela) e a sua caixa de entrada no app!'
        );
      }
    } catch (err) {
      console.warn('[NotificationsScreen] Erro ao testar notificação:', err.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Botão de Teste Rápido de Notificação (Restrito a Administradores) */}
      {isAdmin && (
        <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
          <TouchableOpacity
            onPress={handleTestLostPetNotification}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MaterialIcons name="notifications-active" size={16} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                    Testar Alerta de Pet Perdido
                  </Text>
                  <View style={{ backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : COLORS.primaryLight, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: colors.primary }}>ADMIN</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  Dispara um push local no celular e insere alerta in-app
                </Text>
              </View>
            </View>
            <MaterialIcons name="play-arrow" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {unreadCount > 0 && (
        <View style={[styles.unreadBanner, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7', borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0' }]}>
          <View style={styles.unreadBannerTextContainer}>
            <Text style={[styles.unreadBannerTitle, { color: isDark ? '#4ADE80' : '#15803D' }]}>
              {unreadCount} alerta{unreadCount === 1 ? '' : 's'} pendente{unreadCount === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.unreadBannerSubtitle, { color: isDark ? '#86EFAC' : '#166534' }]}>
              Toque nos alertas para visualizar ou marcar como lido.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.unreadBannerButton, { backgroundColor: '#16A34A' }]}
            onPress={handleMarkAllRead}
            activeOpacity={0.85}
          >
            <Text style={styles.unreadBannerButtonText}>Marcar todos</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
      ) : notificationRows.length > 0 ? (
        <FlatList
          data={notificationRows}
          contentContainerStyle={styles.notificationList}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => item.isSection ? (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
          ) : (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notificationCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                item.critical ? { borderLeftWidth: 3.5, borderLeftColor: '#F59E0B' } : {},
              ]}
              activeOpacity={0.85}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                <MaterialIcons name={item.icon} size={22} color={item.iconColor} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.critical && (
                      <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>Urgente</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.notifTime, { color: colors.textMuted }]}>{item.time}</Text>
                </View>
                <Text style={[styles.notifMsg, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>

              {renewingItemId === item.itemId && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
              )}
              {item.markable && !item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} style={styles.chevron} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="notifications-none" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo limpo por aqui</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
            Você receberá avisos quando houver novidades sobre seus animais ou mensagens novas da comunidade.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notificationList: {
    paddingTop: 10,
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    position: 'relative',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  notifTime: {
    fontSize: 11.5,
    fontWeight: '600',
    flexShrink: 0,
  },
  notifMsg: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  criticalBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  criticalBadgeText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 14,
    right: 32,
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 13.5,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadBannerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  unreadBannerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  unreadBannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  unreadBannerButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadBannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
