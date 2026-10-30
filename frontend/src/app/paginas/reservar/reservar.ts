import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, email, form, maxLength, minLength, pattern, required } from '@angular/forms/signals';
import { CatalogoService } from '../../core/catalogo';
import {
  Cotizacion,
  DisponibilidadDia,
  ReservaCreada,
  ReservasApi,
  TipoReserva,
  URL_COTIZAR,
  mensajeDeError,
  urlDisponibilidad,
} from '../../core/reservas-api';
import {
  FechaISO,
  diaSemana,
  diasEntre,
  fechaCorta,
  fechaLarga,
  finDeMes,
  hoyEnColombia,
  inicioDeMes,
  sumarDias,
  sumarMeses,
} from '../../compartido/fechas';
import { horaLegible } from '../../compartido/formato';
import { PesosPipe } from '../../compartido/pesos.pipe';
import { Calendario, EstadoDia } from './calendario/calendario';

const TIPOS: { tipo: TipoReserva; nombre: string; detalle: string }[] = [
  { tipo: 'ESTADIA', nombre: 'Estadía', detalle: 'Una o más noches' },
  { tipo: 'DIA_DE_SOL', nombre: 'Día de sol', detalle: 'Un día, sin noche' },
  { tipo: 'OCASIONAL', nombre: 'Ocasional', detalle: 'Unas horas' },
];

const esTipo = (valor: string | undefined): valor is TipoReserva => TIPOS.some((t) => t.tipo === valor);

/** Formato de teléfono que acepta el backend (crear-reserva.dto.ts). */
const PATRON_TELEFONO = /^\+?[\d\s-]{7,20}$/;

@Component({
  selector: 'app-reservar',
  imports: [RouterLink, FormRoot, FormField, PesosPipe, Calendario],
  templateUrl: './reservar.html',
  styleUrl: './reservar.scss',
})
export class Reservar {
  private readonly api = inject(ReservasApi);
  private readonly catalogo = inject(CatalogoService).datos;

  /** Llega desde la URL: /reservar?tipo=ESTADIA (gracias a withComponentInputBinding). */
  readonly tipo = input<string>();

  protected readonly tipos = TIPOS;
  protected readonly hoy = hoyEnColombia();
  protected readonly mesMinimo = inicioDeMes(this.hoy);
  protected readonly mesMaximo = sumarMeses(this.mesMinimo, 11);

  // ─── Elecciones del cliente ───
  // linkedSignal: empieza con un valor calculado y se reinicia cuando cambia su fuente,
  // pero también se puede modificar a mano. Si cambia el tipo, se borran las fechas.

  protected readonly tipoElegido = linkedSignal<TipoReserva>(() => {
    const desdeUrl = this.tipo();
    return esTipo(desdeUrl) ? desdeUrl : 'ESTADIA';
  });
  protected readonly entrada = linkedSignal<TipoReserva, FechaISO | undefined>({
    source: this.tipoElegido,
    computation: () => undefined,
  });
  protected readonly salida = linkedSignal<TipoReserva, FechaISO | undefined>({
    source: this.tipoElegido,
    computation: () => undefined,
  });
  protected readonly hora = linkedSignal<FechaISO | undefined, string | undefined>({
    source: this.entrada,
    computation: () => undefined,
  });
  protected readonly mes = signal(this.mesMinimo);
  protected readonly servicios = signal<string[]>([]);

  // ─── Datos del catálogo ───

  protected readonly cabana = computed(() => this.catalogo.value()?.alojamientos[0]);
  /** La cabaña siempre se reserva para su capacidad completa (2 personas). */
  protected readonly huespedes = computed(() => this.cabana()?.capacidad ?? 2);
  protected readonly listaServicios = computed(() => this.catalogo.value()?.servicios ?? []);
  private readonly horarios = computed(() => this.catalogo.value()?.horarios);

  protected readonly precioPorTipo = computed<Record<TipoReserva, number | undefined>>(() => {
    const t = this.cabana()?.tarifas ?? {};
    const noches = [t.NOCHE_ENTRE_SEMANA, t.NOCHE_FIN_DE_SEMANA].filter((p) => p !== undefined);
    return {
      ESTADIA: noches.length ? Math.min(...noches) : undefined,
      DIA_DE_SOL: t.DIA_DE_SOL,
      OCASIONAL: t.OCASIONAL,
    };
  });

  // ─── Disponibilidad ───
  // Se piden el mes anterior, el visible y el siguiente: así una estadía que empieza en
  // un mes y termina en otro se puede validar completa.

  private readonly disponibilidad = httpResource<{ dias: DisponibilidadDia[] }>(() =>
    urlDisponibilidad(sumarMeses(this.mes(), -1), finDeMes(sumarMeses(this.mes(), 1))),
  );

  private readonly dias = computed(() => {
    const mapa = new Map<FechaISO, DisponibilidadDia>();
    for (const dia of this.disponibilidad.value()?.dias ?? []) mapa.set(dia.fecha, dia);
    return mapa;
  });

  protected readonly errorDisponibilidad = computed(() =>
    this.disponibilidad.error() ? mensajeDeError(this.disponibilidad.error()) : undefined,
  );

  /** Qué días se pueden tocar en el calendario según el tipo y lo ya elegido. */
  protected readonly estadoDia = computed<(fecha: FechaISO) => EstadoDia>(() => {
    const tipo = this.tipoElegido();
    const dias = this.dias();
    const entrada = tipo === 'ESTADIA' ? this.entrada() : undefined;
    const horarios = this.horarios();

    return (fecha) => {
      if (fecha < this.hoy) return 'pasado';
      const dia = dias.get(fecha);
      if (!dia) return 'cargando';

      switch (tipo) {
        case 'ESTADIA':
          // Con llegada elegida, un día posterior es una salida posible (aunque esa noche
          // esté ocupada: se sale en la mañana). Si no, solo sirve como nueva llegada.
          if (entrada && fecha > entrada && this.salidaValida(entrada, fecha)) return 'libre';
          return dia.noche ? 'libre' : 'ocupado';
        case 'DIA_DE_SOL':
          if (horarios && !horarios.diaDeSol.dias.includes(diaSemana(fecha))) return 'no-aplica';
          return dia.diaDeSol ? 'libre' : 'ocupado';
        case 'OCASIONAL':
          return dia.ocasional.length ? 'libre' : 'ocupado';
      }
    };
  });

  protected readonly horasDisponibles = computed(() => {
    const entrada = this.entrada();
    const duracion = this.horarios()?.ocasional.duracionHoras ?? 4;
    if (this.tipoElegido() !== 'OCASIONAL' || !entrada) return [];
    return (this.dias().get(entrada)?.ocasional ?? []).map((hora) => ({
      hora,
      texto: `${horaLegible(hora)} – ${horaLegible(sumarHoras(hora, duracion))}`,
    }));
  });

  protected readonly instruccionFechas = computed(() => {
    const h = this.horarios();
    switch (this.tipoElegido()) {
      case 'ESTADIA':
        if (!this.entrada()) return 'Toca el día de llegada. Te reservamos una noche y puedes alargarla.';
        return 'Para quedarte más noches, toca el día en que quieres salir.';
      case 'DIA_DE_SOL':
        return h ? `Elige el día. Horario: ${horaLegible(h.diaDeSol.inicio)} a ${horaLegible(h.diaDeSol.fin)}.` : 'Elige el día.';
      case 'OCASIONAL':
        return this.entrada() ? 'Ahora elige la hora de inicio.' : 'Elige el día.';
    }
  });

  // ─── Cotización en vivo ───
  // Cuando la elección está completa, el backend calcula el precio y confirma que sigue libre.

  private readonly solicitud = computed(() => {
    const tipo = this.tipoElegido();
    const fechaEntrada = this.entrada();
    if (!fechaEntrada) return undefined;
    if (tipo === 'ESTADIA' && !this.salida()) return undefined;
    if (tipo === 'OCASIONAL' && !this.hora()) return undefined;
    return {
      tipo,
      fechaEntrada,
      fechaSalida: tipo === 'ESTADIA' ? this.salida() : undefined,
      horaInicio: tipo === 'OCASIONAL' ? this.hora() : undefined,
      huespedes: this.huespedes(),
      servicios: this.servicios(),
    };
  });

  protected readonly cotizacion = httpResource<Cotizacion>(() => {
    const cuerpo = this.solicitud();
    return cuerpo ? { url: URL_COTIZAR, method: 'POST', body: cuerpo } : undefined;
  });

  protected readonly errorCotizacion = computed(() =>
    this.cotizacion.error() ? mensajeDeError(this.cotizacion.error()) : undefined,
  );

  protected readonly resumenFechas = computed(() => {
    const entrada = this.entrada();
    if (!entrada) return undefined;
    const h = this.horarios();
    switch (this.tipoElegido()) {
      case 'ESTADIA': {
        const salida = this.salida();
        if (!salida) return `Llegada: ${fechaLarga(entrada)}`;
        const noches = diasEntre(entrada, salida);
        return `${fechaCorta(entrada)} → ${fechaCorta(salida)} · ${noches} ${noches === 1 ? 'noche' : 'noches'}`;
      }
      case 'DIA_DE_SOL':
        return `${fechaLarga(entrada)}${h ? ` · ${horaLegible(h.diaDeSol.inicio)} a ${horaLegible(h.diaDeSol.fin)}` : ''}`;
      case 'OCASIONAL': {
        const hora = this.hora();
        const elegida = this.horasDisponibles().find((h) => h.hora === hora);
        return `${fechaLarga(entrada)}${elegida ? ` · ${elegida.texto}` : ''}`;
      }
    }
  });

  protected readonly unidadServicio = computed(() =>
    this.tipoElegido() === 'ESTADIA' ? 'por noche' : 'una vez',
  );

  // ─── Datos del cliente (Signal Forms) ───

  protected readonly modeloDatos = signal({ nombre: '', email: '', telefono: '', notas: '' });

  protected readonly datos = form(
    this.modeloDatos,
    (campo) => {
      required(campo.nombre, { message: 'Escribe tu nombre.' });
      minLength(campo.nombre, 3, { message: 'El nombre debe tener al menos 3 letras.' });
      maxLength(campo.nombre, 100, { message: 'El nombre es demasiado largo.' });
      required(campo.email, { message: 'Escribe tu correo.' });
      email(campo.email, { message: 'Revisa el correo: no parece válido.' });
      required(campo.telefono, { message: 'Escribe tu celular o WhatsApp.' });
      pattern(campo.telefono, PATRON_TELEFONO, { message: 'Escribe solo números, por ejemplo 300 123 4567.' });
      maxLength(campo.notas, 500, { message: 'Las notas pueden tener máximo 500 caracteres.' });
    },
    { submission: { action: () => this.crearReserva() } },
  );

  /** Hay precio calculado y el horario sigue libre. */
  private readonly cotizacionLista = computed(() => this.cotizacion.hasValue() && this.cotizacion.value().disponible);

  // Para el botón: además, no debe haber un envío en curso. (No usar dentro del envío,
  // donde submitting() ya es true.)
  protected readonly puedeConfirmar = computed(() => this.cotizacionLista() && !this.datos().submitting());

  protected readonly errorEnvio = signal<string | undefined>(undefined);
  protected readonly reserva = signal<ReservaCreada | undefined>(undefined);

  // ─── Acciones ───

  protected elegirTipo(tipo: TipoReserva) {
    this.tipoElegido.set(tipo);
  }

  protected elegirFecha(fecha: FechaISO) {
    if (this.tipoElegido() !== 'ESTADIA') {
      this.entrada.set(fecha);
      return;
    }

    const entrada = this.entrada();
    if (entrada && fecha > entrada && this.salidaValida(entrada, fecha)) {
      this.salida.set(fecha); // alarga (o acorta) la estadía
    } else {
      // Nueva llegada: por defecto una noche, para mostrar el precio de inmediato.
      this.entrada.set(fecha);
      this.salida.set(sumarDias(fecha, 1));
    }
  }

  protected borrarFechas() {
    this.entrada.set(undefined);
    this.salida.set(undefined);
  }

  protected alternarServicio(slug: string) {
    this.servicios.update((lista) => (lista.includes(slug) ? lista.filter((s) => s !== slug) : [...lista, slug]));
  }

  private async crearReserva() {
    const solicitud = this.solicitud();
    if (!solicitud || !this.cotizacionLista()) {
      this.errorEnvio.set('Completa las fechas para poder confirmar.');
      return;
    }
    this.errorEnvio.set(undefined);
    const { nombre, email, telefono, notas } = this.modeloDatos();
    try {
      const reserva = await this.api.crear({ ...solicitud, nombre, email, telefono, notas: notas || undefined });
      this.reserva.set(reserva);
      window.scrollTo({ top: 0 });
    } catch (error) {
      this.errorEnvio.set(mensajeDeError(error));
      // Si alguien más tomó el horario, refrescamos para que el calendario lo muestre ocupado.
      this.disponibilidad.reload();
      this.cotizacion.reload();
    }
  }

  // ─── Ayudas ───

  /** ¿Se puede salir ese día? Todas las noches intermedias deben estar libres. */
  private salidaValida(entrada: FechaISO, salida: FechaISO): boolean {
    const noches = diasEntre(entrada, salida);
    if (noches > (this.horarios()?.estadia.maxNoches ?? 14)) return false;
    for (let f = entrada; f < salida; f = sumarDias(f, 1)) {
      if (!this.dias().get(f)?.noche) return false;
    }
    return true;
  }

  protected readonly fechaLarga = fechaLarga;
  protected readonly horaLegible = horaLegible;
  protected horaLimite(iso: string | null): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(
      new Date(iso),
    );
  }
}

/** ("14:00", 4) → "18:00" */
function sumarHoras(hhmm: string, horas: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String(h + horas).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
