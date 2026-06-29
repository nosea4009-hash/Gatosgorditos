/* ============================================================
   Severe Weather Nowcasting Studio v2.0
   Motor de objetos unificado (polígonos, iconos, texto,
   vectores de movimiento, marcadores y mediciones).
   ============================================================ */

// ===================== DOM =====================
const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvasWrapper');
const dropZone = document.getElementById('dropZone');
const imageUpload = document.getElementById('imageUpload');
const canvasTitle = document.getElementById('canvasTitle');
const cursorCoords = document.getElementById('cursorCoords');
const objectCount = document.getElementById('polygonCount');
const toolStatus = document.getElementById('toolStatus');
const hintBar = document.getElementById('hintBar');
const layersList = document.getElementById('layersList');

// Polygon style controls
const polyStyleSelect = document.getElementById('polyStyleSelect');
const hatchAngleSel = document.getElementById('hatchAngle');
const opacitySlider = document.getElementById('opacity');
const opacityValue = document.getElementById('opacityValue');
const borderWidthSlider = document.getElementById('borderWidth');
const borderValue = document.getElementById('borderValue');
const hatchSpacingSlider = document.getElementById('hatchSpacing');
const spacingValue = document.getElementById('spacingValue');
const polyBlackStroke = document.getElementById('polyBlackStroke');

// Icon controls
const iconSizeSlider = document.getElementById('iconSize');
const iconSizeValue = document.getElementById('iconSizeValue');
const iconLabelToggle = document.getElementById('iconLabelToggle');

// Text controls
const textInput = document.getElementById('textInput');
const textSizeSlider = document.getElementById('textSize');
const textSizeValue = document.getElementById('textSizeValue');
const textColorInput = document.getElementById('textColor');
const textHaloToggle = document.getElementById('textHalo');

// Motion / marker / measure
const motionSpeed = document.getElementById('motionSpeed');
const motionColor = document.getElementById('motionColor');
const markerInput = document.getElementById('markerInput');
const kmPerPixelInput = document.getElementById('kmPerPixel');

// Overlays + banner
const toggleGrid = document.getElementById('toggleGrid');
const toggleLegend = document.getElementById('toggleLegend');
const toggleBanner = document.getElementById('toggleBanner');
const bannerTitle = document.getElementById('bannerTitle');
const bannerOffice = document.getElementById('bannerOffice');
const bannerValid = document.getElementById('bannerValid');

// ===================== Estado =====================
let radarImage = null;
let objects = [];          // todos los objetos dibujados
let selectedId = null;
let currentTool = 'select';
let currentAlertType = 'tornado-warning';
let currentIcon = 'tornado';
let uid = 1;

// borradores temporales
let draftPolygon = [];     // puntos del polígono en construcción
let pendingPoint = null;   // primer clic para motion / measure
let mousePos = { x: 0, y: 0 };

// drag
let dragging = false;
let dragStart = null;
let dragOrigin = null;     // snapshot del objeto al iniciar arrastre

// historial
let history = [];
let historyIndex = -1;

// ===================== Definiciones =====================
const alertTypes = {
    'tornado-warning':       { name: 'Tornado Warning',          color: '#FF0606', border: '#d10000' },
    'pds':                   { name: 'PDS Tornado Warning',      color: '#FF33FF', border: '#a300a3' },
    'tornado-emergency':     { name: 'Tornado Emergency',        color: '#A020F0', border: '#5e0a8f' },
    'tornado-watch':         { name: 'Tornado Watch',            color: '#FF0606', border: '#d10000' },
    'severe-warning':        { name: 'Severe T-Storm Warning',   color: '#FFC113', border: '#d19a0a' },
    'severe-watch':          { name: 'Severe T-Storm Watch',     color: '#FFE900', border: '#d1c000' },
    'extreme-wind':          { name: 'Extreme Wind Warning',     color: '#FF33A8', border: '#cc1a7a' },
    'flash-flood-warning':   { name: 'Flash Flood Warning',      color: '#00C853', border: '#00863a' },
    'flash-flood-emergency': { name: 'Flash Flood Emergency',    color: '#00E676', border: '#00a152' },
    'flash-flood-watch':     { name: 'Flash Flood Watch',        color: '#66BB6A', border: '#3a8c3e' },
    'special-marine':        { name: 'Special Marine Warning',   color: '#FFB300', border: '#cc8e00' },
    'special-weather-stmt':  { name: 'Special Weather Statement', color: '#FFE4B5', border: '#c9a86a' },
    'winter-storm':          { name: 'Winter Storm Warning',     color: '#5B8DEF', border: '#2f5fc0' }
};

const iconDefs = {
    tornado:   { emoji: '🌪️', label: 'Tornado' },
    hail:      { emoji: '🧊', label: 'Granizo' },
    wind:      { emoji: '💨', label: 'Viento' },
    storm:     { emoji: '⛈️', label: 'Tormenta' },
    rain:      { emoji: '🌧️', label: 'Lluvia' },
    lightning: { emoji: '⚡', label: 'Rayo' },
    funnel:    { emoji: '🌀', label: 'Funnel' },
    flood:     { emoji: '🌊', label: 'Inundación' },
    snow:      { emoji: '❄️', label: 'Nieve' }
};

const toolNames = {
    select: 'Seleccionar', polygon: 'Polígono', icon: 'Iconos',
    text: 'Texto', motion: 'Vector de movimiento', marker: 'Ciudad', measure: 'Medir'
};

const toolHints = {
    select: 'Haz clic en un objeto para seleccionarlo y arrástralo para moverlo. Supr lo elimina.',
    polygon: 'Clic para añadir vértices. Doble clic, clic derecho o Enter cierra el polígono. Esc cancela.',
    icon: 'Elige un icono a la izquierda y haz clic en el radar para colocarlo.',
    text: 'Escribe el texto en el panel y haz clic donde quieras colocarlo.',
    motion: 'Clic en el origen de la tormenta y luego en su destino para trazar el vector.',
    marker: 'Escribe la ciudad y haz clic para colocar el marcador.',
    measure: 'Clic en dos puntos para medir la distancia (ajusta la escala km/píxel).'
};


// ===================== Inicialización =====================
function init() {
    canvas.width = 900;
    canvas.height = 600;

    // Carga de imagen
    imageUpload.addEventListener('change', e => { if (e.target.files[0]) loadImageFile(e.target.files[0]); });
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('active'); });
    dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('active'); });
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('active');
        const f = e.dataTransfer.files[0];
        if (f && f.type.match('image.*')) loadImageFile(f);
    });

    // Canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (currentTool === 'polygon') finishPolygon(); });

    // Toolbar
    document.querySelectorAll('.tool[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('deleteSelBtn').addEventListener('click', deleteSelected);
    document.getElementById('clearCanvas').addEventListener('click', clearAll);

    // Header actions
    document.getElementById('exportBtn').addEventListener('click', exportImage);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
    document.getElementById('loadProjectBtn').addEventListener('click', () => document.getElementById('loadProjectInput').click());
    document.getElementById('loadProjectInput').addEventListener('change', e => { if (e.target.files[0]) loadProject(e.target.files[0]); });

    // Alert type buttons
    document.querySelectorAll('.alert-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.alert-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAlertType = btn.dataset.type;
            applyStyleToSelectedPolygon();
        });
    });

    // Icon buttons
    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentIcon = btn.dataset.icon;
        });
    });

    // Style controls -> update labels + selected object
    polyStyleSelect.addEventListener('change', applyStyleToSelectedPolygon);
    hatchAngleSel.addEventListener('change', applyStyleToSelectedPolygon);
    opacitySlider.addEventListener('input', () => { opacityValue.textContent = opacitySlider.value + '%'; applyStyleToSelectedPolygon(); });
    borderWidthSlider.addEventListener('input', () => { borderValue.textContent = borderWidthSlider.value + 'px'; applyStyleToSelectedPolygon(); });
    hatchSpacingSlider.addEventListener('input', () => { spacingValue.textContent = hatchSpacingSlider.value + 'px'; applyStyleToSelectedPolygon(); });
    polyBlackStroke.addEventListener('change', applyStyleToSelectedPolygon);

    iconSizeSlider.addEventListener('input', () => { iconSizeValue.textContent = iconSizeSlider.value + 'px'; applyToSelected('size', parseInt(iconSizeSlider.value)); });
    iconLabelToggle.addEventListener('change', () => applyToSelected('showLabel', iconLabelToggle.checked));
    textSizeSlider.addEventListener('input', () => { textSizeValue.textContent = textSizeSlider.value + 'px'; applyToSelected('size', parseInt(textSizeSlider.value)); });
    textColorInput.addEventListener('input', () => applyToSelected('color', textColorInput.value));
    textHaloToggle.addEventListener('change', () => applyToSelected('halo', textHaloToggle.checked));
    motionColor.addEventListener('input', () => applyToSelected('color', motionColor.value));
    motionSpeed.addEventListener('input', () => applyToSelected('speed', parseFloat(motionSpeed.value)));

    // Overlays + banner
    [toggleGrid, toggleLegend, toggleBanner].forEach(t => t.addEventListener('change', redraw));
    [bannerTitle, bannerOffice, bannerValid].forEach(i => i.addEventListener('input', redraw));

    // Default valid time
    bannerValid.value = defaultValidTime();

    document.addEventListener('keydown', handleKeyboard);

    setTool('select');
    pushHistory();
    redraw();
    updateLayers();
}

function defaultValidTime() {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm} (local)`;
}

// ===================== Herramientas / paneles =====================
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    document.querySelectorAll('.context-panel').forEach(p => { p.hidden = (p.dataset.context !== tool); });
    toolStatus.textContent = 'Herramienta: ' + (toolNames[tool] || tool);
    hintBar.textContent = toolHints[tool] || '';
    // cancelar borradores al cambiar de herramienta
    if (tool !== 'polygon') draftPolygon = [];
    pendingPoint = null;
    canvas.style.cursor = (tool === 'select') ? 'default' : 'crosshair';
    redraw();
}

// ===================== Carga de imagen =====================
function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            radarImage = img;
            const maxW = 1280, maxH = 820;
            let w = img.width, h = img.height;
            if (w > maxW) { h = h * maxW / w; w = maxW; }
            if (h > maxH) { w = w * maxH / h; h = maxH; }
            canvas.width = Math.round(w);
            canvas.height = Math.round(h);
            dropZone.classList.add('hidden');
            canvasTitle.textContent = 'Lienzo — ' + file.name;
            redraw();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

// ===================== Lectura de ajustes actuales =====================
function currentPolyStyle() {
    return {
        mode: polyStyleSelect.value,
        hatchAngle: hatchAngleSel.value,
        opacity: parseInt(opacitySlider.value) / 100,
        borderWidth: parseInt(borderWidthSlider.value),
        spacing: parseInt(hatchSpacingSlider.value),
        blackStroke: polyBlackStroke.checked
    };
}


// ===================== RENDER =====================
function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (radarImage) {
        ctx.drawImage(radarImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#0e1c2c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (toggleGrid.checked) drawGrid();

    objects.forEach(obj => drawObject(obj, obj.id === selectedId));

    // borrador del polígono en construcción
    if (currentTool === 'polygon' && draftPolygon.length > 0) drawDraftPolygon();
    // borrador motion/measure
    if (pendingPoint && (currentTool === 'motion' || currentTool === 'measure')) {
        ctx.save();
        ctx.strokeStyle = currentTool === 'motion' ? motionColor.value : '#00e5ff';
        ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pendingPoint.x, pendingPoint.y); ctx.lineTo(mousePos.x, mousePos.y); ctx.stroke();
        ctx.restore();
    }

    if (toggleLegend.checked) drawLegend();
    if (toggleBanner.checked) drawBanner();
}

function drawObject(obj, selected) {
    switch (obj.kind) {
        case 'polygon': drawPolygon(obj); break;
        case 'icon':    drawIcon(obj); break;
        case 'text':    drawTextObj(obj); break;
        case 'motion':  drawMotion(obj); break;
        case 'marker':  drawMarker(obj); break;
        case 'measure': drawMeasure(obj); break;
    }
    if (selected) drawSelection(obj);
}

// ---------- Polígono ----------
function pathPolygon(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
}

function drawPolygon(obj) {
    const pts = obj.points;
    if (pts.length < 2) return;
    const al = alertTypes[obj.alertType] || alertTypes['tornado-warning'];
    const st = obj.style;
    ctx.save();

    if (pts.length > 2) {
        // Relleno de color (solid / hatch)
        if (st.mode === 'solid' || st.mode === 'hatch') {
            pathPolygon(pts);
            ctx.fillStyle = hexToRgba(al.color, st.opacity);
            ctx.fill();
        } else if (st.mode === 'arrows') {
            pathPolygon(pts);
            ctx.fillStyle = hexToRgba(al.color, Math.min(st.opacity, 0.25));
            ctx.fill();
        }
        // Líneas negras internas (lines / hatch)
        if (st.mode === 'lines' || st.mode === 'hatch') {
            ctx.save();
            pathPolygon(pts);
            ctx.clip();
            drawHatchLines(pts, st.hatchAngle, st.spacing);
            ctx.restore();
        }
    }

    // Borde (con trazo negro exterior opcional)
    ctx.lineJoin = 'round';
    if (st.blackStroke) {
        pathPolygon(pts);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = st.borderWidth + 3;
        ctx.stroke();
    }
    pathPolygon(pts);
    ctx.strokeStyle = al.color;
    ctx.lineWidth = st.borderWidth;
    ctx.stroke();

    // Flechas direccionales sobre el borde
    if (st.mode === 'arrows' && pts.length > 2) drawBorderArrows(pts, al.color);

    ctx.restore();
}

function drawHatchLines(points, angle, spacing) {
    const angles = (angle === 'cross') ? [-45, 45] : [parseFloat(angle)];
    const b = getBounds(points);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    const diag = Math.hypot(b.maxX - b.minX, b.maxY - b.minY) / 2 + 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = 1;
    angles.forEach(deg => {
        const th = deg * Math.PI / 180;
        const dx = Math.cos(th), dy = Math.sin(th);     // dirección de la línea
        const nx = -Math.sin(th), ny = Math.cos(th);    // normal (offset)
        for (let off = -diag; off <= diag; off += spacing) {
            const bx = cx + nx * off, by = cy + ny * off;
            ctx.beginPath();
            ctx.moveTo(bx - dx * diag, by - dy * diag);
            ctx.lineTo(bx + dx * diag, by + dy * diag);
            ctx.stroke();
        }
    });
}

function drawBorderArrows(points, color) {
    ctx.save();
    ctx.fillStyle = color;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const a = points[i], bpt = points[(i + 1) % n];
        const mx = (a.x + bpt.x) / 2, my = (a.y + bpt.y) / 2;
        const ang = Math.atan2(bpt.y - a.y, bpt.x - a.x);
        const s = 9;
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(s, 0); ctx.lineTo(-s, -s * 0.7); ctx.lineTo(-s, s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawDraftPolygon() {
    const al = alertTypes[currentAlertType];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(draftPolygon[0].x, draftPolygon[0].y);
    for (let i = 1; i < draftPolygon.length; i++) ctx.lineTo(draftPolygon[i].x, draftPolygon[i].y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.strokeStyle = al.color;
    ctx.lineWidth = parseInt(borderWidthSlider.value);
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    draftPolygon.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = al.color; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.restore();
}

// ---------- Icono ----------
function drawIcon(obj) {
    ctx.save();
    ctx.font = `${obj.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconDefs[obj.iconType].emoji, obj.x, obj.y);
    if (obj.showLabel) {
        const label = iconDefs[obj.iconType].label;
        ctx.font = 'bold 13px "Segoe UI", sans-serif';
        drawHaloText(label, obj.x, obj.y + obj.size / 2 + 10, '#ffffff', true);
    }
    ctx.restore();
}

// ---------- Texto ----------
function drawTextObj(obj) {
    ctx.save();
    ctx.font = `bold ${obj.size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    drawHaloText(obj.text, obj.x, obj.y, obj.color, obj.halo);
    ctx.restore();
}

function drawHaloText(text, x, y, color, halo) {
    if (halo) {
        ctx.lineWidth = Math.max(2, ctx.measureText('M').width * 0.12);
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// ---------- Vector de movimiento ----------
function drawMotion(obj) {
    ctx.save();
    ctx.strokeStyle = obj.color;
    ctx.fillStyle = obj.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
    // punta de flecha
    const ang = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
    const s = 16;
    ctx.beginPath();
    ctx.moveTo(obj.x2, obj.y2);
    ctx.lineTo(obj.x2 - s * Math.cos(ang - 0.4), obj.y2 - s * Math.sin(ang - 0.4));
    ctx.lineTo(obj.x2 - s * Math.cos(ang + 0.4), obj.y2 - s * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
    // etiqueta de velocidad
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const mx = (obj.x1 + obj.x2) / 2, my = (obj.y1 + obj.y2) / 2;
    drawHaloText(`${obj.speed} km/h →`, mx, my - 12, '#ffffff', true);
    ctx.restore();
}

// ---------- Marcador de ciudad ----------
function drawMarker(obj) {
    ctx.save();
    ctx.beginPath(); ctx.arc(obj.x, obj.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    drawHaloText(obj.label, obj.x + 10, obj.y, '#ffffff', true);
    ctx.restore();
}

// ---------- Medición ----------
function drawMeasure(obj) {
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.fillStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.moveTo(obj.x1, obj.y1); ctx.lineTo(obj.x2, obj.y2); ctx.stroke();
    ctx.setLineDash([]);
    [[obj.x1, obj.y1], [obj.x2, obj.y2]].forEach(([px, py]) => {
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    });
    const distPx = Math.hypot(obj.x2 - obj.x1, obj.y2 - obj.y1);
    const km = (distPx * obj.kmPerPixel).toFixed(1);
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const mx = (obj.x1 + obj.x2) / 2, my = (obj.y1 + obj.y2) / 2;
    drawHaloText(`${km} km`, mx, my - 12, '#00e5ff', true);
    ctx.restore();
}


// ---------- Grid ----------
function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = step; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = step; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
}

// ---------- Leyenda automática ----------
function drawLegend() {
    const used = [...new Set(objects.filter(o => o.kind === 'polygon').map(o => o.alertType))];
    if (used.length === 0) return;
    ctx.save();
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    const rowH = 20, pad = 10, sw = 26;
    let maxW = 0;
    used.forEach(t => { maxW = Math.max(maxW, ctx.measureText(alertTypes[t].name).width); });
    const boxW = sw + 8 + maxW + pad * 2;
    const boxH = used.length * rowH + pad * 2 + 16;
    const x = canvas.width - boxW - 12, y = 12;
    ctx.fillStyle = 'rgba(8,18,30,0.82)';
    roundRect(x, y, boxW, boxH, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; roundRect(x, y, boxW, boxH, 8); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('LEYENDA', x + pad, y + pad + 6);
    used.forEach((t, i) => {
        const ry = y + pad + 22 + i * rowH;
        ctx.fillStyle = alertTypes[t].color;
        ctx.fillRect(x + pad, ry - 7, sw, 14);
        ctx.strokeStyle = alertTypes[t].border; ctx.lineWidth = 1.5; ctx.strokeRect(x + pad, ry - 7, sw, 14);
        ctx.fillStyle = '#fff';
        ctx.fillText(alertTypes[t].name, x + pad + sw + 8, ry);
    });
    ctx.restore();
}

// ---------- Banner de información ----------
function drawBanner() {
    const h = 46;
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, 'rgba(0,20,45,0.92)');
    grad.addColorStop(1, 'rgba(0,70,140,0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, h);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(0, h, canvas.width, 3);

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillText(bannerTitle.value || '', 14, h / 2);

    ctx.textAlign = 'right';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cfe0f5';
    const office = bannerOffice.value ? bannerOffice.value : '';
    const valid = bannerValid.value ? 'Válido hasta ' + bannerValid.value : '';
    ctx.fillText(office, canvas.width - 14, h / 2 - 9);
    ctx.fillText(valid, canvas.width - 14, h / 2 + 9);
    ctx.restore();
}

// ---------- Selección ----------
function drawSelection(obj) {
    const b = getObjectBounds(obj);
    if (!b) return;
    ctx.save();
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(b.minX - 6, b.minY - 6, (b.maxX - b.minX) + 12, (b.maxY - b.minY) + 12);
    ctx.setLineDash([]);
    if (obj.kind === 'polygon') {
        obj.points.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ff6600'; ctx.fill();
        });
    }
    ctx.restore();
}

// ===================== Geometría =====================
function getBounds(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });
    return { minX, minY, maxX, maxY };
}

function getObjectBounds(obj) {
    switch (obj.kind) {
        case 'polygon': return obj.points.length ? getBounds(obj.points) : null;
        case 'icon':    { const r = obj.size / 2; return { minX: obj.x - r, minY: obj.y - r, maxX: obj.x + r, maxY: obj.y + r }; }
        case 'text':    { ctx.font = `bold ${obj.size}px "Segoe UI", sans-serif`; const w = ctx.measureText(obj.text).width; return { minX: obj.x, minY: obj.y - obj.size/2, maxX: obj.x + w, maxY: obj.y + obj.size/2 }; }
        case 'marker':  { ctx.font = 'bold 14px "Segoe UI", sans-serif'; const w = ctx.measureText(obj.label).width; return { minX: obj.x - 6, minY: obj.y - 10, maxX: obj.x + 12 + w, maxY: obj.y + 10 }; }
        case 'motion':
        case 'measure': return { minX: Math.min(obj.x1, obj.x2), minY: Math.min(obj.y1, obj.y2), maxX: Math.max(obj.x1, obj.x2), maxY: Math.max(obj.y1, obj.y2) };
    }
    return null;
}

function pointInPolygon(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function distToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}


// ===================== Interacción =====================
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function handleMouseDown(e) {
    if (currentTool !== 'select') return;
    const pos = getPos(e);
    const hit = hitTest(pos);
    selectObject(hit ? hit.id : null);
    if (hit) {
        dragging = true;
        dragStart = pos;
        dragOrigin = JSON.parse(JSON.stringify(hit));
    }
}

function handleMouseMove(e) {
    const pos = getPos(e);
    mousePos = pos;
    cursorCoords.textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;

    if (dragging && selectedId != null) {
        const dx = pos.x - dragStart.x, dy = pos.y - dragStart.y;
        moveObject(getObject(selectedId), dragOrigin, dx, dy);
        redraw();
    } else if ((currentTool === 'polygon' && draftPolygon.length) || pendingPoint) {
        redraw();
    }
}

function handleMouseUp() {
    if (dragging) {
        dragging = false;
        pushHistory();
    }
}

function handleClick(e) {
    const pos = getPos(e);
    switch (currentTool) {
        case 'polygon':
            draftPolygon.push(pos);
            redraw();
            break;
        case 'icon':
            addObject({ kind: 'icon', iconType: currentIcon, x: pos.x, y: pos.y,
                        size: parseInt(iconSizeSlider.value), showLabel: iconLabelToggle.checked });
            break;
        case 'text': {
            let txt = textInput.value.trim();
            if (!txt) txt = prompt('Texto a colocar:', '');
            if (txt) addObject({ kind: 'text', x: pos.x, y: pos.y, text: txt,
                        size: parseInt(textSizeSlider.value), color: textColorInput.value, halo: textHaloToggle.checked });
            break;
        }
        case 'marker': {
            let name = markerInput.value.trim();
            if (!name) name = prompt('Nombre de la ciudad:', '');
            if (name) addObject({ kind: 'marker', x: pos.x, y: pos.y, label: name });
            break;
        }
        case 'motion':
            if (!pendingPoint) { pendingPoint = pos; }
            else {
                addObject({ kind: 'motion', x1: pendingPoint.x, y1: pendingPoint.y, x2: pos.x, y2: pos.y,
                            speed: parseFloat(motionSpeed.value) || 0, color: motionColor.value });
                pendingPoint = null;
            }
            break;
        case 'measure':
            if (!pendingPoint) { pendingPoint = pos; }
            else {
                addObject({ kind: 'measure', x1: pendingPoint.x, y1: pendingPoint.y, x2: pos.x, y2: pos.y,
                            kmPerPixel: parseFloat(kmPerPixelInput.value) || 1 });
                pendingPoint = null;
            }
            break;
    }
}

function handleDoubleClick(e) {
    if (currentTool === 'polygon') finishPolygon();
}

function finishPolygon() {
    // quitar puntos duplicados del doble clic
    while (draftPolygon.length >= 2) {
        const a = draftPolygon[draftPolygon.length - 1], b = draftPolygon[draftPolygon.length - 2];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 6) draftPolygon.pop(); else break;
    }
    if (draftPolygon.length < 3) { draftPolygon = []; redraw(); return; }
    addObject({ kind: 'polygon', alertType: currentAlertType, points: draftPolygon.map(p => ({ x: p.x, y: p.y })), style: currentPolyStyle() });
    draftPolygon = [];
}

// ===================== Hit testing =====================
function hitTest(pos) {
    for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        if (o.kind === 'polygon') {
            if (o.points.length > 2 && pointInPolygon(pos, o.points)) return o;
            for (let j = 0; j < o.points.length; j++) {
                if (distToSegment(pos, o.points[j], o.points[(j + 1) % o.points.length]) < o.style.borderWidth + 5) return o;
            }
        } else if (o.kind === 'motion' || o.kind === 'measure') {
            if (distToSegment(pos, { x: o.x1, y: o.y1 }, { x: o.x2, y: o.y2 }) < 9) return o;
        } else {
            const b = getObjectBounds(o);
            if (b && pos.x >= b.minX - 4 && pos.x <= b.maxX + 4 && pos.y >= b.minY - 4 && pos.y <= b.maxY + 4) return o;
        }
    }
    return null;
}

// ===================== Mover objetos =====================
function moveObject(obj, origin, dx, dy) {
    if (!obj) return;
    if (obj.kind === 'polygon') {
        obj.points = origin.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    } else if (obj.kind === 'motion' || obj.kind === 'measure') {
        obj.x1 = origin.x1 + dx; obj.y1 = origin.y1 + dy;
        obj.x2 = origin.x2 + dx; obj.y2 = origin.y2 + dy;
    } else {
        obj.x = origin.x + dx; obj.y = origin.y + dy;
    }
}


// ===================== CRUD de objetos =====================
function addObject(obj) {
    obj.id = uid++;
    objects.push(obj);
    selectedId = obj.id;
    pushHistory();
    updateLayers();
    redraw();
}

function getObject(id) { return objects.find(o => o.id === id); }

function deleteSelected() {
    if (selectedId == null) return;
    objects = objects.filter(o => o.id !== selectedId);
    selectedId = null;
    pushHistory();
    updateLayers();
    redraw();
}

function clearAll() {
    if (!objects.length && !draftPolygon.length) return;
    if (!confirm('¿Eliminar todos los objetos del lienzo?')) return;
    objects = [];
    draftPolygon = [];
    selectedId = null;
    pushHistory();
    updateLayers();
    redraw();
}

// ===================== Selección + sincronización de controles =====================
function selectObject(id) {
    selectedId = id;
    if (id != null) syncControlsFromSelection(getObject(id));
    updateLayers();
    redraw();
}

function syncControlsFromSelection(o) {
    if (!o) return;
    if (o.kind === 'polygon') {
        currentAlertType = o.alertType;
        document.querySelectorAll('.alert-btn').forEach(b => b.classList.toggle('active', b.dataset.type === o.alertType));
        polyStyleSelect.value = o.style.mode;
        hatchAngleSel.value = o.style.hatchAngle;
        opacitySlider.value = Math.round(o.style.opacity * 100); opacityValue.textContent = opacitySlider.value + '%';
        borderWidthSlider.value = o.style.borderWidth; borderValue.textContent = o.style.borderWidth + 'px';
        hatchSpacingSlider.value = o.style.spacing; spacingValue.textContent = o.style.spacing + 'px';
        polyBlackStroke.checked = !!o.style.blackStroke;
    } else if (o.kind === 'icon') {
        currentIcon = o.iconType;
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.toggle('active', b.dataset.icon === o.iconType));
        iconSizeSlider.value = o.size; iconSizeValue.textContent = o.size + 'px';
        iconLabelToggle.checked = o.showLabel;
    } else if (o.kind === 'text') {
        textInput.value = o.text; textSizeSlider.value = o.size; textSizeValue.textContent = o.size + 'px';
        textColorInput.value = o.color; textHaloToggle.checked = o.halo;
    } else if (o.kind === 'motion') {
        motionSpeed.value = o.speed; motionColor.value = o.color;
    }
}

// Aplica cambios de estilo a un polígono seleccionado (o solo afecta a futuros)
function applyStyleToSelectedPolygon() {
    const o = getObject(selectedId);
    if (o && o.kind === 'polygon') {
        o.alertType = currentAlertType;
        o.style = currentPolyStyle();
        redraw();
    }
}

// Aplica una propiedad puntual al objeto seleccionado
function applyToSelected(prop, value) {
    const o = getObject(selectedId);
    if (!o) return;
    if (prop in o) { o[prop] = value; redraw(); }
}

// ===================== Panel de capas =====================
function updateLayers() {
    objectCount.textContent = 'Objetos: ' + objects.length;
    layersList.innerHTML = '';
    if (!objects.length) {
        const li = document.createElement('li');
        li.className = 'layers-empty';
        li.textContent = 'Sin objetos todavía.';
        layersList.appendChild(li);
        return;
    }
    [...objects].reverse().forEach(o => {
        const li = document.createElement('li');
        li.className = 'layer-item' + (o.id === selectedId ? ' selected' : '');
        const icon = document.createElement('span');
        icon.className = 'layer-icon';
        icon.textContent = layerIcon(o);
        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = layerName(o);
        const del = document.createElement('button');
        del.className = 'layer-del';
        del.textContent = '✕';
        del.title = 'Eliminar';
        del.addEventListener('click', ev => { ev.stopPropagation(); objects = objects.filter(x => x.id !== o.id); if (selectedId === o.id) selectedId = null; pushHistory(); updateLayers(); redraw(); });
        li.appendChild(icon); li.appendChild(name); li.appendChild(del);
        li.addEventListener('click', () => { setTool('select'); selectObject(o.id); });
        layersList.appendChild(li);
    });
}

function layerIcon(o) {
    if (o.kind === 'polygon') return '⬡';
    if (o.kind === 'icon') return iconDefs[o.iconType].emoji;
    if (o.kind === 'text') return '📝';
    if (o.kind === 'motion') return '➡️';
    if (o.kind === 'marker') return '📍';
    if (o.kind === 'measure') return '📏';
    return '•';
}

function layerName(o) {
    if (o.kind === 'polygon') return alertTypes[o.alertType].name;
    if (o.kind === 'icon') return 'Icono: ' + iconDefs[o.iconType].label;
    if (o.kind === 'text') return 'Texto: ' + o.text;
    if (o.kind === 'motion') return 'Vector ' + o.speed + ' km/h';
    if (o.kind === 'marker') return 'Ciudad: ' + o.label;
    if (o.kind === 'measure') return 'Medición';
    return o.kind;
}

// ===================== Historial =====================
function pushHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(JSON.stringify(objects));
    historyIndex++;
    if (history.length > 60) { history.shift(); historyIndex--; }
}

function undo() {
    if (historyIndex <= 0) { if (historyIndex === 0) { historyIndex--; objects = []; } else return; }
    else { historyIndex--; objects = JSON.parse(history[historyIndex]); }
    selectedId = null; updateLayers(); redraw();
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        objects = JSON.parse(history[historyIndex]);
        selectedId = null; updateLayers(); redraw();
    }
}

// ===================== Guardar / cargar proyecto =====================
function saveProject() {
    const data = {
        version: 2,
        objects,
        banner: { title: bannerTitle.value, office: bannerOffice.value, valid: bannerValid.value },
        overlays: { grid: toggleGrid.checked, legend: toggleLegend.checked, banner: toggleBanner.checked }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nowcast-' + timestamp() + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadProject(file) {
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            objects = data.objects || [];
            // recalcular uid
            uid = objects.reduce((m, o) => Math.max(m, o.id || 0), 0) + 1;
            if (data.banner) { bannerTitle.value = data.banner.title || ''; bannerOffice.value = data.banner.office || ''; bannerValid.value = data.banner.valid || ''; }
            if (data.overlays) { toggleGrid.checked = !!data.overlays.grid; toggleLegend.checked = !!data.overlays.legend; toggleBanner.checked = !!data.overlays.banner; }
            selectedId = null;
            pushHistory(); updateLayers(); redraw();
        } catch (err) {
            alert('No se pudo cargar el proyecto: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ===================== Exportar PNG =====================
function exportImage() {
    const prevSel = selectedId;
    selectedId = null; // no exportar marcas de selección
    redraw();
    const link = document.createElement('a');
    link.download = 'severe-weather-' + timestamp() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    selectedId = prevSel;
    redraw();
}

function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ===================== Teclado =====================
function handleKeyboard(e) {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); redo(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); exportImage(); return; }
    if (typing) return;
    if (e.key === 'Escape') { draftPolygon = []; pendingPoint = null; selectedId = null; updateLayers(); redraw(); }
    if (e.key === 'Enter' && currentTool === 'polygon' && draftPolygon.length >= 3) finishPolygon();
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    // atajos de herramienta
    const map = { v: 'select', p: 'polygon', i: 'icon', t: 'text', m: 'motion', c: 'marker', d: 'measure' };
    if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
}

// ===================== Arranque =====================
init();
console.log('🌪️ Severe Weather Nowcasting Studio v2.0 listo');
