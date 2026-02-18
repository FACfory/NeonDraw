/**
 * ============================================================================
 * NEONDRAW APPLICATION
 * Versión: 3.2.0
 * Descripción: Sistema de dibujo colaborativo en tiempo real con Firebase.
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* CONFIGURACIÓN                               */
/* -------------------------------------------------------------------------- */

const firebaseConfig = {
  apiKey: "AIzaSyAAuFtgwStXXvWhazGafirW1bABGsHDk_w",
  authDomain: "neondraw-app-gem.firebaseapp.com",
  databaseURL: "https://neondraw-app-gem-default-rtdb.firebaseio.com",
  projectId: "neondraw-app-gem",
  storageBucket: "neondraw-app-gem.firebasestorage.app",
  messagingSenderId: "611346212206",
  appId: "1:611346212206:web:d124d02ff3d55d25d44d7f",
  measurementId: "G-E366ZD3J90"
};

let database = null;

/* -------------------------------------------------------------------------- */
/* CONSTANTES                                  */
/* -------------------------------------------------------------------------- */

const APP_CONFIG = {
    CANVAS_SIZE: 1000,     // Resolución interna fija
    EMIT_THROTTLE: 50,     // ms entre envíos a Firebase
    ZOOM_MIN: 0.25,
    ZOOM_MAX: 8
};

const IMAGE_GALLERY = [
    { name: 'Gato',    url: 'https://res.cloudinary.com/dyui7yxsa/image/upload/v1771367907/2f010980a035d7562974e57a08b31a94_ekhybs.jpg' },
    { name: 'Casa',    url: 'https://res.cloudinary.com/dyui7yxsa/image/upload/v1771367921/40b25c9f1fe9eb0716efde8eb71d953d_fuyfbn.jpg' },
    { name: 'Arbol',   url: 'https://res.cloudinary.com/dyui7yxsa/image/upload/v1771367936/41918b5871d2f96753252ffcade9aa62_mvumvh.jpg' },
    { name: 'Flor',    url: 'https://res.cloudinary.com/dyui7yxsa/image/upload/v1771367951/e4eda33b2c9e9c6b26761ba92242cbb2_b3mqfj.jpg' },
    { name: 'Girasol', url: 'https://res.cloudinary.com/dyui7yxsa/image/upload/v1771367964/3dc4d0650936aaf13cbc9f0e2dbd4e7c_i4x0iz.jpg' },
    { name: 'Paisaje', url: 'https://res.cloudinary.com/dyui7yxsa/image/upload/v1771283666/10f1cade-2568-4e6a-945c-dd81a1179285.png' }
];

const PALETTES = [
    { name: 'Neón',    colors: ['#00ff88','#00d4ff','#ff00ff','#ffff00','#ff0066','#ffffff'] },
    { name: 'Pastel',  colors: ['#FFB3BA','#FFDFBA','#FFFFBA','#BAFFC9','#BAE1FF','#E0BBE4'] },
    { name: 'Tierra',  colors: ['#8B4513','#D2691E','#CD853F','#DEB887','#F4A460','#BC8F8F'] },
    { name: 'Océano',  colors: ['#006994','#0091AD','#4FB0C6','#7AC7CD','#A1D6E2','#B9DFEA'] },
    { name: 'Fuego',   colors: ['#8B0000','#DC143C','#FF4500','#FF6347','#FF7F50','#FFA07A'] },
    { name: 'Bosque',  colors: ['#013220','#228B22','#32CD32','#90EE90','#98FB98','#F0FFF0'] }
];

const REFERENCE_PRESETS = [
    { name: 'Círculo',     type: 'circle' },
    { name: 'Cuadrícula',  type: 'grid' },
    { name: 'Guías',       type: 'guides' },
    { name: 'Perspectiva', type: 'perspective' }
];

/* -------------------------------------------------------------------------- */
/* ESTADO GLOBAL                               */
/* -------------------------------------------------------------------------- */

const app = {
    // Sesión
    currentRoom:  null,
    userId:       'user-' + Math.random().toString(36).substr(2, 9),
    isConnected:  false,
    
    // Herramientas de dibujo
    isDrawing:    false,
    lastX: 0, lastY: 0,
    currentColor: '#00ff88',
    brushSize:    3,
    isEraser:     false,
    
    // Capas Canvas
    bgCanvas:        null, bgCtx:        null,
    referenceCanvas: null, referenceCtx: null,
    canvas:          null, ctx:          null,

    // Lógica de Trazos
    drawingListener: null,
    currentStroke:   [],
    lastEmitTime:    0,

    // Referencias visuales
    referenceImage:   null,
    referenceOpacity: 0.5,
    currentPalette:   0,

    // Firebase References
    presenceRef:      null,
    heartbeatInterval:null,

    // Viewport & Zoom
    displaySize: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    // Utilidades
    debounceTimers: {}
};

/* -------------------------------------------------------------------------- */
/* REFERENCIAS DOM                             */
/* -------------------------------------------------------------------------- */

const elements = {
    loadingScreen:       document.getElementById('loading-screen'),
    appContainer:        document.getElementById('app'),
    bgCanvas:            document.getElementById('bg-canvas'),
    referenceCanvas:     document.getElementById('reference-canvas'),
    canvas:              document.getElementById('drawing-canvas'),
    canvasOverlay:       document.getElementById('canvas-overlay'),
    roomInput:           document.getElementById('room-id'),
    joinRoomBtn:         document.getElementById('join-room-btn'),
    createRoomBtn:       document.getElementById('create-room-btn'),
    leaveRoomBtn:        document.getElementById('leave-room-btn'),
    clearCanvasBtn:      document.getElementById('clear-canvas-btn'),
    downloadBtn:         document.getElementById('download-btn'),
    colorPicker:         document.getElementById('color-picker'),
    colorPreview:        document.getElementById('color-preview'),
    brushSize:           document.getElementById('brush-size'),
    brushSizeValue:      document.getElementById('brush-size-value'),
    brushIndicator:      document.getElementById('brush-indicator'),
    drawModeBtn:         document.getElementById('draw-mode'),
    eraserModeBtn:       document.getElementById('eraser-mode'),
    userCount:           document.getElementById('user-count'),
    toastContainer:      document.getElementById('toast-container'),
    statusDot:           document.getElementById('status-dot'),
    statusText:          document.getElementById('status-text'),
    uploadReferenceBtn:  document.getElementById('upload-reference-btn'),
    referenceUpload:     document.getElementById('reference-upload'),
    loadUrlReferenceBtn: document.getElementById('load-url-reference-btn'),
    galleryReferenceBtn: document.getElementById('gallery-reference-btn'),
    clearReferenceBtn:   document.getElementById('clear-reference-btn'),
    referenceOpacity:    document.getElementById('reference-opacity'),
    referenceOpacityValue:document.getElementById('reference-opacity-value'),
    referencePresets:    document.getElementById('reference-presets'),
    palettesList:        document.getElementById('palettes-list'),
    presetColors:        document.getElementById('preset-colors'),
    mobileMenuBtn:       document.getElementById('mobile-menu-btn'),
    toolbar:             document.getElementById('toolbar'),
    toolbarOverlay:      document.getElementById('toolbar-overlay'),
    urlModal:            document.getElementById('url-modal'),
    galleryModal:        document.getElementById('gallery-modal'),
    imageUrlInput:       document.getElementById('image-url-input'),
    loadUrlBtn:          document.getElementById('load-url-btn'),
    cancelUrlBtn:        document.getElementById('cancel-url-btn'),
    closeUrlModal:       document.getElementById('close-url-modal'),
    closeGalleryModal:   document.getElementById('close-gallery-modal'),
    galleryGrid:         document.getElementById('gallery-grid')
};

/* -------------------------------------------------------------------------- */
/* INICIALIZACIÓN (MAIN)                            */
/* -------------------------------------------------------------------------- */

window.addEventListener('load', () => {
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        
        // Monitor de conexión
        database.ref('.info/connected').on('value', snap => updateConnectionStatus(snap.val() === true));
        updateConnectionStatus(true);
    } catch (e) {
        console.error('Firebase Init Error:', e);
        updateConnectionStatus(false);
        showToast('Error al conectar con el servidor', 'error');
    }

    // Animación de entrada
    setTimeout(() => {
        elements.loadingScreen.classList.add('hidden');
        elements.appContainer.style.display = 'flex';
        initCanvasSystem();
        setupEventListeners();
        initUIComponents();
        
        // Inicializar estado visual
        updateColor(app.currentColor);
        updateBrushSize(app.brushSize);

        // Auto-join si hay parámetro URL
        const room = new URLSearchParams(window.location.search).get('room');
        if (room) { elements.roomInput.value = room; joinRoom(room); }
    }, 1500);
});

function initUIComponents() {
    initPalettes();
    initRefPresets();
}

/* -------------------------------------------------------------------------- */
/* SISTEMA DE CANVAS                                */
/* -------------------------------------------------------------------------- */

function initCanvasSystem() {
    app.bgCanvas        = elements.bgCanvas;
    app.referenceCanvas = elements.referenceCanvas;
    app.canvas          = elements.canvas;

    app.bgCtx        = app.bgCanvas.getContext('2d', { willReadFrequently: true });
    app.referenceCtx = app.referenceCanvas.getContext('2d', { willReadFrequently: true });
    app.ctx          = app.canvas.getContext('2d', { willReadFrequently: true });

    // Configuración de resolución interna
    [app.bgCanvas, app.referenceCanvas, app.canvas].forEach(c => {
        c.width  = APP_CONFIG.CANVAS_SIZE;
        c.height = APP_CONFIG.CANVAS_SIZE;
    });

    app.ctx.lineCap  = 'round';
    app.ctx.lineJoin = 'round';

    // Fondo blanco base
    app.bgCtx.fillStyle = '#ffffff';
    app.bgCtx.fillRect(0, 0, APP_CONFIG.CANVAS_SIZE, APP_CONFIG.CANVAS_SIZE);

    resizeCanvasDisplay();
    window.addEventListener('resize', debounce(resizeCanvasDisplay, 120));
    setupZoomControls();
}

function resizeCanvasDisplay() {
    const container = app.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height) * 0.95);

    app.displaySize = size;

    // Ajuste visual CSS (no afecta resolución interna)
    [app.bgCanvas, app.referenceCanvas, app.canvas].forEach(c => {
        c.style.width  = size + 'px';
        c.style.height = size + 'px';
        c.style.left = ((rect.width  - size) / 2) + 'px';
        c.style.top  = ((rect.height - size) / 2) + 'px';
    });
}

/* -------------------------------------------------------------------------- */
/* ZOOM & PAN (TRANSFORMS)                          */
/* -------------------------------------------------------------------------- */

function setupZoomControls() {
    const container = app.canvas.parentElement;

    const getDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    // Mouse Wheel Zoom
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(APP_CONFIG.ZOOM_MIN, Math.min(APP_CONFIG.ZOOM_MAX, app.scale * factor));
        const rect = app.canvas.getBoundingClientRect();
        zoomAt(
            (e.clientX - rect.left) / rect.width,
            (e.clientY - rect.top) / rect.height,
            newScale
        );
    }, { passive: false });

    // Touch Controls (Pinch & Draw)
    let pinchStartDist = 0;
    let pinchStartScale = 1;

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            app.isDrawing = false;
            pinchStartDist = getDistance(e.touches[0], e.touches[1]);
            pinchStartScale = app.scale;
        } else if (e.touches.length === 1) {
            startDrawing(e.touches[0]);
        }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault(); 
        if (e.touches.length === 2) {
            // Lógica Pinch Zoom
            const dist = getDistance(e.touches[0], e.touches[1]);
            if (pinchStartDist === 0) return;

            const factor = dist / pinchStartDist;
            const newScale = Math.max(APP_CONFIG.ZOOM_MIN, Math.min(APP_CONFIG.ZOOM_MAX, pinchStartScale * factor));
            
            const rect = app.canvas.getBoundingClientRect();
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            zoomAt((midX - rect.left) / rect.width, (midY - rect.top) / rect.height, newScale);
        } else if (e.touches.length === 1 && app.isDrawing) {
            draw(e.touches[0]);
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) pinchStartDist = 0;
        stopDrawing();
    }, { passive: false });
}

function zoomAt(ox, oy, newScale) {
    const rect = app.canvas.getBoundingClientRect();
    const pointBeforeX = ox * rect.width;
    const pointBeforeY = oy * rect.height;
    const ratio = newScale / app.scale;
    const pointAfterX = pointBeforeX * ratio;
    const pointAfterY = pointBeforeY * ratio;
    
    app.offsetX += pointBeforeX - pointAfterX;
    app.offsetY += pointBeforeY - pointAfterY;
    app.scale = newScale;
    
    applyTransform();
}

function applyTransform() {
    const t = `translate(${app.offsetX}px, ${app.offsetY}px) scale(${app.scale})`;
    [app.bgCanvas, app.referenceCanvas, app.canvas].forEach(c => {
        c.style.transformOrigin = '0 0';
        c.style.transform = t;
    });
}

function resetZoom() {
    app.scale = 1;
    app.offsetX = 0;
    app.offsetY = 0;
    applyTransform();
    showToast('Vista restablecida', 'success');
}

function getMousePos(e) {
    const rect = app.canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0].clientX;
    const clientY = e.clientY ?? e.touches?.[0].clientY;

    const scaleX = APP_CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = APP_CONFIG.CANVAS_SIZE / rect.height;

    return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top)  * scaleY)
    };
}

/* -------------------------------------------------------------------------- */
/* LÓGICA DE DIBUJO                                 */
/* -------------------------------------------------------------------------- */

function startDrawing(e) {
    if (!app.currentRoom) { showToast('Únete a una sala para dibujar', 'warning'); return; }
    app.isDrawing = true;
    const pos = getMousePos(e);
    app.lastX = pos.x;  app.lastY = pos.y;
    app.currentStroke = [];
}

function draw(e) {
    if (!app.isDrawing || !app.currentRoom) return;
    const pos = getMousePos(e);
    const x = pos.x, y = pos.y;

    drawLine(app.lastX, app.lastY, x, y, app.currentColor, app.brushSize, app.isEraser);
    app.currentStroke.push({ x1: app.lastX, y1: app.lastY, x2: x, y2: y });

    const now = Date.now();
    if (now - app.lastEmitTime > APP_CONFIG.EMIT_THROTTLE) {
        sendStrokeBatch();
        app.lastEmitTime = now;
    }
    app.lastX = x;  app.lastY = y;
}

function stopDrawing() {
    if (!app.isDrawing) return;
    app.isDrawing = false;
    if (app.currentStroke.length) sendStrokeBatch();
}

function drawLine(x1, y1, x2, y2, color, size, isEraser) {
    app.ctx.save();
    app.ctx.beginPath();
    app.ctx.moveTo(x1, y1);
    app.ctx.lineTo(x2, y2);
    app.ctx.lineWidth = size;
    app.ctx.lineCap  = 'round';
    app.ctx.lineJoin = 'round';

    if (isEraser) {
        app.ctx.globalCompositeOperation = 'destination-out';
        app.ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        app.ctx.globalCompositeOperation = 'source-over';
        app.ctx.strokeStyle = color;
    }

    app.ctx.stroke();
    app.ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* SINCRONIZACIÓN (FIREBASE)                        */
/* -------------------------------------------------------------------------- */

function sendStrokeBatch() {
    if (!app.currentStroke.length || !app.currentRoom || !database) return;
    
    database.ref(`rooms/${app.currentRoom}/strokes`).push({
        p: app.currentStroke,
        c: app.currentColor,
        s: app.brushSize,
        e: app.isEraser,
        u: app.userId,
        t: firebase.database.ServerValue.TIMESTAMP
    }).catch(console.error);
    
    app.currentStroke = [];
}

function listenToStrokes() {
    if (!database || !app.currentRoom) return;
    app.drawingListener = database.ref(`rooms/${app.currentRoom}/strokes`)
        .on('child_added', snap => {
            const stroke = snap.val();
            if (stroke.u !== app.userId && Array.isArray(stroke.p)) {
                stroke.p.forEach(pt =>
                    drawLine(pt.x1, pt.y1, pt.x2, pt.y2, stroke.c, stroke.s, stroke.e));
            }
        });
}

function loadAllStrokes() {
    if (!database || !app.currentRoom) return;
    database.ref(`rooms/${app.currentRoom}/strokes`).once('value', snap => {
        app.ctx.clearRect(0, 0, APP_CONFIG.CANVAS_SIZE, APP_CONFIG.CANVAS_SIZE);
        snap.forEach(child => {
            const stroke = child.val();
            if (Array.isArray(stroke.p)) {
                stroke.p.forEach(pt =>
                    drawLine(pt.x1, pt.y1, pt.x2, pt.y2, stroke.c, stroke.s, stroke.e));
            }
        });
    }).catch(console.error);
}

/* -------------------------------------------------------------------------- */
/* GESTIÓN DE SALAS                                 */
/* -------------------------------------------------------------------------- */

function createRoom() {
    if (!database) { showToast('Error de conexión', 'error'); return; }
    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    elements.roomInput.value = '';
    joinRoom(roomId, true);
}

function joinRoom(roomId, isNew = false) {
    if (!database) { showToast('Firebase no conectado', 'error'); return; }
    if (app.currentRoom) leaveRoom();

    app.currentRoom = roomId;
    updateRoomUIState(true, roomId);

    // Actualizar URL
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);

    if (isNew) {
        database.ref(`rooms/${roomId}/metadata`).set({
            created:   firebase.database.ServerValue.TIMESTAMP,
            createdBy: app.userId
        });
    }

    app.ctx.clearRect(0, 0, APP_CONFIG.CANVAS_SIZE, APP_CONFIG.CANVAS_SIZE);
    setupPresence();
    listenToStrokes();
    loadAllStrokes();
    showToast(`Unido a la sala: ${roomId}`, 'success');
}

function leaveRoom() {
    if (app.heartbeatInterval) { clearInterval(app.heartbeatInterval); app.heartbeatInterval = null; }
    if (app.drawingListener && app.currentRoom)
        database.ref(`rooms/${app.currentRoom}/strokes`).off('child_added', app.drawingListener);
    if (app.presenceRef) app.presenceRef.remove();

    app.currentRoom = null; app.presenceRef = null;
    updateRoomUIState(false);
    
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
}

function updateRoomUIState(joined, roomId = '') {
    elements.roomInput.value    = joined ? roomId : '';
    elements.roomInput.disabled = joined;
    elements.canvasOverlay.classList.toggle('hidden', joined);
    elements.joinRoomBtn.style.display   = joined ? 'none' : 'inline-block';
    elements.createRoomBtn.style.display = joined ? 'none' : 'inline-block';
    elements.leaveRoomBtn.style.display  = joined ? 'flex' : 'none';
    if (!joined) elements.userCount.textContent = '0';
}

function setupPresence() {
    if (!database || !app.currentRoom) return;
    const userRef  = database.ref(`rooms/${app.currentRoom}/users/${app.userId}`);
    const usersRef = database.ref(`rooms/${app.currentRoom}/users`);
    app.presenceRef = userRef;

    userRef.set({ t: firebase.database.ServerValue.TIMESTAMP, heartbeat: firebase.database.ServerValue.TIMESTAMP });
    userRef.onDisconnect().remove();

    if (app.heartbeatInterval) clearInterval(app.heartbeatInterval);
    app.heartbeatInterval = setInterval(() => {
        if (app.currentRoom && app.isConnected)
            userRef.update({ heartbeat: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
    }, 5000);

    usersRef.on('value', snap => {
        const users = snap.val() || {};
        const now   = Date.now();
        const active = Object.values(users).filter(u => u.heartbeat && now - u.heartbeat < 15000);
        elements.userCount.textContent = active.length;
    });
}

function updateConnectionStatus(connected) {
    app.isConnected = connected;
    elements.statusDot.classList.toggle('disconnected', !connected);
    elements.statusText.textContent = connected ? 'Conectado' : 'Desconectado';
    if (connected && app.currentRoom && app.presenceRef)
        app.presenceRef.set({ t: firebase.database.ServerValue.TIMESTAMP, heartbeat: firebase.database.ServerValue.TIMESTAMP });
}

/* -------------------------------------------------------------------------- */
/* HERRAMIENTAS AUXILIARES Y UI                     */
/* -------------------------------------------------------------------------- */

// Descarga
function downloadCanvas() {
    try {
        const merged = document.createElement('canvas');
        merged.width  = APP_CONFIG.CANVAS_SIZE;
        merged.height = APP_CONFIG.CANVAS_SIZE;
        const mCtx = merged.getContext('2d');

        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(0,0, merged.width, merged.height);
        mCtx.drawImage(app.bgCanvas, 0, 0);
        mCtx.drawImage(app.referenceCanvas, 0, 0);
        mCtx.drawImage(app.canvas, 0, 0);

        const link = document.createElement('a');
        link.download = `neondraw-${Date.now()}.png`;
        link.href = merged.toDataURL('image/png');
        link.click();
        showToast('Imagen guardada', 'success');
    } catch (e) {
        showToast('Error al descargar', 'error');
    }
}

// Paletas
function initPalettes() {
    PALETTES.forEach((palette, index) => {
        const el = document.createElement('div');
        el.className = 'palette-item' + (index === 0 ? ' active' : '');
        
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'palette-colors';
        palette.colors.forEach(c => {
            const dot = document.createElement('div');
            dot.className = 'palette-color-dot';
            dot.style.background = c;
            colorsDiv.appendChild(dot);
        });

        const name = document.createElement('span');
        name.className = 'palette-name';
        name.textContent = palette.name;

        el.appendChild(colorsDiv); el.appendChild(name);
        el.addEventListener('click', () => selectPalette(index));
        elements.palettesList.appendChild(el);
    });
    loadPaletteColors(0);
}

function selectPalette(index) {
    app.currentPalette = index;
    document.querySelectorAll('.palette-item').forEach((el, i) => el.classList.toggle('active', i === index));
    loadPaletteColors(index);
}

function loadPaletteColors(index) {
    elements.presetColors.innerHTML = '';
    PALETTES[index].colors.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'color-preset';
        btn.dataset.color = color;
        btn.style.background = color;
        btn.addEventListener('click', () => { updateColor(color); elements.colorPicker.value = color; });
        elements.presetColors.appendChild(btn);
    });
}

// Referencias
function initRefPresets() {
    REFERENCE_PRESETS.forEach(preset => {
        const btn = document.createElement('div');
        btn.className = 'reference-preset';
        btn.addEventListener('click', () => loadReferencePreset(preset.type));

        const mini = document.createElement('canvas');
        mini.width = mini.height = 100;
        const mCtx = mini.getContext('2d');
        mCtx.strokeStyle = '#0088ff'; mCtx.lineWidth = 2;

        switch (preset.type) {
            case 'circle':
                mCtx.beginPath(); mCtx.arc(50,50,40,0,Math.PI*2); mCtx.stroke(); break;
            case 'grid':
                for(let i=0;i<=100;i+=20){ mCtx.beginPath();mCtx.moveTo(i,0);mCtx.lineTo(i,100);mCtx.moveTo(0,i);mCtx.lineTo(100,i);mCtx.stroke(); } break;
            case 'guides':
                mCtx.beginPath();mCtx.moveTo(50,0);mCtx.lineTo(50,100);mCtx.moveTo(0,50);mCtx.lineTo(100,50);mCtx.stroke(); break;
            case 'perspective':
                mCtx.beginPath(); mCtx.moveTo(10,10);mCtx.lineTo(50,50);mCtx.lineTo(10,90); mCtx.moveTo(90,10);mCtx.lineTo(50,50);mCtx.lineTo(90,90); mCtx.stroke(); break;
        }

        const label = document.createElement('div');
        label.className = 'reference-preset-name';
        label.textContent = preset.name;

        btn.appendChild(mini); btn.appendChild(label);
        elements.referencePresets.appendChild(btn);
    });
}

function loadReferencePreset(type) {
    const W = APP_CONFIG.CANVAS_SIZE, H = APP_CONFIG.CANVAS_SIZE;
    const rCtx = app.referenceCtx;

    rCtx.clearRect(0, 0, W, H);
    rCtx.save();
    rCtx.strokeStyle  = '#0088ff';
    rCtx.lineWidth    = 4;
    rCtx.globalAlpha  = app.referenceOpacity;

    switch (type) {
        case 'circle':
            rCtx.beginPath(); rCtx.arc(W/2, H/2, W * 0.4, 0, Math.PI * 2); rCtx.stroke(); break;
        case 'grid':
            for (let x = 0; x <= W; x += 100) { rCtx.beginPath(); rCtx.moveTo(x,0); rCtx.lineTo(x,H); rCtx.stroke(); }
            for (let y = 0; y <= H; y += 100) { rCtx.beginPath(); rCtx.moveTo(0,y); rCtx.lineTo(W,y); rCtx.stroke(); } break;
        case 'guides':
            rCtx.beginPath(); rCtx.moveTo(W/2,0); rCtx.lineTo(W/2,H); rCtx.moveTo(0,H/2); rCtx.lineTo(W,H/2); rCtx.stroke(); break;
        case 'perspective':
            rCtx.beginPath();
            rCtx.moveTo(W*.2,H*.2); rCtx.lineTo(W*.5,H*.5); rCtx.lineTo(W*.2,H*.8);
            rCtx.moveTo(W*.8,H*.2); rCtx.lineTo(W*.5,H*.5); rCtx.lineTo(W*.8,H*.8);
            rCtx.stroke(); break;
    }
    rCtx.restore();
    app.referenceImage = type;
    elements.clearReferenceBtn.disabled = false;
    showToast('Referencia cargada', 'success');
}

function drawReferenceImage() {
    if (!(app.referenceImage instanceof HTMLImageElement)) return;
    const W = APP_CONFIG.CANVAS_SIZE, H = APP_CONFIG.CANVAS_SIZE;
    const img = app.referenceImage;
    const ratio = img.width / img.height;

    let dw, dh, dx, dy;
    if (ratio >= 1) { dw = W; dh = W / ratio; dx = 0; dy = (H - dh) / 2; }
    else            { dh = H; dw = H * ratio; dy = 0; dx = (W - dw) / 2; }

    app.referenceCtx.clearRect(0, 0, W, H);
    app.referenceCtx.save();
    app.referenceCtx.globalAlpha = app.referenceOpacity;
    app.referenceCtx.drawImage(img, dx, dy, dw, dh);
    app.referenceCtx.restore();
    elements.clearReferenceBtn.disabled = false;
}

function clearReference() {
    app.referenceImage = null;
    app.referenceCtx.clearRect(0, 0, APP_CONFIG.CANVAS_SIZE, APP_CONFIG.CANVAS_SIZE);
    elements.referenceUpload.value = '';
    elements.clearReferenceBtn.disabled = true;
    document.querySelectorAll('.reference-preset').forEach(el => el.classList.remove('active'));
    showToast('Referencia eliminada', 'success');
}

// Herramientas
function updateColor(color) {
    app.currentColor = color;
    elements.colorPreview.style.background = color;
    elements.brushIndicator.style.background = color;
    document.querySelectorAll('.color-preset').forEach(b => b.classList.toggle('active', b.dataset.color === color));
}

function updateBrushSize(size) {
    app.brushSize = size;
    elements.brushSizeValue.textContent = size + 'px';
    elements.brushIndicator.style.width  = size + 'px';
    elements.brushIndicator.style.height = size + 'px';
}

function setMode(mode) {
    app.isEraser = mode === 'eraser';
    elements.drawModeBtn.classList.toggle('active', !app.isEraser);
    elements.eraserModeBtn.classList.toggle('active', app.isEraser);
}

function clearCanvas() {
    if (!app.currentRoom) { showToast('Únete a una sala primero', 'warning'); return; }
    if (!confirm('¿Limpiar el lienzo para todos?')) return;
    database.ref(`rooms/${app.currentRoom}/strokes`).remove()
        .then(() => { app.ctx.clearRect(0, 0, APP_CONFIG.CANVAS_SIZE, APP_CONFIG.CANVAS_SIZE); showToast('Lienzo limpiado', 'success'); })
        .catch(() => showToast('Error al limpiar', 'error'));
}

// Galería y Modales
function openModal(type) {
    if (type === 'url') {
        elements.urlModal.classList.add('show');
        elements.imageUrlInput.value = '';
        elements.imageUrlInput.focus();
    } else if (type === 'gallery') {
        elements.galleryModal.classList.add('show');
        loadGallery();
    }
}

function closeModal(type) {
    if (type === 'url') elements.urlModal.classList.remove('show');
    else if (type === 'gallery') elements.galleryModal.classList.remove('show');
}

function loadImageFromUrl() {
    const url = elements.imageUrlInput.value.trim();
    if (!url) { showToast('Ingresa una URL', 'error'); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { app.referenceImage = img; drawReferenceImage(); closeModal('url'); showToast('Imagen cargada', 'success'); };
    img.onerror = () => showToast('Error al cargar. Verifica la URL', 'error');
    img.src = url;
}

function loadGallery() {
    elements.galleryGrid.innerHTML = '<div class="gallery-item-loading">Cargando...</div>';
    setTimeout(() => {
        elements.galleryGrid.innerHTML = '';
        IMAGE_GALLERY.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            const img = document.createElement('img');
            img.src = item.url; img.alt = item.name; img.loading = 'lazy';
            img.onerror = () => { div.innerHTML = '<div class="gallery-item-loading">Sin CORS</div>'; };
            div.appendChild(img);
            div.addEventListener('click', () => loadGalleryImage(item.url));
            elements.galleryGrid.appendChild(div);
        });
    }, 300);
}

function loadGalleryImage(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { app.referenceImage = img; drawReferenceImage(); closeModal('gallery'); showToast('Imagen cargada', 'success'); };
    img.onerror = () => showToast('Error CORS — intenta otra imagen', 'error');
    img.src = url;
}

function loadReferenceImage(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload  = () => { app.referenceImage = img; drawReferenceImage(); showToast('Imagen cargada', 'success'); };
        img.onerror = () => showToast('Error al cargar imagen', 'error');
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Helpers
function debounce(fn, ms) {
    return function(...args) {
        clearTimeout(app.debounceTimers[fn.name]);
        app.debounceTimers[fn.name] = setTimeout(() => fn(...args), ms);
    };
}

function showToast(message, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="toast-message">${message}</div>`;
    elements.toastContainer.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* -------------------------------------------------------------------------- */
/* SETUP EVENT LISTENERS                            */
/* -------------------------------------------------------------------------- */

function setupEventListeners() {
    // Room Actions
    elements.createRoomBtn.addEventListener('click', createRoom);
    elements.joinRoomBtn.addEventListener('click', () => {
        const id = elements.roomInput.value.trim();
        if (id.length >= 3) joinRoom(id);
        else showToast('Código inválido', 'error');
    });
    elements.leaveRoomBtn.addEventListener('click', () => {
        if (confirm('¿Salir de la sala?')) { leaveRoom(); showToast('Desconectado', 'success'); }
    });

    // Tools
    elements.colorPicker.addEventListener('input', e => updateColor(e.target.value));
    elements.brushSize.addEventListener('input',   e => updateBrushSize(parseInt(e.target.value)));
    elements.drawModeBtn.addEventListener('click',   () => setMode('draw'));
    elements.eraserModeBtn.addEventListener('click', () => setMode('eraser'));
    elements.clearCanvasBtn.addEventListener('click', clearCanvas);
    elements.downloadBtn.addEventListener('click',    downloadCanvas);

    // Reference Tools
    elements.uploadReferenceBtn.addEventListener('click',  () => elements.referenceUpload.click());
    elements.referenceUpload.addEventListener('change', handleFileUpload);
    elements.loadUrlReferenceBtn.addEventListener('click',  () => openModal('url'));
    elements.galleryReferenceBtn.addEventListener('click',  () => openModal('gallery'));
    elements.clearReferenceBtn.addEventListener('click',    clearReference);
    elements.referenceOpacity.addEventListener('input', updateReferenceOpacity);

    // Modals
    elements.closeUrlModal.addEventListener('click',     () => closeModal('url'));
    elements.closeGalleryModal.addEventListener('click', () => closeModal('gallery'));
    elements.loadUrlBtn.addEventListener('click',        loadImageFromUrl);
    
    // Canvas Input
    app.canvas.addEventListener('mousedown', startDrawing);
    app.canvas.addEventListener('mousemove', draw);
    app.canvas.addEventListener('mouseup',   stopDrawing);
    app.canvas.addEventListener('mouseout',  stopDrawing);
    
    // Mobile UI
    elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    elements.toolbarOverlay.addEventListener('click', toggleMobileMenu);

    // Inputs Enter Key
    elements.roomInput.addEventListener('keypress', e => { if (e.key === 'Enter') elements.joinRoomBtn.click(); });
    elements.imageUrlInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadImageFromUrl(); });
    elements.urlModal.addEventListener('click', e => { if (e.target === elements.urlModal) closeModal('url'); });
    elements.galleryModal.addEventListener('click', e => { if (e.target === elements.galleryModal) closeModal('gallery'); });

    // Reset Zoom Button
    createZoomResetButton();
}

// Event Handlers Auxiliares
function updateReferenceOpacity(e) {
    app.referenceOpacity = parseInt(e.target.value) / 100;
    elements.referenceOpacityValue.textContent = e.target.value + '%';
    if (app.referenceImage instanceof HTMLImageElement) drawReferenceImage();
    else if (typeof app.referenceImage === 'string')    loadReferencePreset(app.referenceImage);
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) loadReferenceImage(file);
    else if (file) showToast('Solo se permiten imágenes', 'error');
}

function toggleMobileMenu() {
    elements.toolbar.classList.toggle('open');
    elements.toolbarOverlay.classList.toggle('show');
}

function createZoomResetButton() {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-secondary';
    resetBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:500;padding:8px 14px;font-size:0.85rem;box-shadow: 0 4px 10px rgba(0,0,0,0.5);';
    resetBtn.innerHTML = '🔍 Reset';
    resetBtn.addEventListener('click', resetZoom);
    document.body.appendChild(resetBtn);
}

// Window Unload
window.addEventListener('beforeunload', leaveRoom);

console.log('%cNeonDraw v3.2 ✅', 'color:#00ff88;font-size:16px;font-weight:bold;');
