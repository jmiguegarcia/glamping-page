import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ResultadoPago } from './resultado-pago';

describe('ResultadoPago', () => {
  let fixture: ComponentFixture<ResultadoPago>;
  let http: HttpTestingController;
  let html: HTMLElement;

  const actualizar = async () => {
    TestBed.tick();
    await new Promise((listo) => setTimeout(listo));
    TestBed.tick();
    fixture.detectChanges();
  };

  async function abrir(id?: string) {
    TestBed.configureTestingModule({
      imports: [ResultadoPago],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResultadoPago);
    fixture.componentRef.setInput('codigo', 'CP-ABC234');
    if (id) fixture.componentRef.setInput('id', id);
    html = fixture.nativeElement;
    await actualizar();
  }

  const responder = async (estadoPago: string, estadoReserva: string) => {
    http
      .expectOne('/api/pagos/wompi/transacciones/12-34')
      .flush({ codigo: 'CP-ABC234', estadoPago, estadoReserva, total: 450000 });
    await actualizar();
  };

  afterEach(() => http.verify());

  it('pago aprobado: muestra la reserva confirmada con su código', async () => {
    await abrir('12-34');
    expect(html.textContent).toContain('Confirmando tu pago');
    await responder('APROBADO', 'CONFIRMADA');
    expect(html.querySelector('h1')!.textContent).toContain('Pago aprobado');
    expect(html.querySelector('.codigo')!.textContent).toContain('CP-ABC234');
  });

  it('pago rechazado con la reserva aún apartada: permite intentar de nuevo', async () => {
    await abrir('12-34');
    await responder('RECHAZADO', 'PENDIENTE_PAGO');
    const boton = [...html.querySelectorAll('button')].find((b) => b.textContent!.includes('Intentar de nuevo'));
    expect(boton).toBeTruthy();
  });

  it('pago rechazado con la reserva expirada: invita a hacer una nueva reserva', async () => {
    await abrir('12-34');
    await responder('RECHAZADO', 'EXPIRADA');
    expect(html.querySelector('a[href="/reservar"]')!.textContent).toContain('nueva reserva');
  });

  it('pago aprobado sin cupo: pide contactar para el reembolso', async () => {
    await abrir('12-34');
    await responder('APROBADO', 'EXPIRADA');
    expect(html.querySelector('h1')!.textContent).toContain('ya no estaba libre');
  });

  it('pago pendiente: avisa que el banco está confirmando', async () => {
    await abrir('12-34');
    await responder('PENDIENTE', 'PENDIENTE_PAGO');
    expect(html.querySelector('h1')!.textContent).toContain('confirmando el pago');
  });

  it('sin id de transacción no consulta nada', async () => {
    await abrir();
    http.expectNone((r) => r.url.startsWith('/api/pagos'));
    expect(html.querySelector('h1')!.textContent).toContain('No encontramos');
  });
});
