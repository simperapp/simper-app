import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://teuedvbusvtelecxsrhp.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldWVkdmJ1c3Z0ZWxlY3hzcmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5MjU4MjksImV4cCI6MjExMDUwMTgyOX0._kPqAyaAyi9Q_y6QSFfUNuLy8FotXuBQdK9EkPbjmfE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(
  (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) || (DEFAULT_URL && DEFAULT_KEY)
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

