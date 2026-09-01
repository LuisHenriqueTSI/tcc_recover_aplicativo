import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@wefind/theme_mode';

export const lightColors = {
  background: '#F6F8F6',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E5EBE6',
  innerCard: '#F8FAF8',
  border: '#E2E8F0',
  divider: '#E5EBE6',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#2E5634',
  primaryLight: '#EAF2EB',
  primaryDark: '#1E3E24',
  primaryBorder: '#C5DCC8',
  secondary: '#B1734A',
  secondaryLight: '#F8EFE9',
  secondaryDark: '#875029',
  secondaryBorder: '#E8D2C2',
  weColor: '#B1734A',
  findColor: '#2E5634',
  headerBg: '#2E5634',
  headerText: '#FFFFFF',
  headerSubText: '#EAF2EB',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5EBE6',
  tabBarActive: '#2E5634',
  tabBarInactive: '#64748B',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  statusLost: '#EF4444',
  statusFound: '#2E5634',
  statusAdoption: '#B1734A',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#2E5634',
  badgeBg: '#EAF2EB',
  badgeText: '#1E3E24',
  isDark: false,
};

export const darkColors = {
  background: '#0A120D',
  surface: '#132218',
  card: '#132218',
  cardBorder: '#1E3626',
  innerCard: '#0E1A12',
  border: '#1E3626',
  divider: '#1E3626',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#529960',
  primaryLight: 'rgba(82, 153, 96, 0.18)',
  primaryDark: '#2E5634',
  primaryBorder: '#274B30',
  secondary: '#C68A62',
  secondaryLight: 'rgba(198, 138, 98, 0.18)',
  secondaryDark: '#B1734A',
  secondaryBorder: '#4E3120',
  weColor: '#D99C74',
  findColor: '#68B878',
  headerBg: '#0A120D',
  headerText: '#F8FAFC',
  headerSubText: '#94A3B8',
  tabBarBg: '#0A120D',
  tabBarBorder: '#132218',
  tabBarActive: '#529960',
  tabBarInactive: '#94A3B8',
  inputBg: '#132218',
  inputBorder: '#1E3626',
  statusLost: '#F87171',
  statusFound: '#529960',
  statusAdoption: '#F59E0B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#529960',
  badgeBg: 'rgba(82, 153, 96, 0.22)',
  badgeText: '#A8DDB1',
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
