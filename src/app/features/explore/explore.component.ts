import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { WordCardComponent } from '../../shared/components/word-card.component';
import {
  Article, CefrLevel, FilterState, DEFAULT_FILTER, VowelQuantity, WordType
} from '../../core/models/vocabulary.models';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, WordCardComponent],
  template: `
    <div class="page explore-page">
      <div class="explore-layout">
        <!-- Sidebar filters -->
        <aside class="filters-panel">
          <div class="filters-panel__header">
            <h2 class="filters-title">{{ 'explore.filters' | translate }}</h2>
            <button class="btn btn--ghost btn--sm" (click)="clearFilters()">
              {{ 'explore.clear_filters' | translate }}
            </button>
          </div>

          <!-- Domain filter -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_domain' | translate }}</h3>
            <ng-container *ngTemplateOutlet="domainTree; context: { parentId: null, level: 0 }"></ng-container>
            <ng-template #domainTree let-parentId="parentId" let-level="level">
              <div *ngFor="let d of domainsFor(parentId)" class="domain-node" [style.padding-left.rem]="level * 1.1">
                <div class="domain-row">
                  <button *ngIf="hasChildren(d.id)" type="button" class="domain-toggle"
                    (click)="toggleDomainExpanded(d.id)"
                    [attr.aria-label]="isDomainExpanded(d.id) ? 'Ocultar subdominios' : 'Mostrar subdominios'">
                    <i class="bi" [class.bi-chevron-down]="isDomainExpanded(d.id)"
                      [class.bi-chevron-right]="!isDomainExpanded(d.id)" aria-hidden="true"></i>
                  </button>
                  <span *ngIf="!hasChildren(d.id)" class="domain-toggle-spacer"></span>
                  <label class="checkbox-item">
                    <input type="checkbox" [checked]="isDomainSelected(d.id)" (change)="toggleDomain(d.id, $event)" />
                    {{ d.name }}
                  </label>
                </div>
                <ng-container *ngIf="isDomainExpanded(d.id)">
                  <ng-container *ngTemplateOutlet="domainTree; context: { parentId: d.id, level: level + 1 }"></ng-container>
                </ng-container>
              </div>
            </ng-template>
          </div>

          <!-- Sets filter -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_set' | translate }}</h3>
            <label class="checkbox-item" *ngFor="let s of sets()">
              <input type="checkbox" [checked]="isSetSelected(s.id)" (change)="toggleSet(s.id, $event)" />
              {{ s.name }}
            </label>
          </div>

          <!-- Article filter -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_article' | translate }}</h3>
            <label class="checkbox-item" *ngFor="let a of articles">
              <input type="checkbox" [checked]="isArticleSelected(a)" (change)="toggleArticle(a, $event)" />
              <span class="article-badge article-badge--{{ a }}">{{ a }}</span>
            </label>
          </div>

          <!-- Word type filter -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_word_type' | translate }}</h3>
            <label class="checkbox-item" *ngFor="let type of wordTypes">
              <input type="checkbox" [checked]="isWordTypeSelected(type)" (change)="toggleWordType(type, $event)" />
              {{ ('word_types.' + type) | translate }}
            </label>
          </div>

          <!-- Umlaut filter -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_umlaut' | translate }}</h3>
            <label class="checkbox-item">
              <input type="radio" name="umlaut" [value]="null" [ngModel]="filter().umlaut" (ngModelChange)="setFilter({ umlaut: $event })" />
              {{ 'explore.any' | translate }}
            </label>
            <label class="checkbox-item">
              <input type="radio" name="umlaut" [value]="true" [ngModel]="filter().umlaut" (ngModelChange)="setFilter({ umlaut: $event })" />
              {{ 'word_detail.yes' | translate }}
            </label>
            <label class="checkbox-item">
              <input type="radio" name="umlaut" [value]="false" [ngModel]="filter().umlaut" (ngModelChange)="setFilter({ umlaut: $event })" />
              {{ 'word_detail.no' | translate }}
            </label>
          </div>

          <!-- Vowel quantity -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_vowel' | translate }}</h3>
            <label class="checkbox-item">
              <input type="radio" name="vowel" [value]="null" [ngModel]="filter().vowelQuantity" (ngModelChange)="setFilter({ vowelQuantity: $event })" />
              {{ 'explore.any' | translate }}
            </label>
            <label class="checkbox-item">
              <input type="radio" name="vowel" value="long" [ngModel]="filter().vowelQuantity" (ngModelChange)="setFilter({ vowelQuantity: $event })" />
              {{ 'word_detail.vowel_long' | translate }}
            </label>
            <label class="checkbox-item">
              <input type="radio" name="vowel" value="short" [ngModel]="filter().vowelQuantity" (ngModelChange)="setFilter({ vowelQuantity: $event })" />
              {{ 'word_detail.vowel_short' | translate }}
            </label>
          </div>

          <!-- Patterns -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_pattern' | translate }}</h3>
            <label class="checkbox-item" *ngFor="let p of patterns()">
              <input type="checkbox" [checked]="isPatternSelected(p.id)" (change)="togglePattern(p.id, $event)" />
              <strong>{{ p.grapheme }}</strong>&nbsp;{{ p.sound }}
            </label>
          </div>

          <!-- Syllable count -->
          <div class="filter-group">
            <h3 class="filter-group__title">{{ 'explore.filter_syllables' | translate }}</h3>
            <label class="checkbox-item">
              <input type="radio" name="syllables" [value]="null" [ngModel]="filter().syllableCount" (ngModelChange)="setFilter({ syllableCount: $event })" />
              {{ 'explore.any' | translate }}
            </label>
            <label class="checkbox-item" *ngFor="let n of [1,2,3,4]">
              <input type="radio" name="syllables" [value]="n" [ngModel]="filter().syllableCount" (ngModelChange)="setFilter({ syllableCount: $event })" />
              {{ n }}
            </label>
          </div>
        </aside>

        <!-- Results -->
        <main class="explore-results">
          <div class="results-header">
            <h2>{{ 'explore.results' | translate }}</h2>
            <span class="results-count">{{ 'vocabulary.word_count' | translate:{ count: filteredWords().length } }}</span>
          </div>

          <div class="word-grid" *ngIf="filteredWords().length > 0; else empty">
            <app-word-card *ngFor="let word of filteredWords()"
              [word]="word" [domains]="domains()" [patterns]="patterns()"
              [routerLink]="['/vocabulary', word.id]" />
          </div>

          <ng-template #empty>
            <div class="empty-state">
              <p>{{ 'vocabulary.no_results' | translate }}</p>
            </div>
          </ng-template>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .explore-page { max-width: 1200px; margin: 0 auto; }
    .explore-layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    .filters-panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1rem;
      position: sticky;
      top: 80px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
    }
    .filters-panel__header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1rem;
    }
    .filters-title { font-size: 1rem; font-weight: 600; margin: 0; }
    .filter-group {
      margin-bottom: 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }
    .filter-group:last-child { border-bottom: none; margin-bottom: 0; }
    .filter-group__title { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin: 0 0 0.5rem 0; }
    .checkbox-item {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.875rem;
      padding: 0.2rem 0;
      cursor: pointer;
      color: var(--color-text);
    }
    .domain-row { display: flex; align-items: center; min-height: 1.8rem; }
    .domain-toggle, .domain-toggle-spacer {
      width: 1.25rem; height: 1.5rem; flex: 0 0 1.25rem;
    }
    .domain-toggle {
      display: inline-flex; align-items: center; justify-content: center;
      border: 0; padding: 0; background: transparent; color: var(--color-text-muted);
      cursor: pointer;
    }
    .domain-toggle:hover { color: var(--color-primary); }
    .article-badge {
      font-size: 0.8rem; font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm);
      color: white;
    }
    .article-badge--der { background: var(--color-der); }
    .article-badge--die { background: var(--color-die); }
    .article-badge--das { background: var(--color-das); }
    .results-header {
      display: flex; align-items: baseline; gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .results-header h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
    .results-count { color: var(--color-text-muted); font-size: 0.85rem; }
    .word-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .empty-state { text-align: center; padding: 3rem; color: var(--color-text-muted); }
    @media (max-width: 768px) {
      .explore-layout { grid-template-columns: 1fr; }
      .filters-panel { position: static; max-height: none; }
      .word-grid { grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); }
    }
    @media (max-width: 480px) {
      .filters-panel { padding: 0.75rem; }
      .results-header { align-items: flex-start; flex-direction: column; gap: 0.2rem; }
    }
  `],
})
export class ExploreComponent {
  private vocab = inject(VocabularyService);

  filter = this.vocab.filter;
  filteredWords = this.vocab.filteredWords;
  domains = this.vocab.domains;
  sets = this.vocab.sets;
  patterns = this.vocab.pronunciationPatterns;

  articles: Article[] = ['der', 'die', 'das'];
  wordTypes: WordType[] = ['noun', 'verb', 'adjective', 'phrase', 'number'];

  expandedDomains = signal<Set<string>>(new Set());

  setFilter(partial: Partial<FilterState>): void { this.vocab.setFilter(partial); }
  clearFilters(): void { this.vocab.clearFilter(); }

  isDomainSelected(id: string): boolean { return this.filter().domains.includes(id); }
  domainsFor(parentId: string | null) { return this.domains().filter(d => d.parentId === parentId); }
  hasChildren(id: string): boolean { return this.domains().some(d => d.parentId === id); }
  isDomainExpanded(id: string): boolean { return this.expandedDomains().has(id); }
  toggleDomainExpanded(id: string): void {
    const expanded = new Set(this.expandedDomains());
    expanded.has(id) ? expanded.delete(id) : expanded.add(id);
    this.expandedDomains.set(expanded);
  }
  isSetSelected(id: string): boolean { return this.filter().sets.includes(id); }
  isArticleSelected(a: Article): boolean { return this.filter().articles.includes(a); }
  isPatternSelected(id: string): boolean { return this.filter().patternIds.includes(id); }
  isWordTypeSelected(type: WordType): boolean { return this.filter().wordTypes.includes(type); }

  toggleDomain(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const domains = checked ? [...this.filter().domains, id] : this.filter().domains.filter(d => d !== id);
    this.vocab.setFilter({ domains });
  }

  toggleSet(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const sets = checked ? [...this.filter().sets, id] : this.filter().sets.filter(s => s !== id);
    this.vocab.setFilter({ sets });
  }

  toggleArticle(a: Article, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const articles = checked ? [...this.filter().articles, a] : this.filter().articles.filter(x => x !== a);
    this.vocab.setFilter({ articles });
  }

  togglePattern(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const patternIds = checked ? [...this.filter().patternIds, id] : this.filter().patternIds.filter(p => p !== id);
    this.vocab.setFilter({ patternIds });
  }

  toggleWordType(type: WordType, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const wordTypes = checked
      ? [...this.filter().wordTypes, type]
      : this.filter().wordTypes.filter(current => current !== type);
    this.vocab.setFilter({ wordTypes });
  }
}
