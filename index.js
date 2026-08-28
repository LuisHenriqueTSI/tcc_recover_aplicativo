import { LogBox } from 'react-native';
import { registerRootComponent } from 'expo';

// Silencia avisos conhecidos e esperados do ambiente de desenvolvimento Expo Go
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'SafeAreaView has been deprecated',
]);

const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('expo-notifications') || args[0].includes('SafeAreaView has been deprecated'))) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('expo-notifications: Android Push notifications')) {
    return;
  }
  originalError(...args);
};

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
