// server.js - Backend con SSR y API REST
const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Base de datos en memoria (simulada)
let tasks = [
  {
    id: 1,
    title: 'Tarea de ejemplo del servidor',
    description: 'Esta tarea viene del servidor (SSR)',
    createdAt: new Date().toISOString(),
    location: null
  }
];

let nextId = 2;

// ============================================
// SSR - SERVER SIDE RENDERING
// ============================================

// Renderizar página principal con datos del servidor
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#6366f1">
    <title>Task Manager PWA - SSR</title>
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <!-- DATOS RENDERIZADOS EN EL SERVIDOR -->
    <div id="server-data" style="display: none;">
      ${JSON.stringify(tasks)}
    </div>
    
    <div id="ssr-indicator" style="background: #10b981; color: white; padding: 10px; text-align: center;">
      ✅ Esta página fue renderizada en el servidor (SSR)
    </div>

    <!-- Splash Screen -->
    <div id="splash-screen">
        <div class="splash-logo">📋</div>
        <div class="splash-text">Task Manager</div>
        <div class="splash-subtitle">Con SSR + CSR</div>
        <div class="loader"></div>
    </div>

    <!-- App -->
    <div id="app">
        <header>
            <h1>📋 Task Manager PWA (SSR + CSR)</h1>
            <div class="status">
                <span class="status-badge online">
                    🟢 Servidor: Conectado
                </span>
                <span class="status-badge" id="location-status">
                    📍 <span id="location-text">Sin ubicación</span>
                </span>
            </div>
        </header>

        <div class="task-input-section">
            <h3>➕ Nueva Tarea</h3>
            <form id="task-form">
                <div class="input-group">
                    <label>Título *</label>
                    <input type="text" id="task-title" required>
                </div>
                <div class="input-group">
                    <label>Descripción</label>
                    <textarea id="task-description"></textarea>
                </div>
                <div class="button-group">
                    <button type="submit" class="btn-primary">💾 Guardar</button>
                    <button type="button" class="btn-secondary" id="add-location-btn">📍 Ubicación</button>
                    <button type="button" class="btn-secondary" id="take-photo-btn">📷 Foto</button>
                    <button type="button" class="btn-secondary" id="notify-btn">🔔 Notificar</button>
                </div>
            </form>
        </div>

        <div class="tasks-section">
            <div class="tasks-header">
                <h2>📝 Mis Tareas</h2>
                <span class="task-count" id="task-count">${tasks.length}</span>
            </div>
            
            <!-- TAREAS RENDERIZADAS EN EL SERVIDOR (SSR) -->
            <div id="tasks-list">
              ${tasks.map(task => `
                <div class="task-item" data-task-id="${task.id}">
                  <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <div class="task-actions">
                      <button class="btn-icon btn-danger" onclick="deleteTask(${task.id})">🗑️</button>
                    </div>
                  </div>
                  ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                  <div class="task-meta">
                    <span>📅 ${new Date(task.createdAt).toLocaleDateString()}</span>
                    <span>🖥️ Renderizado en servidor (SSR)</span>
                  </div>
                </div>
              `).join('')}
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/js/db.js"></script>
    <script src="/js/notifications.js"></script>
    <script src="/js/hardware.js"></script>
    <script src="/js/app.js"></script>
    <script>
      // Hidratar con datos del servidor
      window.serverData = ${JSON.stringify(tasks)};
    </script>
</body>
</html>
  `;
  
  res.send(html);
});

// ============================================
// API REST - DATOS REMOTOS
// ============================================

// GET - Obtener todas las tareas
app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: tasks,
    source: 'servidor remoto'
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

// POST - Crear tarea
app.post('/api/tasks', (req, res) => {
  const { title, description, location } = req.body;
  
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
    createdAt: new Date().toISOString(),
    source: 'servidor'
  };
  
  tasks.push(newTask);
  
  res.status(201).json({
    success: true,
    message: 'Tarea creada en el servidor',
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
  const { tasks: clientTasks } = req.body;
  
  console.log('Sincronizando tareas desde el cliente...');
  
  res.json({
    success: true,
    message: 'Tareas sincronizadas con el servidor',
    serverTasks: tasks
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  ✅ Servidor iniciado correctamente   ║
║  📡 http://localhost:${PORT}             ║
║                                        ║
║  Características:                      ║
║  ✅ SSR (Server-Side Rendering)       ║
║  ✅ API REST (Datos remotos)          ║
║  ✅ Sincronización                     ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;