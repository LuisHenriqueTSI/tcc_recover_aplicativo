import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@wefind/theme_mode';

export const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#F1F5F9',
  border: '#E2E8F0',
  divider: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  headerBg: '#2563EB',
  headerText: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#2563EB',
  tabBarInactive: '#64748B',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  statusLost: '#EF4444',
  statusFound: '#10B981',
  statusAdoption: '#DB2777',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
  badgeBg: '#EFF6FF',
  badgeText: '#1D4ED8',
  isDark: false,
};

export const darkColors = {
  background: '#0B0F19',
  surface: '#1E293B',
  card: '#1E293B',
  cardBorder: '#334155',
  border: '#334155',
  divider: '#334155',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3B82F6',
  primaryLight: 'rgba(59, 130, 246, 0.15)',
  primaryDark: '#2563EB',
  headerBg: '#0F172A',
  headerText: '#F8FAFC',
  tabBarBg: '#0F172A',
  tabBarBorder: '#1E293B',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#94A3B8',
  inputBg: '#0F172A',
  inputBorder: '#334155',
  statusLost: '#F87171',
  statusFound: '#34D399',
  statusAdoption: '#F472B6',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
  badgeBg: 'rgba(59, 130, 246, 0.18)',
  badgeText: '#93C5FD',
  isDark: true,
};

const ThemeContext = createContext({
  themeMode: 'light',
  isDark: false,
  colors: lightColors,
  setThemeMode: () => {},
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

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode, loadingTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
