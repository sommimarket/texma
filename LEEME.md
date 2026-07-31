# TEXMA · Planner personal · V1.1.5

Planner mobile-first, sin cuentas ni internet obligatorio. Todos los datos se
guardan en el dispositivo (localStorage) y sobreviven al cerrar y volver a abrir.

## App instalable (PWA) — PUBLICADA ✓

**https://sommimarket.github.io/texma/**

En el celu: abrir esa URL en **Chrome** → menú ⋮ → **"Instalar app"**
(o "Agregar a pantalla de inicio"). Queda con el ícono rosa de TEXMA y
funciona 100% offline después de la primera visita.

Repo: https://github.com/sommimarket/texma (cuenta `sommimarket`).
Para actualizar: editar los archivos, **subir el `CACHE` de `sw.js`**
(`texma-v6` → `texma-v7`, etc.) y hacer `git push`. Si no se sube el número,
el service worker sigue sirviendo la versión vieja.

También se puede mandar `TEXMA.html` suelto por WhatsApp y abrirlo con Chrome.

## Qué tiene

- **Hoy**: saludo, agenda del día, tareas, medicamentos, costura, racha de
  entrenamiento y día del ciclo.
- **Agenda**: calendario mensual + próximos eventos y pagos.
- **Tareas**: prioridad, fecha límite, check animado.
- **Costura** ✂: proyectos con maniquí ilustrado y 15 medidas en cm, fotos,
  y toda la plata: **precio, seña, avíos, materiales propios, saldo y ganancia
  limpia**. Marca si **el cliente trajo el material** (si no, se listan los ítems
  que puso ella y se suman al total). Estados **pagado / entregado / cancelado**,
  cuánto hace que se terminó, cuántos días lleva **sin retirar**, y resumen por
  cliente con la **cantidad de arreglos** que pidió cada uno. Al marcar "pagado"
  entra solo como ingreso en Finanzas.
- **Lista de compras**: separada por **categorías** (Súper, Farmacia, Telas,
  Mercería, Casa + las que agregues), con **precios**, total de la lista y
  **historial de precios** por producto para armar presupuestos. Al tildar una
  compra con precio se registra sola como gasto.
- **Finanzas**: balance mensual, y al tocar **Ingresos** o **Gastos** se despliega
  el detalle: por categoría y uno por uno. Pagos recurrentes.
- **Entrenamiento**: **racha estilo Duolingo** (días seguidos, récord, logros),
  calendario del mes donde se anota qué se hizo cada día, y rutinas por día.
- **Ciclo menstrual**: registro informativo — día del ciclo, próximo período,
  ventana fértil estimada, historial y síntomas.
- **Control de stock**: inventario general para cualquier negocio (mercería,
  reventa, insumos). Cantidad, mínimo, costo, precio de venta, valor del
  inventario, alertas de reposición y movimientos de entrada/venta que pueden
  ir directo a Finanzas.
- **Notas, Agradecimientos, Pasatiempos, Medicamentos.**
- **Ajustes**: nombre, tema **Sistema / Claro / Oscuro** (claro y oscuro mandan
  aunque el celu esté al revés), 7 paletas + color libre, secciones on/off,
  notificaciones con prueba y diagnóstico, exportar/importar copia, borrar todo.

## Notificaciones

Se muestran a través del service worker. Donde el navegador soporta
`TimestampTrigger` (Chrome en Android) quedan **programadas de verdad** y suenan
con la app cerrada. Donde no, avisan mientras la app está viva y hacen **puesta
al día** al abrirla (avisos de hasta 3 horas atrás).

Ajustes → *Probar un aviso ahora* dice el estado exacto: permiso, si está
instalada y si el celu soporta alarmas en segundo plano.

## Copias de seguridad

Ajustes → "Exportar copia de seguridad" descarga un `.json` con todo.
Se restaura con "Importar copia" (acepta copias viejas de TEXMA y del viejo JIOM).

## Venta / licencias

Ver [`server/README.md`](server/README.md). Mientras `LIC_ON = false` en
`TEXMA.html`, la app funciona sin pedir código.
