import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysbnnzzlrcmnrmhfxlca.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYm5uenpscmNtbnJtaGZ4bGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjQxNjAsImV4cCI6MjA3NjcwMDE2MH0.nFKks5qkJLhaRsJ2BBfOyHG2rtLMT2nD2qIQFUdFG7k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);