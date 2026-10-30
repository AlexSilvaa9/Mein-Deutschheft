import { Injectable, signal } from '@angular/core';
import {
  Word, ExerciseSession, ExerciseType, ExerciseAnswer,
  Article, FilterState,
} from '../models/vocabulary.models';
import { VocabularyService } from './vocabulary.service';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private _session = signal<ExerciseSession | null>(null);
  readonly session = this._session.asReadonly();

  constructor(private vocab: VocabularyService) {}

  startSession(type: ExerciseType, filter: FilterState): boolean {
    const words = this.vocab.getWordsForFilter(filter);
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
        return word.translations.find(t => t.language === 'es')?.text ?? word.translations[0]?.text ?? '';
      case 'article':
        return word.article;
      case 'plural':
        return word.plural.form;
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
      return word.pronunciation.vowels.some(vowel => vowel.quantity === 'long') ? 'Sí' : 'No';
    }
    if (questionType === 1) {
      return word.plural.umlaut ? 'Sí' : 'No';
    }
    return word.pronunciation.vowels.some(vowel => vowel.quantity === 'short') ? 'Sí' : 'No';
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
