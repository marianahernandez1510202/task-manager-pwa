// Database Manager - IndexedDB 
class DatabaseManager {
  constructor() {
    this.dbName = 'TaskManagerDB';
    this.version = 1;
    this.db = null;
  }

  // Inicializar base de datos
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Error al abrir DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB inicializada');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('📦 Creando estructura de DB...');

        // Crear tabla de tareas
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', {
            keyPath: 'id',
            autoIncrement: true
          });

          taskStore.createIndex('title', 'title', { unique: false });
          taskStore.createIndex('createdAt', 'createdAt', { unique: false });
          
          console.log('✅ Tabla tasks creada');
        }

        // Crear tabla de configuración
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
          console.log('✅ Tabla settings creada');
        }
      };
    });
  }

  // Crear tarea
  async createTask(taskData) {
    const task = {
      ...taskData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.add(task);

      request.onsuccess = () => {
        console.log('✅ Tarea creada:', task.title);
        resolve(task);
      };

      request.onerror = () => {
        console.error('❌ Error al crear tarea:', request.error);
        reject(request.error);
      };
    });
  }

  // Obtener todas las tareas
  async getAllTasks() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.getAll();

      request.onsuccess = () => {
        const tasks = request.result.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        resolve(tasks);
      };

      request.onerror = () => {
        console.error('❌ Error al obtener tareas:', request.error);
        reject(request.error);
      };
    });
  }

  // Obtener tarea por ID
  async getTaskById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Actualizar tarea
  async updateTask(id, updates) {
    return new Promise(async (resolve, reject) => {
      const task = await this.getTaskById(id);
      
      if (!task) {
        reject(new Error('Tarea no encontrada'));
        return;
      }

      const updatedTask = {
        ...task,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.put(updatedTask);

      request.onsuccess = () => {
        console.log('✅ Tarea actualizada:', updatedTask.title);
        resolve(updatedTask);
      };

      request.onerror = () => {
        console.error('❌ Error al actualizar:', request.error);
        reject(request.error);
      };
    });
  }

  // Eliminar tarea
  async deleteTask(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('✅ Tarea eliminada:', id);
        resolve(id);
      };

      request.onerror = () => {
        console.error('❌ Error al eliminar:', request.error);
        reject(request.error);
      };
    });
  }

  // Buscar tareas
  async searchTasks(query) {
    const allTasks = await this.getAllTasks();
    const lowerQuery = query.toLowerCase();
    
    return allTasks.filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery))
    );
  }

  // Obtener estadísticas
  async getStats() {
    const tasks = await this.getAllTasks();

    return {
      total: tasks.length,
      withLocation: tasks.filter(t => t.location).length,
      withDescription: tasks.filter(t => t.description).length
    };
  }

  // Limpiar base de datos
  async clearAllData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ Datos limpiados');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Cerrar conexión
  close() {
    if (this.db) {
      this.db.close();
      console.log('🔌 DB cerrada');
    }
  }
}

// Instancia global
const dbManager = new DatabaseManager();