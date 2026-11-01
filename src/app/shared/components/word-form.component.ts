import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Word, WordBase, Article, CefrLevel, Domain, VocabSet, PronunciationPattern, WordType } from '../../core/models/vocabulary.models';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-word-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="word-form">
      <div class="form-grid">
        <!-- Lemma + Article -->
        <div class="form-group">
          <label>{{ 'word_form.lemma' | translate }} *</label>
          <input formControlName="lemma" class="form-input" [placeholder]="'word_form.lemma' | translate" />
          <span class="form-error" *ngIf="hasError('lemma')">{{ 'word_form.required' | translate }}</span>
        </div>

        <div class="form-group">
          <label>{{ 'word_form.article' | translate }}</label>
          <select formControlName="article" class="form-select" [disabled]="selectedWordType() !== 'noun'">
            <option [ngValue]="null">—</option>
            <option *ngFor="let a of articles" [value]="a">{{ a }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>{{ 'word_form.word_type' | translate }}</label>
          <select formControlName="wordType" class="form-select" (change)="onWordTypeChange()">
            <option *ngFor="let type of wordTypes" [value]="type">{{ ('word_types.' + type) | translate }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Tipo de entrada</label>
          <select formControlName="entryType" class="form-select">
            <option value="normal">Palabra normal</option>
            <option value="base">Base con significados relacionados</option>
            <option value="related">Significado relacionado</option>
          </select>
        </div>

        <div class="form-group" *ngIf="form.get('entryType')?.value === 'related'">
          <label>Palabra base</label>
          <select formControlName="relatedBaseId" class="form-select">
            <option value="">Selecciona una base</option>
            <option *ngFor="let base of wordBases" [value]="base.id">{{ base.lemma }}</option>
          </select>
        </div>

        <!-- Translations -->
        <div class="form-group">
          <label>{{ 'word_form.translation_es' | translate }}</label>
          <input formControlName="translationEs" class="form-input" required />
        </div>

        <div class="form-group">
          <label>{{ 'word_form.translation_en' | translate }}</label>
          <input formControlName="translationEn" class="form-input" required />
        </div>

        <div class="form-group">
          <label>{{ 'word_form.translation_de' | translate }}</label>
          <input formControlName="translationDe" class="form-input" />
        </div>

        <!-- Level -->
        <div class="form-group">
          <label>{{ 'word_form.level' | translate }}</label>
          <select formControlName="level" class="form-select">
            <option *ngFor="let l of levels" [value]="l">{{ l }}</option>
          </select>
        </div>

        <!-- Plural -->
        <div class="form-group">
          <label>{{ 'word_form.plural_form' | translate }}</label>
          <input formControlName="pluralForm" class="form-input" [disabled]="selectedWordType() !== 'noun'" />
        </div>

        <div class="form-group">
          <label>{{ 'word_form.plural_suffix' | translate }}</label>
          <input formControlName="pluralSuffix" class="form-input" [disabled]="selectedWordType() !== 'noun'" [placeholder]="'word_form.plural_suffix_placeholder' | translate" />
        </div>

        <div class="form-group form-group--checkbox">
          <label>
            <input type="checkbox" formControlName="pluralUmlaut" [disabled]="selectedWordType() !== 'noun'" />
            {{ 'word_form.plural_umlaut' | translate }}
          </label>
        </div>

        <!-- Pronunciation -->
        <div class="form-group">
          <label>{{ 'word_form.syllables' | translate }}</label>
          <input formControlName="syllables" class="form-input" [placeholder]="'word_form.syllables_placeholder' | translate" />
          <small class="form-hint">{{ 'word_form.syllables_hint' | translate }}</small>
        </div>

        <div class="form-group">
          <label>{{ 'word_form.primary_stress' | translate }}</label>
          <input type="number" formControlName="primaryStress" class="form-input" min="1" />
        </div>

        <div class="form-group">
          <label>{{ 'word_form.secondary_stress' | translate }}</label>
          <input formControlName="secondaryStress" class="form-input" [placeholder]="'word_form.secondary_stress_placeholder' | translate" />
        </div>

        <div class="form-group form-group--full">
          <label>{{ 'word_form.vowels_quantity' | translate }}</label>
          <input formControlName="vowels" class="form-input" [placeholder]="'word_form.vowels_placeholder' | translate" />
          <small class="form-hint">{{ 'word_form.vowels_hint' | translate }}</small>
        </div>

        <!-- Domains -->
        <div class="form-group form-group--full">
          <label>{{ 'word_form.domains' | translate }}</label>
          <div class="checkbox-group">
            <label *ngFor="let d of domains" class="checkbox-item">
              <input type="checkbox" [checked]="isDomainSelected(d.id)"
                (change)="toggleDomain(d.id, $event)" />
              {{ d.name }}
            </label>
          </div>
        </div>

        <!-- Sets -->
        <div class="form-group form-group--full">
          <label>{{ 'word_form.sets' | translate }}</label>
          <div class="checkbox-group">
            <label *ngFor="let s of sets" class="checkbox-item">
              <input type="checkbox" [checked]="isSetSelected(s.id)"
                (change)="toggleSet(s.id, $event)" />
              {{ s.name }}
            </label>
          </div>
        </div>

        <!-- Patterns -->
        <div class="form-group form-group--full">
          <label>{{ 'word_form.patterns' | translate }}</label>
          <div class="checkbox-group">
            <label *ngFor="let p of pronunciationPatterns" class="checkbox-item">
              <input type="checkbox" [checked]="isPatternSelected(p.id)"
                (change)="togglePattern(p.id, $event)" />
              <strong>{{ p.grapheme }}</strong> {{ p.sound }}
            </label>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group form-group--full">
          <label>{{ 'word_form.notes' | translate }}</label>
          <textarea formControlName="notes" class="form-textarea" rows="3"></textarea>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn--ghost" (click)="onCancel()">
          {{ 'word_form.cancel' | translate }}
        </button>
        <button type="submit" class="btn btn--primary" [disabled]="form.invalid">
          {{ 'word_form.save' | translate }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .word-form { padding: 1rem; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-group--full { grid-column: 1 / -1; }
    .form-group--checkbox { flex-direction: row; align-items: center; gap: 0.5rem; }
    label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted); }
    .form-input, .form-select, .form-textarea {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.9rem;
      transition: border-color 0.15s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--color-primary);
    }
    .form-error { color: var(--color-danger); font-size: 0.78rem; }
    .form-hint { color: var(--color-text-muted); font-size: 0.75rem; }
    .form-textarea { resize: vertical; }
    .checkbox-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .checkbox-item {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.3rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 0.85rem;
      color: var(--color-text);
    }
    .checkbox-item:hover { border-color: var(--color-primary); }
    .form-actions {
      display: flex; justify-content: flex-end; gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border);
    }
    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WordFormComponent implements OnInit {
  @Input() word?: Word;
  @Input() domains: Domain[] = [];
  @Input() sets: VocabSet[] = [];
  @Input() pronunciationPatterns: PronunciationPattern[] = [];
  @Input() wordBases: WordBase[] = [];
  @Output() saved = new EventEmitter<Word>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  form!: FormGroup;

  articles: Article[] = ['der', 'die', 'das'];
  wordTypes: WordType[] = ['noun', 'verb', 'adjective', 'phrase', 'number'];
  levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  private selectedDomains: string[] = [];
  private selectedSets: string[] = [];
  private selectedPatterns: string[] = [];

  ngOnInit(): void {
    this.selectedDomains = [...(this.word?.domains ?? [])];
    this.selectedSets = [...(this.word?.sets ?? [])];
    this.selectedPatterns = this.word?.pronunciation.patterns.map(p => p.patternId) ?? [];

    this.form = this.fb.group({
      lemma: [this.word?.lemma ?? '', Validators.required],
      article: [this.word?.article ?? null],
      wordType: [this.word?.wordType ?? 'noun', Validators.required],
      entryType: [this.word?.isBase ? 'base' : this.word?.isRelated ? 'related' : 'normal'],
      relatedBaseId: [this.word?.baseId ?? ''],
      translationEs: [this.word?.translations.find(t => t.language === 'es')?.text ?? '', Validators.required],
      translationEn: [this.word?.translations.find(t => t.language === 'en')?.text ?? '', Validators.required],
      translationDe: [this.word?.translations.find(t => t.language === 'de')?.text ?? ''],
      level: [this.word?.level ?? 'A1'],
      pluralForm: [this.word?.plural.form ?? ''],
      pluralSuffix: [this.word?.plural.suffix ?? ''],
      pluralUmlaut: [this.word?.plural.umlaut ?? false],
      syllables: [this.word?.pronunciation.syllables.join('·') ?? ''],
      primaryStress: [this.word?.pronunciation.stress.primary ?? 1],
      secondaryStress: [this.word?.pronunciation.stress.secondary.join(', ') ?? ''],
      vowels: [this.word?.pronunciation.vowels.map(vowel =>
        `${vowel.grapheme}:${vowel.quantity === 'long' ? 'larga' : 'corta'}`,
      ).join(', ') ?? ''],
      notes: [this.word?.notes ?? ''],
    });
  }

  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  selectedWordType(): WordType {
    return this.form.get('wordType')?.value ?? 'noun';
  }

  onWordTypeChange(): void {
    if (this.selectedWordType() !== 'noun') {
      this.form.patchValue({
        article: null,
        pluralForm: '',
        pluralSuffix: '',
        pluralUmlaut: false,
      });
    }
  }

  isDomainSelected(id: string): boolean { return this.selectedDomains.includes(id); }
  isSetSelected(id: string): boolean { return this.selectedSets.includes(id); }
  isPatternSelected(id: string): boolean { return this.selectedPatterns.includes(id); }

  toggleDomain(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedDomains = checked
      ? [...this.selectedDomains, id]
      : this.selectedDomains.filter(d => d !== id);
  }

  toggleSet(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedSets = checked
      ? [...this.selectedSets, id]
      : this.selectedSets.filter(s => s !== id);
  }

  togglePattern(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedPatterns = checked
      ? [...this.selectedPatterns, id]
      : this.selectedPatterns.filter(p => p !== id);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;

    const translations = [];
    if (v.translationEs) translations.push({ text: v.translationEs, language: 'es' as const });
    if (v.translationEn) translations.push({ text: v.translationEn, language: 'en' as const });
    if (v.translationDe) translations.push({ text: v.translationDe, language: 'de' as const });
    const isNoun = v.wordType === 'noun';

    const syllables = v.syllables
      ? v.syllables.split('·').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const vowels = this.parseVowels(v.vowels, syllables, v.lemma);

    const entryType = v.entryType as 'normal' | 'base' | 'related';
    if (entryType === 'related' && !v.relatedBaseId) {
      this.form.get('relatedBaseId')?.markAsTouched();
      return;
    }
    const word: Word = {
      id: this.word?.id ?? '',
      ...(entryType === 'related' && v.relatedBaseId ? { baseId: v.relatedBaseId, isRelated: true, isBase: false } : {}),
      ...(entryType === 'base' ? { isBase: true, isRelated: false } : {}),
      createdAt: this.word?.createdAt ?? '',
      lemma: v.lemma,
      article: isNoun ? v.article ?? null : null,
      translations,
      domains: this.selectedDomains,
      sets: this.selectedSets,
      level: v.level,
      plural: {
        form: isNoun ? v.pluralForm : '',
        suffix: isNoun ? v.pluralSuffix : '',
        umlaut: isNoun ? v.pluralUmlaut : false,
        vowelChanges: isNoun ? this.word?.plural.vowelChanges ?? [] : [],
      },
      pronunciation: {
        syllables,
        stress: {
          primary: Number(v.primaryStress) || 1,
          secondary: this.parseSecondaryStress(v.secondaryStress),
        },
        vowels,
        patterns: this.buildPatternOccurrences(syllables),
      },
      notes: v.notes,
      wordType: v.wordType,
      compoundParts: this.word?.compoundParts,
    };

    this.saved.emit(word);
  }

  onCancel(): void { this.cancelled.emit(); }

  private parseVowels(value: string, syllables: string[], lemma: string): Word['pronunciation']['vowels'] {
    if (!value?.trim()) return [];
    let searchFrom = 0;
    return value.split(',').map((item: string) => item.trim()).filter(Boolean).flatMap((item: string) => {
      const [graphemeValue, quantityValue] = item.split(':').map(part => part.trim());
      const grapheme = graphemeValue?.toLowerCase() ?? '';
      const normalizedQuantity = quantityValue?.toLowerCase();
      if (!grapheme || !['corta', 'larga', 'short', 'long'].includes(normalizedQuantity)) return [];
      const syllable = Math.max(1, syllables.findIndex(part => part.toLowerCase().includes(grapheme)) + 1);
      const start = lemma.toLowerCase().indexOf(grapheme, searchFrom);
      if (start < 0) return [];
      searchFrom = start + grapheme.length;
      return [{
        grapheme,
        start: start + 1,
        end: start + grapheme.length,
        syllable,
        quantity: normalizedQuantity === 'larga' || normalizedQuantity === 'long' ? 'long' as const : 'short' as const,
      }];
    });
  }

  private parseSecondaryStress(value: string): number[] {
    return [...new Set(
      String(value ?? '')
        .split(/[,\s]+/)
        .map((item: string) => Number(item))
        .filter((stress: number) => Number.isInteger(stress) && stress > 0),
    )];
  }

  private buildPatternOccurrences(syllables: string[]): Word['pronunciation']['patterns'] {
    const unique = [...new Set(this.selectedPatterns)];
    return unique.flatMap(patternId => {
      const grapheme = this.pronunciationPatterns.find(pattern => pattern.id === patternId)?.grapheme ?? patternId;
      const start = this.word?.lemma.toLowerCase().indexOf(grapheme.toLowerCase()) ?? -1;
      const currentLemma = this.form.get('lemma')?.value?.toLowerCase() ?? '';
      const currentStart = currentLemma.indexOf(grapheme.toLowerCase());
      const position = currentStart >= 0 ? currentStart : start;
      if (position < 0) return [];
      return [{
        patternId,
        start: position + 1,
        end: position + grapheme.length,
        syllable: Math.max(1, syllables.findIndex(part => part.toLowerCase().includes(grapheme.toLowerCase())) + 1),
      }];
    });
  }
}
