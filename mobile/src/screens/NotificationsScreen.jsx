import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount, getConversations, markMessagesAsRead } from '../services/messages';
import { listItems, markItemAsResolved, deleteItem, cleanupExpiredItems } from '../services/items';
import { getUserNotifications, markAllNotificationsRead, markNotificationRead, buildRenewalAlerts } from '../services/notifications';
import { renewItem } from '../services/items';



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



export default function NotificationsScreen({ navigation, onNotificationsUpdated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [renewingItemId, setRenewingItemId] = useState(null);

  const allNotifications = [...systemAlerts, ...messageNotifications];
  const systemUnreadCount = systemAlerts.filter(notification => !notification.read).length;
  const unreadCount = systemUnreadCount;
  const notificationList = [...systemAlerts, ...messageNotifications, ...pendingItems];

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
      message: `Nova mensagem sobre "${msg.itemTitle || 'item'}" de ${msg.otherName}`,
      time: getRelativeTime(msg.lastMessageAt),
      read: false,
      otherId: msg.otherId,
      icon: 'message-circle',
      iconColor: '#F59E42',
      bgColor: '#FFF7ED',
    }));

    setMessageNotifications(mappedMessageNotifications);

    let items = await listItems({ owner_id: user.id, resolved: false });
    items = (items || []).filter(item => item && item.id);
    const renewalAlerts = buildRenewalAlerts(items);

    const mappedPendingItems = items.map(item => ({
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
    }));

    setPendingItems(mappedPendingItems);

    const mappedSystemAlerts = [...renewalAlerts, ...(systemAlertsData || [])]
      .filter(alert => alert && (alert.type === 'renewal_reminder' || alert.type === 'item_removed'))
      .map(alert => ({
        id: `system_${alert.id}`,
        type: alert.type,
        title: alert.type === 'item_removed' ? 'Sua publicação foi removida' : 'Renove sua publicação',
        message: alert.message,
        time: getRelativeTime(alert.created_at),
        read: Boolean(alert.read),
        icon: alert.type === 'item_removed' ? 'trash-2' : 'alert-triangle',
        iconColor: alert.type === 'item_removed' ? '#DC2626' : '#F59E42',
        bgColor: alert.type === 'item_removed' ? '#FEF2F2' : '#FFF7ED',
        critical: alert.type === 'renewal_reminder' || alert.type === 'item_removed',
        itemId: alert.item_id,
      }));

    setSystemAlerts(mappedSystemAlerts);
    setLoading(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;

    await markAllNotificationsRead(user.id);
    setSystemAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    await fetchNotifications();

    if (typeof onNotificationsUpdated === 'function') {
      onNotificationsUpdated();
    }
  }

  async function handleNotificationPress(notification) {
    if (notification.type === 'renewal_reminder' && notification.itemId) {
      try {
        setRenewingItemId(notification.itemId);
        await renewItem(notification.itemId);
        await markNotificationRead(notification.id.replace('system_', ''));
        Alert.alert('Sucesso', 'Sua publicação foi renovada com sucesso.');
        await fetchNotifications();
      } catch (err) {
        console.error('Erro ao renovar publicação pelo alerta:', err);
        Alert.alert('Erro', 'Não foi possível renovar a publicação neste momento.');
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

    if (notification.type === 'match' && notification.item) {
      Alert.alert(
        'Seu item foi encontrado?',
        'Se você recuperou seu item, podemos excluir sua publicação para evitar novas notificações. Deseja realmente excluir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, pode excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                const itemId = notification.item?.id;
                console.log('[Notifications] Marcando item como resolvido:', itemId);
                await markItemAsResolved(itemId, user.id);
                console.log('[Notifications] Chamando deleteItem para:', itemId);
                const result = await deleteItem(itemId);
                console.log('[Notifications] Resultado deleteItem:', result);
                setPendingItems(prev => prev.filter(item => item.id !== itemId));
                await fetchNotifications();
                if (typeof onNotificationsUpdated === 'function') {
                  onNotificationsUpdated();
                }
              } catch (err) {
                console.error('[Notifications] Falha ao excluir item após marcar como encontrado:', err);
                const message = err?.message || String(err || 'Erro desconhecido');
                Alert.alert('Erro ao excluir publicação', message);
              }
            },
          },
        ]
      );
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

    // Marca notificações persistentes como lidas quando tocadas, se houver id válido
    if (notification.id?.startsWith('system_')) {
      await markNotificationRead(notification.id.replace('system_', ''));
      await fetchNotifications();
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
    }
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadBannerTextContainer}>
            <Text style={styles.unreadBannerTitle}>{unreadCount} notificações não lidas</Text>
            <Text style={styles.unreadBannerSubtitle}>Toque em cada notificação para marcar como lida.</Text>
          </View>
          <TouchableOpacity style={styles.unreadBannerButton} onPress={handleMarkAllRead}>
            <Text style={styles.unreadBannerButtonText}>Marcar todas</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Notifications List */}
      {loading ? (
        <ActivityIndicator size="large" color="#F59E42" style={{ marginVertical: 24 }} />
      ) : notificationList.length > 0 ? (
        <FlatList
          data={notificationList}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notificationCard,
                { backgroundColor: item.bgColor },
                item.critical ? styles.criticalCard : {},
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
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, { color: '#1F2937' }]} numberOfLines={1}>{item.title}</Text>
                    {item.critical && (
                      <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>Urgente</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
                <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
              </View>
              {renewingItemId === item.itemId && (
                <ActivityIndicator size="small" color="#F59E42" style={{ marginLeft: 8 }} />
              )}
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
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFF7ED',
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
  criticalBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#DC2626',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  criticalBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
    backgroundColor: '#fff',
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
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  unreadBannerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  unreadBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  unreadBannerSubtitle: {
    fontSize: 13,
    color: '#1E40AF',
  },
  unreadBannerButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unreadBannerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
