import { createClient } from '@supabase/supabase-js';
import './webCryptoPolyfill';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const expoExtra = Constants.expoConfig?.extra || {};
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  expoExtra.EXPO_PUBLIC_SUPABASE_URL ||
  expoExtra.SUPABASE_URL ||
  '';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.SUPABASE_KEY ||
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY antes de iniciar o aplicativo.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export default supabase;
