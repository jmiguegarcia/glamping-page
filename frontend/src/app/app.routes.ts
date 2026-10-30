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
  {
    // Wompi devuelve aquí al cliente después de pagar: /reserva/CP-7K3M9Q/pago?id=<transacción>
    path: 'reserva/:codigo/pago',
    title: 'Pago · Cabaña Primavera',
    loadComponent: () => import('./paginas/pago/resultado-pago').then((m) => m.ResultadoPago),
  },
  { path: '**', redirectTo: '' },
];
