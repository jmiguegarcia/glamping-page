import { BadRequestException } from '@nestjs/common';
import { Catalogo, SolicitudCotizacion, cotizar, horasInicioOcasional } from './cotizacion.js';

// "Ahora" fijo para que las pruebas no dependan del día en que se ejecutan.
const AHORA = new Date('2026-11-01T12:00:00Z');

const catalogo: Catalogo = {
  capacidad: 2,
  tarifas: {
    NOCHE_ENTRE_SEMANA: 320_000,
    NOCHE_FIN_DE_SEMANA: 450_000,
    DIA_DE_SOL: 250_000,
    OCASIONAL: 120_000,
  },
  servicios: [
    { slug: 'desayuno', nombre: 'Desayuno', precio: 40_000 },
    { slug: 'jacuzzi', nombre: 'Jacuzzi', precio: 100_000 },
  ],
};

const solicitud = (datos: Partial<SolicitudCotizacion>): SolicitudCotizacion => ({
  tipo: 'ESTADIA',
  fechaEntrada: '2026-12-10',
  huespedes: 2,
  servicios: [],
  ...datos,
});

const falla = (datos: Partial<SolicitudCotizacion>, mensaje: RegExp) =>
  expect(() => cotizar(solicitud(datos), catalogo, AHORA)).toThrow(
    expect.objectContaining({ constructor: BadRequestException, message: expect.stringMatching(mensaje) }),
  );

describe('cotizar estadía', () => {
  it('cobra cada noche con su tarifa: jueves entre semana + viernes fin de semana', () => {
    const c = cotizar(solicitud({ fechaSalida: '2026-12-12' }), catalogo, AHORA);
    expect(c.noches).toBe(2);
    expect(c.alojamiento.map((l) => [l.tarifa, l.precio])).toEqual([
      ['NOCHE_ENTRE_SEMANA', 320_000],
      ['NOCHE_FIN_DE_SEMANA', 450_000],
    ]);
    expect(c.subtotalAlojamiento).toBe(770_000);
  });

  it('la noche del domingo es tarifa de fin de semana', () => {
    const c = cotizar(solicitud({ fechaEntrada: '2026-12-13', fechaSalida: '2026-12-14' }), catalogo, AHORA);
    expect(c.alojamiento[0].tarifa).toBe('NOCHE_FIN_DE_SEMANA');
  });

  it('ocupa la cabaña desde el check-in (16:00) hasta el check-out (11:00), hora Colombia', () => {
    const c = cotizar(solicitud({ fechaSalida: '2026-12-12' }), catalogo, AHORA);
    expect(c.inicio.toISOString()).toBe('2026-12-10T21:00:00.000Z');
    expect(c.fin.toISOString()).toBe('2026-12-12T16:00:00.000Z');
  });

  it('bloquea la cabaña 2 h más después del check-out para limpieza', () => {
    const c = cotizar(solicitud({ fechaSalida: '2026-12-12' }), catalogo, AHORA);
    expect(c.bloqueoHasta.toISOString()).toBe('2026-12-12T18:00:00.000Z');
  });

  it('cobra los servicios por cada noche y suma el total', () => {
    const c = cotizar(solicitud({ fechaSalida: '2026-12-12', servicios: ['desayuno', 'desayuno'] }), catalogo, AHORA);
    expect(c.servicios).toEqual([
      { slug: 'desayuno', nombre: 'Desayuno', precioUnitario: 40_000, cantidad: 2, subtotal: 80_000 },
    ]);
    expect(c.total).toBe(770_000 + 80_000);
  });

  it('rechaza salida igual o anterior a la entrada', () => falla({ fechaSalida: '2026-12-10' }, /al menos un día/));
  it('rechaza estadías demasiado largas', () => falla({ fechaSalida: '2027-01-30' }, /máxima/));
  it('rechaza fechas imposibles', () => falla({ fechaEntrada: '2027-02-30', fechaSalida: '2027-03-02' }, /entrada no es válida/));
});

describe('cotizar día de sol', () => {
  it('un lunes cuesta la tarifa de día de sol, de 08:00 a 14:00, con servicios una sola vez', () => {
    const c = cotizar(solicitud({ tipo: 'DIA_DE_SOL', fechaEntrada: '2026-12-07', servicios: ['jacuzzi'] }), catalogo, AHORA);
    expect(c.noches).toBe(0);
    expect(c.fechaSalida).toEqual(c.fechaEntrada);
    expect(c.inicio.toISOString()).toBe('2026-12-07T13:00:00.000Z');
    expect(c.fin.toISOString()).toBe('2026-12-07T19:00:00.000Z');
    expect(c.servicios[0].cantidad).toBe(1);
    expect(c.total).toBe(250_000 + 100_000);
  });

  it('no está disponible el sábado', () =>
    falla({ tipo: 'DIA_DE_SOL', fechaEntrada: '2026-12-12' }, /lunes, martes, miércoles, jueves y viernes/));
});

describe('cotizar ocasional', () => {
  it('las horas de inicio van de 14:00 a 20:00', () => {
    expect(horasInicioOcasional()).toEqual(['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
  });

  it('de 20:00 a 24:00 termina a medianoche', () => {
    const c = cotizar(solicitud({ tipo: 'OCASIONAL', fechaEntrada: '2026-12-12', horaInicio: '20:00' }), catalogo, AHORA);
    expect(c.inicio.toISOString()).toBe('2026-12-13T01:00:00.000Z');
    expect(c.fin.toISOString()).toBe('2026-12-13T05:00:00.000Z');
    expect(c.total).toBe(120_000);
  });

  it('rechaza un bloque que pasaría de medianoche', () =>
    falla({ tipo: 'OCASIONAL', horaInicio: '21:00' }, /entre 14:00 y 20:00/));
  it('rechaza horas que no son en punto', () => falla({ tipo: 'OCASIONAL', horaInicio: '14:30' }, /en punto/));
  it('exige hora de inicio', () => falla({ tipo: 'OCASIONAL' }, /hora de inicio/));
});

describe('validaciones generales', () => {
  it('rechaza más huéspedes que la capacidad', () => falla({ fechaSalida: '2026-12-11', huespedes: 3 }, /máximo 2/));
  it('rechaza horarios que ya pasaron', () => falla({ fechaEntrada: '2026-10-01', fechaSalida: '2026-10-02' }, /ya pasó/));
  it('rechaza servicios desconocidos', () =>
    falla({ fechaSalida: '2026-12-11', servicios: ['masaje'] }, /"masaje" no existe/));
});
