# TEXMA · Planner personal · V1

Planner mobile-first, sin cuentas ni internet obligatorio. Todos los datos se
guardan en el dispositivo (localStorage) y sobreviven al cerrar y volver a abrir.

## Cómo dárselo a ella (opción simple, sin dominio)

1. Mandale el archivo **TEXMA.html** por WhatsApp / Telegram / mail.
2. En el celu, que lo descargue y lo abra con **Chrome**
   (desde la descarga: "Abrir con → Chrome").
3. En Chrome: menú ⋮ → **"Agregar a pantalla de inicio"**.
   Queda como ícono y se abre a pantalla completa.

⚠️ Importante: que lo abra siempre desde el mismo lugar (el mismo archivo /
ícono), porque los datos quedan asociados a esa ubicación.

## App instalable (PWA) — YA PUBLICADA ✓

La app está en línea, gratis y sin dominio propio:

**https://sommimarket.github.io/texma/**

En el celu: abrir esa URL en **Chrome** → menú ⋮ → **"Instalar app"**
(o "Agregar a pantalla de inicio"). Queda con el ícono rosa de TEXMA y
funciona 100% offline después de la primera visita.

Repo: https://github.com/sommimarket/texma (cuenta `sommimarket`).
Para actualizar la app: editar los archivos, subir el `CACHE` de `sw.js`
(`texma-v1` → `texma-v2`, etc.) y hacer `git push`.

## Qué tiene

- **Hoy**: saludo, agenda del día, tareas pendientes, medicamentos, costura en curso.
- **Agenda**: calendario mensual + próximos eventos (citas, eventos, recordatorios).
- **Tareas**: con prioridad, fecha límite y check animado.
- **Costura** ✂: proyectos (vestido / prenda / arreglo), con **maniquí ilustrado
  y 12 medidas en cm** (busto, cintura, cadera, espalda, hombro, talle, manga,
  brazo, cuello, tiro, falda, largo total), cliente, fecha de entrega, notas, y
  check de "terminado" con lluvia de corazones.
- **Más**: Notas (con búsqueda y colores), Entrenamiento (rutinas por día),
  Medicamentos (tomas diarias con checklist), Pasatiempos (metas semanales),
  Finanzas (balance mensual animado + gastos por categoría), Ajustes.
- **Ajustes**: nombre para el saludo, 6 paletas de color, notificaciones,
  exportar/importar copia de seguridad JSON, borrar todo.

## Copias de seguridad

Ajustes → "Exportar copia de seguridad" descarga un `.json` con todo.
Se restaura con "Importar copia" (acepta también copias del viejo JIOM).
