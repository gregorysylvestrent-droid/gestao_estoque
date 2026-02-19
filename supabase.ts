import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dfhfmkuqnhfblsorvfoe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaGZta3VxbmhmYmxzb3J2Zm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzc3ODYsImV4cCI6MjA4NTYxMzc4Nn0.YGVt8iW3rm2FHWqtHXub4db7avXLUBPvsfvcrPrpfos';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
