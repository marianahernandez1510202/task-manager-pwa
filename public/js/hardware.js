// hardware.js - Acceso a elementos físicos del dispositivo
class HardwareManager {
  constructor() {
    this.currentPosition = null;
  }

  // ========== GEOLOCALIZACIÓN ==========
  
  isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  async getCurrentLocation() {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocalización no soportada');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          console.log('📍 Ubicación obtenida:', this.currentPosition);
          resolve(this.currentPosition);
        },
        (error) => {
          console.error('❌ Error de ubicación:', error);
          reject(this.getGeolocationError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  getGeolocationError(error) {
    const errors = {
      1: 'Permiso de ubicación denegado',
      2: 'Ubicación no disponible',
      3: 'Tiempo de espera agotado'
    };
    return errors[error.code] || 'Error desconocido';
  }

  watchLocation(callback) {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocalización no soportada');
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        callback(this.currentPosition);
      },
      (error) => {
        console.error('Error al observar ubicación:', error);
        callback(null, this.getGeolocationError(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );

    return this.watchId;
  }

  stopWatchingLocation() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Observación de ubicación detenida');
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance; // kilómetros
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // ========== CÁMARA ==========
  
  isCameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async capturePhoto() {
    if (!this.isCameraSupported()) {
      throw new Error('Cámara no soportada');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      console.log('📷 Foto capturada');
      return {
        dataURL: imageData,
        width: canvas.width,
        height: canvas.height,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Error con cámara:', error);
      throw new Error('No se pudo acceder a la cámara');
    }
  }

  async capturePhotoFromInput() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('No se seleccionó archivo'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            dataURL: event.target.result,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            timestamp: Date.now()
          });
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  // ========== VIBRACIÓN ==========
  
  isVibrationSupported() {
    return 'vibrate' in navigator;
  }

  vibrate(pattern = 200) {
    if (!this.isVibrationSupported()) {
      console.warn('⚠️ Vibración no soportada');
      return false;
    }

    try {
      navigator.vibrate(pattern);
      console.log('📳 Vibración:', pattern);
      return true;
    } catch (error) {
      console.error('❌ Error al vibrar:', error);
      return false;
    }
  }

  vibrateSuccess() {
    this.vibrate([100, 50, 100]);
  }

  vibrateError() {
    this.vibrate([200, 100, 200, 100, 200]);
  }

  vibrateNotification() {
    this.vibrate([200, 100, 200]);
  }

  vibrateLong() {
    this.vibrate(400);
  }

  vibrateShort() {
    this.vibrate(50);
  }

  stopVibration() {
    if (this.isVibrationSupported()) {
      navigator.vibrate(0);
    }
  }

  // ========== BATERÍA ==========
  
  async getBatteryInfo() {
    if (!('getBattery' in navigator)) {
      throw new Error('API de batería no soportada');
    }

    try {
      const battery = await navigator.getBattery();
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (error) {
      console.error('Error al obtener batería:', error);
      throw error;
    }
  }

  async watchBattery(callback) {
    try {
      const battery = await navigator.getBattery();
      
      const updateBattery = () => {
        callback({
          level: Math.round(battery.level * 100),
          charging: battery.charging
        });
      };

      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
      
      updateBattery();
      
      return () => {
        battery.removeEventListener('levelchange', updateBattery);
        battery.removeEventListener('chargingchange', updateBattery);
      };
    } catch (error) {
      console.error('Error al observar batería:', error);
      throw error;
    }
  }

  // ========== ORIENTACIÓN ==========
  
  isOrientationSupported() {
    return 'DeviceOrientationEvent' in window;
  }

  watchOrientation(callback) {
    if (!this.isOrientationSupported()) {
      throw new Error('Orientación no soportada');
    }

    const handler = (event) => {
      const orientation = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute
      };
      callback(orientation);
    };

    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }

  // ========== COMPARTIR ==========
  
  isShareSupported() {
    return 'share' in navigator;
  }

  async share(data) {
    if (!this.isShareSupported()) {
      throw new Error('Web Share API no soportada');
    }

    try {
      await navigator.share(data);
      console.log('✅ Contenido compartido');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Compartir cancelado');
      } else {
        console.error('Error al compartir:', error);
      }
      return false;
    }
  }

  // ========== PORTAPAPELES ==========
  
  async copyToClipboard(text) {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API no soportada');
    }

    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ Copiado al portapapeles');
      return true;
    } catch (error) {
      console.error('Error al copiar:', error);
      return false;
    }
  }

  async readFromClipboard() {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API no soportada');
    }

    try {
      const text = await navigator.clipboard.readText();
      console.log('✅ Leído del portapapeles');
      return text;
    } catch (error) {
      console.error('Error al leer portapapeles:', error);
      throw error;
    }
  }

  // ========== INFO DEL DISPOSITIVO ==========
  
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      hardwareConcurrency: navigator.hardwareConcurrency || 'No disponible',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      deviceMemory: navigator.deviceMemory || 'No disponible',
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  // ========== ESTADO DE CONEXIÓN ==========
  
  watchConnectionStatus(callback) {
    const updateStatus = () => {
      const status = {
        online: navigator.onLine,
        type: this.getConnectionType(),
        effectiveType: this.getEffectiveConnectionType()
      };
      callback(status);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }

  getConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection ? connection.type : 'unknown';
  }

  getEffectiveConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return connection ? connection.effectiveType : 'unknown';
  }

  // ========== CAPACIDADES ==========
  
  getAllCapabilities() {
    return {
      geolocation: this.isGeolocationSupported(),
      camera: this.isCameraSupported(),
      vibration: this.isVibrationSupported(),
      orientation: this.isOrientationSupported(),
      share: this.isShareSupported(),
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      battery: 'getBattery' in navigator
    };
  }
}

const hardwareManager = new HardwareManager();