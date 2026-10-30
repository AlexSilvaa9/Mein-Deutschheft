// ─── Core Data Models for Mein Deutschheft ────────────────────────────────────

export type Article = 'der' | 'die' | 'das';
export type VowelQuantity = 'short' | 'long';
export type Language = 'es' | 'en' | 'de';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// ─── Translation ──────────────────────────────────────────────────────────────
export interface Translation {
  text: string;
  language: Language;
}

// ─── Vowel info inside a word ─────────────────────────────────────────────────
export interface VowelInfo {
  grapheme: string;
  syllable: number; // 1-indexed
  quantity: VowelQuantity;
}

// ─── Pattern occurrence inside a word ────────────────────────────────────────
export interface PatternOccurrence {
  patternId: string;
  start: number; // 1-indexed, inclusive
  end: number;   // 1-indexed, inclusive
  syllable: number;
}

// ─── Pronunciation ────────────────────────────────────────────────────────────
export interface Pronunciation {
  syllables: string[];        // e.g. ['Ap', 'fel']
  stress: number;             // 1-indexed syllable
  vowels: VowelInfo[];
  patterns: PatternOccurrence[];
}

// ─── Plural morphology ────────────────────────────────────────────────────────
export interface VowelChange {
  from: string;
  to: string;
}

export interface PluralInfo {
  form: string;
  suffix: string;
  umlaut: boolean;
  vowelChanges: VowelChange[];
}

// ─── Word ─────────────────────────────────────────────────────────────────────
export interface Word {
  id: string;
  lemma: string;
  article: Article;
  translations: Translation[];
  domains: string[];   // domain ids
  sets: string[];      // set ids
  level: CefrLevel;
  plural: PluralInfo;
  pronunciation: Pronunciation;
  notes: string;
}

// ─── Domain ───────────────────────────────────────────────────────────────────
export interface Domain {
  id: string;
  name: string;
  nameEn?: string;
  nameDe?: string;
  parentId: string | null;
}

// ─── Set ──────────────────────────────────────────────────────────────────────
export interface VocabSet {
  id: string;
  name: string;
  description: string;
}

// ─── Pronunciation Pattern (catalogue) ───────────────────────────────────────
export interface PronunciationPattern {
  id: string;
  grapheme: string;
  sound: string;       // IPA
  description: string;
  descriptionEn?: string;
  descriptionDe?: string;
}

// ─── Root JSON structure ──────────────────────────────────────────────────────
export interface VocabularyData {
  version: number;
  words: Word[];
  domains: Domain[];
  sets: VocabSet[];
  pronunciationPatterns: PronunciationPattern[];
}

// ─── Filter state ─────────────────────────────────────────────────────────────
export interface FilterState {
  searchText: string;
  domains: string[];
  sets: string[];
  articles: Article[];
  levels: CefrLevel[];
  umlaut: boolean | null;
  vowelQuantity: VowelQuantity | null;
  patternIds: string[];
  syllableCount: number | null;
  includeSubdomains: boolean;
}

export const DEFAULT_FILTER: FilterState = {
  searchText: '',
  domains: [],
  sets: [],
  articles: [],
  levels: [],
  umlaut: null,
  vowelQuantity: null,
  patternIds: [],
  syllableCount: null,
  includeSubdomains: true,
};

// ─── Exercise types ───────────────────────────────────────────────────────────
export type ExerciseType = 'translation' | 'article' | 'plural' | 'pronunciation';

export interface ExerciseSession {
  type: ExerciseType;
  words: Word[];
  currentIndex: number;
  correct: number;
  incorrect: number;
  answers: ExerciseAnswer[];
}

export interface ExerciseAnswer {
  wordId: string;
  correct: boolean;
  userAnswer: string;
  expectedAnswer: string;
}
