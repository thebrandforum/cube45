import { createClient } from '@supabase/supabase-js'

// Supabase 설정
const supabaseUrl = 'https://qwikdismsngrfyukoihd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aWtkaXNtc25ncmZ5dWtvaWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MDE1NjcsImV4cCI6MjA2NzI3NzU2N30.arcdnlPp9W7-wg0HgWVRAqvSmlm34_Th-0ef5oLfU8o'

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)