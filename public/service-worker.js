// service-worker.js - Funcionalidad offline (DATOS OFFLINE)
const CACHE_NAME = 'task-manager-v1.0.0';
const RUNTIME_CACHE = 'task-manager-runtime';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/db.js',
  '/js/notifications.js',
  '/js/hardware.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// INSTALACIÓN
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Archivos cacheados');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => {
              console.log('[SW] Eliminando caché:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// FETCH - Estrategia Cache First para assets, Network First para API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Assets: Cache First
  event.respondWith(cacheFirstStrategy(request));
});

// Network First Strategy
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, using cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Sin conexión - datos no disponibles',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache First Strategy
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// NOTIFICACIONES PUSH
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');
  
  const data = event.data ? event.data.json() : {
    title: 'Task Manager',
    body: 'Nueva notificación'
  };
  
  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// CLICK EN NOTIFICACIÓN
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clicada');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// SINCRONIZACIÓN EN SEGUNDO PLANO
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    console.log('[SW] Sincronizando tareas...');
    
    const response = await fetch('/api/tasks/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('[SW] Sincronización completa');
      
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          message: 'Tareas sincronizadas'
        });
      });
    }
  } catch (error) {
    console.error('[SW] Error en sincronización:', error);
    throw error;
  }
}

// MENSAJES
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker cargado');