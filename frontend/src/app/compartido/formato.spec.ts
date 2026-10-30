import { describirDias, formatearPesos, horaLegible } from './formato';

describe('formato', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(formatearPesos(320000).replace(/\s/g, ' ')).toBe('$ 320.000');
  });

  it.each([
    ['16:00', '4 p. m.'],
    ['08:00', '8 a. m.'],
    ['11:30', '11:30 a. m.'],
    ['12:00', '12 p. m.'],
    ['24:00', '12 a. m.'],
  ])('%s se lee como %s', (hora, esperado) => {
    expect(horaLegible(hora)).toBe(esperado);
  });

  it.each([
    [[1, 2, 3, 4, 5], 'de lunes a viernes'],
    [[5, 6, 0], 'de viernes a domingo'],
    [[0, 1, 2, 3, 4, 5, 6], 'todos los días'],
    [[1, 3], 'lunes y miércoles'],
    [[6], 'sábado'],
  ])('%j se describe como "%s"', (dias, esperado) => {
    expect(describirDias(dias)).toBe(esperado);
  });
});
