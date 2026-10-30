import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { IMAGE_CONFIG, IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

/**
 * Le dice a NgOptimizedImage dónde están las fotos: `ngSrc="habitacion"` →
 * /fotos/habitacion-640.webp en celulares o /fotos/habitacion.webp en pantallas grandes.
 * Las genera `npm run fotos`.
 */
function cargadorDeFotos({ src, width }: ImageLoaderConfig): string {
  const sufijo = width !== undefined && width <= 640 ? '-640' : '';
  return `/fotos/${src}${sufijo}.webp`;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    { provide: IMAGE_LOADER, useValue: cargadorDeFotos },
    // Solo existen dos tamaños de cada foto: no generar más opciones en el srcset.
    { provide: IMAGE_CONFIG, useValue: { breakpoints: [640, 1600] } },
  ],
};
