import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Auth Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import RegisterItemScreen from '../screens/RegisterItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import InboxScreen from '../screens/InboxScreen';
import ProfileScreen from '../screens/ProfileScreen';

import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/MapScreen';
import AdminScreen from '../screens/AdminScreen';
import NotificationBell from '../components/NotificationBell';
import NotificationsScreen from '../screens/NotificationsScreen';
import TabBarButton from '../components/TabBarButton';
import MeusAnunciosScreen from '../screens/MeusAnunciosScreen';
import ConfigScreen from '../screens/ConfigScreen';
import AjudaSuporteScreen from '../screens/AjudaSuporteScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SobreScreen from '../screens/SobreScreen';
import { listItems } from '../services/items';
import { buildRenewalAlerts } from '../services/notifications';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Header Right Button for Public App - navigates to Login
const PublicHeaderRight = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => navigation.navigate('Login')}
    style={{ marginRight: 16 }}
  >
    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Entrar</Text>
  </TouchableOpacity>
);

// Public Stack (no auth required - shows only Home)
const PublicAppTabs = ({ navigation }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingTop: 0,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Explorar',
          tabBarLabel: () => (
            <Text style={{ color: '#4F46E5', fontSize: 13, marginBottom: 4, textAlign: 'center', fontWeight: 'bold' }}>Explorar</Text>
          ),
          tabBarIcon: () => (
            <MaterialIcons name="home" size={22} color="#4F46E5" />
          ),
        }}
      />
      <Tab.Screen
        name="LoginTab"
        component={LoginScreen}
        options={{
          title: 'Entrar',
          tabBarLabel: ({ color }) => (
            <Text style={{ color: '#fff', fontSize: 13, marginTop: 2 }}>Entrar</Text>
          ),
          tabBarIcon: () => (
            <MaterialIcons name="login" size={22} color="#fff" />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                marginHorizontal: 8,
                marginVertical: 4,
                backgroundColor: '#4F46E5',
                borderRadius: 24,
                flexDirection: 'row',
                minWidth: 80,
                maxWidth: 120,
              }}
            >
              <MaterialIcons name="login" size={22} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Entrar</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Public Stack for unauthenticated users
const PublicStack = () => {
  // Para teste: sempre mostrar a tela Sobre
  const showSobre = true;
  const checked = true;

  // Código original comentado para referência:
  // const [showSobre, setShowSobre] = React.useState(false);
  // const [checked, setChecked] = React.useState(false);
  // React.useEffect(() => {
  //   AsyncStorage.getItem('accepted_terms').then((accepted) => {
  //     setShowSobre(!accepted);
  //     setChecked(true);
  //   });
  // }, []);

  if (!checked) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4F46E5',
          paddingTop: 38,
          paddingBottom: 18,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {showSobre && (
        <Stack.Screen
          name="Sobre"
          component={SobreScreen}
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen
        name="PublicApp"
        component={PublicAppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
        initialParams={{}} // Garante que seja a primeira tela
      />
      <Stack.Screen
        name="EsqueciSenha"
        component={require('../screens/EsqueciSenhaScreen').default}
        options={{ title: 'Redefinir senha' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
          options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Detalhes do Item' }}
      />
    </Stack.Navigator>
  );
};





// Main App Stack with Tabs
import { getUnreadCount } from '../services/messages';
import { getUserNotifications } from '../services/notifications';

const MainAppTabs = ({ navigation }) => {
  const { isAdmin, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [systemAlertCount, setSystemAlertCount] = useState(0);
  const [pendingItemCount, setPendingItemCount] = useState(0);
  const [renewalAlertCount, setRenewalAlertCount] = useState(0);

  const fetchUnread = async () => {
    if (!user?.id) return;
    const [messageCount, notifications, items] = await Promise.all([
      getUnreadCount(user.id),
      getUserNotifications(user.id),
      listItems({ owner_id: user.id, resolved: false }),
    ]);

    const unreadSystemAlerts = (notifications || []).filter(alert => alert?.read !== true && alert?.read !== 'true').length;
    const pendingCount = Array.isArray(items) ? items.length : 0;
    const renewalAlerts = buildRenewalAlerts(items || []);
    const renewalCount = renewalAlerts.length;

    console.log('[MainAppTabs] fetchUnread', {
      messageCount,
      unreadSystemAlerts,
      pendingCount,
      renewalCount,
      notificationsCount: notifications?.length,
    });

    setUnreadCount(messageCount);
    setSystemAlertCount(unreadSystemAlerts);
    setPendingItemCount(pendingCount);
    setRenewalAlertCount(renewalCount);
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchUnread();

    const handleNotificationEvent = (payload) => {
      console.log('[MainAppTabs] realtime notification event', payload);
      fetchUnread();
    };

    const handleMessageEvent = (payload) => {
      console.log('[MainAppTabs] realtime message event', payload);
      fetchUnread();
    };

    console.log('[MainAppTabs] subscribing realtime for user', user.id);

    const notificationChannel = supabase.channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        handleNotificationEvent
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        handleNotificationEvent
      )
      .subscribe();

    const messageChannel = supabase.channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        handleMessageEvent
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        handleMessageEvent
      )
      .subscribe();

    const interval = setInterval(fetchUnread, 5000);

    return () => {
      clearInterval(interval);
      if (notificationChannel) supabase.removeChannel(notificationChannel);
      if (messageChannel) supabase.removeChannel(messageChannel);
    };
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Início',
          tabBarLabel: 'Início',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={InboxScreen}
        options={{
          title: 'Mensagens',
          tabBarLabel: 'Mensagens',
          headerTitle: 'Mensagens',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarIcon: ({ color, size }) => (
            <View style={{ width: size + 10, height: size + 10, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <MaterialIcons name="chat" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#EF4444',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  zIndex: 99,
                  borderWidth: 2,
                  borderColor: '#fff',
                }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="RegisterItemTab"
        component={RegisterItemScreen}
        options={{
          title: 'Registrar',
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              icon="add"
              onPress={() => navigation.navigate('RegisterItem')}
            />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        options={{
          title: 'Alertas',
          tabBarLabel: 'Alertas',
          headerTitle: 'Alertas',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarIcon: ({ color, size, focused }) => {
            const notificationCount = focused ? 0 : (unreadCount + systemAlertCount + pendingItemCount + renewalAlertCount);
            return (
              <View style={{ width: size + 24, height: size + 24, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <MaterialIcons name="notifications" size={size} color={color} />
                {notificationCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    backgroundColor: '#EF4444',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#fff',
                  }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      >
        {(props) => <NotificationsScreen {...props} onNotificationsUpdated={fetchUnread} />}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          headerTitle: 'Perfil',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="AdminTab"
          component={AdminScreen}
          options={{
            title: 'Admin',
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="admin-panel-settings" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

// Main Stack for additional screens not in tabs
const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MainApp"
        component={MainAppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Detalhes do Item' }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ title: 'Mensagens' }}
      />
      <Stack.Screen
        name="RegisterItem"
        component={RegisterItemScreen}
        options={{
          title: 'Registrar/Editar Item',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="MeusAnuncios"
        component={MeusAnunciosScreen}
        options={{ title: 'Minhas Publicações' }}
      />
      <Stack.Screen
        name="Config"
        component={ConfigScreen}
        options={{ title: 'Configurações' }}
      />
      <Stack.Screen
        name="AjudaSuporte"
        component={AjudaSuporteScreen}
        options={{ title: 'Ajuda e Suporte' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Editar Perfil' }}
      />
    </Stack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // or a splash screen
  }

  // If user is authenticated, show full app with all features
  if (user) {
    return <MainStack />;
  }

    // If not authenticated, show public app (can view items but limited features)
    return <PublicStack />;
};

export default RootNavigator;
