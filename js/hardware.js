// Hardware Manager - Acceso a elementos físicos
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

  // ========== INFO DEL DISPOSITIVO ==========
  
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
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
        online: navigator.onLine
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

  // ========== CAPACIDADES ==========
  
  getAllCapabilities() {
    return {
      geolocation: this.isGeolocationSupported(),
      camera: this.isCameraSupported(),
      vibration: this.isVibrationSupported(),
      share: this.isShareSupported(),
      notifications: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator
    };
  }
}

// Instancia global
const hardwareManager = new HardwareManager();