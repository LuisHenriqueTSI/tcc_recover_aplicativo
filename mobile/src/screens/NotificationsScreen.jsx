import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount, getConversations } from '../services/messages';
import { listItems, markItemAsResolved } from '../services/items';



// Utilitário para tempo relativo

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



export default function NotificationsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    // Mensagens não lidas
    const conversations = await getConversations(user.id);
    const unreadMsgs = conversations.filter(c => c.unread);
    setMessageNotifications(unreadMsgs.map(msg => ({
      id: msg.itemId + '_' + msg.otherId,
      type: 'message',
      title: 'Nova mensagem',
      message: `Nova mensagem sobre "${msg.itemTitle || 'item'}" de ${msg.otherName}`,
      time: getRelativeTime(msg.lastMessageAt),
      read: false,
      icon: 'message-circle',
      iconColor: '#F59E42',
      bgColor: '#FFF7ED',
    })));
    // Itens não resolvidos
    const items = await listItems({ owner_id: user.id, resolved: false });
    setPendingItems((items || []).map(item => ({
      id: item.id,
      type: 'match',
      title: 'Possível correspondência!',
      message: `Seu item "${item.title}" ainda não foi marcado como devolvido.`,
      time: getRelativeTime(item.created_at),
      read: false,
      icon: 'alert-circle',
      iconColor: '#F59E42',
      bgColor: '#FFF7ED',
      item,
    })));
    setLoading(false);
  }



  // Junta todas as notificações
  const allNotifications = [...messageNotifications, ...pendingItems];
  const unread = allNotifications.length;

  async function handleMarkAllRead() {
    // Não há marcação real, apenas limpa a lista visualmente
    setMessageNotifications([]);
    setPendingItems([]);
  }

  async function handleNotificationPress(notification) {
    // Aqui você pode navegar ou abrir detalhes se quiser
    if (notification.type === 'match' && notification.item) {
      // Exemplo: marcar como resolvido
      await markItemAsResolved(notification.item.id, user.id);
      await fetchNotifications();
    }
    // Para mensagens, abrir chat, etc.
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notificações</Text>
          {unread > 0 && (
            <Text style={styles.headerSubtitle}>{unread} {unread === 1 ? 'nova' : 'novas'}</Text>
          )}
        </View>
        {unread > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={{ color: '#F59E42', fontWeight: 'bold' }}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {loading ? (
        <ActivityIndicator size="large" color="#F59E42" style={{ marginVertical: 24 }} />
      ) : allNotifications.length > 0 ? (
        <FlatList
          data={allNotifications}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notificationCard,
                { backgroundColor: item.bgColor },
                index === 0 ? { borderTopWidth: 0 } : {},
              ]}
              activeOpacity={0.85}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={styles.iconCircle}>
                <Feather name={item.icon} size={22} color={item.iconColor} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={[styles.notifTitle, { color: '#1F2937' }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
                <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
              </View>
              <View style={styles.unreadDot} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="bell" size={40} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
          <Text style={styles.emptyMsg}>Você receberá alertas quando houver novidades sobre seus itens.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#A3A3A3',
    marginTop: 2,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    position: 'relative',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: '#F3F4F6',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    marginBottom: 2,
  },
  notifTime: {
    fontSize: 12,
    color: '#A3A3A3',
    marginLeft: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  notifMsg: {
    color: '#444',
    fontSize: 13,
    marginTop: 0,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E42',
    position: 'absolute',
    top: 24,
    right: 18,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptyMsg: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 260,
  },
});
