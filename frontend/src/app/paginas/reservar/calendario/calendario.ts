import { Component, computed, input, model, output } from '@angular/core';
import { FechaISO, fechaLarga, nombreMes, semanasDelMes, sumarMeses } from '../../../compartido/fechas';

export type EstadoDia = 'libre' | 'ocupado' | 'no-aplica' | 'pasado' | 'cargando';

const DESCRIPCION: Record<EstadoDia, string> = {
  libre: 'disponible',
  ocupado: 'no disponible',
  'no-aplica': 'no aplica para esta opción',
  pasado: 'fecha pasada',
  cargando: 'cargando disponibilidad',
};

/**
 * Calendario de un mes. No sabe nada de reservas: quien lo usa le dice qué estado
 * tiene cada día (`estadoDia`) y qué rango está seleccionado (`desde` / `hasta`).
 */
@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.html',
  styleUrl: './calendario.scss',
})
export class Calendario {
  /** Primer día del mes visible ("2026-12-01"). Se puede enlazar con [(mes)]. */
  readonly mes = model.required<FechaISO>();
  readonly minMes = input.required<FechaISO>();
  readonly maxMes = input.required<FechaISO>();
  readonly estadoDia = input.required<(fecha: FechaISO) => EstadoDia>();
  readonly desde = input<FechaISO>();
  readonly hasta = input<FechaISO>();

  readonly elegir = output<FechaISO>();

  protected readonly semanas = computed(() => semanasDelMes(this.mes()));
  protected readonly titulo = computed(() => nombreMes(this.mes()));
  protected readonly puedeRetroceder = computed(() => this.mes() > this.minMes());
  protected readonly puedeAvanzar = computed(() => this.mes() < this.maxMes());

  protected readonly diasSemana = [
    { corto: 'lu', largo: 'lunes' },
    { corto: 'ma', largo: 'martes' },
    { corto: 'mi', largo: 'miércoles' },
    { corto: 'ju', largo: 'jueves' },
    { corto: 'vi', largo: 'viernes' },
    { corto: 'sá', largo: 'sábado' },
    { corto: 'do', largo: 'domingo' },
  ];

  protected mover(meses: number) {
    this.mes.update((m) => sumarMeses(m, meses));
  }

  protected etiqueta(fecha: FechaISO, estado: EstadoDia): string {
    const seleccion =
      fecha === this.desde() ? ', inicio seleccionado' : fecha === this.hasta() ? ', fin seleccionado' : '';
    return `${fechaLarga(fecha)}, ${DESCRIPCION[estado]}${seleccion}`;
  }

  protected enRango(fecha: FechaISO): boolean {
    const desde = this.desde();
    const hasta = this.hasta();
    return !!desde && !!hasta && fecha > desde && fecha < hasta;
  }

  /** "2026-12-05" → "5" */
  protected numero(fecha: FechaISO): number {
    return Number(fecha.slice(8));
  }
}
