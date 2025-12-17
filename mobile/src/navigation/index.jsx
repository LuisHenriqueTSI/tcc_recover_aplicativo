import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

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
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <PublicHeaderRight navigation={navigation} />,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: 'RECOVER',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
          // headerRight removido
        }}
      />
      {/* Search removed from public tabs as requested */}
    </Tab.Navigator>
  );
};

// Public Stack for unauthenticated users
const PublicStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* WelcomeScreen removido: inicia direto no Login */}
      <Stack.Screen
        name="PublicApp"
        component={PublicAppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Entrar' }}
        initialParams={{}} // Garante que seja a primeira tela
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Registrar' }}
      />
    </Stack.Navigator>
  );
};



// Auth Stack
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFB' },
      }}
    >
      {/* WelcomeScreen removido do AuthStack */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Main App Stack with Tabs
const MainAppTabs = ({ navigation }) => {
  const { isAdmin } = useAuth();

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
        headerShown: true,
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: 'RECOVER',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
          // headerRight removido
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={InboxScreen}
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" size={size} color={color} />
          ),
          // headerRight removido
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
              onPress={() => navigation.navigate('RegisterItemTab')}
            />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          title: 'Alertas',
          tabBarLabel: 'Alertas',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
          headerTitle: 'Alertas',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
          // headerRight removido
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
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
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
        options={{ title: 'Chat' }}
      />
      <Stack.Screen
        name="RegisterItem"
        component={RegisterItemScreen}
        options={{ title: 'Registrar/Editar Item' }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={{ title: 'Mapa' }}
      />
      <Stack.Screen
        name="MeusAnuncios"
        component={MeusAnunciosScreen}
        options={{ title: 'Meus Anúncios' }}
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
