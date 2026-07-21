import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation';
import { cleanupExpiredItems } from './src/services/items';

export default function App() {
  useEffect(() => {
    cleanupExpiredItems().catch((error) => {
      console.error('[App] cleanupExpiredItems falhou:', error);
    });
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
