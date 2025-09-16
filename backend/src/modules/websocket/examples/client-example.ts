/**
// Logger instance
const logger = LoggerFactory.create({ file: __filename });

 * WebSocket Client Example
 * Sprint 4 - Ejemplo de cliente para conectar al servidor WebSocket
 */
import { io, Socket } from 'socket.io-client';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

/**
 * Ejemplo de configuración y uso del cliente WebSocket
 */
export class WebSocketClientExample {
  private socket: Socket | null = null;
  private token: string;
  private companyId: string;
  private serverUrl: string;
  constructor(token: string, companyId: string, serverUrl: string = 'http://localhost:3000') {
    this.token = token;
    this.companyId = companyId;
    this.serverUrl = serverUrl;
  }
  /**
   * Conecta al servidor WebSocket
   */
  connect(): void {
    // Namespace específico de la empresa
    const namespace = `/company/${this.companyId}`;
    // Configuración del cliente
    this.socket = io(`${this.serverUrl}${namespace}`, {
      auth: {
        token: this.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    this.setupEventListeners();
  }
  /**
   * Configura los listeners de eventos
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    // Conexión exitosa
    this.socket.on('connect', () => {
      logger.info('Connected to WebSocket server');
      logger.info('Socket ID:', this.socket?.id);
    });
    // Autenticación exitosa
    this.socket.on('authenticated', (data) => {
      logger.info('Authentication successful:', data);
      // Unirse a salas después de autenticarse
      this.joinRoom('general');
      this.joinRoom('notifications');
    });
    // Error de autenticación
    this.socket.on('authentication:error', (error) => {
      logger.error('Authentication failed:', error);
    });
    // Mensaje recibido
    this.socket.on('message:received', (message) => {
      logger.info('Message received:', message);
    });
    // Usuario conectado
    this.socket.on('user:connected', (data) => {
      logger.info('User connected:', data);
    });
    // Usuario desconectado
    this.socket.on('user:disconnected', (data) => {
      logger.info('User disconnected:', data);
    });
    // Actualización de presencia
    this.socket.on('presence:updated', (data) => {
      logger.info('Presence updated:', data);
    });
    // Heartbeat del servidor
    this.socket.on('heartbeat:ack', (data) => {
      // Responder al heartbeat
      this.socket?.emit('heartbeat', { timestamp: Date.now() });
    });
    // Límite de conexión alcanzado
    this.socket.on('connection:limit:reached', (data) => {
      logger.error('Connection limit reached:', data);
    });
    // Error general
    this.socket.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
    // Desconexión
    this.socket.on('disconnect', (reason) => {
      logger.info('Disconnected:', reason);
    });
    // Reconexión
    this.socket.on('reconnect', (attemptNumber) => {
      logger.info('Reconnected after', attemptNumber, 'attempts');
    });
    // Intento de reconexión
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      logger.info('Reconnection attempt', attemptNumber);
    });
    // Error de reconexión
    this.socket.on('reconnect_error', (error) => {
      logger.error('Reconnection error:', error.message);
    });
    // Fallo de reconexión
    this.socket.on('reconnect_failed', () => {
      logger.error('Failed to reconnect');
    });
  }
  /**
   * Unirse a una sala
   */
  joinRoom(room: string): void {
    if (!this.socket) {
      logger.error('Socket not connected');
      return;
    }
    this.socket.emit('join:room', { room });
    // Escuchar confirmación
    this.socket.once('room:joined', (data) => {
      logger.info('Joined room:', data.room);
    });
  }
  /**
   * Salir de una sala
   */
  leaveRoom(room: string): void {
    if (!this.socket) {
      logger.error('Socket not connected');
      return;
    }
    this.socket.emit('leave:room', { room });
    // Escuchar confirmación
    this.socket.once('room:left', (data) => {
      logger.info('Left room:', data.room);
    });
  }
  /**
   * Enviar mensaje
   */
  sendMessage(message: any, room?: string): void {
    if (!this.socket) {
      logger.error('Socket not connected');
      return;
    }
    this.socket.emit('message:send', {
      room,
      message: {
        id: this.generateId(),
        content: message,
        timestamp: new Date()
      }
    });
  }
  /**
   * Actualizar presencia
   */
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline', metadata?: any): void {
    if (!this.socket) {
      logger.error('Socket not connected');
      return;
    }
    this.socket.emit('presence:update', {
      status,
      metadata
    });
  }
  /**
   * Enviar heartbeat manual
   */
  sendHeartbeat(): void {
    if (!this.socket) {
      logger.error('Socket not connected');
      return;
    }
    this.socket.emit('heartbeat', {
      timestamp: Date.now()
    });
  }
  /**
   * Desconectar del servidor
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      logger.info('Disconnected from WebSocket server');
    }
  }
  /**
   * Obtener el estado de la conexión
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  /**
   * Obtener el ID del socket
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
  /**
   * Genera un ID único
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
/**
 * Ejemplo de uso
 */
async function exampleUsage() {
  // Obtener token JWT (normalmente desde el login)
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  const companyId = '123e4567-e89b-12d3-a456-426614174000';
  // Crear cliente
  const client = new WebSocketClientExample(token, companyId);
  // Conectar
  client.connect();
  // Esperar a que se conecte
  setTimeout(() => {
    // Enviar mensaje a sala general
    client.sendMessage('Hello everyone!', 'general');
    // Actualizar presencia
    client.updatePresence('online', { location: 'Office' });
    // Enviar mensaje broadcast (a todos)
    client.sendMessage('Important announcement!');
    // Unirse a sala de proyecto
    client.joinRoom('project:projectId123');
    // Enviar mensaje a sala de proyecto
    setTimeout(() => {
      client.sendMessage('Project update', 'project:projectId123');
    }, 1000);
    // Desconectar después de 30 segundos
    setTimeout(() => {
      client.disconnect();
    }, 30000);
  }, 2000);
}
