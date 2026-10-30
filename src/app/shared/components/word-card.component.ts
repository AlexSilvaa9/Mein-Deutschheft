import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Word, Domain, VocabSet, PronunciationPattern } from '../../core/models/vocabulary.models';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-word-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="word-card" [class.compact]="compact">
      <div class="word-card__header">
        <span class="article-badge article-badge--{{ word.article }}">{{ word.article }}</span>
        <h3 class="word-card__lemma">{{ word.lemma }}</h3>
        <span class="level-badge">{{ word.level }}</span>
        <div class="word-card__actions" *ngIf="showActions">
          <a class="icon-btn" [routerLink]="['/vocabulary', word.id]"
            [attr.aria-label]="'Editar ' + word.lemma" title="Editar">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </a>
          <button class="icon-btn icon-btn--danger" (click)="onDelete(); $event.stopPropagation()"
            [attr.aria-label]="'Eliminar ' + word.lemma" title="Eliminar">
            <i class="bi bi-trash3" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="word-card__translation">
        {{ primaryTranslation }}
      </div>

      <div class="word-card__tags" *ngIf="!compact">
        <!-- Plural / Umlaut -->
        <span class="tag tag--morphology" *ngIf="word.plural.form">
          Pl: {{ word.plural.form }}
        </span>
        <span class="tag tag--umlaut" *ngIf="word.plural.umlaut">
          Umlaut
        </span>

        <!-- Vowel quantities -->
        <ng-container *ngFor="let v of uniqueVowelQuantities">
          <span class="tag tag--pronunciation">{{ v | translate }}</span>
        </ng-container>

        <!-- Patterns -->
        <span class="tag tag--pattern" *ngFor="let p of wordPatternLabels">
          {{ p }}
        </span>

        <!-- Syllable count -->
        <span class="tag tag--structure" *ngIf="word.pronunciation.syllables.length > 0">
          {{ 'word_detail.syllable_count' | translate:{ n: word.pronunciation.syllables.length } }}
        </span>
      </div>

      <div class="word-card__domains" *ngIf="!compact && domainLabels.length > 0">
        <span class="tag tag--domain" *ngFor="let d of domainLabels">{{ d }}</span>
      </div>

    </div>
  `,
  styles: [`
    .word-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
      transition: box-shadow 0.15s, transform 0.15s;
      cursor: pointer;
    }
    .word-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
    .word-card__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .word-card__actions { display: flex; gap: 0.25rem; margin-left: auto; }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border: 0; border-radius: 50%;
      background: transparent; color: var(--color-text-muted); cursor: pointer;
      text-decoration: none; transition: background 0.15s, color 0.15s;
    }
    .icon-btn:hover { background: var(--color-primary-light); color: var(--color-primary); }
    .icon-btn--danger:hover { background: var(--color-danger-light); color: var(--color-danger); }
    .word-card__lemma {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--color-text);
      margin: 0;
      flex: 1;
    }
    .word-card__translation {
      color: var(--color-text-muted);
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    .word-card__tags, .word-card__domains {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.4rem;
    }
    .word-card__tags > :nth-child(n + 4) { display: none; }
    .word-card__domains { display: none; }
    .article-badge {
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      color: white;
      flex-shrink: 0;
    }
    .article-badge--der { background: var(--color-der); }
    .article-badge--die { background: var(--color-die); }
    .article-badge--das { background: var(--color-das); }
    .level-badge {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 0.1rem 0.4rem;
    }
    .tag {
      font-size: 0.72rem;
      font-weight: 500;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .tag--morphology { background: var(--color-tag-morphology); color: var(--color-tag-morphology-text); }
    .tag--umlaut { background: var(--color-tag-umlaut); color: var(--color-tag-umlaut-text); }
    .tag--pronunciation { background: var(--color-tag-pronunciation); color: var(--color-tag-pronunciation-text); }
    .tag--pattern { background: var(--color-tag-pattern); color: var(--color-tag-pattern-text); }
    .tag--structure { background: var(--color-tag-structure); color: var(--color-tag-structure-text); }
    .tag--domain { background: var(--color-tag-domain); color: var(--color-tag-domain-text); }
  `],
})
export class WordCardComponent {
  @Input({ required: true }) word!: Word;
  @Input() domains: Domain[] = [];
  @Input() patterns: PronunciationPattern[] = [];
  @Input() compact = false;
  @Input() showActions = false;
  @Output() deleted = new EventEmitter<string>();

  get primaryTranslation(): string {
    return this.word.translations.find(t => t.language === 'es')?.text
      ?? this.word.translations[0]?.text ?? '';
  }

  get domainLabels(): string[] {
    return this.word.domains
      .map(id => this.domains.find(d => d.id === id)?.name)
      .filter((n): n is string => !!n);
  }

  get uniqueVowelQuantities(): string[] {
    const quantities = new Set(this.word.pronunciation.vowels.map(v => v.quantity));
    return Array.from(quantities).map(q =>
      q === 'long' ? 'word_detail.vowel_long' : 'word_detail.vowel_short',
    );
  }

  get wordPatternLabels(): string[] {
    return this.word.pronunciation.patterns
      .map(p => this.patterns.find(pat => pat.id === p.patternId)?.grapheme)
      .filter((g): g is string => !!g)
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  onDelete(): void {
    this.deleted.emit(this.word.id);
  }
}
