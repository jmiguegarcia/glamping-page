import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pie',
  imports: [RouterLink, NgOptimizedImage],
  template: `
    <div class="contenedor pie">
      <div class="marca">
        <img ngSrc="logo" width="88" height="88" alt="Logo de Glamping Cabaña Primavera" class="logo" />
        <div>
          <p class="nombre">Cabaña Primavera</p>
          <p class="lugar">Vía Bello – San Félix, Antioquia</p>
        </div>
      </div>

      <nav aria-label="Pie de página">
        <a routerLink="/" fragment="experiencias">Experiencias</a>
        <a routerLink="/" fragment="servicios">Servicios</a>
        <a routerLink="/reservar">Reservar</a>
        <a href="https://www.instagram.com/cabana_primavera" target="_blank" rel="noopener">Instagram</a>
      </nav>

      <p class="legal">© {{ anio }} Glamping Cabaña Primavera</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--noche);
      color: var(--crema-noche-suave);
      padding-block: 56px 32px;
    }

    .pie {
      display: grid;
      gap: 2rem;
      grid-template-columns: 1fr auto;
      align-items: center;
    }

    .marca {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo {
      border-radius: 50%;
      object-fit: cover;
      transform: scale(1.04);
    }

    .nombre {
      font-family: var(--fuente-titulo);
      font-size: 1.4rem;
      color: var(--crema-noche);
    }

    .lugar {
      font-size: 0.9rem;
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
    }

    a {
      color: var(--crema-noche);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
        text-underline-offset: 4px;
      }
    }

    .legal {
      grid-column: 1 / -1;
      padding-top: 1.5rem;
      border-top: 1px solid var(--linea-noche);
      font-size: 0.82rem;
    }

    @media (max-width: 700px) {
      .pie {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Pie {
  protected readonly anio = new Date().getFullYear();
}
