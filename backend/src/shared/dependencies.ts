// Sistema de dependencias simple para módulos CRM y Omni
// Contiene solo los repositorios que no existen en otros lugares
import { dbPools } from '@/shared/database';
import { logger, cache, eventBus, validator, utils } from '@/shared/services';
// Repositorios específicos para CRM y Omni
class ContactRepository {
  private db = dbPools.crm;
  async findAll() {
    // [MOCK] Query simplificado para desarrollo
    logger.debug('Obteniendo todos los contactos');
    return [
      { id: '1', name: 'Juan Pérez', email: 'juan@example.com' },
      { id: '2', name: 'María García', email: 'maria@example.com' }
    ];
  }
  async findById(id: string) {
    // [MOCK] Query simplificado para desarrollo
    logger.debug(`Buscando contacto por ID: ${id}`);
    return {
      id,
      name: 'Test Contact',
      email: 'contact@example.com',
      phone: '+56912345678'
    };
  }
  async create(contactData: any) {
    // [MOCK] Insert simplificado para desarrollo
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
    // [MOCK] Insert simplificado para desarrollo
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
    // [MOCK] Query simplificado para desarrollo
    logger.debug(`Buscando mensajes de conversación: ${conversationId}`);
    return [];
  }
}
// Crear instancias únicas (singleton manual)
const repositories = {
  contact: new ContactRepository(),
  message: new MessageRepository()
};
// Exportar solo lo necesario para CRM y Omni
export const dependencies = {
  // Repositorios
  repositories,
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
