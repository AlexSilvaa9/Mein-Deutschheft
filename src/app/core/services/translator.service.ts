import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type AppLanguage = 'es' | 'en' | 'de';

const STORAGE_KEY = 'mein-deutschheft-lang';

@Injectable({ providedIn: 'root' })
export class TranslatorService {
  private translations: Record<string, Record<string, unknown>> = {};
  private _language = signal<AppLanguage>(this.loadSavedLanguage());
  private _translationsVersion = signal(0);

  readonly language = this._language.asReadonly();

  constructor(private http: HttpClient) {
    this.loadTranslations(this._language());
    if (this._language() !== 'es') this.loadTranslations('es');
  }

  private loadSavedLanguage(): AppLanguage {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' || saved === 'de' || saved === 'es' ? saved : 'es';
  }

  setLanguage(lang: AppLanguage): void {
    this._language.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    if (!this.translations[lang]) {
      this.loadTranslations(lang);
    }
  }

  private loadTranslations(lang: AppLanguage): void {
    this.http.get<Record<string, unknown>>(`assets/i18n/${lang}.json`).subscribe({
      next: data => {
        this.translations[lang] = data;
        this._translationsVersion.update(version => version + 1);
      },
      error: err => console.error(`Failed to load translations for ${lang}`, err),
    });
  }

  /**
   * Translate a dot-notation key, with optional interpolation params.
   * Example: t('exercises.score', { correct: 3, total: 5 })
   */
  t(key: string, params?: Record<string, string | number>): string {
    void this._translationsVersion();
    const lang = this._language();
    const dict = this.translations[lang] || this.translations['es'] || {};
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = dict;
    for (const part of parts) {
      if (value == null) break;
      value = value[part];
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)),
        value,
      );
    }
    return value;
  }

  /** Reactive translation — call inside a computed() or template expression */
  translate = computed(() => {
    const lang = this._language();
    return (key: string, params?: Record<string, string | number>) => {
      void lang; // ensure reactivity
      return this.t(key, params);
    };
  });
}
