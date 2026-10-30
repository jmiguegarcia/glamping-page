# Cabaña Primavera · Glamping

Sitio web con reservas en línea y servicios adicionales.

| Carpeta | Tecnología | Puerto en desarrollo |
|---|---|---|
| `frontend/` | Angular 22 con SSR | http://cabana.localhost:4200 (o http://localhost:4200) |
| `backend/` | NestJS + Prisma 7 | http://localhost:3001/api |
| — | PostgreSQL 18 (base `cabana_primavera`) | 5432 |

## Primera vez

1. En `backend/.env` reemplaza `TU_CONTRASEÑA` por la contraseña del usuario `postgres`.
2. Instala dependencias si clonaste el repo: `npm install` dentro de `frontend/` y de `backend/`.

## Desarrollo (dos terminales)

```bash
# Terminal 1 — API
cd backend
npm run start:dev

# Terminal 2 — web (las llamadas a /api se reenvían al backend)
cd frontend
npm start
```

Comprobar que todo está conectado: http://localhost:4200/api/salud debe responder
`{"api":"ok","baseDeDatos":"ok"}`.

## API (backend)

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/api/catalogo` | Cabaña, tarifas, servicios, horarios y política de cancelación |
| GET | `/api/disponibilidad?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Por día: noche libre, día de sol, horas de ocasional |
| POST | `/api/reservas/cotizar` | Precio detallado y si el horario está libre (no guarda) |
| POST | `/api/reservas` | Crea la reserva en `PENDIENTE_PAGO` |
| GET | `/api/reservas/:codigo?email=...` | Consulta una reserva |
| POST | `/api/reservas/:codigo/cancelar` | Cancela y calcula el reembolso |
| POST | `/api/pagos/iniciar` | Prepara el cobro y devuelve la URL firmada del checkout de Wompi |
| GET | `/api/pagos/wompi/transacciones/:id` | Consulta a Wompi el resultado (al volver del checkout) |
| POST | `/api/pagos/wompi/eventos` | Webhook de Wompi (URL de eventos del dashboard) |

Horarios, días permitidos, tiempo de limpieza y política de cancelación:
`backend/src/config/negocio.ts`.

## Pagos (Wompi)

1. En el dashboard de Wompi, modo **Sandbox**: *Desarrolladores → Secretos para integración técnica*.
2. Copia en `backend/.env` la llave pública (`pub_test_…`), el secreto de integridad
   (`test_integrity_…`) y el de eventos (`test_events_…`). Reinicia el backend.
3. Datos de prueba: tarjeta `4242 4242 4242 4242` (aprobada), `4111 1111 1111 1111` (rechazada),
   cualquier fecha futura y CVC de 3 dígitos. Nequi `3991111111` (aprobado).

Para probar pagos abre la web en **http://cabana.localhost:4200** (es tu mismo computador): el
firewall de Wompi bloquea el checkout si la dirección de regreso es `localhost` o `127.0.0.1`
(error 403 de CloudFront). Por eso `FRONTEND_URL` usa `cabana.localhost`, que también está en
`allowedHosts` del `ng serve` (`frontend/angular.json`).

En desarrollo, el resultado se confirma cuando Wompi devuelve al cliente a
`/reserva/:codigo/pago` (el backend consulta la transacción). El webhook solo funciona con el
sitio publicado: entonces se configura `https://<dominio>/api/pagos/wompi/eventos` como URL de eventos.

Los **reembolsos** por cancelación se hacen desde el dashboard de Wompi; la reserva guarda el
monto a devolver en `monto_reembolso`.

## Base de datos

```bash
cd backend
npx prisma migrate dev --name <cambio>   # aplica cambios de prisma/schema.prisma
npx prisma studio                        # explorador visual (también puedes usar pgAdmin)
```
