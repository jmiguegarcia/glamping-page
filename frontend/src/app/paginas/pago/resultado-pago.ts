import { Component, PLATFORM_ID, computed, effect, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ReservasApi, ResultadoPago as Resultado, mensajeDeError, urlResultadoPago } from '../../core/reservas-api';
import { PesosPipe } from '../../compartido/pesos.pipe';

type Estado = 'sin-pago' | 'consultando' | 'aprobado' | 'pendiente' | 'rechazado' | 'pagado-sin-cupo' | 'error';

/** Cada cuánto se vuelve a preguntar mientras el banco confirma (PSE puede tardar). */
const ESPERA_MS = 4000;
const MAX_CONSULTAS = 15; // ~1 minuto

/**
 * /reserva/:codigo/pago?id=<transacción de Wompi>
 * Wompi devuelve aquí al cliente. El estado real lo confirma el backend con Wompi.
 */
@Component({
  selector: 'app-resultado-pago',
  imports: [RouterLink, PesosPipe],
  templateUrl: './resultado-pago.html',
  styleUrl: './resultado-pago.scss',
})
export class ResultadoPago {
  private readonly api = inject(ReservasApi);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly codigo = input.required<string>(); // de la ruta
  readonly id = input<string>(); // ?id= que agrega Wompi

  protected readonly resultado = httpResource<Resultado>(() => {
    const id = this.id();
    return id ? urlResultadoPago(id) : undefined;
  });

  private readonly consultas = signal(0);
  protected readonly redirigiendo = signal(false);
  protected readonly errorReintento = signal<string | undefined>(undefined);

  protected readonly estado = computed<Estado>(() => {
    if (!this.id()) return 'sin-pago';
    if (this.resultado.error()) return 'error';
    if (!this.resultado.hasValue()) return 'consultando';
    const r = this.resultado.value();
    switch (r.estadoPago) {
      case 'APROBADO':
        return r.estadoReserva === 'CONFIRMADA' ? 'aprobado' : 'pagado-sin-cupo';
      case 'PENDIENTE':
        return 'pendiente';
      default:
        return 'rechazado';
    }
  });

  /** ¿Se puede volver a intentar el pago? Solo si la reserva sigue esperando pago. */
  protected readonly puedeReintentar = computed(
    () => this.resultado.hasValue() && this.resultado.value().estadoReserva === 'PENDIENTE_PAGO',
  );

  protected readonly seguiraConsultando = computed(() => this.consultas() < MAX_CONSULTAS);
  protected readonly mensajeError = computed(() => mensajeDeError(this.resultado.error()));

  constructor() {
    // Mientras el pago esté pendiente, se vuelve a consultar cada pocos segundos (solo en el navegador).
    effect((alLimpiar) => {
      if (!this.enNavegador || this.estado() !== 'pendiente' || !this.seguiraConsultando()) return;
      const temporizador = setTimeout(() => {
        this.consultas.update((n) => n + 1);
        this.resultado.reload();
      }, ESPERA_MS);
      alLimpiar(() => clearTimeout(temporizador));
    });
  }

  protected async reintentar() {
    this.errorReintento.set(undefined);
    this.redirigiendo.set(true);
    try {
      window.location.href = await this.api.iniciarPago(this.codigo());
    } catch (error) {
      this.errorReintento.set(mensajeDeError(error));
      this.redirigiendo.set(false);
    }
  }
}
