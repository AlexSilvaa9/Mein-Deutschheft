import { Injectable, signal } from '@angular/core';
import { Word } from '../models/vocabulary.models';

export type HighlightRuleId = 'long-vowel' | 'short-vowel' | 'pattern';

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
    const letters = Array.from(word.lemma).map(character => ({ character, color: null as string | null, priority: 0 }));
    const activeRules = this.rules();

    for (const rule of activeRules) {
      const priority = rule.id === 'pattern' ? 3 : 2;
      const ranges = rule.id === 'pattern'
        ? word.pronunciation.patterns
          .filter(pattern => pattern.patternId === rule.patternId)
          .map(pattern => ({ start: pattern.start - 1, end: pattern.end - 1 }))
        : this.vowelRanges(word, rule);

      for (const range of ranges) {
        for (let index = Math.max(0, range.start); index <= Math.min(letters.length - 1, range.end); index++) {
          if (priority >= letters[index].priority) {
            letters[index].color = rule.color;
            letters[index].priority = priority;
          }
        }
      }
    }

    return letters.map(({ character, color }) => ({ character, color }));
  }

  matches(word: Word, rule: HighlightRule): boolean {
    if (rule.id === 'long-vowel') return word.pronunciation.vowels.some(vowel => vowel.quantity === 'long');
    if (rule.id === 'short-vowel') return word.pronunciation.vowels.some(vowel => vowel.quantity === 'short');
    return word.pronunciation.patterns.some(pattern => pattern.patternId === rule.patternId);
  }

  private vowelRanges(word: Word, rule: HighlightRule): Array<{ start: number; end: number }> {
    const quantity = rule.id === 'long-vowel' ? 'long' : 'short';
    const ranges: Array<{ start: number; end: number }> = [];
    const usedIndexes = new Set<number>();
    for (const vowel of word.pronunciation.vowels.filter(item => item.quantity === quantity)) {
      const grapheme = Array.from(vowel.grapheme.toLowerCase());
      const lemma = Array.from(word.lemma.toLowerCase());
      const start = lemma.findIndex((_, index) =>
        !usedIndexes.has(index) && grapheme.every((character, offset) => lemma[index + offset] === character),
      );
      if (start >= 0) {
        for (let index = start; index < start + grapheme.length; index++) usedIndexes.add(index);
        ranges.push({ start, end: start + grapheme.length - 1 });
      }
    }
    return ranges;
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
