# ⚡ Severe Weather Nowcasting Studio

Editor web para anotar imágenes de radar con advertencias de tiempo severo al estilo del **Storm Prediction Center (SPC) / NOAA**. Carga una imagen de radar y dibuja polígonos de warnings/watches, coloca iconos de severidad, vectores de movimiento de tormenta, etiquetas, marcadores de ciudad y mucho más. Todo funciona localmente en el navegador, sin servidor.

## 🚀 Cómo usarlo

**Opción rápida (un solo archivo):**
1. Descarga **`weather-app.html`**
2. Ábrelo directamente en tu navegador (doble clic). No necesita nada más.

**Opción modular (para desarrollo):**
- Abre `index.html`. Usa `styles.css` y `script.js` por separado.

## 🧭 Flujo básico

1. **Cargar Imagen** de radar (PNG/JPG) o arrástrala al lienzo.
2. Elige una **herramienta** en la barra superior.
3. Dibuja / coloca elementos sobre el radar.
4. **Exporta a PNG** o guarda el **proyecto `.json`** para seguir editando luego.

## 🛠️ Herramientas

| Herramienta | Atajo | Descripción |
|---|---|---|
| 🖱️ Seleccionar | `V` | Selecciona y arrastra cualquier objeto |
| ⬡ Polígono | `P` | Dibuja warnings/watches (clic por vértice; doble clic / Enter cierra) |
| 🌪️ Iconos | `I` | Coloca iconos de severidad |
| 📝 Texto | `T` | Etiquetas de texto con contorno |
| ➡️ Vector movimiento | `M` | Dirección + velocidad de la tormenta |
| 📍 Ciudad | `C` | Marcador con nombre |
| 📏 Medir | `D` | Distancia entre dos puntos (escala km/píxel) |

Otros atajos: `Ctrl+Z` deshacer · `Ctrl+Y` rehacer · `Ctrl+S` exportar PNG · `Supr` eliminar selección · `Esc` cancelar.

## ⚠️ Tipos de alerta (colores estilo SPC)

Tornado Warning · PDS Tornado Warning · Tornado Emergency · Tornado Watch · Severe T-Storm Warning · Severe T-Storm Watch · Extreme Wind Warning · Flash Flood Warning · Flash Flood Emergency · Flash Flood Watch · Special Marine Warning · Winter Storm Warning.

## 🎨 Estética del polígono (menú desplegable)

- **Solo contorno**
- **Líneas negras internas**
- **Hatch** (relleno + líneas) — el clásico de la SPC
- **Relleno sólido**
- **Borde con flechas** (estilo frente/outflow)

Con ángulo de líneas configurable (↘ -45°, ↗ 45°, horizontal, vertical, **cross-hatch**) y control de opacidad, grosor de borde y densidad de líneas.

## 🌩️ Iconos de severidad

🌪️ Tornado · 🧊 Granizo · 💨 Viento · ⛈️ Tormenta · 🌧️ Lluvia · ⚡ Rayo · 🌀 Funnel · 🌊 Inundación · ❄️ Nieve — con tamaño ajustable y etiqueta opcional.

## ✨ Funciones de nowcasting

- **Panel de capas**: lista de objetos con selección y borrado individual.
- **Vector de movimiento** con velocidad en km/h.
- **Herramienta de medición** con escala configurable.
- **Banner de información** editable (título, oficina, válido hasta).
- **Leyenda automática** que solo lista los tipos de alerta usados.
- **Cuadrícula** de referencia opcional.
- **Guardar / cargar proyecto** en `.json`.
- **Undo/Redo** (hasta 60 estados) y exportación a PNG.

## 📂 Estructura

```
index.html        # estructura (versión modular)
styles.css        # estilos
script.js         # lógica / motor de canvas
weather-app.html  # versión TODO-EN-UNO (lista para abrir directo)
```

---

*Inspirado en el NOAA Storm Prediction Center. Herramienta educativa / de visualización; no es una fuente oficial de pronósticos.*
