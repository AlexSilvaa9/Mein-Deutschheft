import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  VocabularyData, Word, Domain, VocabSet,
  PronunciationPattern, FilterState, DEFAULT_FILTER,
  Article, CefrLevel, VowelQuantity,
} from '../models/vocabulary.models';

const STORAGE_KEY = 'mein-deutschheft-data';
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

  readonly words = computed(() => this._data()?.words ?? []);
  readonly domains = computed(() => this._data()?.domains ?? []);
  readonly sets = computed(() => this._data()?.sets ?? []);
  readonly pronunciationPatterns = computed(() => this._data()?.pronunciationPatterns ?? []);

  // ─── Filtered words ───────────────────────────────────────────────────────
  readonly filteredWords = computed(() => {
    const words = this.words();
    const f = this._filter();
    return words.filter(w => this.matchesFilter(w, f));
  });

  constructor() {
    this.loadData();
  }

  // ─── Data loading ─────────────────────────────────────────────────────────
  loadData(): void {
    this._loading.set(true);
    this._error.set(null);

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: VocabularyData = JSON.parse(stored);
        this._data.set(parsed);
        this._loading.set(false);
        return;
      } catch {
        console.warn('Stored data corrupted, loading initial JSON');
      }
    }

    this.http.get<VocabularyData>(INITIAL_DATA_URL).subscribe({
      next: data => {
        this._data.set(data);
        this._loading.set(false);
      },
      error: err => {
        this._error.set('Failed to load vocabulary data');
        this._loading.set(false);
        console.error(err);
      },
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
          this._data.set(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    this._data.set({ ...data, words: [...data.words, word] });
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
      const allowedDomains = f.includeSubdomains
        ? f.domains.flatMap(d => this.getDescendantDomainIds(d))
        : f.domains;
      const domainMatch = word.domains.some(d => allowedDomains.includes(d));
      if (!domainMatch) return false;
    }

    // Set filter (OR)
    if (f.sets.length > 0) {
      if (!word.sets.some(s => f.sets.includes(s))) return false;
    }

    // Article filter (OR)
    if (f.articles.length > 0) {
      if (!f.articles.includes(word.article)) return false;
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
