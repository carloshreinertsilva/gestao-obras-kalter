import { createClient } from '@supabase/supabase-js';

// Substitua os textos abaixo pelas suas chaves reais
const supabaseUrl = 'https://pnnhyzdbknzhsyyhhgbk.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubmh5emRia256aHN5eWhoZ2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTA0MTEsImV4cCI6MjA4OTMyNjQxMX0.MG0h50YTuKUCWqFpMIAuDtmLGI63z12RPIQeA8ccUkg';

export const supabase = createClient(supabaseUrl, supabaseKey);
