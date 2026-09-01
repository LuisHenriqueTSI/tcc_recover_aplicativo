import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@wefind/theme_mode';

export const lightColors = {
  background: '#F4F8F5',
  surface: '#FFFFFF',
  card: '#F9FCFA',
  cardBorder: '#E2E8F0',
  innerCard: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#059669',
  primaryLight: '#ECFDF5',
  primaryDark: '#047857',
  headerBg: '#059669',
  headerText: '#FFFFFF',
  headerSubText: '#D1FAE5',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#059669',
  tabBarInactive: '#64748B',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  statusLost: '#EF4444',
  statusFound: '#10B981',
  statusAdoption: '#DB2777',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#059669',
  badgeBg: '#ECFDF5',
  badgeText: '#047857',
  isDark: false,
};

export const darkColors = {
  background: '#091512',
  surface: '#11221C',
  card: '#11221C',
  cardBorder: '#1C362D',
  innerCard: '#0C1A15',
  border: '#1C362D',
  divider: '#1C362D',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#34D399',
  primaryLight: 'rgba(52, 211, 153, 0.15)',
  primaryDark: '#059669',
  headerBg: '#091512',
  headerText: '#F8FAFC',
  headerSubText: '#94A3B8',
  tabBarBg: '#091512',
  tabBarBorder: '#11221C',
  tabBarActive: '#34D399',
  tabBarInactive: '#94A3B8',
  inputBg: '#11221C',
  inputBorder: '#1C362D',
  statusLost: '#F87171',
  statusFound: '#34D399',
  statusAdoption: '#F472B6',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#34D399',
  badgeBg: 'rgba(52, 211, 153, 0.18)',
  badgeText: '#A7F3D0',
  isDark: true,
};

const ThemeContext = createContext({
  themeMode: 'light',
  isDark: false,
  colors: lightColors,
  setThemeMode: () => {},
  resetThemeToLight: () => {},
  loadingTheme: false,
});

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('light');
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.warn('[ThemeContext] Erro ao carregar tema:', e.message);
      } finally {
        setLoadingTheme(false);
      }
    };
    loadStoredTheme();
  }, []);

  const setThemeMode = async (mode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('[ThemeContext] Erro ao salvar tema:', e.message);
    }
  };

  const resetThemeToLight = async () => {
    try {
      setThemeModeState('light');
      await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
    } catch (e) {
      console.warn('[ThemeContext] Erro ao resetar tema para claro:', e.message);
    }
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode, resetThemeToLight, loadingTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
