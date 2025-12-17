import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/messages';
import { listItems, markItemAsResolved } from '../services/items';

// Busca itens do usuário que não estão resolvidos
async function getPendingNotificationItems(userId) {
  if (!userId) return [];
  const items = await listItems({ owner_id: userId, resolved: false });
  // Opcional: filtrar por tempo, status, etc.
  return items || [];
}

export default function NotificationBell({ style }) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState([]);
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
    setPendingItems(pending.filter(item => !dismissedItems.includes(item.id)));
    setUnreadCount(unread);
    setLoading(false);
  }

  async function handleYes(item) {
    setLoading(true);
    try {
      await markItemAsResolved(item.id, user.id);
      setPendingItems(prev => prev.filter(i => i.id !== item.id));
      alert('🎉 Parabéns! Ótimo saber que encontrou seu item!');
    } catch (e) {
      alert('Erro ao marcar como resolvido: ' + (e.message || e));
    }
    setLoading(false);
  }

  function handleNo(item) {
    setPendingItems(prev => prev.filter(i => i.id !== item.id));
    setDismissedItems(prev => [...prev, item.id]);
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
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 24 }} />
          ) : (
            <>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.notificationBox} onPress={() => { setModalVisible(false); }}>
                  <View style={styles.notificationRow}>
                    <MaterialIcons name="chat" size={22} color="#4F46E5" style={{ marginRight: 8 }} />
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
                      <MaterialIcons name="search" size={22} color="#4F46E5" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notificationTitle}>Você encontrou seu item?</Text>
                        <Text style={styles.notificationDesc}>{item.title}{item.location ? ` - 📍 ${item.location}` : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleYes(item)} disabled={loading}>
                        <Text style={styles.actionButtonText}>{loading ? 'Salvando...' : 'Sim! 🎉'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={() => handleNo(item)} disabled={loading}>
                        <Text style={[styles.actionButtonText, { color: '#4F46E5' }]}>Ainda não</Text>
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
    marginRight: 8,
    minWidth: 40,
    minHeight: 40,
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
    color: '#4F46E5',
    marginBottom: 12,
    textAlign: 'center',
  },
  notificationBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#4F46E5',
  },
  notificationDesc: {
    fontSize: 13,
    color: '#374151',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4F46E5',
    marginRight: 0,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 24,
    fontSize: 14,
  },
});
