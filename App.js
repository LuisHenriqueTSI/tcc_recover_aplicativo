import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation';
import { cleanupExpiredItems } from './src/services/items';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'wefind://', 'https://wefind.app'],
  config: {
    screens: {
      ItemDetail: 'item/:itemId',
      ChatScreen: 'chat/:conversation',
      Config: 'config',
      MainApp: {
        screens: {
          HomeTab: 'home',
          SearchTab: 'search',
          RegisterTab: 'register',
          InboxTab: 'inbox',
          ProfileTab: 'profile',
        },
      },
    },
  },
};

export default function App() {
  useEffect(() => {
    cleanupExpiredItems().catch((error) => {
      console.error('[App] cleanupExpiredItems falhou:', error);
    });
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
