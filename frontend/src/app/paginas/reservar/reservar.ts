import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Marcador temporal: el flujo de reserva completo se construye en la etapa 6. */
@Component({
  selector: 'app-reservar',
  imports: [RouterLink],
  template: `
    <section class="seccion contenedor">
      <span class="etiqueta">Reservas</span>
      <h1>Muy pronto podrás <em>reservar aquí.</em></h1>
      @if (tipo()) {
        <p class="entradilla">Elegiste: {{ tipo() }}.</p>
      }
      <p class="entradilla">Estamos terminando el calendario y el pago en línea.</p>
      <a class="boton boton-borde" routerLink="/">Volver al inicio</a>
    </section>
  `,
  styles: `
    section {
      display: grid;
      gap: 1.5rem;
      justify-items: start;
      min-height: 60vh;
    }
  `,
})
export class Reservar {
  /** Llega desde la URL: /reservar?tipo=ESTADIA (gracias a withComponentInputBinding). */
  readonly tipo = input<string>();
}
