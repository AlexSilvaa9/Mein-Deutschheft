import { Injectable, signal } from '@angular/core';
import { Word } from '../models/vocabulary.models';

export type HighlightRuleId = 'long-vowel' | 'short-vowel' | 'pattern' | 'primary-stress';

export interface HighlightRule {
  id: HighlightRuleId;
  patternId?: string;
  color: string;
}

export interface HighlightedLetter {
  character: string;
  color: string | null;
}

const STORAGE_KEY = 'mein-deutschheft-highlights';

@Injectable({ providedIn: 'root' })
export class HighlightService {
  readonly rules = signal<HighlightRule[]>(this.loadRules());

  toggle(rule: HighlightRule): void {
    this.rules.update(rules => {
      const exists = rules.some(current => this.sameRule(current, rule));
      return exists ? rules.filter(current => !this.sameRule(current, rule)) : [...rules, rule];
    });
    this.persist();
  }

  updateColor(rule: HighlightRule, color: string): void {
    this.rules.update(rules => rules.map(current =>
      this.sameRule(current, rule) ? { ...current, color } : current,
    ));
    this.persist();
  }

  isActive(rule: HighlightRule): boolean {
    return this.rules().some(current => this.sameRule(current, rule));
  }

  colorFor(word: Word, ruleId: HighlightRuleId, patternId?: string): string | null {
    const rule = this.rules().find(current =>
      current.id === ruleId && (ruleId !== 'pattern' || current.patternId === patternId),
    );
    if (!rule || !this.matches(word, rule)) return null;
    return rule.color;
  }

  lettersFor(word: Word): HighlightedLetter[] {
    const letters = Array.from(word.lemma).map(character => ({ character, colors: [] as string[] }));
    const activeRules = this.rules();

    for (const rule of activeRules) {
      const ranges = rule.id === 'primary-stress'
        ? this.stressRanges(word)
        : rule.id === 'pattern'
        ? word.pronunciation.patterns
          .filter(pattern => pattern.patternId === rule.patternId)
          .map(pattern => ({ start: pattern.start - 1, end: pattern.end - 1 }))
        : word.pronunciation.vowels
          .filter(vowel => vowel.quantity === (rule.id === 'long-vowel' ? 'long' : 'short'))
          .map(vowel => ({ start: vowel.start - 1, end: vowel.end - 1 }));

      for (const range of ranges) {
        for (let index = Math.max(0, range.start); index <= Math.min(letters.length - 1, range.end); index++) {
          if (!letters[index].colors.includes(rule.color)) letters[index].colors.push(rule.color);
        }
      }
    }

    return letters.map(({ character, colors }) => ({
      character,
      color: colors.length === 0 ? null : colors.reduce((combined, color) =>
        combined ? `color-mix(in srgb, ${combined} 50%, ${color} 50%)` : color,
      ''),
    }));
  }

  matches(word: Word, rule: HighlightRule): boolean {
    if (rule.id === 'long-vowel') return word.pronunciation.vowels.some(vowel => vowel.quantity === 'long');
    if (rule.id === 'short-vowel') return word.pronunciation.vowels.some(vowel => vowel.quantity === 'short');
    if (rule.id === 'primary-stress') return word.pronunciation.stress.primary > 0;
    return word.pronunciation.patterns.some(pattern => pattern.patternId === rule.patternId);
  }

  private stressRanges(word: Word): { start: number; end: number }[] {
    const syllable = word.pronunciation.stress.primary;
    if (syllable < 1 || syllable > word.pronunciation.syllables.length) return [];
    const target = word.pronunciation.syllables[syllable - 1];
    const lemma = Array.from(word.lemma);
    const normalizedTarget = Array.from(target.toLocaleLowerCase());
    let cursor = 0;

    for (const part of word.pronunciation.syllables.slice(0, syllable - 1)) {
      const normalizedPart = Array.from(part.toLocaleLowerCase());
      const start = this.findSyllableStart(lemma, normalizedPart, cursor);
      if (start < 0) return [];
      cursor = start + normalizedPart.length;
    }

    const start = this.findSyllableStart(lemma, normalizedTarget, cursor);
    return start < 0 ? [] : [{ start, end: start + normalizedTarget.length - 1 }];
  }

  private findSyllableStart(lemma: string[], syllable: string[], from: number): number {
    for (let index = from; index <= lemma.length - syllable.length; index++) {
      if (lemma.slice(index, index + syllable.length).join('').toLocaleLowerCase() === syllable.join('')) {
        return index;
      }
    }
    return -1;
  }

  private sameRule(left: HighlightRule, right: HighlightRule): boolean {
    return left.id === right.id && left.patternId === right.patternId;
  }

  private loadRules(): HighlightRule[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as HighlightRule[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rules()));
  }
}
