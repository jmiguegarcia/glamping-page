import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Encabezado } from './layout/encabezado/encabezado';
import { Pie } from './layout/pie/pie';

@Component({
  imports: [RouterOutlet, Encabezado, Pie],
  selector: 'app-root',
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    <app-encabezado />
    <main id="contenido">
      <router-outlet />
    </main>
    <app-pie />
  `,
  styles: `
    // Enlace para quienes navegan con teclado: aparece solo al enfocarlo.
    .saltar {
      position: absolute;
      top: -100px;
      left: 16px;
      z-index: 100;
      padding: 0.75rem 1rem;
      background: var(--azul);
      color: var(--crema);
      border-radius: var(--radio);

      &:focus {
        top: 12px;
      }
    }
  `,
})
export class App {}
