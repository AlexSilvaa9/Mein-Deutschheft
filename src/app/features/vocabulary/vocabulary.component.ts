import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { WordCardComponent } from '../../shared/components/word-card.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, WordCardComponent],
  template: `
    <div class="page vocabulary-page">
      <div class="page__header">
        <div>
          <h1 class="page__title">{{ 'nav.vocabulary' | translate }}</h1>
          <p class="page__subtitle">
            {{ 'vocabulary.word_count' | translate:{ count: filteredWords().length } }}
          </p>
        </div>
        <a class="btn btn--primary" [routerLink]="['/manage/new-word']">
          + {{ 'vocabulary.add_word' | translate }}
        </a>
      </div>

      <!-- Search bar -->
      <div class="search-bar">
        <input
          class="search-bar__input"
          type="search"
          [(ngModel)]="searchText"
          (ngModelChange)="onSearch($event)"
          [placeholder]="'vocabulary.search_placeholder' | translate"
        />
        <svg class="search-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>

      <!-- Word grid -->
      <div class="word-grid" *ngIf="filteredWords().length > 0; else empty">
        <app-word-card
          *ngFor="let word of filteredWords()"
          [word]="word"
          [domains]="domains()"
          [patterns]="patterns()"
          [showActions]="true"
          (deleted)="onDelete($event)"
          [routerLink]="['/vocabulary', word.id]"
        />
      </div>

      <ng-template #empty>
        <div class="empty-state">
          <p>{{ 'vocabulary.no_results' | translate }}</p>
        </div>
      </ng-template>

      <!-- Delete confirm modal -->
      <div class="app-modal-overlay" *ngIf="wordToDelete()" (click)="cancelDelete()">
        <div class="app-modal" (click)="$event.stopPropagation()">
          <p>{{ 'vocabulary.confirm_delete' | translate }}</p>
          <div class="modal__actions">
            <button class="btn btn--ghost" (click)="cancelDelete()">
              {{ 'manage.cancel' | translate }}
            </button>
            <button class="btn btn--danger" (click)="confirmDelete()">
              {{ 'vocabulary.delete_word' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vocabulary-page { max-width: 1100px; margin: 0 auto; }
    .search-bar {
      position: relative;
      margin-bottom: 1.5rem;
    }
    .search-bar__input {
      width: 100%;
      padding: 0.65rem 1rem 0.65rem 2.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.95rem;
    }
    .search-bar__input:focus { outline: none; border-color: var(--color-primary); }
    .search-bar__icon {
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      width: 1.1rem; height: 1.1rem;
      color: var(--color-text-muted);
      pointer-events: none;
    }
    .word-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-muted);
    }
    .app-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .app-modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem 2rem;
      min-width: 280px;
      box-shadow: var(--shadow-xl);
    }
    .modal__actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
  `],
})
export class VocabularyComponent {
  private vocab = inject(VocabularyService);
  private toast = inject(ToastService);

  searchText = '';
  wordToDelete = signal<string | null>(null);

  domains = this.vocab.domains;
  patterns = this.vocab.pronunciationPatterns;
  filteredWords = this.vocab.filteredWords;

  onSearch(text: string): void {
    this.vocab.setFilter({ searchText: text });
  }

  onDelete(id: string): void {
    this.wordToDelete.set(id);
  }

  cancelDelete(): void {
    this.wordToDelete.set(null);
  }

  confirmDelete(): void {
    const id = this.wordToDelete();
    if (id) {
      this.vocab.deleteWord(id);
      this.toast.show('Palabra eliminada.', 'success');
    }
    this.wordToDelete.set(null);
  }
}
