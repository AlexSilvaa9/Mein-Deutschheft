import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Word, Article, CefrLevel, Domain, VocabSet, PronunciationPattern } from '../../core/models/vocabulary.models';
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
          <label>{{ 'word_form.article' | translate }} *</label>
          <select formControlName="article" class="form-select">
            <option *ngFor="let a of articles" [value]="a">{{ a }}</option>
          </select>
        </div>

        <!-- Translations -->
        <div class="form-group">
          <label>{{ 'word_form.translation_es' | translate }}</label>
          <input formControlName="translationEs" class="form-input" />
        </div>

        <div class="form-group">
          <label>{{ 'word_form.translation_en' | translate }}</label>
          <input formControlName="translationEn" class="form-input" />
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
          <input formControlName="pluralForm" class="form-input" />
        </div>

        <div class="form-group">
          <label>{{ 'word_form.plural_suffix' | translate }}</label>
          <input formControlName="pluralSuffix" class="form-input" placeholder="-e, -er, -en..." />
        </div>

        <div class="form-group form-group--checkbox">
          <label>
            <input type="checkbox" formControlName="pluralUmlaut" />
            {{ 'word_form.plural_umlaut' | translate }}
          </label>
        </div>

        <!-- Pronunciation -->
        <div class="form-group">
          <label>{{ 'word_form.syllables' | translate }}</label>
          <input formControlName="syllables" class="form-input" placeholder="Ap·fel" />
          <small class="form-hint">Separa con · (punto medio)</small>
        </div>

        <div class="form-group">
          <label>{{ 'word_form.stress' | translate }}</label>
          <input type="number" formControlName="stress" class="form-input" min="1" />
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
  @Output() saved = new EventEmitter<Word>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  form!: FormGroup;

  articles: Article[] = ['der', 'die', 'das'];
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
      article: [this.word?.article ?? 'der', Validators.required],
      translationEs: [this.word?.translations.find(t => t.language === 'es')?.text ?? ''],
      translationEn: [this.word?.translations.find(t => t.language === 'en')?.text ?? ''],
      level: [this.word?.level ?? 'A1'],
      pluralForm: [this.word?.plural.form ?? ''],
      pluralSuffix: [this.word?.plural.suffix ?? ''],
      pluralUmlaut: [this.word?.plural.umlaut ?? false],
      syllables: [this.word?.pronunciation.syllables.join('·') ?? ''],
      stress: [this.word?.pronunciation.stress ?? 1],
      notes: [this.word?.notes ?? ''],
    });
  }

  hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
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

    const syllables = v.syllables
      ? v.syllables.split('·').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const word: Word = {
      id: this.word?.id ?? '',
      lemma: v.lemma,
      article: v.article,
      translations,
      domains: this.selectedDomains,
      sets: this.selectedSets,
      level: v.level,
      plural: {
        form: v.pluralForm,
        suffix: v.pluralSuffix,
        umlaut: v.pluralUmlaut,
        vowelChanges: this.word?.plural.vowelChanges ?? [],
      },
      pronunciation: {
        syllables,
        stress: v.stress,
        vowels: this.word?.pronunciation.vowels ?? [],
        patterns: this.selectedPatterns.map(patternId => ({
          patternId,
          start: 1,
          end: 1,
          syllable: 1,
        })),
      },
      notes: v.notes,
    };

    this.saved.emit(word);
  }

  onCancel(): void { this.cancelled.emit(); }
}
