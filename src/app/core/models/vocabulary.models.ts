// ─── Core Data Models for Mein Deutschheft ────────────────────────────────────

export type Article = 'der' | 'die' | 'das';
export type VowelQuantity = 'short' | 'long';
export type Language = 'es' | 'en' | 'de';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordType = 'noun' | 'verb' | 'adjective' | 'phrase' | 'number';

// ─── Translation ──────────────────────────────────────────────────────────────
export interface Translation {
  text: string;
  language: Language;
}

// ─── Vowel info inside a word ─────────────────────────────────────────────────
export interface VowelInfo {
  grapheme: string;
  start: number; // 1-indexed, inclusive
  end: number;   // 1-indexed, inclusive
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
  stress: StressInfo;
  vowels: VowelInfo[];
  patterns: PatternOccurrence[];
}

export interface StressInfo {
  primary: number;            // 1-indexed syllable
  secondary: number[];        // 1-indexed syllables
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

export interface CompoundPart {
  lemma: string;
  meaning?: string;
}

// ─── Word ─────────────────────────────────────────────────────────────────────
export interface Word {
  id: string;
  lemma: string;
  article: Article | null;
  translations: Translation[];
  domains: string[];   // domain ids
  sets: string[];      // set ids
  level: CefrLevel;
  plural: PluralInfo;
  pronunciation: Pronunciation;
  notes: string;
  wordType: WordType;
  compoundParts?: CompoundPart[];
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

// ─── Lessons ────────────────────────────────────────────────────────────────
export interface LessonCategory {
  id: string;
  name: string;
  order: number;
}

export interface LessonSubcategory {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

export interface Lesson {
  id: string;
  categoryId: string;
  subcategoryId: string;
  title: string;
  summary: string;
  content: string;
  level: CefrLevel;
  order: number;
}

export interface LessonDoubt {
  id: string;
  question: string;
  answer: string;
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
  lessonCategories?: LessonCategory[];
  lessonSubcategories?: LessonSubcategory[];
  lessons?: Lesson[];
  lessonDoubts?: LessonDoubt[];
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
  wordTypes: WordType[];
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
  wordTypes: [],
  includeSubdomains: true,
};

// ─── Exercise types ───────────────────────────────────────────────────────────
export type ExerciseType = 'translation' | 'article' | 'plural' | 'pronunciation' | 'indefinite-article';

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
