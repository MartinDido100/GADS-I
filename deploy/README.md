# DigitalCheck — deploy en VM (Docker)

Stack en un solo `docker compose`:

- **postgres**: Postgres 16 con volumen persistente.
- **backend**: Node + Express + Prisma. Aplica `prisma migrate deploy` al arrancar.
- **frontend**: build de Vite servido por Nginx, que además proxya `/api/*` al backend.

Sólo se expone **un puerto** en la VM (por default `80`). El frontend habla con
el backend por el mismo origen (`/api`), así que no hace falta dominio ni
certificados — se accede por `http://<IP-de-la-VM>`.

---

## Requisitos en la VM

- Docker Engine + plugin compose (`docker compose version`)
- Puerto 80 abierto en el NSG de Azure (o el que elijas vía `PUBLIC_PORT`)
- ~2 GB RAM libres y ~5 GB disco

Instalar Docker en Ubuntu 22.04 (one-liner oficial):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER  # logout/login después
```

---

## Primer deploy

```bash
# 1. Subí el repo a la VM (git clone, scp, rsync — lo que prefieras)
cd implementacion/deploy

# 2. Configurá el entorno
cp .env.example .env
# editá .env y poné un JWT_SECRET fuerte:
#   openssl rand -base64 48

# 3. Build + arranque
docker compose up -d --build

# 4. Mirá los logs hasta que el backend diga "API listening"
docker compose logs -f backend
```

El backend corre `prisma migrate deploy` automáticamente en cada arranque, así
que el schema queda al día sin pasos manuales.

---

## Cargar datos iniciales

El seed **no corre automáticamente** (decisión del proyecto). Después del
primer `up`:

```bash
# Sembrar empleados, horarios, tipos de novedad, etc.
docker compose exec backend npx tsx prisma/seed.ts

# Setear la password del admin (1001) en "admin123"
docker compose exec backend npx tsx prisma/set-password.ts

# O setear otra password / otro legajo
docker compose exec backend npx tsx prisma/set-password.ts -- 1002 admin123

# Forzar reemplazo si ya tiene password
docker compose exec backend npx tsx prisma/set-password.ts -- 1001 nuevaPwd --force
```

Listo: entrá a `http://<IP-de-la-VM>` y logueá con legajo `1001` / `admin123`.

---

## Operación

```bash
# Ver estado
docker compose ps

# Logs por servicio
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Reiniciar un servicio (ej. después de cambiar JWT_SECRET en .env)
docker compose up -d backend

# Bajar todo (mantiene el volumen de Postgres)
docker compose down

# Bajar y BORRAR la base (¡destructivo!)
docker compose down -v
```

---

## Actualizar a una nueva versión

```bash
cd implementacion
git pull
cd deploy
docker compose up -d --build
```

`prisma migrate deploy` se ejecuta solo al reiniciar el backend, así que las
migrations nuevas se aplican sin tocar nada.

---

## Backups de Postgres

```bash
# Dump
docker compose exec postgres pg_dump -U digitalcheck digitalcheck > backup_$(date +%F).sql

# Restore (con la DB ya creada)
cat backup_2026-04-30.sql | docker compose exec -T postgres psql -U digitalcheck -d digitalcheck
```

---

## Configuración por variable de entorno (`.env`)

| Variable            | Default          | Notas                                              |
|---------------------|------------------|----------------------------------------------------|
| `POSTGRES_USER`     | `digitalcheck`   | Usuario de la DB                                   |
| `POSTGRES_PASSWORD` | `digitalcheck`   | **Cambiar en producción**                          |
| `POSTGRES_DB`       | `digitalcheck`   | Nombre de la DB                                    |
| `JWT_SECRET`        | — (requerido)    | Secreto de firma de tokens. Mínimo 32 bytes random |
| `JWT_EXPIRES_IN`    | `12h`            | Vida del token                                     |
| `CORS_ORIGIN`       | `*`              | Como Nginx hace same-origin, no es relevante       |
| `PUBLIC_PORT`       | `80`             | Puerto público que se mapea a Nginx                |

---

## Troubleshooting

- **`docker compose up` falla en backend con error de Prisma**: borrá la imagen
  con `docker compose build --no-cache backend` y volvé a levantar.
- **Backend no encuentra Postgres**: el `depends_on` con healthcheck debería
  resolverlo. Verificá con `docker compose ps` que `postgres` esté `healthy`.
- **404 al refrescar una ruta del SPA**: el `try_files` en `nginx.conf` ya cubre
  esto. Si sigue pasando, revisar que el build del frontend haya copiado bien
  el `index.html` a `/usr/share/nginx/html`.
- **El frontend pega a `localhost:3001`**: rebuild necesario — la URL se
  congela en build time. `docker compose build --no-cache frontend && docker compose up -d frontend`.
