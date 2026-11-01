import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslatorService } from '../../core/services/translator.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { CefrLevel, Lesson, LessonCategory, LessonSubcategory, LessonDoubt } from '../../core/models/vocabulary.models';
import { marked } from 'marked';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page lessons-page">
      <div class="page__header">
        <div>
          <h1 class="page__title">{{ 'lessons.title' | translate }}</h1>
          <p class="page__subtitle">{{ 'lessons.subtitle' | translate }}</p>
        </div>
        <button class="lesson-info-button" type="button" (click)="showFeatureInfo.set(!showFeatureInfo())"
          [attr.aria-expanded]="showFeatureInfo()" [attr.aria-label]="'lessons.feature_info' | translate"
          [title]="'lessons.feature_info' | translate">i</button>
      </div>
      <div class="lesson-feature-info" *ngIf="showFeatureInfo()">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        <span>{{ 'lessons.feature_info_text' | translate }}</span>
      </div>
      <nav class="lesson-view-tabs" [attr.aria-label]="'lessons.sections' | translate">
        <button type="button" class="lesson-view-tab" [class.lesson-view-tab--active]="activeView() === 'lessons'" (click)="activeView.set('lessons')">
          <i class="bi bi-journal-bookmark" aria-hidden="true"></i>{{ 'lessons.section_lessons' | translate }}
        </button>
        <button type="button" class="lesson-view-tab" [class.lesson-view-tab--active]="activeView() === 'doubts'" (click)="activeView.set('doubts')">
          <i class="bi bi-question-circle" aria-hidden="true"></i>{{ 'lessons.section_doubts' | translate }}
          <span class="lesson-view-count">{{ lessonDoubts().length }}</span>
        </button>
      </nav>

      <div class="lessons-layout" *ngIf="activeView() === 'lessons'">
        <aside class="lesson-tree card">
          <div class="tree-header">
            <h2>{{ 'lessons.structure' | translate }}</h2>
            <button class="icon-btn" type="button" (click)="showCategoryForm.set(!showCategoryForm())"
              [attr.aria-label]="'lessons.add_category' | translate">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
            </button>
          </div>
          <div class="inline-create" *ngIf="showCategoryForm()">
            <input class="form-input" [(ngModel)]="newCategoryName" [placeholder]="'lessons.category_name' | translate" />
            <button class="btn btn--primary btn--sm" type="button" (click)="addCategory()" [disabled]="!newCategoryName.trim()">
              {{ 'common.add' | translate }}
            </button>
          </div>
          <p class="muted empty-state" *ngIf="categories().length === 0">{{ 'lessons.no_categories' | translate }}</p>
          <div class="tree-category" *ngFor="let category of categories()">
            <div class="tree-row tree-row--category">
              <button class="tree-toggle" type="button" (click)="toggleCategory(category.id)" [attr.aria-expanded]="isCategoryOpen(category.id)">
                <i class="bi" [class.bi-chevron-right]="!isCategoryOpen(category.id)" [class.bi-chevron-down]="isCategoryOpen(category.id)" aria-hidden="true"></i>
                <strong>{{ category.name }}</strong>
              </button>
              <button class="icon-btn icon-btn--small" type="button" (click)="addSubcategory(category)" [attr.aria-label]="'lessons.add_subcategory' | translate"><i class="bi bi-plus" aria-hidden="true"></i></button>
              <button class="icon-btn icon-btn--small icon-btn--danger" type="button" (click)="deleteCategory(category)" [attr.aria-label]="'lessons.delete_category' | translate"><i class="bi bi-trash3" aria-hidden="true"></i></button>
            </div>
            <div class="tree-children" *ngIf="isCategoryOpen(category.id)">
              <div class="tree-row tree-row--subcategory" *ngFor="let subcategory of subcategoriesFor(category.id)">
                <button class="tree-label" type="button" [class.tree-label--active]="selectedSubcategory() === subcategory.id" (click)="selectSubcategory(subcategory.id)">
                  <i class="bi bi-folder2-open" aria-hidden="true"></i> {{ subcategory.name }}
                  <span class="tree-count">{{ lessonsFor(subcategory.id).length }}</span>
                </button>
                <button class="icon-btn icon-btn--small icon-btn--danger" type="button" (click)="deleteSubcategory(subcategory)" [attr.aria-label]="'lessons.delete_subcategory' | translate"><i class="bi bi-trash3" aria-hidden="true"></i></button>
              </div>
              <p class="muted tree-empty" *ngIf="subcategoriesFor(category.id).length === 0">{{ 'lessons.no_subcategories' | translate }}</p>
            </div>
          </div>
        </aside>

        <section class="lesson-content">
          <div class="lesson-section-header">
            <div>
              <h2>{{ 'lessons.section_lessons' | translate }}</h2>
              <p class="muted">{{ 'lessons.subtitle' | translate }}</p>
            </div>
            <button class="btn btn--primary btn--sm" type="button" (click)="startNewLesson()">
              <i class="bi bi-plus-lg" aria-hidden="true"></i> {{ 'lessons.new_lesson' | translate }}
            </button>
          </div>
          <div class="lesson-filter card">
            <div class="lesson-filter__field">
              <label for="lesson-level">{{ 'lessons.filter_level' | translate }}</label>
              <select id="lesson-level" class="form-select" [ngModel]="selectedLevel()" (ngModelChange)="changeLevel($event)">
                <option value="all">{{ 'lessons.all_levels' | translate }}</option>
                <option *ngFor="let level of levels" [value]="level">{{ level }}</option>
              </select>
            </div>
            <div class="lesson-filter__selection" *ngIf="selectedSubcategory() as selectedId">
              <span class="filter-chip"><i class="bi bi-folder2-open" aria-hidden="true"></i><span>{{ 'lessons.topic' | translate }}:</span> {{ subcategoryName(selectedId) }}</span>
            </div>
            <button class="btn btn--ghost btn--sm lesson-filter__clear" type="button" (click)="clearFilters()" [disabled]="!hasActiveFilters()">
              <i class="bi bi-x-circle" aria-hidden="true"></i><span>{{ 'lessons.clear_filters' | translate }}</span>
            </button>
          </div>

          <div class="lesson-editor card" *ngIf="editingLesson() as lesson; else lessonList">
            <div class="editor-header">
              <div>
                <h2>{{ lesson.id ? ('lessons.edit_lesson' | translate) : ('lessons.new_lesson' | translate) }}</h2>
                <p class="muted">{{ 'lessons.editor_hint' | translate }}</p>
              </div>
              <button class="btn btn--ghost btn--sm" type="button" (click)="editingLesson.set(undefined)">{{ 'common.back' | translate }}</button>
            </div>
            <div class="form-grid">
              <label class="form-group"><span>{{ 'lessons.category' | translate }}</span>
                <select class="form-select" [(ngModel)]="lesson.categoryId" (ngModelChange)="lesson.subcategoryId = ''">
                  <option value="">{{ 'lessons.choose_category' | translate }}</option>
                  <option *ngFor="let category of categories()" [value]="category.id">{{ category.name }}</option>
                </select>
              </label>
              <label class="form-group"><span>{{ 'lessons.subcategory' | translate }}</span>
                <select class="form-select" [(ngModel)]="lesson.subcategoryId">
                  <option value="">{{ 'lessons.choose_subcategory' | translate }}</option>
                  <option *ngFor="let subcategory of subcategoriesFor(lesson.categoryId)" [value]="subcategory.id">{{ subcategory.name }}</option>
                </select>
              </label>
              <label class="form-group"><span>{{ 'lessons.level' | translate }}</span>
                <select class="form-select" [(ngModel)]="lesson.level"><option *ngFor="let level of levels" [value]="level">{{ level }}</option></select>
              </label>
              <label class="form-group"><span>{{ 'lessons.lesson_title' | translate }}</span><input class="form-input" [(ngModel)]="lesson.title" /></label>
              <label class="form-group form-group--full"><span>{{ 'lessons.summary' | translate }}</span><input class="form-input" [(ngModel)]="lesson.summary" /></label>
              <label class="form-group form-group--full"><span>{{ 'lessons.content' | translate }}</span><small class="muted">Admite Markdown: títulos, listas, negrita, código y bloques de ejemplo.</small><textarea class="form-input lesson-textarea" [(ngModel)]="lesson.content" rows="16" placeholder="## Idea clave&#10;&#10;Explicación clara y un ejemplo"></textarea></label>
            </div>
            <div class="form-actions">
              <button class="btn btn--ghost" type="button" (click)="editingLesson.set(undefined)">{{ 'common.cancel' | translate }}</button>
              <button class="btn btn--primary" type="button" (click)="saveLesson()" [disabled]="!canSaveLesson(lesson)">{{ 'common.save' | translate }}</button>
            </div>
          </div>

          <ng-template #lessonList>
            <div *ngIf="isLessonsLoading(); else loadedLessons" class="lesson-list lesson-list--skeleton" aria-live="polite">
              <article class="lesson-card card lesson-skeleton" *ngFor="let item of skeletonItems">
                <span class="skeleton-line skeleton-line--short"></span>
                <span class="skeleton-line skeleton-line--title"></span>
                <span class="skeleton-line"></span>
                <span class="skeleton-line skeleton-line--wide"></span>
              </article>
              <p class="lesson-loading-label"><span class="loading-dots">{{ 'lessons.loading' | translate }}</span></p>
            </div>
            <ng-template #loadedLessons>
              <div *ngIf="!selectedSubcategory(); else selectedLessonList" class="empty-state card lesson-select-prompt">
                <i class="bi bi-folder2-open" aria-hidden="true"></i>
                <span>{{ 'lessons.select_topic' | translate }}</span>
              </div>
              <ng-template #selectedLessonList>
                <div class="lesson-list">
                  <article class="lesson-card card" *ngFor="let lesson of paginatedLessons(); trackBy: trackByLessonId">
                    <div class="lesson-card__topline"><span class="level-badge">{{ lesson.level }}</span><span class="muted">{{ categoryName(lesson.categoryId) }} · {{ subcategoryName(lesson.subcategoryId) }}</span></div>
                    <h2>{{ lesson.title }}</h2>
                    <p class="muted" *ngIf="lesson.summary">{{ lesson.summary }}</p>
                    <div class="lesson-preview lesson-markdown" [attr.aria-label]="lesson.title + ': contenido'" [innerHTML]="markdownHtml(lesson.content)"></div>
                    <div class="lesson-card__actions">
                      <button class="btn btn--secondary btn--sm" type="button" (click)="editLesson(lesson)"><i class="bi bi-pencil" aria-hidden="true"></i>{{ 'common.edit' | translate }}</button>
                      <button class="icon-btn icon-btn--danger" type="button" (click)="deleteLesson(lesson)" [attr.aria-label]="'lessons.delete_lesson' | translate" [title]="'lessons.delete_lesson' | translate"><i class="bi bi-trash3" aria-hidden="true"></i></button>
                    </div>
                  </article>
                  <p class="empty-state card" *ngIf="visibleLessons().length === 0">{{ 'lessons.no_lessons' | translate }}</p>
                </div>
                <nav class="lesson-pagination" *ngIf="totalPages() > 1" [attr.aria-label]="'lessons.pagination' | translate">
                  <button class="icon-btn" type="button" (click)="changePage(currentPage() - 1)" [disabled]="currentPage() === 1" [attr.aria-label]="'lessons.previous_page' | translate"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
                  <span>{{ 'lessons.page_of' | translate:{ current: currentPage(), total: totalPages() } }}</span>
                  <button class="icon-btn" type="button" (click)="changePage(currentPage() + 1)" [disabled]="currentPage() === totalPages()" [attr.aria-label]="'lessons.next_page' | translate"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
                </nav>
              </ng-template>
            </ng-template>
          </ng-template>
        </section>
      </div>
      <section class="doubts-panel" *ngIf="activeView() === 'doubts'">
        <div class="doubts-panel__header">
          <div>
            <h2>{{ 'lessons.doubts_title' | translate }}</h2>
            <p class="muted">{{ 'lessons.doubts_hint' | translate }}</p>
          </div>
          <button class="btn btn--primary btn--sm" type="button" (click)="startNewDoubt()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>{{ 'lessons.new_doubt' | translate }}
          </button>
        </div>
        <form class="doubt-form card" *ngIf="editingDoubt() as doubt" (ngSubmit)="saveDoubt(doubt)">
          <label class="form-group">
            <span>{{ 'lessons.question' | translate }}</span>
            <textarea class="form-input lesson-textarea" [(ngModel)]="doubt.question" name="question" rows="3" required></textarea>
          </label>
          <label class="form-group">
            <span>{{ 'lessons.answer' | translate }}</span>
            <textarea class="form-input lesson-textarea" [(ngModel)]="doubt.answer" name="answer" rows="4" [placeholder]="'lessons.answer_placeholder' | translate"></textarea>
          </label>
          <div class="form-actions">
            <button class="btn btn--ghost" type="button" (click)="editingDoubt.set(undefined)">{{ 'common.cancel' | translate }}</button>
            <button class="btn btn--primary" type="submit" [disabled]="!doubt.question.trim()">{{ 'common.save' | translate }}</button>
          </div>
        </form>
        <div class="doubt-list">
          <article class="doubt-card card" *ngFor="let doubt of lessonDoubts(); trackBy: trackByDoubtId">
            <div class="doubt-card__status" [class.doubt-card__status--answered]="doubt.answer.trim()">
              <i class="bi" [class.bi-hourglass-split]="!doubt.answer.trim()" [class.bi-check-circle]="doubt.answer.trim()" aria-hidden="true"></i>
              {{ doubt.answer.trim() ? ('lessons.answered' | translate) : ('lessons.pending' | translate) }}
            </div>
            <h3>{{ doubt.question }}</h3>
            <p *ngIf="doubt.answer.trim(); else unanswered" class="doubt-answer"><strong>{{ 'lessons.answer' | translate }}:</strong> {{ doubt.answer }}</p>
            <ng-template #unanswered><p class="muted">{{ 'lessons.waiting_answer' | translate }}</p></ng-template>
            <div class="lesson-card__actions">
              <button class="btn btn--secondary btn--sm" type="button" (click)="editDoubt(doubt)"><i class="bi bi-pencil" aria-hidden="true"></i>{{ 'common.edit' | translate }}</button>
              <button class="icon-btn icon-btn--danger" type="button" (click)="deleteDoubt(doubt)" [attr.aria-label]="'lessons.delete_doubt' | translate"><i class="bi bi-trash3" aria-hidden="true"></i></button>
            </div>
          </article>
          <p class="empty-state card" *ngIf="lessonDoubts().length === 0">{{ 'lessons.no_doubts' | translate }}</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .lessons-layout { display: grid; grid-template-columns: minmax(230px, 280px) 1fr; gap: 1.25rem; align-items: start; }
    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; padding: 1rem; box-shadow: var(--shadow-sm); }
    .lesson-tree { position: sticky; top: 76px; }
    .lesson-section-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
    .lesson-section-header h2 { margin: 0; font-size: 1.15rem; }
    .lesson-section-header p { margin: .2rem 0 0; font-size: .82rem; }
    .lesson-view-tabs { display: inline-flex; gap: .25rem; margin-bottom: 1rem; padding: .25rem; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
    .lesson-view-tab { display: inline-flex; align-items: center; gap: .45rem; border: 0; border-radius: var(--radius-md); background: transparent; color: var(--color-text-muted); cursor: pointer; font: inherit; font-size: .85rem; font-weight: 600; padding: .5rem .75rem; }
    .lesson-view-tab:hover, .lesson-view-tab--active { background: var(--color-primary-light); color: var(--color-primary); }
    .lesson-view-count { min-width: 1.25rem; padding: .05rem .3rem; border-radius: 999px; background: var(--color-border); font-size: .7rem; text-align: center; }
    .doubts-panel { display: grid; gap: 1rem; width: 100%; }
    .doubts-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .doubts-panel__header h2 { margin: 0; font-size: 1.2rem; }
    .doubts-panel__header p { margin: .25rem 0 0; }
    .doubt-form { display: grid; gap: 1rem; }
    .doubt-list { display: grid; gap: 1rem; }
    .doubt-card h3 { margin: .55rem 0 .4rem; font-size: 1rem; }
    .doubt-card__status { display: inline-flex; align-items: center; gap: .35rem; color: var(--color-warning); font-size: .78rem; font-weight: 700; }
    .doubt-card__status--answered { color: var(--color-success); }
    .doubt-answer { white-space: pre-wrap; margin: 0 0 .9rem; }
    .lesson-tree, .lesson-filter, .lesson-editor, .lesson-card { box-shadow: var(--shadow-md); }
    .tree-header, .editor-header, .lesson-card__actions { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
    .tree-header h2, .editor-header h2 { margin: 0; font-size: 1.05rem; }
    .inline-create { display: flex; gap: .4rem; margin: .75rem 0; }
    .tree-row { display: flex; align-items: center; gap: .25rem; min-height: 2rem; }
    .tree-toggle, .tree-label { border: 0; background: none; color: inherit; display: flex; align-items: center; gap: .4rem; cursor: pointer; padding: .55rem .5rem; border-radius: var(--radius-md); text-align: left; flex: 1; transition: background .15s, color .15s; }
    .tree-toggle:hover, .tree-label:hover, .tree-label--active { background: var(--color-primary-light); color: var(--color-primary-dark); }
    .tree-children { padding-left: .75rem; border-left: 1px solid var(--color-border); margin-left: .5rem; }
    .tree-count { margin-left: auto; font-size: .75rem; color: var(--color-text-muted); }
    .tree-empty { font-size: .8rem; padding-left: 1.5rem; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text-muted); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
    .icon-btn:hover { background: var(--color-primary-light); color: var(--color-primary); border-color: var(--color-primary); }
    .icon-btn--danger:hover { background: var(--color-danger-light); color: var(--color-danger); border-color: var(--color-danger); }
    .icon-btn--small { width: 1.9rem; height: 1.9rem; font-size: .8rem; }
    .lesson-filter { display: inline-flex; align-items: center; gap: .55rem; width: fit-content; max-width: 100%; margin-bottom: 1rem; padding: .45rem .55rem; flex-wrap: wrap; }
    .lesson-filter__field { display: flex; align-items: center; gap: .45rem; }
    .lesson-filter__field label { color: var(--color-text-muted); font-size: .78rem; font-weight: 700; }
    .lesson-filter .form-select { min-width: 112px; width: auto; padding: .35rem 2rem .35rem .6rem; font-size: .8rem; }
    .lesson-filter__selection { flex: 0 1 auto; min-width: 0; max-width: min(320px, 100%); }
    .filter-chip { display: inline-flex; align-items: center; gap: .35rem; max-width: 100%; border-radius: 999px; padding: .3rem .6rem; background: var(--color-primary-light); color: var(--color-primary-dark); font-size: .76rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .filter-chip span { color: var(--color-text-muted); font-weight: 500; }
    .lesson-filter__clear { padding: .3rem .55rem; font-size: .76rem; }
    .lesson-list { display: grid; gap: 1rem; }
    .lesson-pagination { display: flex; align-items: center; justify-content: center; gap: .9rem; margin-top: 1.25rem; color: var(--color-text-muted); font-size: .85rem; }
    .lesson-pagination .icon-btn { width: 2rem; height: 2rem; }
    .lesson-select-prompt { display: flex; align-items: center; justify-content: center; gap: .6rem; color: var(--color-text-muted); min-height: 8rem; }
    .lesson-select-prompt i { color: var(--color-primary); font-size: 1.2rem; }
    .lesson-list--skeleton { position: relative; }
    .lesson-skeleton { display: grid; gap: .8rem; overflow: hidden; }
    .skeleton-line { display: block; width: 70%; height: .85rem; border-radius: 999px; background: var(--color-border); animation: lessonSkeleton 1.2s ease-in-out infinite; }
    .skeleton-line--short { width: 28%; height: .7rem; }
    .skeleton-line--title { width: 52%; height: 1.35rem; }
    .skeleton-line--wide { width: 90%; }
    .lesson-loading-label { grid-column: 1; margin: -.25rem 0 0; color: var(--color-text-muted); text-align: center; font-size: .85rem; }
    .loading-dots::after { content: ''; display: inline-block; width: 1.5em; text-align: left; animation: loadingDots 1.2s steps(4, end) infinite; }
    @keyframes lessonSkeleton { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
    @keyframes loadingDots { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75%, 100% { content: '...'; } }
    .lesson-card h2 { margin: .5rem 0 .25rem; }
    .lesson-card__topline { display: flex; align-items: center; gap: .65rem; font-size: .85rem; }
    .level-badge { border-radius: 999px; background: var(--color-primary); color: white; padding: .2rem .55rem; font-size: .75rem; font-weight: 700; }
    .lesson-preview { max-height: 20rem; overflow-y: auto; color: var(--color-text-muted); scrollbar-color: var(--color-primary) var(--color-primary-light); scrollbar-width: thin; }
    .lesson-markdown { line-height: 1.6; }
    .lesson-markdown h1, .lesson-markdown h2, .lesson-markdown h3 { color: var(--color-text); font-size: 1rem; margin: .7rem 0 .35rem; }
    .lesson-markdown p { margin: .4rem 0; }
    .lesson-markdown ul, .lesson-markdown ol { margin: .45rem 0; padding-left: 1.25rem; }
    .lesson-markdown code { padding: .1rem .3rem; border-radius: .25rem; background: var(--color-primary-light); color: var(--color-primary-dark); }
    .lesson-info-button { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; padding: 0; border: 1px solid var(--color-border); border-radius: 50%; background: var(--color-surface); color: var(--color-text-muted); font-weight: 800; cursor: pointer; }
    .lesson-info-button:hover, .lesson-info-button[aria-expanded="true"] { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
    .lesson-feature-info { display: flex; align-items: center; gap: .6rem; margin: -0.75rem 0 1.25rem; padding: .7rem .9rem; border-left: 3px solid var(--color-primary); border-radius: var(--radius-md); background: var(--color-primary-light); color: var(--color-text-muted); font-size: .85rem; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: .4rem; font-weight: 600; }
    .form-group .form-input, .form-group .form-select { width: 100%; }
    .form-group--full { grid-column: 1 / -1; }
    .lesson-textarea { resize: vertical; font: inherit; line-height: 1.5; }
    .form-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1.25rem; }
    .empty-state { padding: 1.25rem; text-align: center; }
    @media (max-width: 760px) { .lessons-layout { grid-template-columns: 1fr; } .lesson-tree { position: static; } .form-grid { grid-template-columns: 1fr; } .form-group--full { grid-column: auto; } .page__header { align-items: flex-start; flex-direction: column; } .lesson-filter { max-width: 100%; } .lesson-filter__field { width: auto; } .lesson-filter__selection { flex: 0 1 auto; } .lesson-filter .form-select { min-width: 100px; } .lesson-section-header, .doubts-panel__header { align-items: flex-start; flex-direction: column; } .lesson-section-header .btn, .doubts-panel__header .btn { width: 100%; } .lesson-view-tabs { max-width: 100%; } .lesson-view-tab { flex: 1; justify-content: center; } }
  `],
})
export class LessonsComponent {
  private vocab = inject(VocabularyService);
  private toast = inject(ToastService);
  private translator = inject(TranslatorService);

  categories = this.vocab.lessonCategories;
  subcategories = this.vocab.lessonSubcategories;
  lessons = this.vocab.lessons;
  levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  selectedLevel = signal('all');
  selectedSubcategory = signal<string | null>(null);
  currentPage = signal(1);
  isLessonsLoading = signal(false);
  readonly pageSize = 5;
  readonly skeletonItems = [1, 2, 3];
  private loadingVersion = 0;
  showFeatureInfo = signal(false);
  openCategories = signal<string[]>([]);
  editingLesson = signal<Lesson | undefined>(undefined);
  showCategoryForm = signal(false);
  newCategoryName = '';
  activeView = signal<'lessons' | 'doubts'>('lessons');
  lessonDoubts = this.vocab.lessonDoubts;
  editingDoubt = signal<LessonDoubt | undefined>(undefined);

  visibleLessons = computed(() => {
    const subcategory = this.selectedSubcategory();
    const level = this.selectedLevel();
    return this.lessons().filter(lesson =>
      !!subcategory && lesson.subcategoryId === subcategory &&
      (level === 'all' || lesson.level === level),
    );
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.visibleLessons().length / this.pageSize)));
  paginatedLessons = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.visibleLessons().slice(start, start + this.pageSize);
  });

  subcategoriesFor(categoryId: string): LessonSubcategory[] {
    return this.subcategories().filter(item => item.categoryId === categoryId).sort((a, b) => a.order - b.order);
  }
  lessonsFor(subcategoryId: string): Lesson[] { return this.lessons().filter(item => item.subcategoryId === subcategoryId); }
  categoryName(id: string): string { return this.categories().find(item => item.id === id)?.name ?? id; }
  subcategoryName(id: string): string { return this.subcategories().find(item => item.id === id)?.name ?? id; }
  isCategoryOpen(id: string): boolean { return this.openCategories().includes(id); }
  toggleCategory(id: string): void { this.openCategories.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]); }
  selectSubcategory(id: string): void {
    this.selectedSubcategory.set(id);
    this.prepareLessonList();
  }
  changeLevel(level: string): void {
    this.selectedLevel.set(level);
    this.prepareLessonList();
  }
  changePage(page: number): void {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages()));
  }
  markdownHtml(content: string): string {
    return marked.parse(content, { gfm: true, breaks: true, async: false });
  }
  hasActiveFilters(): boolean { return this.selectedLevel() !== 'all' || this.selectedSubcategory() !== null; }
  clearFilters(): void {
    this.selectedLevel.set('all');
    this.selectedSubcategory.set(null);
    this.currentPage.set(1);
  }
  trackByLessonId(_: number, lesson: Lesson): string { return lesson.id; }
  trackByDoubtId(_: number, doubt: LessonDoubt): string { return doubt.id; }
  startNewDoubt(): void { this.editingDoubt.set({ id: '', question: '', answer: '' }); }
  editDoubt(doubt: LessonDoubt): void { this.editingDoubt.set({ ...doubt }); }
  saveDoubt(doubt: LessonDoubt): void {
    const saved = { ...doubt, question: doubt.question.trim(), answer: doubt.answer.trim() };
    if (!saved.question) return;
    if (saved.id) this.vocab.updateLessonDoubt(saved);
    else this.vocab.addLessonDoubt({ ...saved, id: `doubt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` });
    this.editingDoubt.set(undefined);
  }
  deleteDoubt(doubt: LessonDoubt): void {
    if (confirm(this.translator.t('lessons.confirm_delete_doubt'))) this.vocab.deleteLessonDoubt(doubt.id);
  }
  private prepareLessonList(): void {
    this.currentPage.set(1);
    const version = ++this.loadingVersion;
    this.isLessonsLoading.set(true);
    setTimeout(() => {
      if (version === this.loadingVersion) this.isLessonsLoading.set(false);
    }, 180);
  }

  addCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) return;
    const id = this.slug(name);
    this.vocab.addLessonCategory({ id, name, order: this.categories().length });
    this.newCategoryName = '';
    this.showCategoryForm.set(false);
  }

  addSubcategory(category: LessonCategory): void {
    const name = prompt(this.translator.t('lessons.subcategory_name'));
    if (!name?.trim()) return;
    const id = this.slug(name) + '_' + Date.now();
    this.vocab.addLessonSubcategory({ id, categoryId: category.id, name: name.trim(), order: this.subcategoriesFor(category.id).length });
    this.openCategories.update(ids => ids.includes(category.id) ? ids : [...ids, category.id]);
  }

  deleteCategory(category: LessonCategory): void {
    if (confirm(this.translator.t('lessons.confirm_delete_category', { name: category.name }))) this.vocab.deleteLessonCategory(category.id);
  }
  deleteSubcategory(subcategory: LessonSubcategory): void {
    if (confirm(this.translator.t('lessons.confirm_delete_subcategory', { name: subcategory.name }))) this.vocab.deleteLessonSubcategory(subcategory.id);
  }
  startNewLesson(): void {
    this.editingLesson.set({ id: '', categoryId: '', subcategoryId: '', title: '', summary: '', content: '', level: 'A1', order: this.lessons().length });
  }
  editLesson(lesson: Lesson): void { this.editingLesson.set({ ...lesson }); }
  canSaveLesson(lesson: Lesson): boolean { return !!lesson.categoryId && !!lesson.subcategoryId && !!lesson.title.trim() && !!lesson.content.trim(); }
  saveLesson(): void {
    const lesson = this.editingLesson();
    if (!lesson || !this.canSaveLesson(lesson)) return;
    if (lesson.id) this.vocab.updateLesson(lesson);
    else this.vocab.addLesson({ ...lesson, id: this.vocab.generateLessonId() });
    this.editingLesson.set(undefined);
    this.toast.show(this.translator.t('lessons.saved'), 'success');
  }
  deleteLesson(lesson: Lesson): void {
    if (confirm(this.translator.t('lessons.confirm_delete', { title: lesson.title }))) this.vocab.deleteLesson(lesson.id);
  }
  private slug(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
}
