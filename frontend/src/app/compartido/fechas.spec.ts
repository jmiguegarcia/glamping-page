import { diaSemana, diasEntre, finDeMes, hoyEnColombia, semanasDelMes, sumarDias, sumarMeses } from './fechas';

describe('fechas', () => {
  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('cuenta días entre fechas', () => {
    expect(diasEntre('2026-12-10', '2026-12-12')).toBe(2);
  });

  it('sabe el día de la semana (el 11 de diciembre de 2026 es viernes)', () => {
    expect(diaSemana('2026-12-11')).toBe(5);
  });

  it('suma meses y calcula el fin de mes', () => {
    expect(sumarMeses('2026-12-01', 1)).toBe('2027-01-01');
    expect(sumarMeses('2026-01-01', -1)).toBe('2025-12-01');
    expect(finDeMes('2028-02-01')).toBe('2028-02-29');
  });

  it('usa la fecha de Colombia: 11 p. m. del 31 en Bogotá ya es el 1 en UTC', () => {
    expect(hoyEnColombia(new Date('2027-01-01T04:00:00Z'))).toBe('2026-12-31');
  });

  it('arma las semanas del mes empezando en lunes', () => {
    const semanas = semanasDelMes('2026-12-01'); // el 1 de diciembre de 2026 es martes
    expect(semanas[0]).toEqual([null, '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
    expect(semanas.at(-1)?.filter(Boolean).at(-1)).toBe('2026-12-31');
    expect(semanas.every((s) => s.length === 7)).toBe(true);
  });
});
