import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const FALLBACK_SUPABASE_URL = 'https://youlbpxrvzgjzvhbisbn.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdWxicHhydnpnanp2aGJpc2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDUwMDksImV4cCI6MjA5OTUyMTAwOX0.YrgjNo8Fdt1GMkOtx2gJ1-UVzdILyXdCRhseDS-fkIs';

const expoExtra = Constants.expoConfig?.extra || {};
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  expoExtra.EXPO_PUBLIC_SUPABASE_URL ||
  expoExtra.SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.SUPABASE_KEY ||
  FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
