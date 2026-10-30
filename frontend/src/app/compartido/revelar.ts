import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Hace aparecer suavemente un elemento cuando entra en pantalla al hacer scroll.
 * Uso: <section appRevelar>...</section>
 *
 * Solo actúa en el navegador y solo sobre elementos que están fuera de la pantalla
 * al cargar: lo visible al inicio nunca se oculta, y sin JavaScript todo se ve.
 * Respeta "reducir movimiento" del sistema operativo.
 *
 * Revisa la posición en cada scroll (y no con IntersectionObserver): si alguien baja
 * muy rápido o salta con un enlace del menú, el elemento puede pasar de "debajo" a
 * "encima" de la pantalla sin llegar a cruzarla, y el observador nunca lo revelaría.
 * Aquí se revela todo lo que ya entró o quedó atrás.
 */
@Directive({ selector: '[appRevelar]' })
export class Revelar {
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const destruir = inject(DestroyRef);

    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (this.yaLlego()) return; // visible desde el inicio: no se oculta

      this.elemento.classList.add('revelar-oculto');

      let pendiente = false;
      const revisar = () => {
        pendiente = false;
        if (!this.yaLlego()) return;
        this.elemento.classList.replace('revelar-oculto', 'revelar-visible');
        quitar();
      };
      // Como mucho una revisión por cuadro de animación, aunque lleguen muchos eventos.
      const alMoverse = () => {
        if (!pendiente) {
          pendiente = true;
          requestAnimationFrame(revisar);
        }
      };
      const quitar = () => {
        removeEventListener('scroll', alMoverse);
        removeEventListener('resize', alMoverse);
      };

      addEventListener('scroll', alMoverse, { passive: true });
      addEventListener('resize', alMoverse, { passive: true });
      destruir.onDestroy(quitar);
    });
  }

  /** ¿El borde superior ya entró en la pantalla (o quedó arriba)? */
  private yaLlego(): boolean {
    return this.elemento.getBoundingClientRect().top < innerHeight - 40;
  }
}
