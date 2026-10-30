import { Component, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-encabezado',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './encabezado.html',
  styleUrl: './encabezado.scss',
  host: {
    '[class.con-scroll]': 'conScroll()',
    '(window:scroll)': 'alHacerScroll()',
    '(document:keydown.escape)': 'menuAbierto.set(false)',
  },
})
export class Encabezado {
  protected readonly menuAbierto = signal(false);
  protected readonly conScroll = signal(false);

  // Solo se ejecuta en el navegador: en el servidor no hay eventos de scroll.
  protected alHacerScroll() {
    this.conScroll.set(window.scrollY > 8);
  }

  protected readonly enlaces = [
    { texto: 'Experiencias', fragmento: 'experiencias' },
    { texto: 'La cabaña', fragmento: 'cabana' },
    { texto: 'De noche', fragmento: 'noche' },
    { texto: 'Servicios', fragmento: 'servicios' },
    { texto: 'Ubicación', fragmento: 'ubicacion' },
  ];
}
