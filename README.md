# Cabaña Primavera · Glamping

Sitio web con reservas en línea y servicios adicionales.

| Carpeta | Tecnología | Puerto en desarrollo |
|---|---|---|
| `frontend/` | Angular 22 con SSR | http://localhost:4200 |
| `backend/` | NestJS + Prisma 7 | http://localhost:3000/api |
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

## Base de datos

```bash
cd backend
npx prisma migrate dev --name <cambio>   # aplica cambios de prisma/schema.prisma
npx prisma studio                        # explorador visual (también puedes usar pgAdmin)
```
