// app.js - Con soporte para datos remotos
class TaskManagerApp {
  constructor() {
    this.tasks = [];
    this.isOnline = navigator.onLine;
    this.API_URL = window.location.origin + '/api';
  }

  async init() {
    console.log('🚀 Inicializando...');

    setTimeout(() => this.hideSplashScreen(), 2000);

    await dbManager.init();
    await this.registerServiceWorker();
    await notificationManager.init(this.swRegistration);
    
    // Cargar tareas (primero del servidor, luego locales)
    await this.loadTasks();
    
    this.setupEventListeners();
    this.setupConnectionMonitoring();
    this.setupInstallPrompt();

    console.log('✅ App lista');
  }

  hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    const app = document.getElementById('app');
    splash.classList.add('hidden');
    app.classList.add('visible');
    setTimeout(() => splash.style.display = 'none', 500);
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registrado');
    } catch (error) {
      console.error('❌ Error en SW:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('task-form').addEventListener('submit', (e) => this.handleTaskSubmit(e));
    document.getElementById('add-location-btn').addEventListener('click', () => this.addLocation());
    document.getElementById('take-photo-btn').addEventListener('click', () => this.takePhoto());
    document.getElementById('notify-btn').addEventListener('click', () => this.testNotification());
  }

  setupConnectionMonitoring() {
    const updateStatus = () => {
      this.isOnline = navigator.onLine;
      
      if (this.isOnline) {
        this.showToast('🟢 Conectado - Sincronizando...', 'success');
        this.syncWithServer();
      } else {
        this.showToast('🔴 Sin conexión - Modo offline', 'warning');
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      const installPrompt = document.getElementById('install-prompt');
      if (installPrompt) {
        installPrompt.classList.add('visible');

        document.getElementById('install-btn')?.addEventListener('click', async () => {
          installPrompt.classList.remove('visible');
          if (!this.deferredPrompt) return;
          
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          
          if (outcome === 'accepted') {
            hardwareManager.vibrateSuccess();
            this.showToast('✅ App instalada', 'success');
          }
          
          this.deferredPrompt = null;
        });

        document.getElementById('dismiss-btn')?.addEventListener('click', () => {
          installPrompt.classList.remove('visible');
        });
      }
    });
  }

  // ========== CARGAR TAREAS ==========
  
  async loadTasks() {
    try {
      if (this.isOnline) {
        // Primero intentar del servidor (DATOS REMOTOS)
        const response = await fetch(`${this.API_URL}/tasks`);
        if (response.ok) {
          const data = await response.json();
          this.tasks = data.data;
          console.log('✅ Tareas cargadas del SERVIDOR (remoto)');
          
          // Guardar en IndexedDB para offline
          for (const task of this.tasks) {
            await dbManager.createTask(task);
          }
        }
      } else {
        // Si está offline, cargar de IndexedDB (DATOS LOCALES)
        this.tasks = await dbManager.getAllTasks();
        console.log('✅ Tareas cargadas de IndexedDB (local)');
      }
      
      this.renderTasks();
    } catch (error) {
      console.error('Error al cargar tareas:', error);
      // Fallback a IndexedDB
      this.tasks = await dbManager.getAllTasks();
      this.renderTasks();
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
          console.log('✅ Tarea guardada en SERVIDOR');
          this.showToast('✅ Tarea guardada en servidor', 'success');
        }
      } else {
        // Guardar solo local (DATOS LOCALES)
        task = await dbManager.createTask(taskData);
        console.log('✅ Tarea guardada LOCALMENTE (offline)');
        this.showToast('✅ Guardada localmente (se sincronizará)', 'info');
      }

      // Siempre guardar en IndexedDB también
      await dbManager.createTask(task || taskData);
      
      this.tasks.unshift(task || taskData);
      this.renderTasks();

      e.target.reset();
      this.currentLocation = null;

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

  // ========== SINCRONIZAR ==========
  
  async syncWithServer() {
    if (!this.isOnline) return;

    try {
      const localTasks = await dbManager.getAllTasks();
      
      const response = await fetch(`${this.API_URL}/tasks/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: localTasks })
      });

      if (response.ok) {
        console.log('✅ Sincronización completa');
        await this.loadTasks();
      }
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  }

  // ========== RENDERIZAR ==========
  
  renderTasks() {
    const container = document.getElementById('tasks-list');
    const taskCount = document.getElementById('task-count');

    if (taskCount) taskCount.textContent = this.tasks.length;

    if (this.tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>No hay tareas aún</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.tasks.map(task => `
      <div class="task-item">
        <div class="task-header">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <div class="task-actions">
            <button class="btn-icon btn-danger" onclick="app.deleteTask(${task.id})">🗑️</button>
          </div>
        </div>
        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span>📅 ${this.formatDate(task.createdAt)}</span>
          ${task.location ? `<span>📍 ${task.location.latitude.toFixed(4)}, ${task.location.longitude.toFixed(4)}</span>` : ''}
          ${task.source === 'servidor' ? '<span>🖥️ Del servidor</span>' : '<span>💾 Local</span>'}
        </div>
      </div>
    `).join('');
  }

  // ========== HARDWARE ==========
  
  async addLocation() {
    try {
      this.showToast('📍 Obteniendo ubicación...', 'info');
      const location = await hardwareManager.getCurrentLocation();
      this.currentLocation = location;
      this.showToast(`✅ Ubicación: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`, 'success');
      hardwareManager.vibrateSuccess();
      notificationManager.showLocationNotification(location);
    } catch (error) {
      this.showToast(`❌ ${error}`, 'error');
      hardwareManager.vibrateError();
    }
  }

  async takePhoto() {
    try {
      this.showToast('📷 Abriendo cámara...', 'info');
      const photo = await hardwareManager.capturePhotoFromInput();
      this.showToast('✅ Foto capturada', 'success');
      hardwareManager.vibrateSuccess();
    } catch (error) {
      this.showToast('❌ Error con cámara', 'error');
    }
  }

  async testNotification() {
    try {
      const hasPermission = await notificationManager.requestPermission();
      if (hasPermission) {
        notificationManager.showNotification({
          title: '🔔 Notificación de prueba',
          body: 'Las notificaciones funcionan',
          vibrate: [200, 100, 200]
        });
        hardwareManager.vibrateNotification();
        this.showToast('✅ Notificación enviada', 'success');
      } else {
        this.showToast('⚠️ Permiso denegado', 'warning');
      }
    } catch (error) {
      this.showToast('❌ Error', 'error');
    }
  }

  // ========== UTILIDADES ==========
  
  showToast(message, type = 'info') {
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
    return date.toLocaleDateString('es-MX');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Inicializar
const app = new TaskManagerApp();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}