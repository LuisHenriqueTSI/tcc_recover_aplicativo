import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../services/messages';
import { getUserNotifications } from '../services/notifications';

export default function NotificationBell({ style }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchCounts() {
    if (!user) return;
    try {
      const [unreadMsgs, systemNotifs] = await Promise.all([
        getUnreadCount(user.id),
        getUserNotifications(user.id),
      ]);
      const unreadSystem = (systemNotifs || []).filter((n) => !n.read).length;
      setUnreadCount((unreadMsgs || 0) + unreadSystem);
    } catch (e) {
      // Ignora silenciosamente
    }
  }

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
