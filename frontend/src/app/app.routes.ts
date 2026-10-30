import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Cabaña Primavera · Glamping en San Félix, Bello',
    loadComponent: () => import('./paginas/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'reservar',
    title: 'Reservar · Cabaña Primavera',
    loadComponent: () => import('./paginas/reservar/reservar').then((m) => m.Reservar),
  },
  { path: '**', redirectTo: '' },
];
