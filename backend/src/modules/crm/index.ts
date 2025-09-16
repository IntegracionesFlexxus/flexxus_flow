import { Router } from 'express';
import { getDependencies } from '@shared/dependencies';

const router = Router();
const { repositories, utils } = getDependencies();

// Rutas básicas de CRM
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await repositories.contact.findAll();
    
    utils.logger.info('Listando contactos');
    res.json(utils.apiResponse(true, contacts));
  } catch (error) {
    utils.logger.error('Error obteniendo contactos:', error);
    res.status(500).json(
      utils.apiResponse(false, null, 'Error al obtener contactos')
    );
  }
});

router.get('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await repositories.contact.findById(id);
    
    if (!contact) {
      return res.status(404).json(
        utils.apiResponse(false, null, 'Contacto no encontrado')
      );
    }
    
    res.json(utils.apiResponse(true, contact));
  } catch (error) {
    utils.logger.error('Error obteniendo contacto:', error);
    res.status(500).json(
      utils.apiResponse(false, null, 'Error al obtener contacto')
    );
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const contactData = req.body;
    
    // Validación básica
    if (!contactData.name || !contactData.email) {
      return res.status(400).json(
        utils.apiResponse(false, null, 'Nombre y email son requeridos')
      );
    }
    
    // Validar email
    if (!utils.validator.isEmail(contactData.email)) {
      return res.status(400).json(
        utils.apiResponse(false, null, 'Email inválido')
      );
    }
    
    // Validar teléfono si existe
    if (contactData.phone && !utils.validator.isPhone(contactData.phone)) {
      return res.status(400).json(
        utils.apiResponse(false, null, 'Teléfono inválido')
      );
    }
    
    const newContact = await repositories.contact.create(contactData);
    
    utils.logger.info(`Contacto creado: ${newContact.id}`);
    res.status(201).json(
      utils.apiResponse(true, newContact, 'Contacto creado exitosamente')
    );
  } catch (error) {
    utils.logger.error('Error creando contacto:', error);
    res.status(500).json(
      utils.apiResponse(false, null, 'Error al crear contacto')
    );
  }
});

// Endpoint de status del módulo
router.get('/status', (req, res) => {
  res.json({ 
    module: 'crm',
    status: 'active',
    message: 'Módulo CRM funcionando'
  });
});

export default router;