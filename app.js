// =====================================================
// CONFIGURACIÓN DE FIREBASE
// =====================================================
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


// Variable para Firebase
let database = null;

// =====================================================
// GALERÍA DE IMÁGENES PREDEFINIDAS
// =====================================================
const IMAGE_GALLERY = [
    { name: 'Anatomía Mano', url: 'https://i.imgur.com/2qX8KpR.jpg' },
    { name: 'Rostro Proporciones', url: 'https://i.imgur.com/8YJC9Qh.jpg' },
    { name: 'Cuerpo Humano', url: 'https://w.wallhaven.cc/full/e8/wallhaven-e83mxl.png' },
    { name: 'Perspectiva Ciudad', url: 'https://i.imgur.com/7tKmN4R.jpg' },
    { name: 'Animales', url: 'https://i.imgur.com/9pLmQ2X.jpg' },
    { name: 'Poses Dinámicas', url: 'https://i.imgur.com/3wRtY5K.jpg' }
];

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
    isConnected: false,
    presenceRef: null,
    heartbeatInterval: null
};

// =====================================================
// ELEMENTOS DEL DOM
// =====================================================
const elements = {
    loadingScreen: document.getElementById('loading-screen'),
    appContainer: document.getElementById('app'),
    canvas: document.getElementById('drawing-canvas'),
    referenceCanvas: document.getElementById('reference-canvas'),
    canvasOverlay: document.getElementById('canvas-overlay'),
    roomInput: document.getElementById('room-id'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    createRoomBtn: document.getElementById('create-room-btn'),
    leaveRoomBtn: document.getElementById('leave-room-btn'),
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
    loadUrlReferenceBtn: document.getElementById('load-url-reference-btn'),
    galleryReferenceBtn: document.getElementById('gallery-reference-btn'),
    clearReferenceBtn: document.getElementById('clear-reference-btn'),
    referenceOpacity: document.getElementById('reference-opacity'),
    referenceOpacityValue: document.getElementById('reference-opacity-value'),
    referencePresets: document.getElementById('reference-presets'),
    palettesList: document.getElementById('palettes-list'),
    presetColors: document.getElementById('preset-colors'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    toolbar: document.getElementById('toolbar'),
    toolbarOverlay: document.getElementById('toolbar-overlay'),
    urlModal: document.getElementById('url-modal'),
    galleryModal: document.getElementById('gallery-modal'),
    imageUrlInput: document.getElementById('image-url-input'),
    loadUrlBtn: document.getElementById('load-url-btn'),
    cancelUrlBtn: document.getElementById('cancel-url-btn'),
    closeUrlModal: document.getElementById('close-url-modal'),
    closeGalleryModal: document.getElementById('close-gallery-modal'),
    galleryGrid: document.getElementById('gallery-grid')
};


// =====================================================
// INICIALIZACIÓN
// =====================================================
window.addEventListener('load', () => {
    // Primero inicializar Firebase
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        
        // Monitorear conexión
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            updateConnectionStatus(snap.val() === true);
        });
        
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        updateConnectionStatus(false);
        showToast('Error al conectar con Firebase. Revisa la configuración.', 'error');
    }
    
    // Luego mostrar app
    setTimeout(() => {
        elements.loadingScreen.classList.add('hidden');
        elements.appContainer.style.display = 'flex';
        initializeCanvas();
        setupEventListeners();
        initializePalettes();
        initializeReferencePresets();
        
        // Auto-join desde URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomFromUrl = urlParams.get('room');
        if (roomFromUrl) {
            elements.roomInput.value = roomFromUrl;
            joinRoom(roomFromUrl);
        }
    }, 1500);
});

// =====================================================
// CANVAS
// =====================================================
function initializeCanvas() {
    app.canvas = elements.canvas;
    app.ctx = app.canvas.getContext('2d');
    app.referenceCanvas = elements.referenceCanvas;
    app.referenceCtx = app.referenceCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    app.ctx.lineCap = 'round';
    app.ctx.lineJoin = 'round';
    
    saveToHistory();
}

function resizeCanvas() {
    const container = app.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Usar casi todo el espacio disponible
    const maxWidth = rect.width * 0.98;
    const maxHeight = rect.height * 0.98;
    
    // Mantener aspecto 4:3 pero adaptable
    let width = maxWidth;
    let height = width * (3/4);
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * (4/3);
    }
    
    // Asegurar tamaño mínimo
    width = Math.max(width, 400);
    height = Math.max(height, 300);
    
    const imageData = app.canvas.width > 0 ? app.ctx.getImageData(0, 0, app.canvas.width, app.canvas.height) : null;
    
    app.canvas.width = width;
    app.canvas.height = height;
    app.referenceCanvas.width = width;
    app.referenceCanvas.height = height;
    
    if (imageData && app.canvas.width >= imageData.width) {
        app.ctx.putImageData(imageData, 0, 0);
    }
    
    if (app.currentRoom) {
        loadAllStrokes();
    }
    
    if (app.referenceImage) {
        drawReferenceImage();
    }
}

// =====================================================
// PALETAS Y REFERENCIAS
// =====================================================
function initializePalettes() {
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

function initializeReferencePresets() {
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
        
        switch(preset.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(50, 50, 40, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'grid':
                for(let i = 0; i <= 100; i += 20) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, 100);
                    ctx.moveTo(0, i);
                    ctx.lineTo(100, i);
                    ctx.stroke();
                }
                break;
            case 'guides':
                ctx.beginPath();
                ctx.moveTo(50, 0);
                ctx.lineTo(50, 100);
                ctx.moveTo(0, 50);
                ctx.lineTo(100, 50);
                ctx.stroke();
                break;
            case 'perspective':
                ctx.beginPath();
                ctx.moveTo(10, 10);
                ctx.lineTo(50, 50);
                ctx.lineTo(10, 90);
                ctx.moveTo(90, 10);
                ctx.lineTo(50, 50);
                ctx.lineTo(90, 90);
                ctx.stroke();
                break;
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
    const width = app.referenceCanvas.width;
    const height = app.referenceCanvas.height;
    
    app.referenceCtx.clearRect(0, 0, width, height);
    app.referenceCtx.strokeStyle = '#00d4ff';
    app.referenceCtx.lineWidth = 2;
    app.referenceCtx.globalAlpha = app.referenceOpacity;
    
    switch(type) {
        case 'circle':
            const radius = Math.min(width, height) * 0.4;
            app.referenceCtx.beginPath();
            app.referenceCtx.arc(width/2, height/2, radius, 0, Math.PI * 2);
            app.referenceCtx.stroke();
            break;
        case 'grid':
            const gridSize = 50;
            for(let x = 0; x <= width; x += gridSize) {
                app.referenceCtx.beginPath();
                app.referenceCtx.moveTo(x, 0);
                app.referenceCtx.lineTo(x, height);
                app.referenceCtx.stroke();
            }
            for(let y = 0; y <= height; y += gridSize) {
                app.referenceCtx.beginPath();
                app.referenceCtx.moveTo(0, y);
                app.referenceCtx.lineTo(width, y);
                app.referenceCtx.stroke();
            }
            break;
        case 'guides':
            app.referenceCtx.beginPath();
            app.referenceCtx.moveTo(width/2, 0);
            app.referenceCtx.lineTo(width/2, height);
            app.referenceCtx.moveTo(0, height/2);
            app.referenceCtx.lineTo(width, height/2);
            app.referenceCtx.stroke();
            break;
        case 'perspective':
            app.referenceCtx.beginPath();
            app.referenceCtx.moveTo(width * 0.2, height * 0.2);
            app.referenceCtx.lineTo(width * 0.5, height * 0.5);
            app.referenceCtx.lineTo(width * 0.2, height * 0.8);
            app.referenceCtx.moveTo(width * 0.8, height * 0.2);
            app.referenceCtx.lineTo(width * 0.5, height * 0.5);
            app.referenceCtx.lineTo(width * 0.8, height * 0.8);
            app.referenceCtx.stroke();
            break;
    }
    
    app.referenceCtx.globalAlpha = 1;
    app.referenceImage = type;
    elements.clearReferenceBtn.disabled = false;
    
    showToast('Referencia cargada', 'success');
}


// =====================================================
// EVENT LISTENERS
// =====================================================
function setupEventListeners() {
    // Sala
    elements.createRoomBtn.addEventListener('click', createRoom);
    elements.joinRoomBtn.addEventListener('click', () => {
        const roomId = elements.roomInput.value.trim();
        if (!roomId) {
            showToast('Ingresa un código de sala', 'error');
            return;
        }
        if (roomId.length < 3) {
            showToast('El código debe tener al menos 3 caracteres', 'error');
            return;
        }
        joinRoom(roomId);
    });
    elements.leaveRoomBtn.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres salir de la sala?')) {
            leaveRoom();
            showToast('Has salido de la sala', 'success');
        }
    });
    elements.roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') elements.joinRoomBtn.click();
    });

    // Herramientas
    elements.colorPicker.addEventListener('input', (e) => updateColor(e.target.value));
    elements.brushSize.addEventListener('input', (e) => updateBrushSize(parseInt(e.target.value)));
    elements.drawModeBtn.addEventListener('click', () => setMode('draw'));
    elements.eraserModeBtn.addEventListener('click', () => setMode('eraser'));

    // Historial
    elements.undoBtn.addEventListener('click', undo);
    elements.redoBtn.addEventListener('click', redo);
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redo();
        }
    });

    // Referencias
    elements.uploadReferenceBtn.addEventListener('click', () => elements.referenceUpload.click());
    elements.referenceUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Selecciona una imagen válida', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast('La imagen es muy grande (máx 5MB)', 'error');
                return;
            }
            loadReferenceImage(file);
        }
    });
    
    elements.loadUrlReferenceBtn.addEventListener('click', openUrlModal);
    elements.galleryReferenceBtn.addEventListener('click', openGalleryModal);
    elements.clearReferenceBtn.addEventListener('click', clearReference);
    elements.referenceOpacity.addEventListener('input', (e) => {
        app.referenceOpacity = parseInt(e.target.value) / 100;
        elements.referenceOpacityValue.textContent = e.target.value + '%';
        if (app.referenceImage) drawReferenceImage();
    });

    // Modales
    elements.closeUrlModal.addEventListener('click', closeUrlModal);
    elements.cancelUrlBtn.addEventListener('click', closeUrlModal);
    elements.loadUrlBtn.addEventListener('click', loadImageFromUrl);
    elements.closeGalleryModal.addEventListener('click', closeGalleryModal);
    elements.urlModal.addEventListener('click', (e) => {
        if (e.target === elements.urlModal) closeUrlModal();
    });
    elements.galleryModal.addEventListener('click', (e) => {
        if (e.target === elements.galleryModal) closeGalleryModal();
    });

    // Acciones
    elements.clearCanvasBtn.addEventListener('click', clearCanvas);
    elements.downloadBtn.addEventListener('click', downloadCanvas);

    // Canvas
    app.canvas.addEventListener('mousedown', startDrawing);
    app.canvas.addEventListener('mousemove', draw);
    app.canvas.addEventListener('mouseup', stopDrawing);
    app.canvas.addEventListener('mouseout', stopDrawing);
    app.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    app.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    app.canvas.addEventListener('touchend', stopDrawing);
    
    // Móvil
    elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    elements.toolbarOverlay.addEventListener('click', toggleMobileMenu);
}

function toggleMobileMenu() {
    elements.toolbar.classList.toggle('open');
    elements.toolbarOverlay.classList.toggle('show');
}

// =====================================================
// GESTIÓN DE SALAS CON HEARTBEAT
// =====================================================
function createRoom() {
    if (!database) {
        showToast('Error: Firebase no está conectado', 'error');
        return;
    }
    
    const roomId = 'room-' + Math.random().toString(36).substr(2, 9);
    elements.roomInput.value = ''; // Limpiar input
    joinRoom(roomId);
}

function joinRoom(roomId) {
    if (!database) {
        showToast('Error: Firebase no está conectado', 'error');
        return;
    }
    
    if (app.currentRoom) {
        leaveRoom();
    }

    app.currentRoom = roomId;
    elements.roomInput.value = roomId;
    elements.roomInput.disabled = true;
    elements.canvasOverlay.classList.add('hidden');

    // Actualizar UI de botones
    elements.joinRoomBtn.style.display = 'none';
    elements.createRoomBtn.style.display = 'none';
    elements.leaveRoomBtn.style.display = 'flex';

    // Actualizar URL
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);

    // Limpiar canvas y historial
    app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
    app.history = [];
    app.historyStep = -1;
    saveToHistory();

    // Configurar presencia con heartbeat
    setupPresence();

    // Cargar y escuchar trazos
    listenToStrokes();
    loadAllStrokes();

    showToast(`Conectado a sala: ${roomId}`, 'success');
}

function setupPresence() {
    if (!database || !app.currentRoom) return;
    
    const userRef = database.ref(`rooms/${app.currentRoom}/users/${app.userId}`);
    const usersRef = database.ref(`rooms/${app.currentRoom}/users`);
    
    // Establecer presencia inicial
    app.presenceRef = userRef;
    userRef.set({
        t: firebase.database.ServerValue.TIMESTAMP,
        heartbeat: firebase.database.ServerValue.TIMESTAMP
    }).catch(err => console.error('Error en presencia:', err));

    // Configurar desconexión automática
    userRef.onDisconnect().remove();

    // Heartbeat cada 5 segundos para mantener conexión
    if (app.heartbeatInterval) {
        clearInterval(app.heartbeatInterval);
    }
    
    app.heartbeatInterval = setInterval(() => {
        if (app.currentRoom && app.isConnected) {
            userRef.update({
                heartbeat: firebase.database.ServerValue.TIMESTAMP
            }).catch(err => {
                console.error('Error en heartbeat:', err);
                // Si falla heartbeat, intentar reconectar
                if (app.isConnected) {
                    showToast('Reconectando...', 'warning');
                    userRef.set({
                        t: firebase.database.ServerValue.TIMESTAMP,
                        heartbeat: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            });
        }
    }, 5000);

    // Escuchar cambios en usuarios
    usersRef.on('value', (snapshot) => {
        const users = snapshot.val();
        if (!users) {
            elements.userCount.textContent = '0';
            return;
        }
        
        // Filtrar usuarios con heartbeat reciente (últimos 15 segundos)
        const now = Date.now();
        const activeUsers = Object.entries(users).filter(([id, data]) => {
            return data.heartbeat && (now - data.heartbeat < 15000);
        });
        
        const count = activeUsers.length;
        elements.userCount.textContent = count;
        
        // Notificar cuando se une alguien
        if (count >= 2 && count !== app.lastUserCount) {
            showToast('¡Usuario conectado!', 'success');
        }
        app.lastUserCount = count;
    });

    // Limpiar usuarios inactivos cada 30 segundos
    setInterval(() => {
        if (!app.currentRoom) return;
        
        usersRef.once('value', (snapshot) => {
            const users = snapshot.val();
            if (!users) return;
            
            const now = Date.now();
            Object.entries(users).forEach(([userId, data]) => {
                if (data.heartbeat && (now - data.heartbeat > 30000)) {
                    database.ref(`rooms/${app.currentRoom}/users/${userId}`).remove();
                }
            });
        });
    }, 30000);
}

function leaveRoom() {
    // Detener heartbeat
    if (app.heartbeatInterval) {
        clearInterval(app.heartbeatInterval);
        app.heartbeatInterval = null;
    }
    
    // Detener listener de trazos
    if (app.drawingListener) {
        const strokesRef = database.ref(`rooms/${app.currentRoom}/strokes`);
        strokesRef.off('child_added', app.drawingListener);
    }
    
    // Remover presencia
    if (app.presenceRef && database) {
        app.presenceRef.remove();
    }

    app.currentRoom = null;
    app.presenceRef = null;
    
    // Actualizar UI
    elements.roomInput.value = '';
    elements.roomInput.disabled = false;
    elements.canvasOverlay.classList.remove('hidden');
    elements.joinRoomBtn.style.display = 'inline-block';
    elements.createRoomBtn.style.display = 'inline-block';
    elements.leaveRoomBtn.style.display = 'none';
    elements.userCount.textContent = '0';
    
    // Limpiar URL
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
}

function updateConnectionStatus(connected) {
    app.isConnected = connected;
    
    if (connected) {
        elements.statusDot.classList.remove('disconnected');
        elements.statusText.textContent = 'Conectado';
        
        // Si estaba en sala, restablecer presencia
        if (app.currentRoom && app.presenceRef) {
            app.presenceRef.set({
                t: firebase.database.ServerValue.TIMESTAMP,
                heartbeat: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } else {
        elements.statusDot.classList.add('disconnected');
        elements.statusText.textContent = 'Desconectado';
    }
}


// =====================================================
// DIBUJO EN CANVAS
// =====================================================
function startDrawing(e) {
    if (!app.currentRoom) {
        showToast('Únete a una sala primero', 'warning');
        return;
    }
    
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
    
    if (app.currentStroke.length > 0) {
        sendStrokeBatch();
    }
    
    saveToHistory();
}

function drawLine(x1, y1, x2, y2, color, size, isEraser = false) {
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
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    app.canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    app.canvas.dispatchEvent(mouseEvent);
}

// =====================================================
// FIREBASE - TRAZOS
// =====================================================
function sendStrokeBatch() {
    if (!app.currentStroke.length || !app.currentRoom || !database) return;
    
    const strokeRef = database.ref(`rooms/${app.currentRoom}/strokes`).push();
    strokeRef.set({
        p: app.currentStroke,
        c: app.currentColor,
        s: app.brushSize,
        e: app.isEraser,
        u: app.userId,
        t: firebase.database.ServerValue.TIMESTAMP
    }).catch(err => console.error('Error al enviar trazo:', err));
    
    app.currentStroke = [];
}

function listenToStrokes() {
    if (!database || !app.currentRoom) return;
    
    const strokesRef = database.ref(`rooms/${app.currentRoom}/strokes`);
    
    app.drawingListener = strokesRef.on('child_added', (snapshot) => {
        const stroke = snapshot.val();
        
        if (stroke.u !== app.userId && stroke.p && Array.isArray(stroke.p)) {
            stroke.p.forEach(point => {
                drawLine(point.x1, point.y1, point.x2, point.y2, stroke.c, stroke.s, stroke.e);
            });
        }
    });
}

function loadAllStrokes() {
    if (!database || !app.currentRoom) return;
    
    const strokesRef = database.ref(`rooms/${app.currentRoom}/strokes`);
    
    strokesRef.once('value', (snapshot) => {
        app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
        
        snapshot.forEach((childSnapshot) => {
            const stroke = childSnapshot.val();
            if (stroke.p && Array.isArray(stroke.p)) {
                stroke.p.forEach(point => {
                    drawLine(point.x1, point.y1, point.x2, point.y2, stroke.c, stroke.s, stroke.e);
                });
            }
        });
        
        saveToHistory();
    }).catch(err => {
        console.error('Error al cargar trazos:', err);
        showToast('Error al cargar dibujos', 'error');
    });
}

// =====================================================
// HISTORIAL
// =====================================================
function saveToHistory() {
    if (app.historyStep < app.history.length - 1) {
        app.history = app.history.slice(0, app.historyStep + 1);
    }
    
    app.history.push(app.canvas.toDataURL());
    app.historyStep++;
    
    if (app.history.length > app.maxHistory) {
        app.history.shift();
        app.historyStep--;
    }
    
    updateHistoryButtons();
}

function undo() {
    if (app.historyStep > 0) {
        app.historyStep--;
        restoreFromHistory();
    }
}

function redo() {
    if (app.historyStep < app.history.length - 1) {
        app.historyStep++;
        restoreFromHistory();
    }
}

function restoreFromHistory() {
    if (app.history[app.historyStep]) {
        const img = new Image();
        img.src = app.history[app.historyStep];
        img.onload = () => {
            app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
            app.ctx.drawImage(img, 0, 0);
        };
    }
}

function updateHistoryButtons() {
    elements.undoBtn.disabled = app.historyStep <= 0;
    elements.redoBtn.disabled = app.historyStep >= app.history.length - 1;
}

// =====================================================
// MODALES Y REFERENCIAS
// =====================================================
function openUrlModal() {
    elements.urlModal.classList.add('show');
    elements.imageUrlInput.value = '';
    elements.imageUrlInput.focus();
}

function closeUrlModal() {
    elements.urlModal.classList.remove('show');
}

function loadImageFromUrl() {
    const url = elements.imageUrlInput.value.trim();
    
    if (!url) {
        showToast('Ingresa una URL válida', 'error');
        return;
    }
    
    if (!url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) && !url.includes('imgur') && !url.includes('image')) {
        showToast('La URL debe ser una imagen válida', 'warning');
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
        app.referenceImage = img;
        drawReferenceImage();
        elements.clearReferenceBtn.disabled = false;
        closeUrlModal();
        showToast('Imagen cargada correctamente', 'success');
    };
    
    img.onerror = () => {
        showToast('Error al cargar la imagen. Verifica la URL o permisos CORS', 'error');
    };
    
    img.src = url;
}

function openGalleryModal() {
    elements.galleryModal.classList.add('show');
    loadGallery();
}

function closeGalleryModal() {
    elements.galleryModal.classList.remove('show');
}

function loadGallery() {
    elements.galleryGrid.innerHTML = '<div class="gallery-item-loading">Cargando galería...</div>';
    
    // Simular carga (en producción cargarías desde servidor/BD)
    setTimeout(() => {
        elements.galleryGrid.innerHTML = '';
        
        IMAGE_GALLERY.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = item.url;
            img.alt = item.name;
            img.loading = 'lazy';
            
            img.onerror = () => {
                div.innerHTML = '<div class="gallery-item-loading">Error al cargar</div>';
            };
            
            div.appendChild(img);
            div.addEventListener('click', () => loadGalleryImage(item.url));
            
            elements.galleryGrid.appendChild(div);
        });
    }, 500);
}

function loadGalleryImage(url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
        app.referenceImage = img;
        drawReferenceImage();
        elements.clearReferenceBtn.disabled = false;
        closeGalleryModal();
        showToast('Imagen de referencia cargada', 'success');
    };
    
    img.onerror = () => {
        showToast('Error al cargar la imagen', 'error');
    };
    
    img.src = url;
}

function loadReferenceImage(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            app.referenceImage = img;
            drawReferenceImage();
            elements.clearReferenceBtn.disabled = false;
            showToast('Imagen de referencia cargada', 'success');
        };
        img.onerror = () => {
            showToast('Error al cargar la imagen', 'error');
        };
        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        showToast('Error al leer el archivo', 'error');
    };
    
    reader.readAsDataURL(file);
}

function drawReferenceImage() {
    if (!app.referenceImage) return;
    
    const width = app.referenceCanvas.width;
    const height = app.referenceCanvas.height;
    
    app.referenceCtx.clearRect(0, 0, width, height);
    app.referenceCtx.globalAlpha = app.referenceOpacity;
    
    if (app.referenceImage instanceof HTMLImageElement) {
        const imgRatio = app.referenceImage.width / app.referenceImage.height;
        const canvasRatio = width / height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgRatio > canvasRatio) {
            drawWidth = width;
            drawHeight = width / imgRatio;
            offsetX = 0;
            offsetY = (height - drawHeight) / 2;
        } else {
            drawHeight = height;
            drawWidth = height * imgRatio;
            offsetX = (width - drawWidth) / 2;
            offsetY = 0;
        }
        
        app.referenceCtx.drawImage(app.referenceImage, offsetX, offsetY, drawWidth, drawHeight);
    }
    
    app.referenceCtx.globalAlpha = 1;
}

function clearReference() {
    if (!app.referenceImage) {
        showToast('No hay referencia para eliminar', 'warning');
        return;
    }
    
    app.referenceImage = null;
    app.referenceCtx.clearRect(0, 0, app.referenceCanvas.width, app.referenceCanvas.height);
    elements.referenceUpload.value = '';
    elements.clearReferenceBtn.disabled = true;
    
    document.querySelectorAll('.reference-preset').forEach(el => {
        el.classList.remove('active');
    });
    
    showToast('Referencia eliminada', 'success');
}


// =====================================================
// HERRAMIENTAS
// =====================================================
function updateColor(color) {
    app.currentColor = color;
    elements.colorPreview.style.background = color;
    elements.brushIndicator.style.background = color;
    
    document.querySelectorAll('.color-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
}

function updateBrushSize(size) {
    app.brushSize = size;
    elements.brushSizeValue.textContent = size + 'px';
    elements.brushIndicator.style.width = size + 'px';
    elements.brushIndicator.style.height = size + 'px';
}

function setMode(mode) {
    if (mode === 'draw') {
        app.isEraser = false;
        elements.drawModeBtn.classList.add('active');
        elements.eraserModeBtn.classList.remove('active');
    } else {
        app.isEraser = true;
        elements.eraserModeBtn.classList.add('active');
        elements.drawModeBtn.classList.remove('active');
    }
}

function clearCanvas() {
    if (!app.currentRoom) {
        showToast('Únete a una sala primero', 'warning');
        return;
    }
    
    if (confirm('¿Estás seguro de limpiar el lienzo? Esto afectará a todos los usuarios.')) {
        database.ref(`rooms/${app.currentRoom}/strokes`).remove()
            .then(() => {
                app.ctx.clearRect(0, 0, app.canvas.width, app.canvas.height);
                app.history = [];
                app.historyStep = -1;
                saveToHistory();
                showToast('Lienzo limpiado', 'success');
            })
            .catch(err => {
                console.error('Error al limpiar:', err);
                showToast('Error al limpiar el lienzo', 'error');
            });
    }
}

function downloadCanvas() {
    try {
        const link = document.createElement('a');
        link.download = `neondraw-${Date.now()}.png`;
        link.href = app.canvas.toDataURL();
        link.click();
        showToast('Imagen descargada', 'success');
    } catch (err) {
        console.error('Error al descargar:', err);
        showToast('Error al descargar la imagen', 'error');
    }
}

// =====================================================
// NOTIFICACIONES
// =====================================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Log de inicio
console.log('%cNeonDraw v2.1 cargado ✅', 'color: #00ff88; font-size: 16px; font-weight: bold;');
console.log('%cRecuerda configurar Firebase!', 'color: #00d4ff; font-size: 14px;');

