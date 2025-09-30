// Notifications Manager - Push Notifications
class NotificationManager {
  constructor() {
    this.permission = Notification.permission;
    this.swRegistration = null;
  }

  // Inicializar
  async init(swRegistration) {
    this.swRegistration = swRegistration;
    
    if (!('Notification' in window)) {
      console.warn('⚠️ Notificaciones no soportadas');
      return false;
    }

    this.permission = Notification.permission;
    console.log('🔔 Notificaciones:', this.permission);
    return this.permission !== 'denied';
  }

  // Solicitar permiso
  async requestPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notificaciones no soportadas');
    }

    if (this.permission === 'granted') {
      console.log('✅ Permiso ya concedido');
      return true;
    }

    if (this.permission === 'denied') {
      throw new Error('Permiso denegado');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        this.showWelcomeNotification();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error al solicitar permiso:', error);
      throw error;
    }
  }

  // Notificación de bienvenida
  showWelcomeNotification() {
    this.showNotification({
      title: '¡Notificaciones activadas! 🎉',
      body: 'Recibirás actualizaciones de tus tareas',
      icon: '/assets/icons/icon-192x192.png'
    });
  }

  // Mostrar notificación
  async showNotification(options) {
    if (this.permission !== 'granted') {
      console.warn('⚠️ Permiso no concedido');
      return;
    }

    const defaultOptions = {
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'task-notification',
      timestamp: Date.now()
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      if (this.swRegistration) {
        await this.swRegistration.showNotification(
          options.title || 'Task Manager',
          notificationOptions
        );
      } else {
        new Notification(options.title || 'Task Manager', notificationOptions);
      }
      
      console.log('✅ Notificación mostrada:', options.title);
    } catch (error) {
      console.error('❌ Error en notificación:', error);
    }
  }

  // Notificación de tarea creada
  showTaskNotification(task) {
    this.showNotification({
      title: `📋 ${task.title}`,
      body: task.description || 'Nueva tarea creada',
      tag: `task-${task.id}`
    });
  }

  // Notificación de ubicación
  showLocationNotification(location) {
    this.showNotification({
      title: '📍 Ubicación agregada',
      body: `Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}`
    });
  }

  // Notificación de éxito
  showSuccessNotification(message) {
    this.showNotification({
      title: '✅ Éxito',
      body: message
    });
  }

  // Notificación de error
  showErrorNotification(message) {
    this.showNotification({
      title: '❌ Error',
      body: message
    });
  }

  // Obtener notificaciones activas
  async getActiveNotifications() {
    if (!this.swRegistration) {
      return [];
    }

    try {
      const notifications = await this.swRegistration.getNotifications();
      return notifications;
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      return [];
    }
  }

  // Cerrar todas las notificaciones
  async closeAllNotifications() {
    if (!this.swRegistration) return;

    try {
      const notifications = await this.swRegistration.getNotifications();
      notifications.forEach(notification => notification.close());
      console.log('✅ Notificaciones cerradas');
    } catch (error) {
      console.error('Error al cerrar notificaciones:', error);
    }
  }
}

// Instancia global
const notificationManager = new NotificationManager();