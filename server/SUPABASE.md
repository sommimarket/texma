# Maxing Agent · un Supabase para todas las apps

La idea: **un solo proyecto de Supabase** que sea la casa de TEXMA y de todo lo
que venga después, con un panel de dueño único. Separado del de Sommi Market
para no comerle el free tier.

## 1. Crear la organización y el proyecto

1. supabase.com → arriba a la izquierda, el selector de organización →
   **New organization** → nombre `Maxing Agent`, plan **Free**.
2. Adentro: **New project**
   - Nombre: `maxing-apps`
   - Región: **South America (São Paulo)** — es la más cerca de Argentina
   - Contraseña de la base: **guardala en el gestor de contraseñas, no se puede recuperar**
3. Anotá de *Project Settings → API*:
   - `Project URL` → `https://xxxx.supabase.co`
   - `anon key` (pública, va en el panel)
   - `service_role key` (**secreta**, nunca en el navegador ni en el repo)

### Lo que da el plan Free

| | Free |
|---|---|
| Proyectos activos | 2 por organización |
| Base de datos | 500 MB |
| Tráfico | 5 GB/mes |
| Archivos | 1 GB |
| Edge Functions | 500.000 llamadas/mes |
| `pg_cron`, `pg_net` | sí |

Para vender un planner alcanza y sobra: cada licencia son unos pocos bytes.

⚠ **Los proyectos free se pausan a los 7 días sin actividad.** No se pierde
nada (se reactiva con un click), pero si el día que se pausa alguien intenta
activar su licencia, le va a fallar. Se evita con cualquier cosa que le pegue
todos los días — por ejemplo el cron de limpieza que está más abajo.

## 2. El esquema multi-app

SQL Editor → pegar y correr:

```sql
-- Catálogo de tus apps
create table if not exists apps (
  id          text primary key,          -- 'texma', 'la-que-venga', ...
  nombre      text not null,
  version     text,
  precio_ars  int,
  activa      boolean default true,
  creada      timestamptz default now()
);

-- Una fila por venta
create table if not exists licencias (
  codigo      text primary key,          -- XXXX-XXXX-XXXX
  app_id      text not null references apps(id),
  comprador   text,                      -- nombre / WhatsApp / mail
  precio_ars  int,
  device      text,                      -- se llena al activarse
  activada_en timestamptz,
  revocada    boolean default false,
  nota        text,
  creada      timestamptz default now()
);
create index if not exists licencias_app on licencias (app_id, creada desc);

-- Quién tiene la app abierta (para saber cuánta gente la usa)
create table if not exists devices (
  device      text not null,
  app_id      text not null references apps(id),
  version     text,
  ultima_vez  timestamptz default now(),
  primary key (device, app_id)
);

alter table apps      enable row level security;
alter table licencias enable row level security;
alter table devices   enable row level security;
-- Sin políticas: solo entra la Edge Function con la service_role key.

insert into apps (id, nombre, version, precio_ars)
values ('texma', 'TEXMA · Planner personal', '1.2.0', 30000)
on conflict (id) do nothing;
```

Mantener el proyecto despierto + limpiar:

```sql
create extension if not exists pg_cron;
select cron.schedule('maxing-vivo', '0 9 * * *',
  $$ delete from devices where ultima_vez < now() - interval '180 days'; $$);
```

## 3. Las licencias

**Hoy funcionan con el Cloudflare Worker** (`server/worker.js`), publicado y
probado. **No lo toques todavía**: anda, es gratis y es rápido.

Cuando quieras mudarlo a Supabase, la lógica es idéntica — cambia dónde vive:

| | Worker (hoy) | Supabase (mañana) |
|---|---|---|
| Códigos | KV de Cloudflare | tabla `licencias` |
| Firma | ECDSA P-256 en el Worker | igual, en la Edge Function |
| Clave pública en la app | `LIC_PUB` | la misma, no cambia |
| Panel | `server/panel.html` | mismo panel, otra URL |

La clave privada se guarda con `supabase secrets set LIC_PRIVATE=...` y la app
no se entera de nada: sigue verificando offline con la misma `LIC_PUB`. La
ventaja de mudarlo es tener **todas las apps y todas las ventas en una tabla**
que podés ordenar, filtrar y exportar.

## 4. El panel de dueño

`server/panel.html` ya existe para TEXMA. La versión multi-app es la misma
pantalla con un selector arriba:

- **Apps** → alta de app nueva, precio, versión publicada
- **Licencias** → generar códigos, ver quién activó y cuándo, revocar
- **Uso** → cuántos dispositivos activos por app

Se sube a **Vercel** como sitio estático (o se deja local, es un HTML suelto).
Va con la `anon key` y una política de RLS de solo lectura para vos, o más
simple: pantalla protegida con una contraseña y todo por la Edge Function.

⚠ La `service_role key` **nunca** va en un HTML que se publica: quien la tenga
puede leer y borrar toda la base.

## 5. Orden recomendado

1. Crear la organización y el proyecto → correr el SQL del punto 2. *(10 min)*
2. Seguir vendiendo con el Worker como está.
3. Cuando haya 2 apps, mudar licencias a la Edge Function y unificar el panel.
4. Recién ahí, si hace falta, backup en la nube con Supabase Storage.

No hace falta hacerlo todo hoy. El punto 1 es lo único que conviene dejar
listo ya, para que el free tier de Sommi Market quede intacto.
