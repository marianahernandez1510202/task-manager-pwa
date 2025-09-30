# 📱 Task Manager PWA - Frontend Only

Aplicación Web Progresiva completa para gestión de tareas con geolocalización, cámara, notificaciones y funcionalidad offline.

## ✨ Características

✅ **Splash Screen** - Pantalla de carga animada  
✅ **Home Screen** - Interfaz responsive y moderna  
✅ **IndexedDB** - Base de datos local persistente  
✅ **Service Worker** - Funcionalidad offline completa  
✅ **Geolocalización** - GPS de alta precisión  
✅ **Cámara** - Captura de fotos  
✅ **Vibración** - Feedback táctil  
✅ **Notificaciones Push** - Alertas del sistema  
✅ **Instalable** - Se instala como app nativa  

## 📁 Estructura del Proyecto

```
task-manager-pwa/
│
├── index.html              # Página principal
├── manifest.json           # Configuración PWA
├── service-worker.js       # Worker offline
│
├── js/
│   ├── app.js             # Lógica principal
│   ├── db.js              # IndexedDB
│   ├── notifications.js   # Notificaciones
│   └── hardware.js        # Hardware APIs
│
├── assets/
│   └── icons/             # Iconos PWA (72-512px)
│
└── README.md              # Este archivo
```

## 🚀 Cómo Ejecutar

### Opción 1: Python (Más simple)
```bash
python -m http.server 8080
```

### Opción 2: Node.js
```bash
npx serve -s . -p 8080
```

### Opción 3: PHP
```bash
php -S localhost:8080
```

Luego abre en tu navegador:
```
http://localhost:8080
```

## 📱 Cómo Instalar como PWA

1. Abre la aplicación en tu navegador
2. Aparecerá un banner de instalación
3. Click en "Instalar"
4. La app se agregará a tu pantalla de inicio
5. ¡Listo! Ahora funciona como app nativa

## 🎯 Funcionalidades

### Crear Tarea
1. Completa título y descripción
2. (Opcional) Agrega ubicación GPS
3. (Opcional) Toma una foto
4. Click en "Guardar Tarea"

### Agregar Ubicación
1. Click en "Agregar Ubicación"
2. Acepta permisos de ubicación
3. Se agregará automáticamente a la tarea

### Tomar Foto
1. Click en "Tomar Foto"
2. Selecciona o captura imagen
3. Se guarda con la tarea

### Notificaciones
1. Click en "Notificación"
2. Acepta permisos
3. Recibirás notificaciones de tus tareas

## 💾 Almacenamiento

- **IndexedDB**: Tareas y datos principales
- **LocalStorage**: Configuración y preferencias
- **Cache API**: Assets estáticos (HTML, CSS, JS)

**Los datos NO se pierden** al cerrar el navegador.

## 🌐 Funciona Offline

La aplicación funciona completamente sin conexión a Internet:
- Service Worker cachea todos los archivos
- IndexedDB almacena las tareas
- Puedes crear, editar y eliminar tareas offline
- Todo se guarda localmente en tu dispositivo

## 📊 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- HTTPS o localhost (requerido para PWA)
- Permisos opcionales:
  - 📍 Ubicación
  - 📷 Cámara
  - 🔔 Notificaciones

## 🎨 Tecnologías

- HTML5
- CSS3 (Flexbox, Grid, Animaciones)
- JavaScript ES6+
- IndexedDB API
- Service Workers
- Geolocation API
- Media Devices API
- Vibration API
- Notification API