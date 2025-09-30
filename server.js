const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado para soportar fotos
app.use(express.static('public')); // Servir archivos estáticos desde public/

// Base de datos en memoria
let tasks = [
  {
    id: 1,
    title: 'Tarea de ejemplo del servidor',
    description: 'Esta tarea fue renderizada en el servidor (SSR) con datos remotos',
    createdAt: new Date().toISOString(),
    location: { latitude: 19.4326, longitude: -99.1332 },
    source: 'servidor'
  },
  {
    id: 2,
    title: 'Bienvenido a Task Manager PWA',
    description: 'Aplicación con funcionalidad online, offline y sincronización automática',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    source: 'servidor'
  }
];

let nextId = 3;



app.get('/ssr', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Manager - SSR Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #667eea; margin-bottom: 10px; }
        .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 30px;
        }
        h2 {
            color: #764ba2;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin: 30px 0 20px 0;
        }
        .task-item {
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
        }
        .task-title {
            font-weight: 600;
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .task-description {
            color: #6b7280;
            margin-bottom: 10px;
        }
        .task-meta {
            font-size: 12px;
            color: #9ca3af;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        .endpoint {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            border-left: 4px solid #2196f3;
        }
        .method {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
        }
        .get { background: #10b981; color: white; }
        .post { background: #3b82f6; color: white; }
        .put { background: #f59e0b; color: white; }
        .delete { background: #ef4444; color: white; }
        code {
            background: #f4f4f4;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
        .link-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            margin: 10px 10px 0 0;
            transition: transform 0.2s;
        }
        .link-button:hover { transform: translateY(-2px); }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Task Manager PWA</h1>
        <div class="badge">✅ Esta página fue renderizada en el servidor (SSR)</div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${tasks.length}</div>
                <div class="stat-label">Tareas en el servidor</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${new Date().toLocaleTimeString('es-MX')}</div>
                <div class="stat-label">Hora del servidor</div>
            </div>
        </div>
        
        <h2>📊 Tareas Renderizadas en el Servidor</h2>
        ${tasks.map(t => `
            <div class="task-item">
                <div class="task-title">${t.title}</div>
                <div class="task-description">${t.description}</div>
                <div class="task-meta">
                    <span>📅 ${new Date(t.createdAt).toLocaleString('es-MX')}</span>
                    <span>🆔 ID: ${t.id}</span>
                    <span>🖥️ ${t.source}</span>
                    ${t.location ? `<span>📍 ${t.location.latitude.toFixed(4)}, ${t.location.longitude.toFixed(4)}</span>` : ''}
                </div>
            </div>
        `).join('')}
        
        <h2>📡 API REST Endpoints</h2>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <code>/api/tasks</code>
            <p>Obtener todas las tareas del servidor</p>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <code>/api/tasks</code>
            <p>Crear una nueva tarea en el servidor</p>
        </div>
        
        <div class="endpoint">
            <span class="method put">PUT</span>
            <code>/api/tasks/:id</code>
            <p>Actualizar tarea existente</p>
        </div>
        
        <div class="endpoint">
            <span class="method delete">DELETE</span>
            <code>/api/tasks/:id</code>
            <p>Eliminar tarea del servidor</p>
        </div>
        
        <div class="endpoint">
            <span class="method post">POST</span>
            <code>/api/tasks/sync</code>
            <p>Sincronizar tareas del cliente con el servidor</p>
        </div>
        
        <h2>🎯 Características Implementadas</h2>
        <ul style="line-height: 2;">
            <li>✅ <strong>SSR</strong> - Server-Side Rendering (esta página)</li>
            <li>✅ <strong>CSR</strong> - Client-Side Rendering (PWA)</li>
            <li>✅ <strong>Datos Locales</strong> - IndexedDB</li>
            <li>✅ <strong>Datos Remotos</strong> - API REST</li>
            <li>✅ <strong>Datos Offline</strong> - Service Worker + Cache</li>
            <li>✅ <strong>Notificaciones</strong> - Push Notifications</li>
            <li>✅ <strong>Hardware</strong> - GPS, Cámara, Vibración, Batería</li>
        </ul>
        
        <a href="/" class="link-button">📱 Ir a la PWA</a>
        <a href="/api/tasks" class="link-button">📊 Ver API</a>
    </div>
</body>
</html>
  `);
});

// ============================================
// API REST - DATOS REMOTOS
// ============================================

// GET - Obtener todas las tareas
app.get('/api/tasks', (req, res) => {
  console.log('📡 GET /api/tasks');
  res.json({
    success: true,
    data: tasks,
    count: tasks.length,
    source: 'servidor remoto',
    timestamp: new Date().toISOString()
  });
});

// GET - Obtener tarea por ID
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Tarea no encontrada'
    });
  }
  
  res.json({
    success: true,
    data: task
  });
});

// POST - Crear nueva tarea
app.post('/api/tasks', (req, res) => {
  console.log('📡 POST /api/tasks', { title: req.body.title });
  
  const { title, description, location, photo, photoName } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'El título es obligatorio'
    });
  }
  
  const newTask = {
    id: nextId++,
    title,
    description: description || '',
    location: location || null,
    photo: photo || null,
    photoName: photoName || null,
    createdAt: new Date().toISOString(),
    source: 'servidor'
  };
  
  tasks.push(newTask);
  
  res.status(201).json({
    success: true,
    message: 'Tarea creada en el servidor remoto',
    data: newTask
  });
});

// PUT - Actualizar tarea
app.put('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tarea no encontrada'
    });
  }
  
  tasks[taskIndex] = {
    ...tasks[taskIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Tarea actualizada en el servidor',
    data: tasks[taskIndex]
  });
});

// DELETE - Eliminar tarea
app.delete('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Tarea no encontrada'
    });
  }
  
  const deleted = tasks.splice(taskIndex, 1)[0];
  
  res.json({
    success: true,
    message: 'Tarea eliminada del servidor',
    data: deleted
  });
});

// POST - Sincronizar tareas
app.post('/api/tasks/sync', (req, res) => {
  console.log('📡 POST /api/tasks/sync');
  
  const { tasks: clientTasks } = req.body;
  
  res.json({
    success: true,
    message: 'Tareas sincronizadas con el servidor',
    serverTasks: tasks,
    clientTasksReceived: clientTasks ? clientTasks.length : 0,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tasksCount: tasks.length,
    uptime: process.uptime()
  });
});

// Ruta catch-all - Si no encuentra la ruta, sirve index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  ✅ Servidor iniciado correctamente   ║
║  📡 Puerto: ${PORT}                      ║
║                                        ║
║  URLs disponibles:                     ║
║  🏠 Frontend (PWA): /                  ║
║  🖥️  SSR Demo: /ssr                    ║
║  📊 API: /api/tasks                    ║
║  ❤️  Health: /health                   ║
║                                        ║
║  Características:                      ║
║  ✅ SSR (Server-Side Rendering)       ║
║  ✅ CSR (Client-Side Rendering)       ║
║  ✅ API REST (Datos remotos)          ║
║  ✅ CORS habilitado                   ║
║  ✅ ${tasks.length} tareas en memoria              ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;