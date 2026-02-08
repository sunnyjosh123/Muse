
export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM', // Inspiration
  FIST = 'FIST',           // Record Voice
  OK = 'OK',               // Generate Image
  VICTORY = 'VICTORY',     // General Style (kept for backward compatibility or simple style)
  ROCK = 'ROCK',           // Heavy Metal Style
  LOVE = 'LOVE',           // Kawaii/Anime Style (ASL ILY Sign)
  SHAKA = 'SHAKA',         // Just for Fun / Surprise Style
  POINTING = 'POINTING',    // Selection/Reset
  DIAL = 'DIAL'
}

export type ThemeMode = 'cyberpunk' | 'zen' | 'retro' | 'alchemist' | 'comic' | 'game';

export interface MagicState {
  isRecording: boolean;
  prompt: string;
  styleModifier: string;
  generatedImage: string | null;
  generatedVideo: string | null;
  isLoading: boolean;
  lastGesture: GestureType;
  feedbackMessage: string;
  providerInfo?: string; // Tracks the source
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceData {
  landmarks: Landmark[];
  detected: boolean;
  snapshot?: string; // Base64 image
  expression?: string;
  emotion?: 'Joy' | 'Calm' | 'Neutral';
}

export type UserTier = 'free' | 'pro';

export interface SavedPrompt {
  id: string;
  text: string;
  style: string;
  timestamp: number;
  thumbnail?: string;
}
