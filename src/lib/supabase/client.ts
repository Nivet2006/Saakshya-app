import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isRealSupabaseConfigured =
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('YOUR_PROJECT_REF') &&
  !supabaseUrl.includes('placeholder-project') &&
  supabaseAnonKey.length > 20 &&
  !supabaseAnonKey.includes('YOUR_SUPABASE_');

export const supabase: SupabaseClient | null = isRealSupabaseConfigured
  ? createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

