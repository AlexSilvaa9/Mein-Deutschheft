import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'vocabulary', pathMatch: 'full' },
  {
    path: 'vocabulary',
    loadComponent: () => import('./features/vocabulary/vocabulary.component').then(m => m.VocabularyComponent),
  },
  {
    path: 'vocabulary/:id',
    loadComponent: () => import('./features/word-detail/word-detail.component').then(m => m.WordDetailComponent),
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent),
  },
  {
    path: 'exercises',
    loadComponent: () => import('./features/exercises/exercises.component').then(m => m.ExercisesComponent),
  },
  {
    path: 'manage',
    loadComponent: () => import('./features/manage/manage.component').then(m => m.ManageComponent),
  },
  {
    path: 'manage/new-word',
    loadComponent: () => import('./features/manage/manage.component').then(m => m.ManageComponent),
    data: { openWordForm: true },
  },
  { path: '**', redirectTo: 'vocabulary' },
];
