import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslatorService } from '../../core/services/translator.service';
import { HighlightService } from '../../core/services/highlight.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { CefrLevel, Lesson, LessonCategory, LessonSubcategory, Word } from '../../core/models/vocabulary.models';

interface LessonTextPart {
  text: string;
  word?: Word;
}

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
        <button class="btn btn--primary" type="button" (click)="startNewLesson()">
          <i class="bi bi-plus-lg" aria-hidden="true"></i> {{ 'lessons.new_lesson' | translate }}
        </button>
        <button class="lesson-info-button" type="button" (click)="showFeatureInfo.set(!showFeatureInfo())"
          [attr.aria-expanded]="showFeatureInfo()" [attr.aria-label]="'lessons.feature_info' | translate"
          [title]="'lessons.feature_info' | translate">i</button>
      </div>
      <div class="lesson-feature-info" *ngIf="showFeatureInfo()">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        <span>{{ 'lessons.feature_info_text' | translate }}</span>
      </div>

      <div class="lessons-layout">
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
          <div class="lesson-filter card">
            <div class="lesson-filter__field">
              <label for="lesson-level">{{ 'lessons.filter_level' | translate }}</label>
              <select id="lesson-level" class="form-select" [ngModel]="selectedLevel()" (ngModelChange)="selectedLevel.set($event)">
                <option value="all">{{ 'lessons.all_levels' | translate }}</option>
                <option *ngFor="let level of levels" [value]="level">{{ level }}</option>
              </select>
            </div>
            <div class="lesson-filter__selection" *ngIf="selectedSubcategory() as selectedId">
              <span class="filter-chip"><i class="bi bi-folder2-open" aria-hidden="true"></i>{{ subcategoryName(selectedId) }}</span>
            </div>
            <button class="btn btn--secondary btn--sm" type="button" (click)="clearFilters()" [disabled]="!hasActiveFilters()">
              <i class="bi bi-x-circle" aria-hidden="true"></i>{{ 'lessons.clear_filters' | translate }}
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
              <label class="form-group form-group--full"><span>{{ 'lessons.content' | translate }}</span><textarea class="form-input lesson-textarea" [(ngModel)]="lesson.content" rows="12"></textarea></label>
            </div>
            <div class="form-actions">
              <button class="btn btn--ghost" type="button" (click)="editingLesson.set(undefined)">{{ 'common.cancel' | translate }}</button>
              <button class="btn btn--primary" type="button" (click)="saveLesson()" [disabled]="!canSaveLesson(lesson)">{{ 'common.save' | translate }}</button>
            </div>
          </div>

          <ng-template #lessonList>
            <div class="lesson-list">
              <article class="lesson-card card" *ngFor="let lesson of visibleLessons()">
                <div class="lesson-card__topline"><span class="level-badge">{{ lesson.level }}</span><span class="muted">{{ categoryName(lesson.categoryId) }} · {{ subcategoryName(lesson.subcategoryId) }}</span></div>
                <h2>{{ lesson.title }}</h2>
                <p class="muted" *ngIf="lesson.summary">{{ lesson.summary }}</p>
                <div class="lesson-preview">
                  <ng-container *ngFor="let part of lessonTextParts(lesson.content)">
                    <span *ngIf="!part.word">{{ part.text }}</span>
                    <span class="lesson-word" *ngIf="part.word"
                      [attr.title]="translationFor(part.word)"
                      tabindex="0"
                      [attr.aria-label]="part.text + ': ' + translationFor(part.word)">
                      <span *ngFor="let letter of highlightedLetters(part.word)" [style.color]="letter.color">{{ letter.character }}</span>
                    </span>
                  </ng-container>
                </div>
                <div class="lesson-card__actions">
                  <button class="btn btn--secondary btn--sm" type="button" (click)="editLesson(lesson)"><i class="bi bi-pencil" aria-hidden="true"></i>{{ 'common.edit' | translate }}</button>
                  <button class="icon-btn icon-btn--danger" type="button" (click)="deleteLesson(lesson)" [attr.aria-label]="'lessons.delete_lesson' | translate" [title]="'lessons.delete_lesson' | translate"><i class="bi bi-trash3" aria-hidden="true"></i></button>
                </div>
              </article>
              <p class="empty-state card" *ngIf="visibleLessons().length === 0">{{ 'lessons.no_lessons' | translate }}</p>
            </div>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .lessons-layout { display: grid; grid-template-columns: minmax(230px, 280px) 1fr; gap: 1.25rem; align-items: start; }
    .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 14px; padding: 1rem; box-shadow: var(--shadow-sm); }
    .lesson-tree { position: sticky; top: 76px; }
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
    .lesson-filter { display: flex; align-items: end; gap: .75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .lesson-filter__field { display: flex; align-items: center; gap: .65rem; }
    .lesson-filter__field label { font-weight: 600; }
    .lesson-filter .form-select { min-width: 150px; }
    .lesson-filter__selection { flex: 1; min-width: 160px; }
    .filter-chip { display: inline-flex; align-items: center; gap: .4rem; border-radius: 999px; padding: .35rem .7rem; background: var(--color-primary-light); color: var(--color-primary-dark); font-size: .8rem; font-weight: 600; }
    .lesson-list { display: grid; gap: 1rem; }
    .lesson-card h2 { margin: .5rem 0 .25rem; }
    .lesson-card__topline { display: flex; align-items: center; gap: .65rem; font-size: .85rem; }
    .level-badge { border-radius: 999px; background: var(--color-primary); color: white; padding: .2rem .55rem; font-size: .75rem; font-weight: 700; }
    .lesson-preview { white-space: pre-wrap; max-height: 5.5rem; overflow: hidden; color: var(--color-text-muted); }
    .lesson-word { margin: 0 .08rem; cursor: help; }
    .lesson-word:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
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
    @media (max-width: 760px) { .lessons-layout { grid-template-columns: 1fr; } .lesson-tree { position: static; } .form-grid { grid-template-columns: 1fr; } .form-group--full { grid-column: auto; } .page__header { align-items: flex-start; flex-direction: column; } .lesson-filter__field { width: 100%; justify-content: space-between; } .lesson-filter .form-select { flex: 1; } .lesson-filter__selection { min-width: 0; } }
  `],
})
export class LessonsComponent {
  private vocab = inject(VocabularyService);
  private toast = inject(ToastService);
  private translator = inject(TranslatorService);
  private highlights = inject(HighlightService);

  categories = this.vocab.lessonCategories;
  subcategories = this.vocab.lessonSubcategories;
  lessons = this.vocab.lessons;
  levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  selectedLevel = signal('all');
  selectedSubcategory = signal<string | null>(null);
  showFeatureInfo = signal(false);
  openCategories = signal<string[]>([]);
  editingLesson = signal<Lesson | undefined>(undefined);
  showCategoryForm = signal(false);
  newCategoryName = '';

  visibleLessons = computed(() => {
    const subcategory = this.selectedSubcategory();
    const level = this.selectedLevel();
    return this.lessons().filter(lesson =>
      (!subcategory || lesson.subcategoryId === subcategory) &&
      (level === 'all' || lesson.level === level),
    );
  });

  subcategoriesFor(categoryId: string): LessonSubcategory[] {
    return this.subcategories().filter(item => item.categoryId === categoryId).sort((a, b) => a.order - b.order);
  }
  lessonsFor(subcategoryId: string): Lesson[] { return this.lessons().filter(item => item.subcategoryId === subcategoryId); }
  categoryName(id: string): string { return this.categories().find(item => item.id === id)?.name ?? id; }
  subcategoryName(id: string): string { return this.subcategories().find(item => item.id === id)?.name ?? id; }
  isCategoryOpen(id: string): boolean { return this.openCategories().includes(id); }
  toggleCategory(id: string): void { this.openCategories.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]); }
  selectSubcategory(id: string): void { this.selectedSubcategory.set(id); }
  lessonTextParts(content: string): LessonTextPart[] {
    return content.split(/(\p{L}+)/u).filter(Boolean).map(text => ({
      text,
      word: this.vocab.words().find(word => word.lemma.localeCompare(text, undefined, { sensitivity: 'accent' }) === 0),
    }));
  }
  translationFor(word: Word): string {
    const language = this.translator.language();
    return word.translations.find(translation => translation.language === language)?.text
      ?? word.translations[0]?.text
      ?? word.lemma;
  }
  highlightedLetters(word: Word) {
    return this.highlights.lettersFor(word);
  }
  hasActiveFilters(): boolean { return this.selectedLevel() !== 'all' || this.selectedSubcategory() !== null; }
  clearFilters(): void { this.selectedLevel.set('all'); this.selectedSubcategory.set(null); }

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
