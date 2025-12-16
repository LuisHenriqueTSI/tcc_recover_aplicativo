import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/messages';
import { listItems, markItemAsResolved } from '../services/items';

async function getPendingNotificationItems(userId) {
  if (!userId) return [];
  const items = await listItems({ owner_id: userId, resolved: false });
  return items || [];
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [dismissedItems, setDismissedItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificações</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 24 }} />
      ) : (
        <>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.notificationBox}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#4F46E5',
    marginBottom: 16,
    textAlign: 'center',
  },
  notificationBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1F2937',
  },
  notificationDesc: {
    color: '#6B7280',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
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
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
});
