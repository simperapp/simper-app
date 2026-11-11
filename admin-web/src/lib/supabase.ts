import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://gnzkagrbdoxmlqawmyrs.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduemthZ3JiZG94bWxxYXdteXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMzQ1MzQsImV4cCI6MjEwOTkxMDUzNH0.kDmLH2kAQx-IB2RPpDhwHbb4rsSrBQC7if3bYkGs5IU';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(
  (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) || (DEFAULT_URL && DEFAULT_KEY)
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

