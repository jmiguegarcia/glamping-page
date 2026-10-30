import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Render en el servidor en cada visita (no prerender al compilar): las páginas
    // muestran precios y disponibilidad que vienen de la API y pueden cambiar.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
