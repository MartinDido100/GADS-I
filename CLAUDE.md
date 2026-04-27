# DigitalCheck

Sistema de Gestión de Novedades Laborales y Control Horario para Pymes. TP de la materia GADS (Gestión Aplicada al Desarrollo de Software) en UNLaM — Ingeniería en Informática.

El sistema **no liquida sueldos**: ordena la información (fichadas, novedades, horarios) y la exporta para que el contador externo liquide.

## Stack

- **Frontend**: Vite + React 19 + TypeScript + Mantine + Tailwind v4 + React Router 7. Deploy en Vercel (https://digitalcheck.vercel.app).
- **Backend**: Node + Express + TypeScript. Layout por capas `routes → controllers → services → repositories`. Auth con JWT + bcrypt.
- **DB**: Postgres 16 vía Docker (`docker-compose.yml` en la raíz). ORM: Prisma.
- **Deploy backend**: a definir (Railway / Render / Fly). No deployar todavía.

## Estructura del repo

```
implementacion/
├── frontend/              # SPA existente (ver frontend/CLAUDE.md si existe)
├── backend/               # Node + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── routes/        # Express routers por módulo
│       ├── controllers/   # Adaptan req/res, validan input
│       ├── services/      # Lógica de negocio (motor de reglas vive acá)
│       ├── repositories/  # Acceso a Prisma
│       ├── middleware/    # auth, requireRole, errorHandler
│       └── lib/           # prisma client, jwt, bcrypt helpers
├── docker-compose.yml     # postgres
└── CLAUDE.md
```

## Modelo de datos (canónico — del docx del grupo)

Las entidades vienen del diagrama ER ya entregado. Cualquier cambio se justifica.

- **EMPLEADO** (`legajo` PK, `nombre`, `dni`, `cuil`, `fecha_ingreso`, `categoria_laboral`, `activo`, `password_hash`, `rol`)
- **HORARIO** (`id` PK, `descripcion`, `horario_entrada`, `horario_retiro`, `horas_a_trabajar` nullable, `tolerancia_entrada`, `tolerancia_retiro`, `minutos_minimos_descanso`, `umbral_horas_extras`, `activo`)
- **TURNO** (`id` PK, `id_horario` FK, `id_empleado` FK, `dia`) — vincula empleado↔horario por día. Permite turnos rotativos.
- **FICHADA** (`identidad` PK, `id_empleado` FK, `timestamp`, `entrada_salida`, `origen`, `legajo_usuario_carga` nullable, `activo`, `id_correccion` FK self) — **inmutable**, las correcciones son nuevas filas que apuntan a la original.
- **BIOMETRIA** (`id_empleado` PK, `huella`, `facial`, `codigo_fichaje`)
- **TIPO_NOVEDAD** (`id_tipo_novedad` PK, `descripcion`)
- **NOVEDAD** (`id_novedad` PK, `id_empleado` FK, `fecha`, `tipo_novedad` FK, `origen` (auto/manual), `estado` (pendiente/aprobada/rechazada), `observacion`)
- **CIERRE_MENSUAL** (`id` PK, `id_empleado` FK, `periodo`, `fecha_cierre`, `estado_borrador_cerrado` (B/C), `ruta_archivo_exportado`)

**Concepto clave** (decisión de arquitectura del PDF): la **fichada** (dato crudo) y la **interpretación** (tardanza/ausencia/HE) son cosas distintas. Las novedades automáticas se derivan del motor; nunca se modifica una fichada original.

## Roles

Todos los usuarios son `EMPLEADO` con un campo `rol`:
- **empleado**: ve sus notificaciones, su perfil, carga justificativos.
- **administrador**: todo lo del empleado + configuración de empleados, horarios, turnos, fichadas manuales, aprobación de novedades, cierre mensual.
- **contador**: lectura del cierre mensual + descarga del CSV.

## Pantallas (8 totales)

1. Login (legajo + password)
2. Main post-login con tabs (default: notificaciones)
3. Centro de notificaciones (fichadas y novedades del día)
4. Justificativos (empleado carga, admin aprueba)
5. Perfil (solo lectura)
6. Configuración de empleados (admin) — ya existe `EmpleadosConfig.tsx` con datos mock
7. Horarios y turnos (admin) — falta
8. Cierre mensual (admin + contador) — ya existe `CierreMensual.tsx` con datos mock

## Motor de reglas (V1)

Eventos detectables a partir de fichadas + horario asignado:
- **Tardanza**: entrada > horario + tolerancia_entrada
- **Ausencia**: día laborable sin fichada de entrada
- **Salida anticipada**: salida < horario_retiro - tolerancia_retiro
- **Doble fichada**: mismo tipo en corto período (decisión: < 5 min según docx)
- **Hs extra al 50%**: salida posterior a horario + umbral_horas_extras en día hábil
- **Hs extra al 100%**: ídem en domingos. Feriados: **fuera de alcance V1** (decisión confirmada — sólo domingos por ahora).
- **Descanso extendido**: si hay break y excede `minutos_minimos_descanso`

Las reglas son **parametrizables por horario** (tolerancias, umbrales). No hardcodear minutos.

## Decisiones tomadas (acordadas con el usuario)

- **Postgres con Docker** (no instalación nativa, no cloud todavía)
- **Prisma** como ORM (no SQL puro)
- **EMPLEADO = usuario** del sistema, con campo `rol` y `password_hash`. No hay tabla `USUARIO` separada.
- **Sin passwords en el seed**. El admin las crea/setea a mano. El seed sólo crea los registros sin `password_hash` (campo nullable o placeholder vacío).
- **Feriados fuera de alcance V1**. Sólo se distinguen domingos para HE al 100%.
- **Alcance de la entrega**: todos los módulos del PDF deben quedar implementados (no parciales).

## Convenciones

- Idioma: **español** en UI, comentarios y nombres de dominio (Empleado, Fichada, Novedad). Identifiers de código en inglés sólo cuando son técnicos (controllers, services, etc.).
- Fechas: ISO `YYYY-MM-DD` en API. Timestamps en UTC en DB; el frontend formatea en `es-AR` con `toLocaleDateString`.
- Errores: Express middleware central. Códigos HTTP estándar. Body JSON `{ error: { code, message } }`.
- Frontend ya tiene helpers: `parseLocalDate`, `getInitials`, `avatarColor`. Reusarlos, no duplicarlos.

## Comandos

```bash
# DB
docker compose up -d            # levantar postgres
docker compose down             # bajar
docker compose down -v          # bajar + borrar volumen

# Backend
cd backend
npm run dev                     # tsx watch
npm run build
npm run prisma:migrate          # crear migration
npm run prisma:generate
npm run seed

# Frontend
cd frontend
npm run dev                     # localhost:5173
npm run build
```

## Datos del grupo (TP entregado el 2026-04-12)

Grupo 1, integrantes: Mathieu Santamaría Loiacono, Fabricio Martinez Solomita, Martín Didolich (el usuario), Alejo Lopez Rodofile, Juan Bianchi, Agustín Garcia Riveros, Juan Bernardez.

## Recursos / referencias en el repo

- `GADS---Especificacion-Requisitos-Trabajo-Practico_1.pdf` — spec oficial de la cátedra (17 págs)
- `TP Gads1.docx` — entrega del grupo. Contiene el ER canónico (image1.png) y decisiones de diseño justificadas.
- `frontend/src/data/mockData.ts` — los 10 empleados de muestra que se migran al seed.
