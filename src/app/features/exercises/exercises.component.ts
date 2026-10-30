import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { ExerciseService } from '../../core/services/exercise.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslatorService } from '../../core/services/translator.service';
import { HighlightService } from '../../core/services/highlight.service';
import {
  ExerciseType, FilterState, DEFAULT_FILTER, Article
} from '../../core/models/vocabulary.models';

type ExerciseStep = 'setup' | 'playing' | 'result';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page exercises-page">

      <!-- ── SETUP ─────────────────────────────────────────── -->
      <div class="setup-panel" *ngIf="step() === 'setup'">
        <div class="setup-card">
          <h2>{{ 'exercises.select_type' | translate }}</h2>
          <div class="exercise-types">
            <button
              *ngFor="let t of exerciseTypes"
              class="type-btn"
              [class.type-btn--active]="selectedType() === t.id"
              (click)="selectedType.set(t.id)"
            >
              <i class="bi type-btn__icon" [ngClass]="t.icon" aria-hidden="true"></i>
              <span>{{ t.labelKey | translate }}</span>
            </button>
          </div>

          <!-- Quick filter for exercises -->
          <div class="exercise-filters">
            <h3>Selección de palabras</h3>
            <div class="filter-row">
              <label>{{ 'explore.filter_domain' | translate }}</label>
              <select class="form-select" [(ngModel)]="exerciseDomainId" (ngModelChange)="updateExerciseFilter()">
                <option value="">{{ 'explore.any' | translate }}</option>
                <option *ngFor="let d of domains()" [value]="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div class="filter-row">
              <label>{{ 'explore.filter_set' | translate }}</label>
              <select class="form-select" [(ngModel)]="exerciseSetId" (ngModelChange)="updateExerciseFilter()">
                <option value="">{{ 'explore.any' | translate }}</option>
                <option *ngFor="let s of sets()" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
            <p class="exercise-word-count">
              {{ 'vocabulary.word_count' | translate:{ count: exerciseWordCount() } }}
            </p>
          </div>

          <button
            class="btn btn--primary btn--lg"
            (click)="startExercise()"
            [disabled]="exerciseWordCount() < 2"
          >
            {{ 'exercises.start' | translate }}
          </button>
          <p class="no-words-msg" *ngIf="exerciseWordCount() < 2">
            {{ 'exercises.no_words' | translate }}
          </p>
        </div>
      </div>

      <!-- ── PLAYING ─────────────────────────────────────────── -->
      <div class="playing-panel" *ngIf="step() === 'playing' && currentWord()">
        <div class="progress-bar">
          <div class="progress-bar__fill" [style.width.%]="progressPercent()"></div>
        </div>
        <p class="question-counter">
          {{ 'exercises.question_of' | translate:{ current: questionNumber(), total: session()!.words.length } }}
        </p>

        <div class="question-card">
          <!-- Translation exercise -->
          <ng-container *ngIf="selectedType() === 'translation'">
            <p class="question-prompt">{{ 'exercises.translation_prompt' | translate }}</p>
            <div class="word-display">
              <span class="article-badge article-badge--{{ currentWord()!.article }}">{{ currentWord()!.article }}</span>
              <span class="word-display__lemma"><span *ngFor="let letter of highlightedLetters(currentWord()!)" [style.color]="letter.color">{{ letter.character }}</span></span>
            </div>
            <input class="answer-input" type="text" [(ngModel)]="userAnswer"
              [placeholder]="'exercises.type_answer' | translate"
              (keyup.enter)="checkAnswer()" [disabled]="answered()" />
          </ng-container>

          <!-- Article exercise -->
          <ng-container *ngIf="selectedType() === 'article'">
            <p class="question-prompt">{{ 'exercises.article_prompt' | translate }}</p>
            <div class="word-display">
              <span class="word-display__lemma"><span *ngFor="let letter of highlightedLetters(currentWord()!)" [style.color]="letter.color">{{ letter.character }}</span></span>
            </div>
            <div class="article-buttons">
              <button *ngFor="let a of articles" class="article-btn article-btn--{{ a }}"
                [class.article-btn--selected]="userAnswer === a"
                [class.article-btn--correct]="answered() && a === session()!.answers.at(-1)!.expectedAnswer"
                [class.article-btn--wrong]="answered() && userAnswer === a && a !== session()!.answers.at(-1)!.expectedAnswer"
                (click)="selectArticle(a)" [disabled]="answered()">
                {{ a }}
              </button>
            </div>
          </ng-container>

          <!-- Plural exercise -->
          <ng-container *ngIf="selectedType() === 'plural'">
            <p class="question-prompt">{{ 'exercises.plural_prompt' | translate }}</p>
            <div class="word-display">
              <span class="article-badge article-badge--{{ currentWord()!.article }}">{{ currentWord()!.article }}</span>
              <span class="word-display__lemma"><span *ngFor="let letter of highlightedLetters(currentWord()!)" [style.color]="letter.color">{{ letter.character }}</span></span>
            </div>
            <input class="answer-input" type="text" [(ngModel)]="userAnswer"
              [placeholder]="'exercises.type_answer' | translate"
              (keyup.enter)="checkAnswer()" [disabled]="answered()" />
          </ng-container>

          <!-- Pronunciation exercise -->
          <ng-container *ngIf="selectedType() === 'pronunciation'">
            <p class="question-prompt">{{ currentPronunciationQuestion() }}</p>
            <div class="word-display">
              <span class="article-badge article-badge--{{ currentWord()!.article }}">{{ currentWord()!.article }}</span>
              <span class="word-display__lemma"><span *ngFor="let letter of highlightedLetters(currentWord()!)" [style.color]="letter.color">{{ letter.character }}</span></span>
            </div>
            <div class="article-buttons">
              <button class="article-btn" [class.article-btn--selected]="userAnswer === 'Sí'"
                [class.article-btn--correct]="answered() && session()!.answers.at(-1)!.expectedAnswer === 'Sí'"
                [class.article-btn--wrong]="answered() && userAnswer === 'Sí' && session()!.answers.at(-1)!.expectedAnswer !== 'Sí'"
                (click)="selectArticle('Sí')" [disabled]="answered()">
                {{ 'word_detail.yes' | translate }}
              </button>
              <button class="article-btn" [class.article-btn--selected]="userAnswer === 'No'"
                [class.article-btn--correct]="answered() && session()!.answers.at(-1)!.expectedAnswer === 'No'"
                [class.article-btn--wrong]="answered() && userAnswer === 'No' && session()!.answers.at(-1)!.expectedAnswer !== 'No'"
                (click)="selectArticle('No')" [disabled]="answered()">
                {{ 'word_detail.no' | translate }}
              </button>
            </div>
          </ng-container>

          <!-- Feedback -->
          <div class="feedback" *ngIf="answered()">
            <div class="feedback__badge" [class.feedback__badge--correct]="lastAnswerCorrect()" [class.feedback__badge--wrong]="!lastAnswerCorrect()">
              {{ lastAnswerCorrect() ? ('exercises.correct' | translate) : ('exercises.incorrect' | translate) }}
            </div>
            <p *ngIf="!lastAnswerCorrect()" class="feedback__expected">
              → {{ session()!.answers.at(-1)!.expectedAnswer }}
            </p>
          </div>

          <div class="question-actions">
            <button class="btn btn--primary" *ngIf="!answered()" (click)="checkAnswer()" [disabled]="!userAnswer">
              {{ 'exercises.check' | translate }}
            </button>
            <button class="btn btn--primary" *ngIf="answered() && !isFinished()" (click)="nextQuestion()">
              {{ 'exercises.next' | translate }}
            </button>
            <button class="btn btn--primary" *ngIf="answered() && isFinished()" (click)="showResult()">
              {{ 'exercises.finish' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── RESULT ─────────────────────────────────────────── -->
      <div class="result-panel" *ngIf="step() === 'result'">
        <div class="result-card">
          <h2>{{ 'exercises.result' | translate }}</h2>
          <div class="score-display">
            <span class="score-number">{{ session()!.correct }}</span>
            <span class="score-sep">/</span>
            <span class="score-total">{{ session()!.words.length }}</span>
          </div>
          <p class="score-label">{{ 'exercises.score' | translate:{ correct: session()!.correct, total: session()!.words.length } }}</p>

          <div class="answers-review">
            <div *ngFor="let a of session()!.answers" class="answer-item" [class.answer-item--correct]="a.correct" [class.answer-item--wrong]="!a.correct">
              <span class="answer-item__lemma">{{ getWordLemma(a.wordId) }}</span>
              <span class="answer-item__user">{{ a.userAnswer }}</span>
              <span class="answer-item__expected" *ngIf="!a.correct">→ {{ a.expectedAnswer }}</span>
            </div>
          </div>

          <div class="result-actions">
            <button class="btn btn--ghost" (click)="resetExercise()">
              {{ 'exercises.restart' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .exercises-page { max-width: 700px; margin: 0 auto; }
    .setup-card, .question-card, .result-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: 2rem;
    }
    .exercise-types {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;
      margin: 1.25rem 0;
    }
    .type-btn {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 1rem; border: 2px solid var(--color-border);
      border-radius: var(--radius-lg); background: transparent;
      cursor: pointer; font-size: 0.9rem; font-weight: 500;
      color: var(--color-text); transition: all 0.15s;
    }
    .type-btn:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
    .type-btn--active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
    .type-btn__icon { font-size: 1.5rem; }
    .exercise-filters { margin: 1.5rem 0; }
    .exercise-filters h3 { font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--color-text-muted); }
    .filter-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .filter-row label { min-width: 120px; font-size: 0.85rem; }
    .form-select { flex: 1; padding: 0.4rem 0.6rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); }
    .exercise-word-count { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.5rem; }
    .no-words-msg { color: var(--color-danger); font-size: 0.85rem; margin-top: 0.5rem; text-align: center; }
    .progress-bar { height: 4px; background: var(--color-border); border-radius: 2px; margin-bottom: 0.75rem; }
    .progress-bar__fill { height: 100%; background: var(--color-primary); border-radius: 2px; transition: width 0.3s; }
    .question-counter { text-align: right; font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 1rem; }
    .question-prompt { font-size: 0.95rem; color: var(--color-text-muted); margin-bottom: 1.25rem; }
    .word-display {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 1.5rem; justify-content: center;
    }
    .word-display__lemma { color: var(--color-text); font-size: 2rem; font-weight: 700; }
    .article-badge {
      font-size: 1rem; font-weight: 700; padding: 0.2rem 0.6rem;
      border-radius: var(--radius-sm); color: white;
    }
    .article-badge--der { background: var(--color-der); }
    .article-badge--die { background: var(--color-die); }
    .article-badge--das { background: var(--color-das); }
    .answer-input {
      width: 100%; padding: 0.75rem 1rem; font-size: 1rem;
      border: 2px solid var(--color-border); border-radius: var(--radius-lg);
      background: var(--color-surface); color: var(--color-text);
      margin-bottom: 1rem;
    }
    .answer-input:focus { outline: none; border-color: var(--color-primary); }
    .article-buttons { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem; }
    .article-btn {
      padding: 0.75rem 2rem; font-size: 1.1rem; font-weight: 700;
      border: 2px solid var(--color-border); border-radius: var(--radius-lg);
      background: transparent; cursor: pointer; color: var(--color-text);
      transition: all 0.15s;
    }
    .article-btn--selected { border-color: var(--color-primary); background: var(--color-primary-light); }
    .article-btn--correct { border-color: var(--color-success) !important; background: var(--color-success-light) !important; color: var(--color-success) !important; }
    .article-btn--wrong { border-color: var(--color-danger) !important; background: var(--color-danger-light) !important; color: var(--color-danger) !important; }
    .article-btn--der:hover { border-color: var(--color-der); }
    .article-btn--die:hover { border-color: var(--color-die); }
    .article-btn--das:hover { border-color: var(--color-das); }
    .feedback { text-align: center; margin-bottom: 1rem; }
    .feedback__badge {
      display: inline-block; padding: 0.3rem 1rem;
      border-radius: var(--radius-lg); font-weight: 600; font-size: 0.9rem;
    }
    .feedback__badge--correct { background: var(--color-success-light); color: var(--color-success); }
    .feedback__badge--wrong { background: var(--color-danger-light); color: var(--color-danger); }
    .feedback__expected { color: var(--color-text-muted); font-size: 0.9rem; margin-top: 0.35rem; }
    .question-actions { display: flex; justify-content: center; margin-top: 1rem; }
    .score-display {
      display: flex; align-items: baseline; justify-content: center;
      gap: 0.25rem; margin: 1.5rem 0 0.5rem;
    }
    .score-number { font-size: 3.5rem; font-weight: 800; color: var(--color-primary); }
    .score-sep { font-size: 2rem; color: var(--color-text-muted); }
    .score-total { font-size: 2rem; color: var(--color-text-muted); }
    .score-label { text-align: center; color: var(--color-text-muted); margin-bottom: 1.5rem; }
    .answers-review { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.5rem; }
    .answer-item {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.75rem; border-radius: var(--radius-md);
      font-size: 0.875rem;
    }
    .answer-item--correct { background: var(--color-success-light); }
    .answer-item--wrong { background: var(--color-danger-light); }
    .answer-item__lemma { font-weight: 600; min-width: 100px; }
    .answer-item__user { color: var(--color-text-muted); }
    .answer-item__expected { color: var(--color-danger); font-weight: 500; }
    .result-actions { display: flex; justify-content: center; }
    .btn--lg { padding: 0.75rem 2rem; font-size: 1rem; }
    @media (max-width: 600px) {
      .setup-card, .question-card, .result-card { padding: 1rem; border-radius: var(--radius-lg); }
      .exercise-types { grid-template-columns: 1fr 1fr; gap: 0.5rem; }
      .type-btn { padding: 0.75rem 0.4rem; font-size: 0.8rem; }
      .filter-row { align-items: stretch; flex-direction: column; gap: 0.25rem; }
      .filter-row label { min-width: 0; }
      .word-display { margin: 1.25rem 0; }
      .word-display__lemma { font-size: 1.6rem; overflow-wrap: anywhere; }
      .answer-item { align-items: flex-start; flex-wrap: wrap; }
      .answer-item__lemma { min-width: 0; width: 100%; }
      .question-actions .btn { width: 100%; }
    }
  `],
})
export class ExercisesComponent {
  private vocab = inject(VocabularyService);
  private exerciseSvc = inject(ExerciseService);
  private translator = inject(TranslatorService);
  private highlights = inject(HighlightService);

  step = signal<ExerciseStep>('setup');
  selectedType = signal<ExerciseType>('translation');
  userAnswer = '';
  answered = signal(false);
  exerciseDomainId = '';
  exerciseSetId = '';

  domains = this.vocab.domains;
  sets = this.vocab.sets;
  session = this.exerciseSvc.session;
  articles: Article[] = ['der', 'die', 'das'];

  exerciseTypes = [
    { id: 'translation' as ExerciseType, labelKey: 'exercises.translation', icon: 'bi-translate' },
    { id: 'article' as ExerciseType, labelKey: 'exercises.article', icon: 'bi-bookmark-star' },
    { id: 'plural' as ExerciseType, labelKey: 'exercises.plural', icon: 'bi-collection' },
    { id: 'pronunciation' as ExerciseType, labelKey: 'exercises.pronunciation', icon: 'bi-music-note-beamed' },
  ];

  private exerciseFilter = signal<FilterState>({ ...DEFAULT_FILTER });

  exerciseWordCount = computed(() =>
    this.vocab.getWordsForFilter(this.exerciseFilter()).length
  );

  currentWord = computed(() => this.exerciseSvc.getCurrentWord());

  highlightedLetters(word: import('../../core/models/vocabulary.models').Word) {
    return this.highlights.lettersFor(word);
  }

  questionNumber = computed(() => {
    const s = this.session();
    return s ? s.currentIndex + 1 : 0;
  });

  progressPercent = computed(() => {
    const s = this.session();
    if (!s) return 0;
    return ((s.currentIndex + (this.answered() ? 1 : 0)) / s.words.length) * 100;
  });

  lastAnswerCorrect = computed(() => {
    const s = this.session();
    return s?.answers.at(-1)?.correct ?? false;
  });

  currentPronunciationQuestion = computed(() => {
    const w = this.currentWord();
    if (!w) return '';
    // Rotate question type based on word index
    const s = this.session();
    if (!s) return '';
    const idx = s.currentIndex % 3;
    if (idx === 0) return this.translator.t('exercises.pronunciation_long');
    if (idx === 1) return this.translator.t('exercises.pronunciation_umlaut');
    return this.translator.t('exercises.pronunciation_short');
  });

  updateExerciseFilter(): void {
    const f: FilterState = { ...DEFAULT_FILTER };
    if (this.exerciseDomainId) f.domains = [this.exerciseDomainId];
    if (this.exerciseSetId) f.sets = [this.exerciseSetId];
    this.exerciseFilter.set(f);
  }

  startExercise(): void {
    const started = this.exerciseSvc.startSession(this.selectedType(), this.exerciseFilter());
    if (started) {
      this.step.set('playing');
      this.answered.set(false);
      this.userAnswer = '';
    }
  }

  selectArticle(value: string): void {
    if (this.answered()) return;
    this.userAnswer = value;
    this.checkAnswer();
  }

  checkAnswer(): void {
    if (!this.userAnswer || this.answered()) return;

    this.exerciseSvc.submitAnswer(this.userAnswer);
    this.answered.set(true);
  }

  nextQuestion(): void {
    this.exerciseSvc.nextQuestion();
    this.answered.set(false);
    this.userAnswer = '';
  }

  isFinished(): boolean {
    return this.exerciseSvc.isFinished();
  }

  showResult(): void {
    this.step.set('result');
  }

  resetExercise(): void {
    this.exerciseSvc.resetSession();
    this.step.set('setup');
    this.answered.set(false);
    this.userAnswer = '';
  }

  getWordLemma(id: string): string {
    return this.vocab.getWordById(id)?.lemma ?? id;
  }
}
