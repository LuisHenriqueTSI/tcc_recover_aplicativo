import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
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

function MainAppContainer() {
  const { isDark, colors } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    cleanupExpiredItems().catch((error) => {
      console.error('[App] cleanupExpiredItems falhou:', error);
    });
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}
