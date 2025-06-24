import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hcyodecaeoeiadwyyzrz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjeW9kZWNhZW9laWFkd3l5enJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwNTEzOTQsImV4cCI6MjA1NjYyNzM5NH0.9CcesMivK0TDQ6BGvyxkar9Ezcc1Pmi2ctp4yo7ck-g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
