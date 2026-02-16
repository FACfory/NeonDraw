// =====================================================
// CONFIGURACIÓN DE FIREBASE
// =====================================================
const firebaseConfig = {
    apiKey: "AIzaSyAAuFtgwStXXvWhazGafirW1bABGsHDk_w", // Tu API Key original
    authDomain: "neondraw-app-gem.firebaseapp.com",
    databaseURL: "https://neondraw-app-gem-default-rtdb.firebaseio.com",
    projectId: "neondraw-app-gem",
    storageBucket: "neondraw-app-gem.firebasestorage.app",
    messagingSenderId: "611346212206",
    appId: "1:611346212206:web:d124d02ff3d55d25d44d7f",
    measurementId: "G-E366ZD3J90"
};

// Inicializar Firebase
let database;
try {
    // Verificamos si firebase está cargado antes de usarlo
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    } else {
        console.error("Firebase SDK no cargado");
    }
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
}

// =====================================================
// PALETAS PREDEFINIDAS
// =====================================================
const PALETTES = [
    { name: 'Neón', colors: ['#00ff88', '#00d4ff', '#ff00ff', '#ffff00', '#ff0066', '#ffffff'] },
    { name: 'Pastel', colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4'] },
    { name: 'Tierra', colors: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#BC8F8F'] },
    { name: 'Océano', colors: ['#006994', '#0091AD', '#4FB0C6', '#7AC7CD', '#A1D6E2', '#B9DFEA'] },
    { name: 'Fuego', colors: ['#8B0000', '#DC143C', '#FF4500', '#FF6347', '#FF7F50', '#FFA07A'] },
    { name: 'Bosque', colors: ['#013220', '#228B22', '#32CD32', '#90EE90', '#98FB98', '#F0FFF0'] }
];

const REFERENCE_PRESETS = [
    { name: 'Círculo', type: 'circle' },
    { name: 'Cuadrícula', type: 'grid' },
    { name: 'Guías', type: 'guides' },
    { name: 'Perspectiva', type: 'perspective' }
];

// =====================================================
// ESTADO DE LA APLICACIÓN
// =====================================================
const app = {
    currentRoom: null,
    userId: 'user-' + Math.random().toString(36).substr(2, 9),
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    currentColor: '#00ff88',
    brushSize: 3,
    isEraser: false,
    canvas: null,
    ctx: null,
    referenceCanvas: null,
    referenceCtx: null,
    drawingListener: null,
    currentStroke: [],
    lastEmitTime: 0,
    emitThrottle: 50,
    history: [],
    historyStep: -1,
    maxHistory: 50,
    referenceImage: null,
    referenceOpacity: 0.5,
    currentPalette: 0,
    isConnected: false
};

// =====================================================
// ELEMENTOS DEL DOM (Declaración Segura)
// =====================================================
let elements = {};

function initDomElements() {
    elements = {
        loadingScreen: document.getElementById('loading-screen'),
        appContainer: document.getElementById('app'),
        canvas: document.getElementById('drawing-canvas'),
        referenceCanvas: document.getElementById('reference-canvas'),
        canvasOverlay: document.getElementById('canvas-overlay'),
        roomInput: document.getElementById('room-id'),
        joinRoomBtn: document.getElementById('join-room-btn'),
        createRoomBtn: document.getElementById('create-room-btn'),
        clearCanvasBtn: document.getElementById('clear-canvas-btn'),
        downloadBtn: document.getElementById('download-btn'),
        colorPicker: document.getElementById('color-picker'),
        colorPreview: document.getElementById('color-preview'),
        brushSize: document.getElementById('brush-size'),
        brushSizeValue: document.getElementById('brush-size-value'),
        brushIndicator: document.getElementById('brush-indicator'),
        drawModeBtn: document.getElementById('draw-mode'),
        eraserModeBtn: document.getElementById('eraser-mode'),
        userCount: document.getElementById('user-count'),
        toastContainer: document.getElementById('toast-container'),
        statusDot: document.getElementById('status-dot'),
        statusText: document.getElementById('status-text'),
        undoBtn: document.getElementById('undo-btn'),
        redoBtn: document.getElementById('redo-btn'),
        uploadReferenceBtn: document.getElementById('upload-reference-btn'),
        referenceUpload: document.getElementById('reference-upload'),
        clearReferenceBtn: document.getElementById('clear-reference-btn'),
        referenceOpacity: document.getElementById('reference-opacity'),
        referenceOpacityValue: document.getElementById('reference-opacity-value'),
        referencePresets: document.getElementById('reference-presets'),
        palettesList: document.getElementById('palettes-list'),
        presetColors: document.getElementById('preset-colors'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        toolbar: document.getElementById('toolbar'),
        toolbarOverlay: document.getElementById('toolbar-overlay')
    };
}

// =====================================================
// INICIALIZACIÓN PRINCIPAL
// =====================================================
window.addEventListener('load', () => {
    // 1. Capturar elementos cuando el DOM está listo
    initDomElements();

    // 2. Configuración inicial
    if (database) updateConnectionStatus(true);
    
    // 3. Transición de carga
    setTimeout(() => {
        // Ocultar carga
        if (elements.loadingScreen) elements.loadingScreen.classList.add('hidden');
        
        // Mostrar App
        if (elements.appContainer) {
            elements.appContainer.style.display = 'flex';
            
            // IMPORTANTE: Inicializar canvas DESPUÉS de mostrar el contenedor
            // Usamos requestAnimationFrame para asegurar que el navegador pintó el 'flex'
            requestAnimationFrame(() => {
                initializeCanvas();
                resizeCanvas(); // Forzamos el tamaño correcto
                
                setupEventListeners();
                initializePalettes();
                initializeReferencePresets();
                
                // Unirse a sala desde URL si existe
                const urlParams = new URLSearchParams(window.location.search);
                const roomFromUrl = urlParams.get('room');
                if (roomFromUrl && elements.roomInput) {
                    elements.roomInput.value = roomFromUrl;
                    joinRoom(roomFromUrl);
                }
            });
        }
    }, 1500);
});

// =====================================================
// CONFIGURACIÓN DEL CANVAS
// =====================================================
function initializeCanvas() {
    if (!elements.canvas) return;

    app.canvas = elements.canvas;
    app.ctx = app.canvas.getContext('2d');
    app.referenceCanvas = elements.referenceCanvas;
    app.referenceCtx = app.referenceCanvas.getContext('2d');

    window.addEventListener('resize', resizeCanvas);

    app.ctx.lineCap = 'round';
    app.ctx.lineJoin = 'round';
    
    saveToHistory();
}

function resizeCanvas() {
    if (!app.canvas) return;
    
    const wrapper = app.canvas.parentElement;
    // Si el wrapper no tiene tamaño (ej. app oculta), usamos window como fallback
    const rect = wrapper.getBoundingClientRect();
    const wrapperWidth = rect.width || (window.innerWidth * 0.8);
    const wrapperHeight = rect.height || (window.innerHeight * 0.8);
    
    // Mantener aspecto 4:3 pero adaptable
    const maxWidth = Math.min(wrapperWidth * 0.95, 1200);
    const maxHeight = Math.min(wrapperHeight * 0.95, 900);
    
    let width = maxWidth;
    let height = width * (3/4);
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * (4/3);
    }
    
    // Guardar contenido existente
    const imageData = app.canvas.width > 0 ? app.ctx.getImageData(0, 0, app.canvas.width, app.canvas.height) : null;
    
    // Aplicar nuevas dimensiones
    app.canvas.width = width;
    app.canvas.height = height;
    app.referenceCanvas.width = width;
    app.referenceCanvas.height = height;
    
    // Restaurar contenido
    if (imageData) {
        app.ctx.putImageData(imageData, 0, 0);
    } else {
        // Fondo blanco inicial
        app.ctx.fillStyle = '#ffffff';
        app.ctx.fillRect(0, 0, width, height);
    }
    
    // Restaurar propiedades de dibujo (se pierden al redimensionar)
    app.ctx.lineCap = 'round';
    app.ctx.lineJoin = 'round';
    app.ctx.lineWidth = app.brushSize;
    app.ctx.strokeStyle = app.isEraser ? '#ffffff' : app.currentColor;

    if (app.currentRoom) loadAllStrokes();
    if (app.referenceImage) drawReferenceImage();
}

// =====================================================
// PALETAS Y COLORES
// =====================================================
function initializePalettes() {
    if (!elements.palettesList) return;
    
    PALETTES.forEach((palette, index) => {
        const paletteEl = document.createElement('div');
        paletteEl.className = 'palette-item' + (index === 0 ? ' active' : '');
        paletteEl.dataset.index = index;
        
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'palette-colors';
        
        palette.colors.forEach(color => {
            const dot = document.createElement('div');
            dot.className = 'palette-color-dot';
            dot.style.background = color;
            colorsDiv.appendChild(dot);
        });
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'palette-name';
        nameSpan.textContent = palette.name;
        
        paletteEl.appendChild(colorsDiv);
        paletteEl.appendChild(nameSpan);
        paletteEl.addEventListener('click', () => selectPalette(index));
        
        elements.palettesList.appendChild(paletteEl);
    });
    
    loadPaletteColors(0);
}

function selectPalette(index) {
    app.currentPalette = index;
    document.querySelectorAll('.palette-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });
    loadPaletteColors(index);
}

function loadPaletteColors(index) {
    const palette = PALETTES[index];
    if (elements.presetColors) {
        elements.presetColors.innerHTML = '';
        palette.colors.forEach(color => {
            const btn = document.createElement('button');
            btn.className = 'color-preset';
            btn.dataset.color = color;
            btn.style.background = color;
            btn.addEventListener('click', () => {
                updateColor(color);
                elements.colorPicker.value = color;
            });
            elements.presetColors.appendChild(btn);
        });
    }
}

// =====================================================
// REFERENCIAS
// =====================================================
function initializeReferencePresets() {
    if (!elements.referencePresets) return;
    
    REFERENCE_PRESETS.forEach(preset => {
        const btn = document.createElement('div');
        btn.className = 'reference-preset';
        btn.addEventListener('click', () => loadReferencePreset(preset.type));
        
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        
        if (preset.type === 'circle') {
            ctx.beginPath();
            ctx.arc(50, 50, 40, 0, Math.PI * 2);
            ctx.stroke();
        } else if (preset.type === 'grid') {
            for(let i = 0; i <= 100; i += 20) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 100); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(100, i); ctx.stroke();
            }
        } else if (preset.type === 'guides') {
            ctx.beginPath(); ctx.moveTo(50, 0); ctx.lineTo(50, 100); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(100, 50); ctx.stroke();
        } else if (preset.type === 'perspective') {
            ctx.beginPath();
            ctx.moveTo(10, 10); ctx.lineTo(50, 50); ctx.lineTo(10, 90);
            ctx.moveTo(90, 10); ctx.lineTo(50, 50); ctx.lineTo(90, 90);
            ctx.stroke();
        }
        
        btn.appendChild(canvas);
        const name = document.createElement('div');
        name.className = 'reference-preset-name';
        name.textContent = preset.name;
        btn.appendChild(name);
        
        elements.referencePresets.appendChild(btn);
    });
}

function loadReferencePreset(type) {
    if (!app.referenceCtx) return;
    const width = app.referenceCanvas.width;
    const height = app.referenceCanvas.height;
    
    app.referenceCtx.clearRect(0, 0, width, height);
    app.referenceCtx.strokeStyle = '#00d4ff';
    app.referenceCtx.lineWidth = 2;
    app.referenceCtx.globalAlpha = app.referenceOpacity;
    
    // (Lógica de dibujo simplificada para ahorrar espacio, es igual a la anterior)
    if (type === 'circle') {
        app.referenceCtx.beginPath();
        app.referenceCtx.arc(width/2, height/2, Math.min(width, height)*0.4, 0, Math.PI*2);
        app.referenceCtx.stroke();
    } else if (type === 'grid') {
        const gridSize = 50;
        for(let x=0; x<=width; x+=gridSize) { app.referenceCtx.beginPath(); app.referenceCtx.moveTo(x,0); app.referenceCtx.lineTo(x,height); app.referenceCtx.stroke(); }
        for(let y=0; y<=height; y+=gridSize) { app.referenceCtx.beginPath(); app.referenceCtx.moveTo(0,y); app.referenceCtx.lineTo(width,y); app.referenceCtx.stroke(); }
    } else if (type === 'guides') {
        app.referenceCtx.beginPath(); app.referenceCtx.moveTo(width/2,0); app.referenceCtx.lineTo(width/2,height); app.referenceCtx.stroke();
        app.referenceCtx.beginPath(); app.referenceCtx.moveTo(0,height/2); app.referenceCtx.lineTo(width,height/2); app.referenceCtx.stroke();
    } else if (type === 'perspective') {
        app.referenceCtx.beginPath();
        app.referenceCtx.moveTo(width*0.2, height*0.2); app.referenceCtx.lineTo(width*0.5, height*0.5); app.referenceCtx.lineTo(width*0.2, height*0.8);
        app.referenceCtx.moveTo(width*0.8, height*0.2); app.referenceCtx.lineTo(width*0.5, height*0.5); app.referenceCtx.lineTo(width*0.8, height*0.8);
        app.referenceCtx.stroke();
    }
    
    app.referenceCtx.globalAlpha = 1;
    app.referenceImage = type;
    showToast('Referencia cargada', 'success');
}

// =====================================================
// EVENT LISTENERS
// =====================================================
function setupEventListeners() {
    if (!elements.joinRoomBtn) return;

    elements.createRoomBtn.addEventListener('click', createRoom);
    elements.joinRoomBtn.addEventListener('click', () => {
        const roomId = elements.roomInput.value.trim();
        if (!roomId) return showToast('Ingresa un código', 'error');
        if (roomId.length < 3) return showToast('Mínimo 3 caracteres', 'error');
        joinRoom(roomId);
    });

    elements.roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') elements.joinRoomBtn.click();
    });

    elements.colorPicker.addEventListener('input', (e) => updateColor(e.target.value));
    elements.brushSize.addEventListener('input', (e) => updateBrushSize(parseInt(e.target.value)));
    elements.drawModeBtn.addEventListener('click', () => setMode('draw'));
    elements.eraserModeBtn.addEventListener('click', () => setMode('eraser'));
    elements.undoBtn.addEventListener('click', undo);
    elements.redoBtn.addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    });

    elements.uploadReferenceBtn.addEventListener('click', () => elements.referenceUpload.click());
    elements.referenceUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadReferenceImage(file);
    });
    
    elements.clearReferenceBtn.addEventListener('click', clearReference);
    elements.referenceOpacity.addEventListener('input', (e) => {
        app.referenceOpacity = parseInt(e.target.value) / 100;
        elements.referenceOpacityValue.textContent = e.target.value + '%';
        if (app.referenceImage) drawReferenceImage();
    });

    elements.clearCanvasBtn.addEventListener('click', clearCanvas);
    elements.downloadBtn.addEventListener('click', downloadCanvas);

    // Mouse & Touch
    app.canvas.addEventListener('mousedown', startDrawing);
    app.canvas.addEventListener('mousemove', draw);
    app.canvas.addEventListener('mouseup', stopDrawing);
    app.canvas.addEventListener('mouseout', stopDrawing);
    app.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    app.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    app.canvas.addEventListener('touchend', stopDrawing);
    
    elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    elements.toolbarOverlay.addEventListener('click', toggleMobileMenu);
}

function toggleMobileMenu() {
    elements.toolbar.classList.toggle('open');
    elements.toolbarOverlay.classList.toggle('show');
}

// =====================================================
// LÓGICA DE DIBUJO Y SALAS
// =====================================================
function createRoom() {
    if (!database) return showToast('Error: Firebase no conectado', 'error');
    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    joinRoom(roomId);
    showToast(`Sala creada: ${roomId}`, 'success');
}

function joinRoom(roomId) {
    if (!database) return showToast('Error: Firebase no conectado', 'error');
    if (app.currentRoom) leaveRoom();

    app.currentRoom = roomId;
    elements.roomInput.value = roomId;
    elements.canvasOverlay.classList.add('hidden');

    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);

    app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
    // Restaurar fondo blanco
    app.ctx.fillStyle = '#ffffff';
    app.ctx.fillRect(0, 0, app.canvas.width, app.canvas.height);
    
    app.history = [];
    app.historyStep = -1;
    saveToHistory();

    listenToStrokes();
    loadAllStrokes();
    updateUserPresence();
    showToast(`Conectado a sala: ${roomId}`, 'success');
}

function leaveRoom() {
    if (app.drawingListener) app.drawingListener.off();
    if (app.currentRoom && database) {
        database.ref(`rooms/${app.currentRoom}/users/${app.userId}`).remove();
    }
    app.currentRoom = null;
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
}

function updateUserPresence() {
    if (!database || !app.currentRoom) return;
    const ref = database.ref(`rooms/${app.currentRoom}/users/${app.userId}`);
    ref.set({ t: firebase.database.ServerValue.TIMESTAMP });
    ref.onDisconnect().remove();
    
    database.ref(`rooms/${app.currentRoom}/users`).on('value', (snap) => {
        const c = snap.val() ? Object.keys(snap.val()).length : 0;
        elements.userCount.textContent = c;
    });
}

function updateConnectionStatus(connected) {
    app.isConnected = connected;
    if (connected) {
        elements.statusDot.classList.remove('disconnected');
        elements.statusText.textContent = 'Conectado';
    } else {
        elements.statusDot.classList.add('disconnected');
        elements.statusText.textContent = 'Desconectado';
    }
}

// Monitoreo de conexión
if (typeof firebase !== 'undefined' && database) {
    database.ref('.info/connected').on('value', (snap) => updateConnectionStatus(snap.val() === true));
}

function startDrawing(e) {
    if (!app.currentRoom) return showToast('Únete a una sala primero', 'warning');
    app.isDrawing = true;
    const pos = getMousePos(e);
    app.lastX = Math.round(pos.x);
    app.lastY = Math.round(pos.y);
    app.currentStroke = [];
}

function draw(e) {
    if (!app.isDrawing || !app.currentRoom) return;
    const pos = getMousePos(e);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    
    drawLine(app.lastX, app.lastY, x, y, app.currentColor, app.brushSize, app.isEraser);
    app.currentStroke.push({ x1: app.lastX, y1: app.lastY, x2: x, y2: y });
    
    const now = Date.now();
    if (now - app.lastEmitTime > app.emitThrottle) {
        sendStrokeBatch();
        app.lastEmitTime = now;
    }
    app.lastX = x;
    app.lastY = y;
}

function stopDrawing() {
    if (!app.isDrawing) return;
    app.isDrawing = false;
    if (app.currentStroke.length > 0) sendStrokeBatch();
    saveToHistory();
}

function drawLine(x1, y1, x2, y2, color, size, isEraser) {
    app.ctx.beginPath();
    app.ctx.moveTo(x1, y1);
    app.ctx.lineTo(x2, y2);
    app.ctx.strokeStyle = isEraser ? '#ffffff' : color;
    app.ctx.lineWidth = size;
    app.ctx.stroke();
}

function getMousePos(e) {
    const rect = app.canvas.getBoundingClientRect();
    const scaleX = app.canvas.width / rect.width;
    const scaleY = app.canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function handleTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    app.canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
}
function handleTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    app.canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
}

function sendStrokeBatch() {
    if (!app.currentStroke.length || !app.currentRoom || !database) return;
    database.ref(`rooms/${app.currentRoom}/strokes`).push().set({
        p: app.currentStroke, c: app.currentColor, s: app.brushSize, e: app.isEraser, u: app.userId, t: firebase.database.ServerValue.TIMESTAMP
    });
    app.currentStroke = [];
}

function listenToStrokes() {
    if (!database || !app.currentRoom) return;
    database.ref(`rooms/${app.currentRoom}/strokes`).on('child_added', (snapshot) => {
        const s = snapshot.val();
        if (s.u !== app.userId && s.p) {
            s.p.forEach(p => drawLine(p.x1, p.y1, p.x2, p.y2, s.c, s.s, s.e));
        }
    });
}

function loadAllStrokes() {
    if (!database || !app.currentRoom) return;
    database.ref(`rooms/${app.currentRoom}/strokes`).once('value', (snapshot) => {
        // No limpiar aquí para no borrar el fondo blanco, solo si es necesario
        // app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
        snapshot.forEach((child) => {
            const s = child.val();
            if (s.p) s.p.forEach(p => drawLine(p.x1, p.y1, p.x2, p.y2, s.c, s.s, s.e));
        });
        saveToHistory();
    });
}

function saveToHistory() {
    if (app.historyStep < app.history.length - 1) app.history = app.history.slice(0, app.historyStep + 1);
    app.history.push(app.canvas.toDataURL());
    app.historyStep++;
    if (app.history.length > app.maxHistory) { app.history.shift(); app.historyStep--; }
    if(elements.undoBtn) {
        elements.undoBtn.disabled = app.historyStep <= 0;
        elements.redoBtn.disabled = app.historyStep >= app.history.length - 1;
    }
}

function undo() {
    if (app.historyStep > 0) { app.historyStep--; restoreFromHistory(); }
}
function redo() {
    if (app.historyStep < app.history.length - 1) { app.historyStep++; restoreFromHistory(); }
}
function restoreFromHistory() {
    if (app.history[app.historyStep]) {
        const img = new Image();
        img.src = app.history[app.historyStep];
        img.onload = () => {
            app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
            app.ctx.drawImage(img, 0, 0);
            // Actualizar estado de botones
            elements.undoBtn.disabled = app.historyStep <= 0;
            elements.redoBtn.disabled = app.historyStep >= app.history.length - 1;
        };
    }
}

function loadReferenceImage(file) {
    if (!file.type.startsWith('image/')) return showToast('Imagen inválida', 'error');
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            app.referenceImage = img;
            drawReferenceImage();
            showToast('Referencia cargada', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawReferenceImage() {
    if (!app.referenceImage || !app.referenceCtx) return;
    const w = app.referenceCanvas.width, h = app.referenceCanvas.height;
    app.referenceCtx.clearRect(0, 0, w, h);
    app.referenceCtx.globalAlpha = app.referenceOpacity;
    
    if (app.referenceImage instanceof HTMLImageElement) {
        const r = app.referenceImage.width / app.referenceImage.height;
        const cr = w / h;
        let dw, dh, ox, oy;
        if (r > cr) { dw = w; dh = w / r; ox = 0; oy = (h - dh) / 2; }
        else { dh = h; dw = h * r; ox = (w - dw) / 2; oy = 0; }
        app.referenceCtx.drawImage(app.referenceImage, ox, oy, dw, dh);
    }
    app.referenceCtx.globalAlpha = 1;
}

function clearReference() {
    app.referenceImage = null;
    app.referenceCtx.clearRect(0, 0, app.referenceCanvas.width, app.referenceCanvas.height);
    elements.referenceUpload.value = '';
    showToast('Referencia eliminada', 'success');
}

function updateColor(color) {
    app.currentColor = color;
    elements.colorPreview.style.background = color;
    elements.brushIndicator.style.background = color;
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.color === color) btn.classList.add('active');
    });
}
function updateBrushSize(size) {
    app.brushSize = size;
    elements.brushSizeValue.textContent = size + 'px';
    elements.brushIndicator.style.width = size + 'px';
    elements.brushIndicator.style.height = size + 'px';
}
function setMode(mode) {
    app.isEraser = (mode === 'eraser');
    elements.drawModeBtn.classList.toggle('active', mode === 'draw');
    elements.eraserModeBtn.classList.toggle('active', mode === 'eraser');
}

function clearCanvas() {
    if (!app.currentRoom) return showToast('Únete a una sala', 'warning');
    if (confirm('¿Limpiar lienzo para todos?')) {
        database.ref(`rooms/${app.currentRoom}/strokes`).remove()
            .then(() => {
                app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
                app.ctx.fillStyle = '#ffffff'; // Restaurar fondo blanco
                app.ctx.fillRect(0, 0, app.canvas.width, app.canvas.height);
                app.history = []; app.historyStep = -1; saveToHistory();
                showToast('Lienzo limpiado', 'success');
            });
    }
}

function downloadCanvas() {
    const link = document.createElement('a');
    link.download = `neondraw-${Date.now()}.png`;
    link.href = app.canvas.toDataURL();
    link.click();
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<div class="toast-message">${msg}</div>`;
    elements.toastContainer.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

window.addEventListener('beforeunload', leaveRoom);
// Limpieza auto
setInterval(() => {
    if (app.currentRoom && database) {
        database.ref(`rooms/${app.currentRoom}/users`).once('value', (snap) => {
            if (!snap.val()) setTimeout(() => database.ref(`rooms/${app.currentRoom}`).remove(), 300000);
        });
    }
}, 60000);

console.log('%cNeonDraw v2.0 Corregido ✅', 'color: #00ff88; font-weight: bold;');
