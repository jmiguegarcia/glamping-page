import { Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../core/catalogo';
import { describirDias, formatearPesos, horaLegible } from '../../compartido/formato';
import { PesosPipe } from '../../compartido/pesos.pipe';
import { Revelar } from '../../compartido/revelar';

interface Experiencia {
  tipo: 'ESTADIA' | 'DIA_DE_SOL' | 'OCASIONAL';
  titulo: string;
  foto: string;
  alt: string;
  descripcion: string;
  // Lo siguiente viene de la API; si no responde, la tarjeta se muestra sin estos datos.
  horario?: string;
  dias?: string;
  precio?: number;
  unidad: string;
  nota?: string;
}

interface Foto {
  nombre: string;
  alt: string;
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

@Component({
  selector: 'app-inicio',
  imports: [NgOptimizedImage, RouterLink, PesosPipe, Revelar],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly catalogo = inject(CatalogoService).datos;

  protected readonly cargando = this.catalogo.isLoading;
  protected readonly cabana = computed(() => this.catalogo.value()?.alojamientos[0]);
  protected readonly servicios = computed(() => this.catalogo.value()?.servicios ?? []);

  /** Precio más bajo de todas las tarifas, para el "desde" de la portada. */
  protected readonly precioDesde = computed(() => {
    const precios = Object.values(this.cabana()?.tarifas ?? {});
    return precios.length ? Math.min(...precios) : undefined;
  });

  protected readonly experiencias = computed<Experiencia[]>(() => {
    const c = this.catalogo.value();
    const tarifas = this.cabana()?.tarifas ?? {};
    const h = c?.horarios;
    const noches = [tarifas.NOCHE_ENTRE_SEMANA, tarifas.NOCHE_FIN_DE_SEMANA].filter((p) => p !== undefined);

    return [
      {
        tipo: 'ESTADIA',
        titulo: 'Noche en la cabaña',
        foto: 'habitacion',
        alt: 'Cama doble en la cabaña de madera',
        descripcion: 'Llega en la tarde, mira caer el sol desde el jacuzzi y despierta con el valle bajo las nubes.',
        horario: h && `Entrada ${horaLegible(h.estadia.checkIn)} · Salida ${horaLegible(h.estadia.checkOut)}`,
        dias: h && 'Todos los días',
        precio: noches.length ? Math.min(...noches) : undefined,
        unidad: 'por noche',
        nota:
          h && tarifas.NOCHE_FIN_DE_SEMANA
            ? `Noches ${describirDias(h.estadia.diasTarifaFinDeSemana)}: ${formatearPesos(tarifas.NOCHE_FIN_DE_SEMANA)}`
            : undefined,
      },
      {
        tipo: 'DIA_DE_SOL',
        titulo: 'Día de sol',
        foto: 'terraza-mesa-vista',
        alt: 'Mesa para dos en la terraza con vista a las montañas',
        descripcion: 'Un día para ti: jacuzzi, malla mirador y Medellín vista desde arriba, sin pasar la noche.',
        horario: h && `${mayuscula(horaLegible(h.diaDeSol.inicio))} a ${horaLegible(h.diaDeSol.fin)}`,
        dias: h && mayuscula(describirDias(h.diaDeSol.dias)),
        precio: tarifas.DIA_DE_SOL,
        unidad: 'por día',
      },
      {
        tipo: 'OCASIONAL',
        titulo: 'Ocasional',
        foto: 'vino-vista',
        alt: 'Botella de vino y copas en la mesa con vista al valle',
        descripcion: 'Unas horas para celebrar, sorprender a alguien o simplemente desconectarte.',
        horario:
          h &&
          `${h.ocasional.duracionHoras} horas, entre ${horaLegible(h.ocasional.inicioMasTemprano)} y ${horaLegible(h.ocasional.finMasTardio)}`,
        dias: h && mayuscula(describirDias(h.ocasional.dias)),
        precio: tarifas.OCASIONAL,
        unidad: h ? `por ${h.ocasional.duracionHoras} horas` : '',
      },
    ];
  });

  /** "Bueno saber": horarios y política de cancelación en lenguaje natural. */
  protected readonly bueno = computed(() => {
    const c = this.catalogo.value();
    if (!c) return [];
    const [total, parcial] = c.politicaCancelacion;
    return [
      { titulo: 'Entrada', texto: `${horaLegible(c.horarios.estadia.checkIn)} en estadías` },
      { titulo: 'Salida', texto: `${horaLegible(c.horarios.estadia.checkOut)} del día siguiente` },
      {
        titulo: 'Cancelación',
        texto:
          `${total.porcentajeReembolso}% de reembolso con ${total.horasMinimas} h de anticipación` +
          (parcial ? `, ${parcial.porcentajeReembolso}% con ${parcial.horasMinimas} h` : ''),
      },
      { titulo: 'Pago', texto: 'En línea al reservar' },
    ];
  });

  // El orden importa: 1.ª alta a la izquierda, 2.ª y 3.ª a la derecha, 4.ª panorámica abajo.
  protected readonly galeriaDia: Foto[] = [
    { nombre: 'interior-ventanal', alt: 'Ventanal de la cabaña con cielo azul y montañas' },
    { nombre: 'habitacion', alt: 'Interior de madera con cama doble' },
    { nombre: 'terraza-dia-vista', alt: 'Terraza con jacuzzi, mesa y vista a Medellín' },
    { nombre: 'malla-mirador', alt: 'Malla mirador colgante sobre el valle de Aburrá' },
  ];

  protected readonly galeriaNoche: Foto[] = [
    { nombre: 'jacuzzi-atardecer', alt: 'Jacuzzi iluminado al anochecer con la ciudad al fondo' },
    { nombre: 'cena-noche', alt: 'Cena servida en la terraza con las luces de Medellín' },
    { nombre: 'decoracion-romantica', alt: 'Cama decorada con pétalos, velas y flores' },
    { nombre: 'jacuzzi-noche-luces', alt: 'Terraza con luces de colores junto al jacuzzi' },
  ];

  protected readonly cinta = [
    'Jacuzzi privado',
    'Malla mirador',
    'Vista al valle de Aburrá',
    'Cenas románticas',
    'Día de sol',
    'Vía Bello – San Félix',
  ];

  protected readonly enlaceMapa =
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Glamping Cabaña Primavera San Félix Bello');
}
