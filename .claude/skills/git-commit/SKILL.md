---
name: git-commit
description: Analiza los cambios del repositorio y genera un plan paso a paso de commits y push (con los comandos exactos) para que el usuario lo revise y lo ejecute manualmente. Nunca hace add, commit ni push por sí misma. Usar cuando el usuario escribe /git-commit.
disable-model-invocation: true
---

# /git-commit — plan de commit y push (solo plan)

Objetivo: convertir los cambios pendientes en un plan de commits pequeños y con sentido,
con los comandos listos para copiar, para que **el usuario** los revise y ejecute a mano.
El usuario está aprendiendo Git, así que explica brevemente el *por qué* de cada paso.

Responde siempre en español.

## Regla principal: no ejecutar nada que modifique el repositorio

- **Nunca** ejecutes `git add`, `git commit`, `git push`, `git reset`, `git stash`,
  `git rebase` ni nada que cambie el índice, el historial o el remoto.
- **No** preguntes "¿lo ejecuto?" al final: el entregable es el plan, y el usuario lo
  ejecuta. Si después pide explícitamente que lo hagas tú, eso es otra petición.
- Solo se permiten comandos de lectura: `git status`, `git diff`, `git log`,
  `git remote -v`, `git fetch` (actualiza referencias remotas, no toca el trabajo local).
- Tampoco edites archivos (ej. `.gitignore`): si hace falta un cambio, inclúyelo como
  paso del plan para que lo haga el usuario.

## 1. Recolectar el estado

Ejecuta en la raíz del repo (pueden ir en paralelo):

- `git status --short --branch -uall` (ignora `node_modules` en la salida)
- `git diff --stat` y `git diff --cached --stat`
- `git diff` / `git diff --cached` para entender el contenido real de los cambios
  (en archivos grandes o generados, lee solo lo necesario)
- `git log --oneline -10` (si hay commits) para seguir el estilo existente
- `git remote -v`, `git fetch origin` y `git status -sb` para saber si la rama va
  adelantada/atrasada respecto al remoto

Si no hay nada que commitear **ni** commits pendientes de push, dilo y termina.

## 2. Revisiones de seguridad

Marca como **⛔ bloqueante** (y excluye del plan) si aparece:

- Archivos `.env` (excepto `.env.example`), claves, tokens, contraseñas o credenciales
  dentro del diff (`password=`, `secret`, `api_key`, `BEGIN PRIVATE KEY`…).
- Artefactos generados: `node_modules/`, `dist/`, `.angular/`, `backend/src/generated/`,
  `*.tsbuildinfo`, `coverage/` → agrega un paso previo para añadirlos al `.gitignore`.
- Archivos de más de ~5 MB (imágenes sin optimizar, zips, videos).

Si ya hay archivos en staging (`git diff --cached`) que no encajan en el plan, indícalo
y da el comando para sacarlos del staging (`git restore --staged <archivo>`).

## 3. Agrupar en commits lógicos

Un commit = una idea. Criterios, en orden:

1. Por funcionalidad (ej. "modelo de reservas" = schema de Prisma + migración + seed).
2. Por área: `frontend`, `backend`, `prisma`, `docs`, configuración/tooling (`chore`).
3. Las migraciones de Prisma van en el mismo commit que el cambio de `schema.prisma`
   que las generó.
4. Si todo es un único cambio coherente, basta con un commit; no fuerces divisiones.
5. Ordena los commits para que cada uno deje el proyecto en un estado coherente
   (ej. `.gitignore` primero).

Mensajes con **Conventional Commits**, descripción en español, imperativo, minúscula:

```
<tipo>(<ámbito>): <descripción corta, máx. ~70 caracteres>
```

Tipos: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `chore`, `build`.
Ámbitos habituales: `frontend`, `backend`, `prisma`, `reservas`, `pagos`, `ui`, `repo`.

## 4. Formato del plan

```
Rama: main → origin/main   (estado: N commits por delante / al día / atrasada / primer push)

⛔ Bloqueantes / ⚠️ Avisos (si los hay)

Paso 0 — (solo si hace falta) preparar .gitignore u otro ajuste previo
  Qué hacer y por qué + comando

Paso 1 — feat(backend): agregar endpoint de salud
  Por qué juntos: ...
  ```
  git add backend/src/app.controller.ts backend/src/app.service.ts
  git commit -m "feat(backend): agregar endpoint de salud"
  ```

Paso 2 — ...

Paso final — subir a GitHub
  ```
  git push -u origin main     # -u solo la primera vez; después basta con: git push
  ```

Verificación: `git status` (debe quedar limpio) y `git log --oneline -5`.
```

Reglas para los comandos del plan:

- `git add` siempre con rutas explícitas (archivos o carpetas concretas), nunca
  `git add -A` ni `git add .`. Si una carpeta entera va en un commit y su `.gitignore`
  ya excluye lo generado, puedes usar `git add backend/` y decirlo.
- Los comandos deben funcionar tanto en PowerShell como en Git Bash (usa `-m "..."`;
  para un cuerpo de mensaje, un segundo `-m "..."`).
- Nunca propongas `--force`, `--no-verify` ni `--amend` sobre commits ya publicados.
- Si la rama está atrasada respecto al remoto, añade antes del push:
  `git pull --rebase origin <rama>` y explica qué hace y qué hacer si hay conflictos.
- Si es el primer push, menciona que Windows puede abrir el navegador para iniciar
  sesión en GitHub (Git Credential Manager).

Termina con el enlace del repositorio: https://github.com/jmiguegarcia/glamping-page
