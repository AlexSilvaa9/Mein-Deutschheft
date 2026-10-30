import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { WordFormComponent } from '../../shared/components/word-form.component';
import { ToastService } from '../../core/services/toast.service';
import { Word, Domain, VocabSet } from '../../core/models/vocabulary.models';

type ManageTab = 'words' | 'domains' | 'sets' | 'io';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, WordFormComponent],
  template: `
    <div class="page manage-page">
      <div class="page__header">
        <h1 class="page__title">{{ 'manage.title' | translate }}</h1>
        <div class="unsaved-badge" *ngIf="hasChanges()">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i> {{ 'manage.unsaved_changes' | translate }}
        </div>
      </div>

      <!-- Tab navigation -->
      <nav class="tab-nav">
        <button *ngFor="let t of tabs" class="tab-btn" [class.tab-btn--active]="activeTab() === t.id" (click)="activeTab.set(t.id)">
          {{ t.labelKey | translate }}
        </button>
      </nav>

      <!-- ── WORDS tab ─────────────────────────────── -->
      <div *ngIf="activeTab() === 'words'">
        <div class="new-word-panel" *ngIf="isNewWordPage">
          <div class="new-word-panel__header">
            <div>
              <h2>{{ 'vocabulary.add_word' | translate }}</h2>
              <p class="muted">Añade una palabra al vocabulario.</p>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" (click)="goToManage()">
              <i class="bi bi-arrow-left" aria-hidden="true"></i> Volver
            </button>
          </div>
          <app-word-form
            [domains]="domains()"
            [sets]="sets()"
            [pronunciationPatterns]="patterns()"
            (saved)="onWordSaved($event)"
            (cancelled)="goToManage()"
          />
        </div>

        <div class="section-header" *ngIf="!isNewWordPage">
          <h2>{{ 'manage.words_section' | translate }}</h2>
          <button class="btn btn--primary btn--sm" (click)="showWordForm.set(true); editingWord.set(undefined)">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> {{ 'vocabulary.add_word' | translate }}
          </button>
        </div>

        <!-- Word form modal -->
        <div class="app-modal-overlay" *ngIf="showWordForm() && !isNewWordPage" (click)="showWordForm.set(false)">
          <div class="app-modal app-modal--lg" (click)="$event.stopPropagation()">
            <div class="app-modal__header">
              <h3>{{ editingWord() ? ('vocabulary.edit_word' | translate) : ('vocabulary.add_word' | translate) }}</h3>
              <button class="btn-icon" (click)="showWordForm.set(false)" aria-label="Cerrar"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <app-word-form
              [word]="editingWord()"
              [domains]="domains()"
              [sets]="sets()"
              [pronunciationPatterns]="patterns()"
              (saved)="onWordSaved($event)"
              (cancelled)="showWordForm.set(false)"
            />
          </div>
        </div>

        <!-- Word list -->
        <div class="manage-word-list" *ngIf="!isNewWordPage">
          <div class="manage-word-item" *ngFor="let w of words()">
            <div class="manage-word-item__info">
              <span class="article-badge article-badge--{{ w.article }}">{{ w.article }}</span>
              <strong>{{ w.lemma }}</strong>
              <span class="muted">{{ primaryTranslation(w) }}</span>
            </div>
            <div class="manage-word-item__actions">
              <button class="icon-btn" (click)="editWord(w)" [attr.aria-label]="'Editar ' + w.lemma" title="Editar">
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button class="icon-btn icon-btn--danger" (click)="deleteWord(w.id)" [attr.aria-label]="'Eliminar ' + w.lemma" title="Eliminar">
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── DOMAINS tab ─────────────────────────────── -->
      <div *ngIf="activeTab() === 'domains'">
        <div class="section-header">
          <h2>{{ 'manage.domains_section' | translate }}</h2>
          <button class="btn btn--primary btn--sm" (click)="showDomainForm.set(true); resetDomainForm()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> {{ 'manage.add_domain' | translate }}
          </button>
        </div>

        <div class="app-modal-overlay" *ngIf="showDomainForm()" (click)="showDomainForm.set(false)">
          <div class="app-modal" (click)="$event.stopPropagation()">
            <div class="app-modal__header">
              <h3>{{ 'manage.add_domain' | translate }}</h3>
              <button class="btn-icon" (click)="showDomainForm.set(false)" aria-label="Cerrar"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <div class="inline-form">
              <input class="form-input" [(ngModel)]="domainForm.name" [placeholder]="'manage.domain_name' | translate" />
              <select class="form-select" [(ngModel)]="domainForm.parentId">
                <option [ngValue]="null">{{ 'manage.none' | translate }}</option>
                <option *ngFor="let d of domains()" [ngValue]="d.id">{{ d.name }}</option>
              </select>
              <div class="form-actions">
                <button class="btn btn--ghost" (click)="showDomainForm.set(false)">{{ 'manage.cancel' | translate }}</button>
                <button class="btn btn--primary" (click)="saveDomain()" [disabled]="!domainForm.name">{{ 'manage.save' | translate }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="manage-list">
          <div class="manage-item" *ngFor="let d of domains()">
            <span class="manage-item__name">{{ d.name }}</span>
            <span class="muted" *ngIf="d.parentId">↳ {{ getParentName(d.parentId) }}</span>
            <button class="icon-btn icon-btn--danger" (click)="deleteDomain(d.id)" [attr.aria-label]="'Eliminar ' + d.name" title="Eliminar"><i class="bi bi-trash3" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>

      <!-- ── SETS tab ─────────────────────────────── -->
      <div *ngIf="activeTab() === 'sets'">
        <div class="section-header">
          <h2>{{ 'manage.sets_section' | translate }}</h2>
          <button class="btn btn--primary btn--sm" (click)="showSetForm.set(true); resetSetForm()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i> {{ 'manage.add_set' | translate }}
          </button>
        </div>

        <div class="app-modal-overlay" *ngIf="showSetForm()" (click)="showSetForm.set(false)">
          <div class="app-modal" (click)="$event.stopPropagation()">
            <div class="app-modal__header">
              <h3>{{ 'manage.add_set' | translate }}</h3>
              <button class="btn-icon" (click)="showSetForm.set(false)" aria-label="Cerrar"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
            </div>
            <div class="inline-form">
              <input class="form-input" [(ngModel)]="setForm.name" [placeholder]="'manage.set_name' | translate" />
              <input class="form-input" [(ngModel)]="setForm.description" [placeholder]="'manage.set_description' | translate" />
              <div class="form-actions">
                <button class="btn btn--ghost" (click)="showSetForm.set(false)">{{ 'manage.cancel' | translate }}</button>
                <button class="btn btn--primary" (click)="saveSet()" [disabled]="!setForm.name">{{ 'manage.save' | translate }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="manage-list">
          <div class="manage-item" *ngFor="let s of sets()">
            <div>
              <span class="manage-item__name">{{ s.name }}</span>
              <span class="muted" *ngIf="s.description"> — {{ s.description }}</span>
            </div>
            <button class="icon-btn icon-btn--danger" (click)="deleteSet(s.id)" [attr.aria-label]="'Eliminar ' + s.name" title="Eliminar"><i class="bi bi-trash3" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>

      <!-- ── I/O tab ─────────────────────────────── -->
      <div *ngIf="activeTab() === 'io'" class="io-panel">
        <div class="io-card">
          <div class="io-card__icon"><i class="bi bi-box-arrow-up" aria-hidden="true"></i></div>
          <h3>{{ 'manage.export' | translate }}</h3>
          <p class="muted">Descarga un archivo JSON con todo tu vocabulario actual.</p>
          <button class="btn btn--primary" (click)="exportJson()">{{ 'manage.export' | translate }}</button>
        </div>

        <div class="io-card">
          <div class="io-card__icon"><i class="bi bi-box-arrow-in-down" aria-hidden="true"></i></div>
          <h3>{{ 'manage.import' | translate }}</h3>
          <p class="muted">Carga un archivo JSON exportado previamente.</p>
          <label class="btn btn--secondary" style="cursor:pointer">
            {{ 'manage.import' | translate }}
            <input type="file" accept=".json" style="display:none" (change)="onFileImport($event)" />
          </label>
          <p class="import-error" *ngIf="importError()">{{ importError() }}</p>
        </div>

        <div class="io-card io-card--danger">
          <div class="io-card__icon"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></div>
          <h3>{{ 'manage.reset' | translate }}</h3>
          <p class="muted">{{ 'manage.confirm_reset' | translate }}</p>
          <button class="btn btn--danger" (click)="resetData()">{{ 'manage.reset' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .manage-page { max-width: 900px; margin: 0 auto; }
    .unsaved-badge {
      padding: 0.3rem 0.75rem;
      background: var(--color-warning-light);
      color: var(--color-warning);
      border-radius: var(--radius-md);
      font-size: 0.8rem; font-weight: 500;
    }
    .tab-nav { display: flex; gap: 0.25rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--color-border); }
    .tab-btn {
      padding: 0.6rem 1.25rem; border: none; background: transparent;
      cursor: pointer; font-size: 0.9rem; color: var(--color-text-muted);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all 0.15s;
    }
    .tab-btn--active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header h2 { font-size: 1rem; font-weight: 600; margin: 0; }
    .manage-word-list, .manage-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .manage-word-item, .manage-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .manage-word-item__info { display: flex; align-items: center; gap: 0.6rem; }
    .manage-word-item__actions, .manage-item { gap: 0.5rem; }
    .manage-item { gap: 0.5rem; }
    .manage-item__name { font-weight: 500; }
    .muted { color: var(--color-text-muted); font-size: 0.875rem; }
    .article-badge {
      font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.4rem;
      border-radius: var(--radius-sm); color: white;
    }
    .article-badge--der { background: var(--color-der); }
    .article-badge--die { background: var(--color-die); }
    .article-badge--das { background: var(--color-das); }
    .app-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .app-modal {
      background: var(--color-surface); border-radius: var(--radius-xl);
      padding: 1.5rem 2rem; min-width: 320px; max-width: 90vw;
      box-shadow: var(--shadow-xl); max-height: 90vh; overflow-y: auto;
    }
    .app-modal--lg { width: 700px; }
    .app-modal__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .app-modal__header h3 { margin: 0; font-size: 1rem; }
    .btn-icon { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--color-text-muted); }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); cursor: pointer; }
    .icon-btn:hover { background: var(--color-primary-light); color: var(--color-primary); }
    .icon-btn--danger:hover { background: var(--color-danger-light); color: var(--color-danger); }
    .inline-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .form-input, .form-select {
      padding: 0.5rem 0.75rem; border: 1px solid var(--color-border);
      border-radius: var(--radius-md); background: var(--color-surface);
      color: var(--color-text); font-size: 0.9rem;
    }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .io-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .io-card {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-xl); padding: 1.5rem; text-align: center;
    }
    .io-card--danger { border-color: var(--color-danger-light); }
    .io-card__icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .io-card h3 { margin: 0 0 0.4rem; font-size: 0.95rem; }
    .io-card .btn { margin-top: 1rem; }
    .import-error { color: var(--color-danger); font-size: 0.8rem; margin-top: 0.5rem; }
    .new-word-panel {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-xl); padding: 1rem; box-shadow: var(--shadow-sm);
    }
    .new-word-panel__header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; padding: 0 1rem 1rem; border-bottom: 1px solid var(--color-border);
    }
    .new-word-panel__header h2 { margin: 0; font-size: 1.15rem; }
    .new-word-panel__header p { margin: 0.25rem 0 0; }
  `],
})
export class ManageComponent implements OnInit {
  private vocab = inject(VocabularyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  activeTab = signal<ManageTab>('words');
  showWordForm = signal(false);
  showDomainForm = signal(false);
  showSetForm = signal(false);
  editingWord = signal<Word | undefined>(undefined);
  importError = signal<string | null>(null);
  isNewWordPage = false;

  words = this.vocab.words;
  domains = this.vocab.domains;
  sets = this.vocab.sets;
  patterns = this.vocab.pronunciationPatterns;
  hasChanges = this.vocab.hasUnsavedChanges;

  domainForm: { name: string; parentId: string | null } = { name: '', parentId: null };
  setForm: { name: string; description: string } = { name: '', description: '' };

  tabs = [
    { id: 'words' as ManageTab, labelKey: 'manage.words_section' },
    { id: 'domains' as ManageTab, labelKey: 'manage.domains_section' },
    { id: 'sets' as ManageTab, labelKey: 'manage.sets_section' },
    { id: 'io' as ManageTab, labelKey: 'manage.export' },
  ];

  ngOnInit(): void {
    if (this.route.snapshot.data['openWordForm'] === true) {
      this.isNewWordPage = true;
      this.activeTab.set('words');
      this.editingWord.set(undefined);
      this.showWordForm.set(true);
    }
  }

  primaryTranslation(w: Word): string {
    return w.translations.find(t => t.language === 'es')?.text ?? w.translations[0]?.text ?? '';
  }

  editWord(w: Word): void {
    this.editingWord.set(w);
    this.showWordForm.set(true);
  }

  onWordSaved(word: Word): void {
    if (word.id) {
      this.vocab.updateWord(word);
    } else {
      this.vocab.addWord({ ...word, id: this.vocab.generateWordId() });
    }
    this.showWordForm.set(false);
    this.toast.show(word.id ? 'Palabra actualizada.' : 'Palabra creada.', 'success');
    if (this.isNewWordPage) this.goToManage();
  }

  goToManage(): void {
    this.router.navigate(['/manage']);
  }

  deleteWord(id: string): void {
    if (confirm('¿Eliminar esta palabra?')) {
      this.vocab.deleteWord(id);
      this.toast.show('Palabra eliminada.', 'success');
    }
  }

  // Domains
  resetDomainForm(): void { this.domainForm = { name: '', parentId: null }; }
  saveDomain(): void {
    const id = this.domainForm.name.toLowerCase().replace(/\s+/g, '_');
    this.vocab.addDomain({ id, name: this.domainForm.name, parentId: this.domainForm.parentId });
    this.showDomainForm.set(false);
    this.toast.show('Dominio creado.', 'success');
  }
  deleteDomain(id: string): void {
    this.vocab.deleteDomain(id);
    this.toast.show('Dominio eliminado.', 'success');
  }
  getParentName(id: string): string { return this.domains().find(d => d.id === id)?.name ?? id; }

  // Sets
  resetSetForm(): void { this.setForm = { name: '', description: '' }; }
  saveSet(): void {
    const id = this.setForm.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    this.vocab.addSet({ id, name: this.setForm.name, description: this.setForm.description });
    this.showSetForm.set(false);
    this.toast.show('Conjunto creado.', 'success');
  }
  deleteSet(id: string): void {
    this.vocab.deleteSet(id);
    this.toast.show('Conjunto eliminado.', 'success');
  }

  // I/O
  exportJson(): void { this.vocab.exportJson(); }

  async onFileImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.vocab.importJson(file);
      this.importError.set(null);
      this.toast.show('Datos importados correctamente.', 'success');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al importar el archivo.';
      this.importError.set(message);
      this.toast.show(message, 'danger');
    }
  }

  resetData(): void {
    if (confirm('manage.confirm_reset')) {
      this.vocab.resetToInitialData();
      this.toast.show('Datos restaurados.', 'success');
    }
  }
}
