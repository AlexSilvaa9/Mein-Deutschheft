import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { WordFormComponent } from '../../shared/components/word-form.component';
import { Word } from '../../core/models/vocabulary.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-word-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe, WordFormComponent],
  template: `
    <div class="page word-detail-page" *ngIf="word(); else notFound">
      <div class="page__header">
        <button class="btn btn--ghost" (click)="goBack()"><i class="bi bi-arrow-left" aria-hidden="true"></i> {{ 'common.back' | translate }}</button>
        <div class="detail-actions">
          <button class="icon-btn" (click)="editing = !editing"
            [attr.aria-label]="editing ? ('common.close' | translate) : ('vocabulary.edit_word' | translate)"
            [title]="editing ? ('common.close' | translate) : ('vocabulary.edit_word' | translate)">
            <i class="bi" [class.bi-x-lg]="editing" [class.bi-pencil]="!editing" aria-hidden="true"></i>
          </button>
          <button class="icon-btn icon-btn--danger" (click)="onDelete()"
            [attr.aria-label]="'vocabulary.delete_word' | translate" [title]="'vocabulary.delete_word' | translate">
            <i class="bi bi-trash3" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Edit mode -->
      <div *ngIf="editing" class="edit-panel">
        <app-word-form
          [word]="word()!"
          [domains]="domains()"
          [sets]="sets()"
          [pronunciationPatterns]="patterns()"
          (saved)="onSaved($event)"
          (cancelled)="editing = false"
        />
      </div>

      <!-- View mode -->
      <div *ngIf="!editing" class="detail-content">
        <!-- Header -->
        <div class="detail-header">
          <span class="article-badge-lg article-badge-lg--{{ word()!.article }}">{{ word()!.article }}</span>
          <h1 class="detail-lemma">{{ word()!.lemma }}</h1>
          <span class="level-badge">{{ word()!.level }}</span>
        </div>

        <!-- Translations -->
        <div class="detail-translations">
          <span *ngFor="let t of word()!.translations" class="translation-item">
            <span class="lang-flag">{{ t.language.toUpperCase() }}</span>
            {{ t.text }}
          </span>
        </div>

        <div class="detail-grid">
          <!-- Morphology -->
          <div class="detail-card">
            <h2 class="detail-card__title">{{ 'word_detail.morphology' | translate }}</h2>
            <dl class="detail-dl">
              <dt>{{ 'vocabulary.plural' | translate }}</dt>
              <dd>
                <span *ngIf="word()!.plural.form; else noPlural" class="tag tag--morphology">
                  {{ word()!.plural.form }}
                  <span *ngIf="word()!.plural.suffix"> (-{{ word()!.plural.suffix }})</span>
                </span>
                <ng-template #noPlural><span class="muted">{{ 'vocabulary.no_plural' | translate }}</span></ng-template>
              </dd>

              <dt>{{ 'word_detail.umlaut' | translate }}</dt>
              <dd>
                <span class="tag" [class.tag--umlaut]="word()!.plural.umlaut" [class.tag--neutral]="!word()!.plural.umlaut">
                  {{ word()!.plural.umlaut ? ('word_detail.yes' | translate) : ('word_detail.no' | translate) }}
                </span>
              </dd>
            </dl>
          </div>

          <!-- Pronunciation -->
          <div class="detail-card">
            <h2 class="detail-card__title">{{ 'word_detail.pronunciation' | translate }}</h2>
            <dl class="detail-dl">
              <dt>{{ 'word_detail.syllables' | translate }}</dt>
              <dd class="syllables-display">
                <span *ngFor="let s of word()!.pronunciation.syllables; let i = index">
                  <span class="syllable" [class.syllable--stressed]="i + 1 === word()!.pronunciation.stress">{{ s }}</span>
                  <span class="syllable-sep" *ngIf="i < word()!.pronunciation.syllables.length - 1"> · </span>
                </span>
              </dd>

              <dt>{{ 'word_detail.stress' | translate }}</dt>
              <dd>{{ 'word_detail.syllable_stress' | translate:{ n: word()!.pronunciation.stress } }}</dd>

              <dt>{{ 'word_detail.syllable_count' | translate:{ n: word()!.pronunciation.syllables.length } }}</dt>
              <dd></dd>

              <!-- Vowels -->
              <ng-container *ngIf="word()!.pronunciation.vowels.length > 0">
                <dt>Vocales</dt>
                <dd>
                  <span *ngFor="let v of word()!.pronunciation.vowels" class="tag" [class.tag--pronunciation]="v.quantity === 'long'" [class.tag--structure]="v.quantity === 'short'">
                    {{ v.grapheme }} ({{ v.quantity === 'long' ? ('word_detail.vowel_long' | translate) : ('word_detail.vowel_short' | translate) }})
                  </span>
                </dd>
              </ng-container>

              <!-- Patterns -->
              <ng-container *ngIf="word()!.pronunciation.patterns.length > 0">
                <dt>{{ 'word_form.patterns' | translate }}</dt>
                <dd>
                  <span *ngFor="let p of word()!.pronunciation.patterns" class="tag tag--pattern">
                    {{ getPatternLabel(p.patternId) }}
                  </span>
                </dd>
              </ng-container>
            </dl>
          </div>

          <!-- Domains & Sets -->
          <div class="detail-card">
            <h2 class="detail-card__title">{{ 'vocabulary.domains' | translate }}</h2>
            <div class="tag-cloud">
              <span *ngFor="let d of word()!.domains" class="tag tag--domain">{{ getDomainName(d) }}</span>
              <span class="muted" *ngIf="word()!.domains.length === 0">—</span>
            </div>

            <h2 class="detail-card__title" style="margin-top:1rem">{{ 'vocabulary.sets' | translate }}</h2>
            <div class="tag-cloud">
              <span *ngFor="let s of word()!.sets" class="tag tag--domain">{{ getSetName(s) }}</span>
              <span class="muted" *ngIf="word()!.sets.length === 0">—</span>
            </div>
          </div>

          <!-- Notes -->
          <div class="detail-card" *ngIf="word()!.notes">
            <h2 class="detail-card__title">{{ 'vocabulary.notes' | translate }}</h2>
            <p class="notes-text">{{ word()!.notes }}</p>
          </div>
        </div>
      </div>
    </div>

    <ng-template #notFound>
      <div class="page">
        <p class="muted">Palabra no encontrada.</p>
        <button class="btn btn--ghost" (click)="goBack()">← {{ 'common.back' | translate }}</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .word-detail-page { max-width: 900px; margin: 0 auto; }
    .detail-actions { display: flex; gap: 0.5rem; }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.25rem; height: 2.25rem; border: 0; border-radius: 50%;
      background: transparent; color: var(--color-text-muted); cursor: pointer;
    }
    .icon-btn:hover { background: var(--color-primary-light); color: var(--color-primary); }
    .icon-btn--danger:hover { background: var(--color-danger-light); color: var(--color-danger); }
    .detail-header {
      display: flex; align-items: center; gap: 1rem;
      margin-bottom: 1rem;
    }
    .detail-lemma { font-size: 2.5rem; font-weight: 800; margin: 0; }
    .article-badge-lg {
      font-size: 1.1rem; font-weight: 700;
      padding: 0.25rem 0.75rem; border-radius: var(--radius-md);
      color: white;
    }
    .article-badge-lg--der { background: var(--color-der); }
    .article-badge-lg--die { background: var(--color-die); }
    .article-badge-lg--das { background: var(--color-das); }
    .level-badge {
      font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted);
      border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 0.15rem 0.5rem;
    }
    .detail-translations {
      display: flex; gap: 1rem; flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }
    .translation-item { display: flex; align-items: center; gap: 0.4rem; font-size: 1.1rem; }
    .lang-flag { font-size: 1.2rem; }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .detail-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 1.25rem 1.5rem;
    }
    .detail-card__title {
      font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--color-text-muted);
      margin: 0 0 0.75rem;
    }
    .detail-dl { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 0.75rem; align-items: baseline; margin: 0; }
    dt { font-size: 0.825rem; color: var(--color-text-muted); }
    dd { margin: 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .syllables-display { font-size: 1.1rem; }
    .syllable { font-weight: 600; }
    .syllable--stressed { color: var(--color-primary); text-decoration: underline; }
    .syllable-sep { color: var(--color-text-muted); }
    .tag {
      font-size: 0.75rem; font-weight: 500;
      padding: 0.15rem 0.5rem; border-radius: var(--radius-sm);
    }
    .tag--morphology { background: var(--color-tag-morphology); color: var(--color-tag-morphology-text); }
    .tag--umlaut { background: var(--color-tag-umlaut); color: var(--color-tag-umlaut-text); }
    .tag--pronunciation { background: var(--color-tag-pronunciation); color: var(--color-tag-pronunciation-text); }
    .tag--pattern { background: var(--color-tag-pattern); color: var(--color-tag-pattern-text); }
    .tag--structure { background: var(--color-tag-structure); color: var(--color-tag-structure-text); }
    .tag--domain { background: var(--color-tag-domain); color: var(--color-tag-domain-text); }
    .tag--neutral { background: var(--color-border); color: var(--color-text-muted); }
    .tag-cloud { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .notes-text { color: var(--color-text); font-size: 0.9rem; line-height: 1.6; }
    .muted { color: var(--color-text-muted); font-size: 0.875rem; }
    .edit-panel {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-xl); margin-top: 1rem;
    }
  `],
})
export class WordDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vocab = inject(VocabularyService);
  private toast = inject(ToastService);

  editing = false;

  word = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? this.vocab.getWordById(id) : undefined;
  });

  domains = this.vocab.domains;
  sets = this.vocab.sets;
  patterns = this.vocab.pronunciationPatterns;

  ngOnInit(): void {}

  getDomainName(id: string): string { return this.domains().find(d => d.id === id)?.name ?? id; }
  getSetName(id: string): string { return this.sets().find(s => s.id === id)?.name ?? id; }
  getPatternLabel(id: string): string {
    const p = this.patterns().find(pat => pat.id === id);
    return p ? `${p.grapheme} ${p.sound}` : id;
  }

  onSaved(w: Word): void {
    this.vocab.updateWord(w);
    this.editing = false;
    this.toast.show('Palabra actualizada.', 'success');
  }

  onDelete(): void {
    const w = this.word();
    if (w && confirm('¿Eliminar esta palabra?')) {
      this.vocab.deleteWord(w.id);
      this.toast.show('Palabra eliminada.', 'success');
      this.router.navigate(['/vocabulary']);
    }
  }

  goBack(): void { this.router.navigate(['/vocabulary']); }
}
