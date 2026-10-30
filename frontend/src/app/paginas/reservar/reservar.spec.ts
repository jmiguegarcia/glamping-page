import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture } from '@angular/core/testing';
import { Catalogo } from '../../core/catalogo';
import { DisponibilidadDia } from '../../core/reservas-api';
import { FechaISO, diaSemana, sumarDias } from '../../compartido/fechas';
import { Reservar } from './reservar';

// "Hoy" fijo: 1 de noviembre de 2026, 10 a. m. en Colombia.
const AHORA = new Date('2026-11-01T15:00:00Z');

const CATALOGO: Catalogo = {
  alojamientos: [
    {
      slug: 'cabana-primavera',
      nombre: 'Cabaña Primavera',
      descripcion: '',
      capacidad: 2,
      tarifas: { NOCHE_ENTRE_SEMANA: 320000, NOCHE_FIN_DE_SEMANA: 450000, DIA_DE_SOL: 250000, OCASIONAL: 120000 },
    },
  ],
  servicios: [{ slug: 'desayuno', nombre: 'Desayuno', descripcion: 'Típico', precio: 40000 }],
  horarios: {
    estadia: { checkIn: '16:00', checkOut: '11:00', maxNoches: 14, diasTarifaFinDeSemana: [5, 6, 0] },
    diaDeSol: { inicio: '08:00', fin: '14:00', dias: [1, 2, 3, 4, 5] },
    ocasional: { duracionHoras: 4, inicioMasTemprano: '14:00', finMasTardio: '24:00', dias: [0, 1, 2, 3, 4, 5, 6], horasInicio: ['14:00', '20:00'] },
  },
  politicaCancelacion: [{ horasMinimas: 24, porcentajeReembolso: 100 }],
};

/** Disponibilidad simulada: todo libre salvo las noches indicadas. */
function disponibilidad(desde: FechaISO, hasta: FechaISO, nochesOcupadas: FechaISO[] = []): { dias: DisponibilidadDia[] } {
  const dias: DisponibilidadDia[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const libre = !nochesOcupadas.includes(f);
    dias.push({ fecha: f, noche: libre, diaDeSol: libre && diaSemana(f) >= 1 && diaSemana(f) <= 5, ocasional: libre ? ['14:00', '20:00'] : [] });
  }
  return { dias };
}

describe('Reservar', () => {
  let fixture: ComponentFixture<Reservar>;
  let http: HttpTestingController;
  let html: HTMLElement;

  // httpResource entrega las respuestas de forma asíncrona: damos una vuelta al ciclo de
  // eventos (sin whenStable, que esperaría también las peticiones aún sin responder).
  const actualizar = async () => {
    TestBed.tick();
    await new Promise((listo) => setTimeout(listo));
    TestBed.tick();
    fixture.detectChanges();
  };
  const dia = (fecha: FechaISO) =>
    html.querySelector<HTMLButtonElement>(`app-calendario button[aria-label^="${etiquetaDe(fecha)}"]`)!;
  const etiquetaDe = (fecha: FechaISO) =>
    new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
      new Date(`${fecha}T00:00:00Z`),
    );
  const responderDisponibilidad = (nochesOcupadas: FechaISO[] = []) => {
    const pedido = http.expectOne((r) => r.url.startsWith('/api/disponibilidad'));
    const url = new URL(pedido.request.urlWithParams, 'http://x');
    pedido.flush(disponibilidad(url.searchParams.get('desde')!, url.searchParams.get('hasta')!, nochesOcupadas));
  };

  async function iniciar(tipo?: string, nochesOcupadas: FechaISO[] = []) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AHORA);
    TestBed.configureTestingModule({
      imports: [Reservar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Reservar);
    if (tipo) fixture.componentRef.setInput('tipo', tipo);
    html = fixture.nativeElement;
    await actualizar();
    http.expectOne('/api/catalogo').flush(CATALOGO);
    responderDisponibilidad(nochesOcupadas);
    await actualizar();
  }

  afterEach(() => {
    // Cada cambio de fechas pide una cotización: las pruebas que no la revisan la dejan
    // sin responder. Se descartan aquí para verificar que no quedó ninguna otra petición.
    http.match('/api/reservas/cotizar');
    http.verify({ ignoreCancelled: true });
    vi.useRealTimers();
  });

  it('toma el tipo de la URL y muestra el calendario de este mes', async () => {
    await iniciar('DIA_DE_SOL');
    expect(html.querySelector<HTMLInputElement>('input[value="DIA_DE_SOL"]')!.checked).toBe(true);
    expect(html.querySelector('app-calendario .titulo')!.textContent).toContain('noviembre');
  });

  it('día de sol: los fines de semana no se pueden elegir', async () => {
    await iniciar('DIA_DE_SOL');
    expect(dia('2026-11-07').disabled).toBe(true); // sábado
    expect(dia('2026-11-09').disabled).toBe(false); // lunes
  });

  it('estadía: al elegir la llegada reserva una noche y pide el precio de inmediato', async () => {
    await iniciar('ESTADIA');
    dia('2026-11-30').click(); // último día del mes: la salida pasa al 1 de diciembre
    await actualizar();

    expect(html.querySelector('.resumen-fechas')!.textContent).toContain('1 noche');
    expect(html.querySelector('.resumen-fechas')!.textContent).toContain('1 de dic');
    const pedido = http.expectOne('/api/reservas/cotizar');
    expect(pedido.request.body).toMatchObject({ fechaEntrada: '2026-11-30', fechaSalida: '2026-12-01', huespedes: 2 });
    pedido.flush({ disponible: true, alojamiento: [{ concepto: 'Noche del lunes 30 de noviembre', precio: 320000 }], servicios: [], total: 320000 });
    await actualizar();

    expect(html.querySelector<HTMLButtonElement>('.confirmar')!.disabled).toBe(false);
  });

  it('estadía: tocar un día posterior alarga la estadía, sin pasar por noches ocupadas', async () => {
    await iniciar('ESTADIA', ['2026-11-12']); // la noche del 12 está ocupada
    dia('2026-11-10').click();
    await actualizar();
    dia('2026-11-12').click(); // 2 noches: sale el 12 a las 11 a. m., antes de la noche ocupada
    await actualizar();
    expect(html.querySelector('.resumen-fechas')!.textContent).toContain('2 noches');

    dia('2026-11-13').click(); // saldría pasando por la noche del 12: se toma como nueva llegada
    await actualizar();
    expect(html.querySelector('.resumen-fechas')!.textContent).toMatch(/13 de nov.*14 de nov.*1 noche/);
  });

  it('estadía: "Elegir otra fecha de llegada" borra la selección', async () => {
    await iniciar('ESTADIA');
    dia('2026-11-10').click();
    await actualizar();
    html.querySelector<HTMLButtonElement>('button.enlace')!.click();
    await actualizar();
    expect(html.querySelector('.resumen-fechas')!.textContent).toContain('Elige tus fechas');
  });

  it('no deja cambiar los huéspedes: la cabaña es para 2 personas', async () => {
    await iniciar('ESTADIA');
    expect(html.querySelector('.contador')).toBeNull();
    expect(html.querySelector('.resumen-tipo')!.textContent).toContain('2 personas');
  });

  it('con fechas completas pide la cotización al backend y muestra el total', async () => {
    await iniciar('ESTADIA');
    dia('2026-11-12').click();
    await actualizar();
    dia('2026-11-14').click();
    await actualizar();
    html.querySelector<HTMLInputElement>('.servicio input')!.click();
    await actualizar();

    const pedidos = http.match('/api/reservas/cotizar');
    const ultimo = pedidos.at(-1)!;
    expect(ultimo.request.method).toBe('POST');
    expect(ultimo.request.body).toEqual({
      tipo: 'ESTADIA',
      fechaEntrada: '2026-11-12',
      fechaSalida: '2026-11-14',
      horaInicio: undefined,
      huespedes: 2,
      servicios: ['desayuno'],
    });
    ultimo.flush({
      disponible: true,
      alojamiento: [
        { concepto: 'Noche del jueves', precio: 320000 },
        { concepto: 'Noche del viernes', precio: 450000 },
      ],
      servicios: [{ slug: 'desayuno', nombre: 'Desayuno', precioUnitario: 40000, cantidad: 2, subtotal: 80000 }],
      total: 850000,
    });
    await actualizar();

    expect(html.querySelector('.resumen .total')!.textContent!.replace(/\s/g, ' ')).toContain('850.000');
    expect(html.querySelector<HTMLButtonElement>('.confirmar')!.disabled).toBe(false);
  });

  it('con datos válidos crea la reserva y muestra el código', async () => {
    await iniciar('DIA_DE_SOL');
    dia('2026-11-09').click();
    await actualizar();
    http.expectOne('/api/reservas/cotizar').flush({ disponible: true, alojamiento: [], servicios: [], total: 250000 });
    await actualizar();

    const escribir = (id: string, valor: string) => {
      const campo = html.querySelector<HTMLInputElement>(`#${id}`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    escribir('nombre', 'Ana Gómez');
    escribir('email', 'ana@correo.com');
    escribir('telefono', '300 123 4567');
    await actualizar();

    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await actualizar();

    const pedido = http.expectOne('/api/reservas');
    expect(pedido.request.body).toMatchObject({
      tipo: 'DIA_DE_SOL',
      fechaEntrada: '2026-11-09',
      nombre: 'Ana Gómez',
      email: 'ana@correo.com',
      telefono: '300 123 4567',
    });
    pedido.flush({
      codigo: 'CP-7K3M9Q',
      tipo: 'DIA_DE_SOL',
      huespedes: 2,
      servicios: [],
      total: 250000,
      expiraEn: '2026-11-01T15:30:00Z',
      cliente: { nombre: 'Ana Gómez', email: 'ana@correo.com', telefono: '300 123 4567' },
    });
    await actualizar();

    expect(html.querySelector('.codigo')!.textContent).toContain('CP-7K3M9Q');
    expect(html.querySelector('.aviso-pago')!.textContent).toContain('10:30');
  });

  it('si el horario se ocupó al confirmar, avisa y vuelve a consultar la disponibilidad', async () => {
    await iniciar('DIA_DE_SOL');
    dia('2026-11-09').click();
    await actualizar();
    http.expectOne('/api/reservas/cotizar').flush({ disponible: true, alojamiento: [], servicios: [], total: 250000 });
    await actualizar();
    for (const [id, valor] of [['nombre', 'Ana Gómez'], ['email', 'ana@correo.com'], ['telefono', '3001234567']]) {
      const campo = html.querySelector<HTMLInputElement>(`#${id}`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    }
    await actualizar();
    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await actualizar();

    http
      .expectOne('/api/reservas')
      .flush({ message: 'Ese horario ya no está disponible.' }, { status: 409, statusText: 'Conflict' });
    await actualizar();

    expect(html.querySelector('.resumen [role="alert"]')!.textContent).toContain('ya no está disponible');
    responderDisponibilidad(['2026-11-09']); // se recargó
    http.expectOne('/api/reservas/cotizar').flush({ disponible: false, alojamiento: [], servicios: [], total: 250000 });
    await actualizar();
    expect(html.querySelector<HTMLButtonElement>('.confirmar')!.disabled).toBe(true);
  });

  it('no envía la reserva si faltan los datos y muestra los errores', async () => {
    await iniciar('OCASIONAL');
    dia('2026-11-20').click();
    await actualizar();
    html.querySelector<HTMLButtonElement>('.hora')!.click();
    await actualizar();
    http.expectOne('/api/reservas/cotizar').flush({ disponible: true, alojamiento: [], servicios: [], total: 120000 });
    await actualizar();

    html.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await actualizar();

    http.expectNone('/api/reservas');
    expect(html.querySelector('#error-nombre')!.textContent).toContain('Escribe tu nombre');
    expect(html.querySelector('#error-email')!.textContent).toContain('Escribe tu correo');
  });
});
