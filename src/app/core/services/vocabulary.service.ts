import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  VocabularyData, Word, Domain, VocabSet, WordBase,
  PronunciationPattern, FilterState, DEFAULT_FILTER,
  Article, CefrLevel, VowelQuantity, Lesson, LessonCategory, LessonSubcategory, LessonDoubt,
} from '../models/vocabulary.models';

const STORAGE_KEY = 'mein-deutschheft-data';
const RESET_MARKER = 'mein-deutschheft-data-reset-2026-11-v8';
const INITIAL_DATA_URL = 'assets/data/vocabulary.json';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private http = inject(HttpClient);

  // ─── State ────────────────────────────────────────────────────────────────
  private _data = signal<VocabularyData | null>(null);
  private _filter = signal<FilterState>({ ...DEFAULT_FILTER });
  private _hasUnsavedChanges = signal(false);
  private _loading = signal(true);
  private _error = signal<string | null>(null);

  // ─── Public read-only signals ─────────────────────────────────────────────
  readonly data = this._data.asReadonly();
  readonly filter = this._filter.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly words = computed(() => [...(this._data()?.words ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  ));
  readonly visibleWords = computed(() => this.words().filter(word => !word.isRelated));
  readonly wordBases = computed(() => this._data()?.wordBases ?? []);
  readonly domains = computed(() => this._data()?.domains ?? []);
  readonly sets = computed(() => this._data()?.sets ?? []);
  readonly pronunciationPatterns = computed(() => this._data()?.pronunciationPatterns ?? []);
  readonly lessonCategories = computed(() => this._data()?.lessonCategories ?? []);
  readonly lessonSubcategories = computed(() => this._data()?.lessonSubcategories ?? []);
  readonly lessons = computed(() => this._data()?.lessons ?? []);
  readonly lessonDoubts = computed(() => this._data()?.lessonDoubts ?? []);

  // ─── Filtered words ───────────────────────────────────────────────────────
  readonly filteredWords = computed(() => {
    const words = this.words().filter(word => !word.isRelated);
    const allWords = this.words();
    const f = this._filter();
    return words.filter(word => {
      if (this.matchesFilter(word, f)) return true;
      return word.isBase === true
        && allWords.some(child => child.baseId === word.id && this.matchesFilter(child, f));
    });
  });
  constructor() {
    this.loadData();
  }

  // ─── Data loading ─────────────────────────────────────────────────────────
  loadData(): void {
    this._loading.set(true);
    this._error.set(null);

    if (!localStorage.getItem(RESET_MARKER)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(RESET_MARKER, '1');
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: VocabularyData = JSON.parse(stored);
        this._data.set(this.normalizeData(parsed));
        this._loading.set(false);
        return;
      } catch {
        console.warn('Stored data corrupted, loading initial JSON');
      }
    }

    this.http.get<VocabularyData>(INITIAL_DATA_URL).subscribe({
      next: data => {
        this._data.set(this.normalizeData(data));
        this._loading.set(false);
      },
      error: err => {
        this._error.set('Failed to load vocabulary data');
        this._loading.set(false);
        console.error(err);
      },
    });
  }

  private normalizeData(data: VocabularyData): VocabularyData {
    const normalizedWords = data.words.map((word, index) => this.normalizeWord(word, index));
    const groups = new Map<string, Word[]>();
    for (const word of normalizedWords) {
      if (word.isBase) continue;
      const legacyBaseId = word.baseId ?? this.slugBaseId(word.lemma);
      if (data.wordBases.some(base => base.id === word.baseId)
        || normalizedWords.filter(item => item.lemma.toLocaleLowerCase() === word.lemma.toLocaleLowerCase()).length > 1) {
        const group = groups.get(legacyBaseId) ?? [];
        group.push(word);
        groups.set(legacyBaseId, group);
      }
    }

    const existingBases = normalizedWords.filter(word => word.isBase);
    const generatedBases = [...groups.entries()]
      .filter(([legacyId]) => !existingBases.some(base => base.id === legacyId))
      .map(([legacyId, children]) => {
      const representative = children[0];
      const baseId = legacyId.startsWith('base_word_')
        ? legacyId
        : `base_word_${legacyId.replace(/^base_/, '')}`;
      const articles = [...new Set(children.map(child => child.article).filter((article): article is Article => !!article))];
      return {
        ...representative,
        id: baseId,
        baseId: undefined,
        isBase: true,
        isRelated: false,
        article: articles[0] ?? representative.article,
        articles,
        translations: representative.translations,
        createdAt: children.reduce((date, child) => child.createdAt < date ? child.createdAt : date, representative.createdAt),
      } satisfies Word;
    });
    const baseByLegacyId = new Map(
      [...groups.keys()].map(legacyId => [
        legacyId,
        legacyId.startsWith('base_word_') ? legacyId : `base_word_${legacyId.replace(/^base_/, '')}`,
      ]),
    );
    const words = normalizedWords.map(word => {
      const legacyId = word.baseId ?? this.slugBaseId(word.lemma);
      const baseId = baseByLegacyId.get(legacyId);
      return baseId ? { ...word, baseId, isRelated: true, isBase: false } : word;
    });
    const allWords = [...words.filter(word => !word.isBase), ...existingBases, ...generatedBases];
    const wordBases = [...existingBases, ...generatedBases]
      .map(base => ({ id: base.id, lemma: base.lemma, wordId: base.id }));
    return {
      ...data,
      wordBases,
      lessonCategories: data.lessonCategories ?? [],
      lessonSubcategories: data.lessonSubcategories ?? [],
      lessons: data.lessons ?? [],
      lessonDoubts: data.lessonDoubts ?? [],
      words: allWords,
    };
  }

  private normalizeWord(word: Word, index: number): Word {
    const wordType = word.wordType ?? 'noun';
    return {
      ...word,
      createdAt: word.createdAt ?? new Date(index).toISOString(),
      wordType,
      article: wordType !== 'noun' ? null : word.article ?? null,
      plural: wordType !== 'noun'
        ? { ...word.plural, form: '', suffix: '', umlaut: false, vowelChanges: [] }
        : word.plural,
      pronunciation: {
        ...word.pronunciation,
        stress: this.normalizeStress(word.pronunciation.stress),
        vowels: this.normalizeVowels(word.lemma, word.pronunciation.syllables, word.pronunciation.vowels),
      },
    };
  }

  private slugBaseId(lemma: string): string {
    return `base_${lemma.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  }

  private normalizeStress(stress: Word['pronunciation']['stress'] | number): Word['pronunciation']['stress'] {
    if (typeof stress === 'number') return { primary: stress, secondary: [] };
    return {
      primary: stress?.primary ?? 1,
      secondary: stress?.secondary ?? [],
    };
  }

  addLessonCategory(category: LessonCategory): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessonCategories: [...this.lessonCategories(), category] });
    this.persist();
  }

  deleteLessonCategory(id: string): void {
    const data = this._data();
    if (!data) return;
    const subcategoryIds = this.lessonSubcategories().filter(item => item.categoryId === id).map(item => item.id);
    this._data.set({
      ...data,
      lessonCategories: this.lessonCategories().filter(item => item.id !== id),
      lessonSubcategories: this.lessonSubcategories().filter(item => item.categoryId !== id),
      lessons: this.lessons().filter(item => item.categoryId !== id && !subcategoryIds.includes(item.subcategoryId)),
    });
    this.persist();
  }

  addLessonSubcategory(subcategory: LessonSubcategory): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessonSubcategories: [...this.lessonSubcategories(), subcategory] });
    this.persist();
  }

  deleteLessonSubcategory(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      lessonSubcategories: this.lessonSubcategories().filter(item => item.id !== id),
      lessons: this.lessons().filter(item => item.subcategoryId !== id),
    });
    this.persist();
  }

  addLesson(lesson: Lesson): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessons: [...this.lessons(), lesson] });
    this.persist();
  }

  updateLesson(lesson: Lesson): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessons: this.lessons().map(item => item.id === lesson.id ? lesson : item) });
    this.persist();
  }

  deleteLesson(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessons: this.lessons().filter(item => item.id !== id) });
    this.persist();
  }

  addLessonDoubt(doubt: LessonDoubt): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessonDoubts: [...this.lessonDoubts(), doubt] });
    this.persist();
  }

  updateLessonDoubt(doubt: LessonDoubt): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessonDoubts: this.lessonDoubts().map(item => item.id === doubt.id ? doubt : item) });
    this.persist();
  }

  deleteLessonDoubt(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, lessonDoubts: this.lessonDoubts().filter(item => item.id !== id) });
    this.persist();
  }

  generateLessonId(): string {
    return `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private normalizeVowels(
    lemma: string,
    syllables: string[],
    vowels: Word['pronunciation']['vowels'],
  ): Word['pronunciation']['vowels'] {
    let searchFrom = 0;
    return vowels.flatMap(vowel => {
      const start = vowel.start
        ? vowel.start - 1
        : lemma.toLowerCase().indexOf(vowel.grapheme.toLowerCase(), searchFrom);
      if (start < 0) return [];
      searchFrom = start + vowel.grapheme.length;
      return [{
        ...vowel,
        start: start + 1,
        end: vowel.end ?? start + vowel.grapheme.length,
        syllable: vowel.syllable || Math.max(
          1,
          syllables.findIndex(syllable => syllable.toLowerCase().includes(vowel.grapheme.toLowerCase())) + 1,
        ),
      }];
    });
  }

  // ─── Persistence ──────────────────────────────────────────────────────────
  private persist(): void {
    const data = this._data();
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this._hasUnsavedChanges.set(true);
    }
  }

  exportJson(): void {
    const data = this._data();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary.json';
    a.click();
    URL.revokeObjectURL(url);
    this._hasUnsavedChanges.set(false);
  }

  importJson(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data: VocabularyData = JSON.parse(e.target!.result as string);
          const normalized = this.normalizeData(data);
          this._data.set(normalized);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          this._hasUnsavedChanges.set(false);
          resolve();
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  }

  resetToInitialData(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._hasUnsavedChanges.set(false);
    this.loadData();
  }

  // ─── CRUD: Words ──────────────────────────────────────────────────────────
  addWord(word: Word): void {
    const data = this._data();
    if (!data) return;
    const sameLemma = data.words.filter(item =>
      item.lemma.toLocaleLowerCase() === word.lemma.toLocaleLowerCase() && !item.isBase,
    );
    const existingBase = data.words.find(item =>
      item.isBase && item.lemma.toLocaleLowerCase() === word.lemma.toLocaleLowerCase(),
    );
    const baseId = word.baseId;
    const base = baseId && !existingBase && sameLemma.length > 0
      ? {
          ...sameLemma[0],
          id: baseId,
          baseId: undefined,
          isBase: true,
          isRelated: false,
          articles: [...new Set(sameLemma.map(item => item.article).filter((article): article is Article => !!article))],
        }
      : existingBase;
    const words = base
      ? data.words.map(item => sameLemma.some(existing => existing.id === item.id)
        ? { ...item, baseId, isRelated: true, isBase: false }
        : item)
      : data.words;
    const relatedBase = existingBase && baseId
      ? {
          ...existingBase,
          articles: [...new Set([
            ...(existingBase.articles ?? (existingBase.article ? [existingBase.article] : [])),
            ...(word.article ? [word.article] : []),
          ])],
        }
      : base;
    const newBase = word.isBase ? word : undefined;
    const updatedWords = relatedBase && existingBase
      ? words.map(item => item.id === existingBase.id ? relatedBase : item)
      : words;
    this._data.set({
      ...data,
      wordBases: (relatedBase ?? newBase) && !this.wordBases().some(item => item.id === (relatedBase ?? newBase)!.id)
        ? [...this.wordBases(), { id: (relatedBase ?? newBase)!.id, lemma: (relatedBase ?? newBase)!.lemma, wordId: (relatedBase ?? newBase)!.id }]
        : this.wordBases(),
      words: [...updatedWords, ...(base && !existingBase ? [base] : []), {
        ...word,
        ...(baseId ? { baseId, isRelated: true, isBase: false } : {}),
        createdAt: new Date().toISOString(),
      }],
    });
    this.persist();
  }

  updateWord(updated: Word): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      words: data.words.map(w => w.id === updated.id ? updated : w),
    });
    this.persist();
  }

  deleteWord(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, words: data.words.filter(w => w.id !== id) });
    this.persist();
  }

  getWordById(id: string): Word | undefined {
    return this.words().find(w => w.id === id);
  }

  generateWordId(): string {
    const words = this.words();
    const max = words.reduce((acc, w) => {
      const n = parseInt(w.id.replace('word_', ''), 10);
      return isNaN(n) ? acc : Math.max(acc, n);
    }, 0);
    return `word_${String(max + 1).padStart(3, '0')}`;
  }

  // ─── CRUD: Domains ────────────────────────────────────────────────────────
  addDomain(domain: Domain): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, domains: [...data.domains, domain] });
    this.persist();
  }

  updateDomain(updated: Domain): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      domains: data.domains.map(d => d.id === updated.id ? updated : d),
    });
    this.persist();
  }

  deleteDomain(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      domains: data.domains.filter(d => d.id !== id),
      words: data.words.map(w => ({
        ...w,
        domains: w.domains.filter(d => d !== id),
      })),
    });
    this.persist();
  }

  // ─── CRUD: Sets ───────────────────────────────────────────────────────────
  addSet(set: VocabSet): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, sets: [...data.sets, set] });
    this.persist();
  }

  updateSet(updated: VocabSet): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      sets: data.sets.map(s => s.id === updated.id ? updated : s),
    });
    this.persist();
  }

  deleteSet(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      sets: data.sets.filter(s => s.id !== id),
      words: data.words.map(w => ({
        ...w,
        sets: w.sets.filter(s => s !== id),
      })),
    });
    this.persist();
  }

  addPronunciationPattern(pattern: PronunciationPattern): void {
    const data = this._data();
    if (!data) return;
    this._data.set({ ...data, pronunciationPatterns: [...data.pronunciationPatterns, pattern] });
    this.persist();
  }

  deletePronunciationPattern(id: string): void {
    const data = this._data();
    if (!data) return;
    this._data.set({
      ...data,
      pronunciationPatterns: data.pronunciationPatterns.filter(pattern => pattern.id !== id),
      words: data.words.map(word => ({
        ...word,
        pronunciation: {
          ...word.pronunciation,
          patterns: word.pronunciation.patterns.filter(pattern => pattern.patternId !== id),
        },
      })),
    });
    this.persist();
  }

  // ─── Domain helpers ───────────────────────────────────────────────────────
  getDescendantDomainIds(domainId: string): string[] {
    const domains = this.domains();
    const result: string[] = [domainId];
    const queue = [domainId];
    while (queue.length) {
      const current = queue.shift()!;
      const children = domains.filter(d => d.parentId === current).map(d => d.id);
      result.push(...children);
      queue.push(...children);
    }
    return result;
  }

  // ─── Filter management ────────────────────────────────────────────────────
  setFilter(partial: Partial<FilterState>): void {
    this._filter.update(f => ({ ...f, ...partial }));
  }

  clearFilter(): void {
    this._filter.set({ ...DEFAULT_FILTER });
  }

  // ─── Filter logic ─────────────────────────────────────────────────────────
  private matchesFilter(word: Word, f: FilterState): boolean {
    // Text search
    if (f.searchText) {
      const q = f.searchText.toLowerCase();
      const inLemma = word.lemma.toLowerCase().includes(q);
      const inTranslation = word.translations.some(t => t.text.toLowerCase().includes(q));
      if (!inLemma && !inTranslation) return false;
    }

    // Domain filter (OR within group)
    if (f.domains.length > 0) {
      const allowedDomains = f.domains.flatMap(d => this.getDescendantDomainIds(d));
      const domainMatch = word.domains.some(d => allowedDomains.includes(d));
      if (!domainMatch) return false;
    }

    // Set filter (OR)
    if (f.sets.length > 0) {
      if (!word.sets.some(s => f.sets.includes(s))) return false;
    }

    // Article filter (OR)
    if (f.articles.length > 0) {
      if (!word.article || !f.articles.includes(word.article)) return false;
    }

    // Word type filter (OR)
    if (f.wordTypes.length > 0 && (!word.wordType || !f.wordTypes.includes(word.wordType))) {
      return false;
    }

    // Level filter (OR)
    if (f.levels.length > 0) {
      if (!f.levels.includes(word.level)) return false;
    }

    // Umlaut
    if (f.umlaut !== null) {
      if (word.plural.umlaut !== f.umlaut) return false;
    }

    // Vowel quantity
    if (f.vowelQuantity !== null) {
      const hasQuantity = word.pronunciation.vowels.some(v => v.quantity === f.vowelQuantity);
      if (!hasQuantity) return false;
    }

    // Pronunciation patterns (OR)
    if (f.patternIds.length > 0) {
      const hasPattern = word.pronunciation.patterns.some(p => f.patternIds.includes(p.patternId));
      if (!hasPattern) return false;
    }

    // Syllable count
    if (f.syllableCount !== null) {
      if (word.pronunciation.syllables.length !== f.syllableCount) return false;
    }

    return true;
  }

  /** Apply a filter preset and return filtered words (used by exercises) */
  getWordsForFilter(f: FilterState): Word[] {
    return this.words().filter(w => this.matchesFilter(w, f));
  }
}
