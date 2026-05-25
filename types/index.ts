import { Tables } from './supabase'

export type UserRole = 'teacher' | 'student' | 'parent'
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'error'

export type Profile = Tables<'profiles'>
export type Recitation = Tables<'recitations'>
export type Assignment = Tables<'assignments'>
export type Class = Tables<'classes'>
export type Feedback = Tables<'feedback'>

export interface Surah {
  number: number
  name: string
  ayahs: number
}
