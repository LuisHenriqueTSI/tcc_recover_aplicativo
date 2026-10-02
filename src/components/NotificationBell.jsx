import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/messages';
import { getUnreadNotificationCount } from '../services/notifications';

export default function NotificationBell({ style }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
    const [unreadMsgs, unreadNotifications] = await Promise.all([
      getUnreadCount(user.id),
      getUnreadNotificationCount(user.id),
    ]);
    setUnreadCount(unreadMsgs + unreadNotifications);
    } catch (error) {
    console.warn('[NotificationBell] Não foi possível atualizar o contador:', error.message);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
    if (!user?.id) return undefined;
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
    }, [fetchCounts, user?.id])
  );

  return (
    <View style={[{ minWidth: 40, alignItems: 'center', justifyContent: 'center' }, style]}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Notifications')}
        style={styles.bellButton}
        accessibilityLabel="Abrir Notificações"
        activeOpacity={0.75}
      >
        <MaterialIcons
          name="notifications"
          size={28}
          color="#fff"
          style={{ textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 3 }}
        />
        {unreadCount > 0 && (
          <View pointerEvents="none" style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    padding: 6,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
