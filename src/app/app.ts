import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatorService, AppLanguage } from './core/services/translator.service';
import { VocabularyService } from './core/services/vocabulary.service';
import { TranslatePipe } from './shared/pipes/translate.pipe';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TranslatePipe],
  template: `
    <div class="app-shell" [class.dark-theme]="darkMode()">
      <!-- Top navigation bar -->
      <header class="topbar">
        <div class="topbar__brand">
          <a routerLink="/vocabulary" class="brand-link">
            <i class="bi bi-journal-bookmark-fill brand-icon" aria-hidden="true"></i>
            <span class="brand-name">Mein Deutschheft</span>
          </a>
        </div>

        <nav class="topbar__nav">
          <a class="nav-link" routerLink="/vocabulary" routerLinkActive="nav-link--active">
            <i class="bi bi-collection nav-link__icon" aria-hidden="true"></i>
            <span class="nav-link__label">{{ 'nav.vocabulary' | translate }}</span>
          </a>
          <a class="nav-link" routerLink="/explore" routerLinkActive="nav-link--active">
            <i class="bi bi-search nav-link__icon" aria-hidden="true"></i>
            <span class="nav-link__label">{{ 'nav.explore' | translate }}</span>
          </a>
          <a class="nav-link" routerLink="/exercises" routerLinkActive="nav-link--active">
            <i class="bi bi-bullseye nav-link__icon" aria-hidden="true"></i>
            <span class="nav-link__label">{{ 'nav.exercises' | translate }}</span>
          </a>
          <a class="nav-link" routerLink="/manage" routerLinkActive="nav-link--active">
            <i class="bi bi-sliders nav-link__icon" aria-hidden="true"></i>
            <span class="nav-link__label">{{ 'nav.manage' | translate }}</span>
            <span class="nav-link__badge" *ngIf="hasChanges()" aria-label="Cambios sin guardar"></span>
          </a>
        </nav>

        <div class="topbar__actions">
          <button class="theme-toggle" type="button" (click)="toggleTheme()"
            [attr.aria-label]="darkMode() ? 'Activar modo claro' : 'Activar modo oscuro'"
            [title]="darkMode() ? 'Modo claro' : 'Modo oscuro'">
            <i class="bi" [class.bi-sun]="darkMode()" [class.bi-moon-stars]="!darkMode()" aria-hidden="true"></i>
          </button>
          <div class="language-dropdown" (click)="$event.stopPropagation()">
            <button class="language-dropdown__toggle" type="button" (click)="languageMenuOpen.set(!languageMenuOpen())"
              [attr.aria-expanded]="languageMenuOpen()" aria-haspopup="listbox">
              <span class="language-flag" aria-hidden="true">{{ selectedLanguage.flag }}</span>
              <span class="language-label">{{ selectedLanguage.label }}</span>
              <i class="bi bi-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="language-dropdown__menu" *ngIf="languageMenuOpen()" role="listbox">
              <button *ngFor="let lang of languages" class="language-option"
                [class.language-option--active]="currentLang() === lang.code"
                (click)="setLanguage(lang.code)" role="option"
                [attr.aria-selected]="currentLang() === lang.code">
                <span class="language-flag" aria-hidden="true">{{ lang.flag }}</span>
                <span>{{ lang.label }}</span>
                <i class="bi bi-check2 language-option__check" *ngIf="currentLang() === lang.code" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="state-banner state-banner--loading" *ngIf="loading()">
        {{ 'common.loading' | translate }}
      </div>
      <div class="state-banner state-banner--error" *ngIf="error()">
        {{ 'common.error' | translate }}: {{ error() }}
      </div>

      <main class="main-content">
        <router-outlet />
      </main>

      <div class="toast-container" aria-live="polite" aria-atomic="true">
        <div *ngFor="let toast of toasts()" class="app-toast"
          [class.app-toast--success]="toast.kind === 'success'"
          [class.app-toast--danger]="toast.kind === 'danger'"
          [class.app-toast--warning]="toast.kind === 'warning'"
          [class.app-toast--info]="toast.kind === 'info'" role="status">
          <i class="bi" [class.bi-check-circle-fill]="toast.kind === 'success'"
            [class.bi-x-circle-fill]="toast.kind === 'danger'"
            [class.bi-exclamation-triangle-fill]="toast.kind === 'warning'"
            [class.bi-info-circle-fill]="toast.kind === 'info'" aria-hidden="true"></i>
          <span>{{ toast.message }}</span>
          <button type="button" class="app-toast__close" (click)="dismissToast(toast.id)" aria-label="Cerrar">
            <i class="bi bi-x" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; min-height: 100vh; background: var(--color-bg); }
    .topbar {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; gap: 1rem;
      padding: 0 1.5rem; height: 60px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .topbar__brand { flex-shrink: 0; }
    .brand-link { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--color-text); }
    .brand-icon { font-size: 1.4rem; }
    .brand-name {
      font-weight: 700; font-size: 1.05rem;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }
    .topbar__nav { display: flex; align-items: center; gap: 0.25rem; flex: 1; justify-content: center; }
    .nav-link {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.45rem 0.9rem; border-radius: var(--radius-lg);
      text-decoration: none; color: var(--color-text-muted);
      font-size: 0.875rem; font-weight: 500;
      transition: all 0.15s; position: relative;
    }
    .nav-link:hover { background: var(--color-surface-hover); color: var(--color-text); }
    .nav-link--active { background: var(--color-primary-light); color: var(--color-primary); }
    .nav-link__icon { font-size: 1rem; }
    .nav-link__badge { position: absolute; top: 4px; right: 4px; color: var(--color-warning); font-size: 0.5rem; }
    .topbar__actions { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
    .theme-toggle {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.25rem; height: 2.25rem; border: 1px solid var(--color-border);
      border-radius: 50%; background: var(--color-surface); color: var(--color-text-muted);
      cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .theme-toggle:hover { background: var(--color-surface-hover); color: var(--color-primary); border-color: var(--color-primary); }
    .language-dropdown { position: relative; }
    .language-dropdown__toggle {
      display: inline-flex; align-items: center; gap: 0.45rem;
      min-width: 7.5rem; padding: 0.45rem 0.65rem;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      background: var(--color-surface); color: var(--color-text);
      cursor: pointer; font: inherit; font-size: 0.8rem; font-weight: 600;
    }
    .language-dropdown__toggle:hover {
      border-color: var(--color-primary); background: var(--color-surface-hover);
    }
    .language-dropdown__toggle .bi-chevron-down { margin-left: auto; font-size: 0.7rem; color: var(--color-text-muted); }
    .language-dropdown__menu {
      position: absolute; top: calc(100% + 0.4rem); right: 0; z-index: 200;
      min-width: 10rem; padding: 0.3rem;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-md); box-shadow: var(--shadow-md);
    }
    .language-option {
      display: flex; align-items: center; gap: 0.55rem; width: 100%;
      padding: 0.5rem 0.6rem; border: 0; border-radius: var(--radius-sm);
      background: transparent; color: var(--color-text); cursor: pointer;
      text-align: left; font: inherit; font-size: 0.8rem;
    }
    .language-option:hover, .language-option--active { background: var(--color-surface-hover); }
    .language-option--active { color: var(--color-primary); font-weight: 600; }
    .language-option__check { margin-left: auto; }
    .language-flag { font-size: 1.1rem; line-height: 1; }
    .state-banner { text-align: center; padding: 0.5rem; font-size: 0.85rem; }
    .state-banner--loading { background: var(--color-primary-light); color: var(--color-primary); }
    .state-banner--error { background: var(--color-danger-light); color: var(--color-danger); }
    .main-content { flex: 1; padding: 1.5rem; }
    .toast-container {
      position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 3000;
      display: flex; flex-direction: column; gap: 0.6rem; width: min(360px, calc(100vw - 2rem));
    }
    .app-toast {
      display: flex; align-items: center; gap: 0.65rem; padding: 0.8rem 0.9rem;
      border: 1px solid; border-radius: 0.65rem; background: var(--color-surface);
      box-shadow: var(--shadow-md); font-size: 0.875rem; font-weight: 600;
    }
    .app-toast--success { border-color: var(--color-success); color: var(--color-success); }
    .app-toast--danger { border-color: var(--color-danger); color: var(--color-danger); }
    .app-toast--warning { border-color: var(--color-warning); color: var(--color-warning); }
    .app-toast--info { border-color: var(--color-primary); color: var(--color-primary); }
    .app-toast span { color: var(--color-text); flex: 1; }
    .app-toast__close { border: 0; background: transparent; color: var(--color-text-muted); cursor: pointer; font-size: 1.1rem; }
    @media (max-width: 640px) {
      .nav-link__label { display: none; }
      .brand-name { display: none; }
      .topbar { padding: 0 0.75rem; }
    }
  `],
})
export class App {
  private translator = inject(TranslatorService);
  private vocab = inject(VocabularyService);
  private toast = inject(ToastService);

  currentLang = this.translator.language;
  loading = this.vocab.loading;
  error = this.vocab.error;
  hasChanges = this.vocab.hasUnsavedChanges;
  toasts = this.toast.messages;
  darkMode = signal(this.getInitialTheme());

  languageMenuOpen = signal(false);

  languages: { code: AppLanguage; label: string; flag: string }[] = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  get selectedLanguage(): { code: AppLanguage; label: string; flag: string } {
    return this.languages.find(lang => lang.code === this.currentLang()) ?? this.languages[0];
  }

  setLanguage(lang: AppLanguage): void {
    this.translator.setLanguage(lang);
    this.languageMenuOpen.set(false);
  }

  dismissToast(id: number): void {
    this.toast.dismiss(id);
  }

  @HostListener('document:click')
  closeLanguageMenu(): void {
    this.languageMenuOpen.set(false);
  }

  toggleTheme(): void {
    const nextTheme = !this.darkMode();
    this.darkMode.set(nextTheme);
    this.applyTheme(nextTheme);
    localStorage.setItem('mein-deutschheft-theme', nextTheme ? 'dark' : 'light');
  }

  private getInitialTheme(): boolean {
    const savedTheme = localStorage.getItem('mein-deutschheft-theme');
    const isDark = savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(isDark);
    return isDark;
  }

  private applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
  }
}
