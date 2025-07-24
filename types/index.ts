import { Tables } from './supabase'

// Type aliases for easier usage
export type Profile = Tables<'profiles'>
export type Recitation = Tables<'recitations'>
export type Assignment = Tables<'assignments'>
export type Class = Tables<'classes'>
export type Feedback = Tables<'feedback'>

// Legacy Recitation interface for backward compatibility
// You may want to migrate to the Supabase types gradually
export interface LegacyRecitation {
  id: string;
  student_id: string;
  assignment_id: string;
  audio_url: string;
  transcription: string | null;
  feedback: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
}

// Legacy Assignment interface for backward compatibility
// You may want to migrate to the Supabase types gradually
export interface LegacyAssignment {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  surah_name: string;
  start_ayah: number;
  end_ayah: number;
  due_date: string;
  created_at: string;
  updated_at: string;
}

// Legacy Feedback interface for backward compatibility
// You may want to migrate to the Supabase types gradually
export interface LegacyFeedback {
  id: string;
  recitation_id: string;
  teacher_id: string;
  feedback: string;
  created_at: string;
}

// Surah: represents a surah in the Quran
type SurahType = 'Meccan' | 'Medinan';
export interface Surah {
  number: number;
  name: string;
  ayahs: number; // number of ayahs in the surah
  // Optionally, you can add:
  // englishName?: string;
  // englishNameTranslation?: string;
  // numberOfAyahs?: number;
  // revelationType?: SurahType;
}

// UpdateErrorStatusParams: for updating error status in the API
export interface UpdateErrorStatusParams {
  supabase: any; // Will be replaced with the correct Supabase client type if available
  recitationId: string;
  error: string;
}

// SignedUploadUrlRequest: request body for signed upload URL
export interface SignedUploadUrlRequest {
  assignmentId: string;
  studentId: string;
  fileType: string;
}

// SignedUploadUrlResponse: response from signed upload URL endpoint
export interface SignedUploadUrlResponse {
  signedUrl: string;
  path: string;
  expiresIn: number;
} 