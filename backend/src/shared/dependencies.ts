// Sistema de dependencias simple - Sin DI Container complejo (Nivel 1)
// TODO: Evaluar necesidad de Inversify o similar en Nivel 2

import { dbPools } from './database';
import { logger, cache, eventBus, validator, utils } from './services';

// Repositorios simples - instancias únicas compartidas
class UserRepository {
  private db = dbPools.shared;
  
  async findByEmail(email: string) {
    try {
      // TODO: Implementar query real en Nivel 2
      logger.debug(`Buscando usuario por email: ${email}`);
      
      // Mock temporal
      if (email === 'admin@flexxus.com') {
        return {
          id: '1',
          email,
          name: 'Admin User',
          password: utils.hashPassword('admin123'),
          role: 'admin'
        };
      }
      return null;
    } catch (error) {
      logger.error('Error en UserRepository.findByEmail:', error);
      throw error;
    }
  }
  
  async findById(id: string) {
    // TODO: Implementar query real en Nivel 2
    logger.debug(`Buscando usuario por ID: ${id}`);
    return {
      id,
      email: 'user@flexxus.com',
      name: 'Test User',
      role: 'user'
    };
  }
  
  async create(userData: any) {
    // TODO: Implementar insert real en Nivel 2
    const newUser = {
      id: utils.generateId('user'),
      ...userData,
      password: utils.hashPassword(userData.password),
      createdAt: new Date().toISOString()
    };
    
    logger.info(`Usuario creado: ${newUser.id}`);
    eventBus.emit('user.created', newUser);
    
    return newUser;
  }
}

class ContactRepository {
  private db = dbPools.crm;
  
  async findAll() {
    // TODO: Implementar query real en Nivel 2
    logger.debug('Obteniendo todos los contactos');
    return [
      { id: '1', name: 'Juan Pérez', email: 'juan@example.com' },
      { id: '2', name: 'María García', email: 'maria@example.com' }
    ];
  }
  
  async findById(id: string) {
    // TODO: Implementar query real en Nivel 2
    logger.debug(`Buscando contacto por ID: ${id}`);
    return {
      id,
      name: 'Test Contact',
      email: 'contact@example.com',
      phone: '+56912345678'
    };
  }
  
  async create(contactData: any) {
    // TODO: Implementar insert real en Nivel 2
    const newContact = {
      id: utils.generateId('contact'),
      ...contactData,
      createdAt: new Date().toISOString()
    };
    
    logger.info(`Contacto creado: ${newContact.id}`);
    eventBus.emit('contact.created', newContact);
    
    return newContact;
  }
}

class MessageRepository {
  private db = dbPools.omni;
  
  async save(messageData: any) {
    // TODO: Implementar insert real en Nivel 2
    const message = {
      id: utils.generateId('msg'),
      ...messageData,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Mensaje guardado: ${message.id}`);
    eventBus.emit('message.sent', message);
    
    return message;
  }
  
  async findByConversationId(conversationId: string) {
    // TODO: Implementar query real en Nivel 2
    logger.debug(`Buscando mensajes de conversación: ${conversationId}`);
    return [];
  }
}

// Crear instancias únicas (singleton manual)
const repositories = {
  user: new UserRepository(),
  contact: new ContactRepository(),
  message: new MessageRepository()
};

// Servicios de negocio simples
class AuthService {
  constructor(
    private userRepo = repositories.user,
    private logger = logger,
    private cache = cache
  ) {}
  
  async login(email: string, password: string) {
    // Verificar cache primero
    const cacheKey = `auth:${email}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug('Login desde cache');
      return cached;
    }
    
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    
    if (!utils.verifyPassword(password, user.password)) {
      return { success: false, message: 'Contraseña incorrecta' };
    }
    
    // Generar token simple (TODO: usar JWT real en Nivel 2)
    const token = utils.generateId('token');
    
    const result = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
    
    // Guardar en cache por 5 minutos
    this.cache.set(cacheKey, result, 300);
    
    return result;
  }
}

class NotificationService {
  constructor(
    private messageRepo = repositories.message,
    private logger = logger,
    private eventBus = eventBus
  ) {
    // Suscribirse a eventos
    this.eventBus.on('user.created', this.onUserCreated.bind(this));
    this.eventBus.on('contact.created', this.onContactCreated.bind(this));
  }
  
  private async onUserCreated(user: any) {
    this.logger.info(`Enviando notificación de bienvenida a ${user.email}`);
    // TODO: Implementar envío real en Nivel 2
  }
  
  private async onContactCreated(contact: any) {
    this.logger.info(`Nuevo contacto registrado: ${contact.email}`);
    // TODO: Implementar notificación real en Nivel 2
  }
  
  async sendMessage(channel: string, recipient: string, content: string) {
    const message = await this.messageRepo.save({
      channel,
      recipient,
      content,
      status: 'pending'
    });
    
    // TODO: Implementar envío real por canal en Nivel 2
    this.logger.info(`Mensaje ${message.id} enviado por ${channel}`);
    
    return message;
  }
}

// Crear instancias de servicios
const authService = new AuthService();
const notificationService = new NotificationService();

// Exportar todo de manera simple
export const dependencies = {
  // Repositorios
  repositories,
  
  // Servicios
  services: {
    auth: authService,
    notification: notificationService
  },
  
  // Utilidades
  utils: {
    logger,
    cache,
    eventBus,
    validator,
    ...utils
  }
};

// Función helper para obtener dependencias en los módulos
export function getDependencies() {
  return dependencies;
}