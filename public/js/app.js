// app.js - Aplicación principal con CSR, datos remotos, locales y offline
class TaskManagerApp {
  constructor() {
    this.tasks = [];
    this.isOnline = navigator.onLine;
    this.swRegistration = null;
    this.currentLocation = null;
    this.pendingPhoto = null;
    this.deferredPrompt = null;
    this.API_URL = window.location.origin + '/api';
  }

  async init() {
    console.log('🚀 Inicializando Task Manager PWA...');

    // Mostrar splash screen
    setTimeout(() => {
      this.hideSplashScreen();
    }, 2000);

    // Inicializar IndexedDB
    try {
      await dbManager.init();
      console.log('✅ IndexedDB inicializada');
    } catch (error) {
      console.error('❌ Error en IndexedDB:', error);
    }

    // Registrar Service Worker
    await this.registerServiceWorker();

    // Inicializar notificaciones
    await notificationManager.init(this.swRegistration);

    // Cargar tareas
    await this.loadTasks();

    // Configurar eventos
    this.setupEventListeners();
    this.setupConnectionMonitoring();
    this.setupInstallPrompt();

    console.log('✅ Aplicación inicializada correctamente');
  }

  hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    
    splash.classList.add('hidden');
    app.classList.add('visible');
    
    setTimeout(() => {
      splash.style.display = 'none';
    }, 500);
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker no soportado');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registrado');

      this.swRegistration.addEventListener('updatefound', () => {
        console.log('🔄 Nueva versión disponible');
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
    } catch (error) {
      console.error('❌ Error al registrar SW:', error);
    }
  }

  handleServiceWorkerMessage(data) {
    console.log('📨 Mensaje del SW:', data);

    if (data.type === 'SYNC_COMPLETE') {
      this.showToast('✅ Sincronización completa', 'success');
      this.loadTasks();
    }
  }

  setupEventListeners() {
    // Formulario de tarea
    document.getElementById('task-form').addEventListener('submit', (e) => this.handleTaskSubmit(e));

    // Botones de hardware
    document.getElementById('add-location-btn').addEventListener('click', () => this.addLocation());
    document.getElementById('take-photo-btn').addEventListener('click', () => this.takePhoto());
    document.getElementById('notify-btn').addEventListener('click', () => this.testNotification());
    document.getElementById('battery-btn').addEventListener('click', () => this.checkBattery());
  }

  setupConnectionMonitoring() {
    const updateConnectionStatus = () => {
      this.isOnline = navigator.onLine;
      const statusBadge = document.getElementById('connection-status');
      const statusIcon = document.getElementById('status-icon');
      const statusText = document.getElementById('status-text');

      if (this.isOnline) {
        statusBadge.classList.remove('offline');
        statusBadge.classList.add('online');
        statusIcon.textContent = '🟢';
        statusText.textContent = 'En línea';
        
        this.showToast('🟢 Conectado - Sincronizando...', 'success');
        this.syncWithServer();
      } else {
        statusBadge.classList.remove('online');
        statusBadge.classList.add('offline');
        statusIcon.textContent = '🔴';
        statusText.textContent = 'Sin conexión';
        
        this.showToast('🔴 Modo offline', 'warning');
      }
    };

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    updateConnectionStatus();
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      const installPrompt = document.getElementById('install-prompt');
      installPrompt.classList.add('visible');

      document.getElementById('install-btn').addEventListener('click', async () => {
        installPrompt.classList.remove('visible');
        
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        console.log('Instalación:', outcome);
        
        if (outcome === 'accepted') {
          hardwareManager.vibrateSuccess();
          this.showToast('✅ App instalada correctamente', 'success');
        }
        
        this.deferredPrompt = null;
      });

      document.getElementById('dismiss-btn').addEventListener('click', () => {
        installPrompt.classList.remove('visible');
      });
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA instalada');
      this.showToast('✅ Aplicación instalada', 'success');
      hardwareManager.vibrateSuccess();
    });
  }

  // ========== CARGAR TAREAS ==========
  
  async loadTasks() {
    try {
      if (this.isOnline) {
        // Intentar cargar del servidor (DATOS REMOTOS)
        const response = await fetch(`${this.API_URL}/tasks`);
        
        if (response.ok) {
          const data = await response.json();
          this.tasks = data.data;
          console.log('✅ Tareas del servidor:', this.tasks.length);
          
          // Guardar en IndexedDB para offline
          for (const task of this.tasks) {
            try {
              await dbManager.createTask(task);
            } catch (error) {
              // Tarea ya existe, ignorar
            }
          }
        }
      } else {
        // Si está offline, cargar de IndexedDB (DATOS LOCALES)
        this.tasks = await dbManager.getAllTasks();
        console.log('✅ Tareas locales:', this.tasks.length);
      }
      
      this.renderTasks();
    } catch (error) {
      console.error('Error al cargar tareas:', error);
      
      // Fallback a IndexedDB
      this.tasks = await dbManager.getAllTasks();
      this.renderTasks();
      this.showToast('⚠️ Cargando tareas locales', 'warning');
    }
  }

  // ========== CREAR TAREA ==========
  
  async handleTaskSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();

    if (!title) {
      this.showToast('⚠️ El título es obligatorio', 'warning');
      hardwareManager.vibrateError();
      return;
    }

    const taskData = {
      title,
      description,
      location: this.currentLocation,
      createdAt: new Date().toISOString()
    };

    // Agregar foto si existe
    if (this.pendingPhoto) {
      taskData.photo = this.pendingPhoto.dataURL;
      taskData.photoName = this.pendingPhoto.fileName;
    }

    try {
      let task;

      if (this.isOnline) {
        // Guardar en servidor (DATOS REMOTOS)
        const response = await fetch(`${this.API_URL}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });

        if (response.ok) {
          const data = await response.json();
          task = data.data;
          console.log('✅ Tarea guardada en servidor');
          this.showToast('✅ Guardada en servidor', 'success');
        }
      } else {
        // Guardar solo local (DATOS LOCALES)
        task = await dbManager.createTask(taskData);
        console.log('✅ Tarea guardada localmente');
        this.showToast('💾 Guardada localmente (se sincronizará)', 'info');
      }

      // Siempre guardar en IndexedDB también
      if (this.isOnline && task) {
        await dbManager.createTask(task);
      }
      
      this.tasks.unshift(task || taskData);
      this.renderTasks();

      // Limpiar formulario
      e.target.reset();
      this.currentLocation = null;
      this.pendingPhoto = null;
      this.updateLocationStatus(false);

      // Feedback
      hardwareManager.vibrateSuccess();
      notificationManager.showTaskNotification(task || taskData);
    } catch (error) {
      console.error('Error al crear tarea:', error);
      this.showToast('❌ Error al crear tarea', 'error');
      hardwareManager.vibrateError();
    }
  }

  // ========== ELIMINAR TAREA ==========
  
  async deleteTask(taskId) {
    if (!confirm('¿Eliminar esta tarea?')) return;

    try {
      if (this.isOnline) {
        // Eliminar del servidor
        await fetch(`${this.API_URL}/tasks/${taskId}`, {
          method: 'DELETE'
        });
      }

      // Eliminar de IndexedDB
      await dbManager.deleteTask(taskId);
      
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.renderTasks();

      this.showToast('✅ Tarea eliminada', 'success');
      hardwareManager.vibrateShort();
    } catch (error) {
      console.error('Error al eliminar:', error);
      this.showToast('❌ Error al eliminar', 'error');
    }
  }

  // ========== SINCRONIZAR CON SERVIDOR ==========
  
  async syncWithServer() {
    if (!this.isOnline) return;

    try {
      const localTasks = await dbManager.getAllTasks();
      const unsyncedTasks = localTasks.filter(t => !t.synced);

      if (unsyncedTasks.length === 0) {
        console.log('✅ No hay tareas pendientes de sincronizar');
        return;
      }

      console.log(`🔄 Sincronizando ${unsyncedTasks.length} tareas...`);

      const response = await fetch(`${this.API_URL}/tasks/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: unsyncedTasks })
      });

      if (response.ok) {
        console.log('✅ Sincronización completa');
        await this.loadTasks();
      }
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  }

  // ========== RENDERIZAR TAREAS ==========
  
  renderTasks() {
    const container = document.getElementById('tasks-list');
    const taskCount = document.getElementById('task-count');

    taskCount.textContent = this.tasks.length;

    if (this.tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>No hay tareas aún. ¡Crea tu primera tarea!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.tasks.map(task => `
      <div class="task-item" data-task-id="${task.id}">
        <div class="task-header">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <div class="task-actions">
            <button class="btn-icon btn-danger" onclick="app.deleteTask(${task.id})" title="Eliminar">
              🗑️
            </button>
          </div>
        </div>
        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
        ${task.photo ? `<img src="${task.photo}" alt="Foto de tarea" class="task-photo">` : ''}
        <div class="task-meta">
          <span>📅 ${this.formatDate(task.createdAt)}</span>
          ${task.location ? `<span>📍 ${task.location.latitude.toFixed(4)}, ${task.location.longitude.toFixed(4)}</span>` : ''}
          ${task.source === 'servidor' ? '<span>🖥️ Servidor</span>' : '<span>💾 Local</span>'}
          ${task.photoName ? `<span>📷 ${task.photoName}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  // ========== FUNCIONES DE HARDWARE ==========

  async addLocation() {
    try {
      this.showToast('📍 Obteniendo ubicación...', 'info');
      
      const location = await hardwareManager.getCurrentLocation();
      this.currentLocation = location;
      
      this.updateLocationStatus(true);
      this.showToast(`✅ Ubicación: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`, 'success');
      hardwareManager.vibrateSuccess();
      
      notificationManager.showLocationNotification(location);
    } catch (error) {
      console.error('Error ubicación:', error);
      this.showToast(`❌ ${error}`, 'error');
      hardwareManager.vibrateError();
    }
  }

  updateLocationStatus(hasLocation) {
    const locationText = document.getElementById('location-text');
    
    if (hasLocation && this.currentLocation) {
      locationText.textContent = `${this.currentLocation.latitude.toFixed(4)}, ${this.currentLocation.longitude.toFixed(4)}`;
    } else {
      locationText.textContent = 'Sin ubicación';
    }
  }

  async takePhoto() {
    try {
      this.showToast('📷 Abriendo selector de archivos...', 'info');
      
      const photo = await hardwareManager.capturePhotoFromInput();
      
      // Guardar foto pendiente
      this.pendingPhoto = photo;
      
      this.showToast('✅ Foto capturada - Se agregará a la próxima tarea', 'success');
      hardwareManager.vibrateSuccess();
      
      console.log('📷 Foto lista:', photo.fileName);
    } catch (error) {
      console.error('Error cámara:', error);
      this.showToast('❌ Error al capturar foto', 'error');
    }
  }

  async testNotification() {
    try {
      const hasPermission = await notificationManager.requestPermission();
      
      if (hasPermission) {
        notificationManager.showNotification({
          title: '🔔 Notificación de prueba',
          body: 'Las notificaciones funcionan correctamente',
          vibrate: [200, 100, 200]
        });
        
        hardwareManager.vibrateNotification();
        this.showToast('✅ Notificación enviada', 'success');
      } else {
        this.showToast('⚠️ Permiso de notificaciones denegado', 'warning');
      }
    } catch (error) {
      console.error('Error notificaciones:', error);
      this.showToast('❌ Error con notificaciones', 'error');
    }
  }

  async checkBattery() {
    try {
      const battery = await hardwareManager.getBatteryInfo();
      const charging = battery.charging ? '⚡ Cargando' : '';
      this.showToast(`🔋 Batería: ${battery.level}% ${charging}`, 'info');
      hardwareManager.vibrateShort();
    } catch (error) {
      console.error('Error batería:', error);
      this.showToast('⚠️ API de batería no soportada en este navegador', 'warning');
    }
  }

  // ========== UTILIDADES ==========

  showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}]`, message);
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Inicializar aplicación
const app = new TaskManagerApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}