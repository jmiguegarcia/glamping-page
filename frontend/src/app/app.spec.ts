import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('muestra el encabezado con el nombre y el botón de reservar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('app-encabezado')?.textContent).toContain('Cabaña Primavera');
    expect(html.querySelector('a[href="/reservar"]')).toBeTruthy();
  });

  it('tiene un enlace para saltar al contenido principal', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('a.saltar')?.getAttribute('href')).toBe('#contenido');
    expect(html.querySelector('main#contenido')).toBeTruthy();
  });
});
