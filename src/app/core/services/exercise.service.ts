import { Injectable, signal } from '@angular/core';
import {
  Word, ExerciseSession, ExerciseType, ExerciseAnswer,
  Article, FilterState,
} from '../models/vocabulary.models';
import { VocabularyService } from './vocabulary.service';
import { TranslatorService } from './translator.service';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private _session = signal<ExerciseSession | null>(null);
  readonly session = this._session.asReadonly();

  constructor(private vocab: VocabularyService, private translator: TranslatorService) {}

  getEligibleWords(type: ExerciseType, filter: FilterState): Word[] {
    return this.vocab.getWordsForFilter(filter).filter(word => {
      switch (type) {
        case 'article':
        case 'indefinite-article':
          return word.article !== null;
        case 'plural':
          return word.wordType === 'noun' && !!word.plural.form;
        case 'pronunciation':
          return word.pronunciation.vowels.length > 0;
        case 'translation':
          return word.translations.length > 0;
      }
    });
  }

  startSession(type: ExerciseType, filter: FilterState): boolean {
    const words = this.getEligibleWords(type, filter);
    if (words.length < 2) return false;

    const shuffled = this.shuffle([...words]);
    this._session.set({
      type,
      words: shuffled,
      currentIndex: 0,
      correct: 0,
      incorrect: 0,
      answers: [],
    });
    return true;
  }

  getCurrentWord(): Word | null {
    const s = this._session();
    if (!s) return null;
    return s.words[s.currentIndex] ?? null;
  }

  isPluralQuestion(): boolean {
    const session = this._session();
    if (session?.type === 'indefinite-article') {
      return session.currentIndex % 4 >= 2;
    }
    return (session?.currentIndex ?? 0) % 2 === 1;
  }

  isNegativeArticleQuestion(): boolean {
    const session = this._session();
    return session?.type === 'indefinite-article'
      ? session.currentIndex % 2 === 1
      : false;
  }

  getDisplayLemma(word: Word): string {
    return this.isPluralQuestion() ? word.plural.form : word.lemma;
  }

  getDisplayArticle(word: Word): Article {
    return this.isPluralQuestion() ? 'die' : word.article ?? 'der';
  }

  submitAnswer(userAnswer: string): ExerciseAnswer | null {
    const s = this._session();
    if (!s) return null;
    const word = s.words[s.currentIndex];
    if (!word) return null;

    const expected = this.getExpectedAnswer(s.type, word);
    const correct = this.checkAnswer(s.type, userAnswer, expected, word);

    const answer: ExerciseAnswer = {
      wordId: word.id,
      correct,
      userAnswer,
      expectedAnswer: expected,
    };

    this._session.update(prev => prev ? ({
      ...prev,
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
      answers: [...prev.answers, answer],
    }) : null);

    return answer;
  }

  nextQuestion(): boolean {
    const s = this._session();
    if (!s) return false;
    if (s.currentIndex >= s.words.length - 1) return false;
    this._session.update(prev => prev ? ({ ...prev, currentIndex: prev.currentIndex + 1 }) : null);
    return true;
  }

  isFinished(): boolean {
    const s = this._session();
    if (!s) return true;
    return s.currentIndex >= s.words.length - 1 && s.answers.length > s.currentIndex;
  }

  resetSession(): void {
    this._session.set(null);
  }

  getArticleOptions(): Article[] {
    return ['der', 'die', 'das'];
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private getExpectedAnswer(type: ExerciseType, word: Word): string {
    switch (type) {
      case 'translation':
        return word.translations.find(t => t.language === this.translator.language())?.text
          ?? word.translations[0]?.text ?? '';
      case 'article':
        return this.getDisplayArticle(word);
      case 'indefinite-article':
        return this.getIndefiniteArticle(word);
      case 'plural':
        return this.isPluralQuestion() ? word.lemma : word.plural.form;
      case 'pronunciation':
        return this.getPronunciationAnswer(word);
      default:
        return '';
    }
  }

  private checkAnswer(type: ExerciseType, user: string, expected: string, word: Word): boolean {
    switch (type) {
      case 'translation': {
        // Accept any translation that includes the user's text (case-insensitive)
        return word.translations.some(t =>
          t.text.toLowerCase().includes(user.toLowerCase().trim()) ||
          user.toLowerCase().trim().includes(t.text.toLowerCase()),
        );
      }
      case 'article':
        return user.trim().toLowerCase() === expected.trim().toLowerCase();
      case 'indefinite-article':
        return user.trim().toLowerCase() === expected.trim().toLowerCase();
      case 'plural':
        return user.trim().toLowerCase() === expected.trim().toLowerCase();
      case 'pronunciation':
        return user.trim().toLowerCase() === expected.trim().toLowerCase();
      default:
        return false;
    }
  }

  private getPronunciationAnswer(word: Word): string {
    const session = this._session();
    const questionType = (session?.currentIndex ?? 0) % 3;
    if (questionType === 0) {
      return word.pronunciation.vowels.some(vowel => vowel.quantity === 'long') ? 'long' : 'short';
    }

    if (questionType === 1) {
      return word.plural.umlaut ? 'umlaut' : 'no_umlaut';
    }
    return word.pronunciation.vowels.some(vowel => vowel.quantity === 'short') ? 'short' : 'no_short';
  }

  private getIndefiniteArticle(word: Word): string {
    const negative = this.isNegativeArticleQuestion();
    if (negative && this.isPluralQuestion()) return 'keine';
    if (this.isPluralQuestion()) return '—';
    if (word.article === 'die') return negative ? 'keine' : 'eine';
    return negative ? 'kein' : 'ein';
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
