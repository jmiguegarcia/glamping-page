import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Configuración de Wompi, leída del .env. Las llaves de pruebas empiezan por pub_test_,
 * test_integrity_ y test_events_; las de producción por pub_prod_, prod_integrity_ y
 * prod_events_. Se encuentran en el dashboard de Wompi:
 * Desarrolladores → Secretos para integración técnica.
 *
 * ⚠️ El secreto de integridad y el de eventos NUNCA deben llegar al navegador.
 */
export interface ConfigWompi {
  llavePublica: string;
  secretoIntegridad: string;
  secretoEventos: string;
  urlApi: string;
  urlCheckout: string;
}

const URL_CHECKOUT = 'https://checkout.wompi.co/p/';

export function configWompi(): ConfigWompi {
  const llavePublica = process.env.WOMPI_LLAVE_PUBLICA ?? '';
  const secretoIntegridad = process.env.WOMPI_SECRETO_INTEGRIDAD ?? '';
  const secretoEventos = process.env.WOMPI_SECRETO_EVENTOS ?? '';

  if (!llavePublica || !secretoIntegridad || !secretoEventos) {
    throw new ServiceUnavailableException('Los pagos en línea no están configurados todavía.');
  }

  const pruebas = llavePublica.startsWith('pub_test_');
  return {
    llavePublica,
    secretoIntegridad,
    secretoEventos,
    // La URL de la API depende de si las llaves son de pruebas o de producción.
    urlApi: pruebas ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1',
    urlCheckout: URL_CHECKOUT,
  };
}
