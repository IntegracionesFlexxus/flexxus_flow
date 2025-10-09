/**
 * ChannelsPage Component
 * Página principal de gestión de canales de comunicación
 * Integrada con backend y componentes de Fase 2
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { ChannelList, ChannelConfigModal } from '../components/channels';
import { Channel, ChannelType } from '../types';
import { useUIStore } from '@/shared/store/uiStore';
import { useAuthStore } from '@/shared/store/authStore';

function ChannelsPage() {
  // Medir tiempo de montaje de la página
  const pageLoadTime = React.useRef(Date.now());

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [newChannelModalOpen, setNewChannelModalOpen] = useState(false);
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null);
  const { addNotification } = useUIStore();
  const { currentCompany, user } = useAuthStore();

  // Log cuando se monta la página
  useEffect(() => {
    const mountDuration = Date.now() - pageLoadTime.current;
    console.log('═══════════════════════════════════════════════════════');
    console.log('📄 [ChannelsPage] PÁGINA MONTADA');
    console.log('⏱️  Tiempo de montaje:', mountDuration, 'ms');
    console.log('⏰  Timestamp:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════');

    return () => {
      console.log('🔴 [ChannelsPage] Página desmontada');
    };
  }, []);

  // Debug: Log company info
  useEffect(() => {
    console.log('🏢 [ChannelsPage] Current Company:', currentCompany);
    console.log('👤 [ChannelsPage] User:', user);
    if (!currentCompany) {
      console.warn('⚠️  [ChannelsPage] No company selected!');
    } else {
      const timeSinceMount = Date.now() - pageLoadTime.current;
      console.log('⏱️  [ChannelsPage] Tiempo desde montaje hasta tener company:', timeSinceMount, 'ms');
    }
  }, [currentCompany, user]);

  // Handler para abrir modal de configuración
  const handleConfigureChannel = (channel: Channel | null) => {
    setSelectedChannel(channel);
    setConfigModalOpen(true);
  };

  // Handler para agregar nuevo canal
  const handleAddChannel = () => {
    setNewChannelModalOpen(true);
  };

  // Handler para seleccionar tipo de canal y abrir configuración
  const handleSelectChannelType = () => {
    if (!selectedChannelType) {
      addNotification({
        type: 'warning',
        title: 'Selecciona un tipo de canal',
        message: 'Debes seleccionar el tipo de canal que deseas configurar'
      });
      return;
    }

    setNewChannelModalOpen(false);
    setSelectedChannel(null);
    setConfigModalOpen(true);
  };

  // Handler cuando se guarda un canal
  const handleChannelSaved = (channel: Channel) => {
    addNotification({
      type: 'success',
      title: channel.id ? 'Canal actualizado' : 'Canal creado',
      message: `${channel.name} se ha configurado correctamente`
    });
    setConfigModalOpen(false);
    setSelectedChannelType(null);
  };

  // Handler cuando se cierra el modal de configuración
  const handleCloseConfigModal = () => {
    setConfigModalOpen(false);
    setSelectedChannel(null);
    setSelectedChannelType(null);
  };

  // Validación: Si no hay empresa seleccionada
  if (!currentCompany) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" icon={<BusinessIcon />}>
          <AlertTitle>Selecciona una Empresa</AlertTitle>
          Por favor selecciona una empresa para gestionar los canales de comunicación.
          {user && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Usuario actual: {user.email}
              </Typography>
            </Box>
          )}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Canales de Comunicación
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configura y gestiona todos tus canales de comunicación con clientes
        </Typography>
        {/* Debug info - remover en producción */}
        {process.env.NODE_ENV === 'development' && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Empresa: {currentCompany.name} (ID: {currentCompany.id})
          </Typography>
        )}
      </Box>

      {/* Lista de canales */}
      <ChannelList
        onConfigureChannel={handleConfigureChannel}
        onAddChannel={handleAddChannel}
      />

      {/* Sección de configuración global */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuración Global
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Estas configuraciones aplican a todos los canales
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Respuestas automáticas"
              secondary="Configura respuestas automáticas para cuando estés fuera de horario"
            />
            <ListItemSecondaryAction>
              <Button
                variant="outlined"
                size="small"
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Próximamente',
                  message: 'Esta funcionalidad estará disponible pronto'
                })}
              >
                Configurar
              </Button>
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Horarios de atención"
              secondary="Define los horarios en los que tu equipo está disponible"
            />
            <ListItemSecondaryAction>
              <Button
                variant="outlined"
                size="small"
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Próximamente',
                  message: 'Esta funcionalidad estará disponible pronto'
                })}
              >
                Configurar
              </Button>
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Asignación automática"
              secondary="Configura reglas para asignar conversaciones automáticamente"
            />
            <ListItemSecondaryAction>
              <Button
                variant="outlined"
                size="small"
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Próximamente',
                  message: 'Esta funcionalidad estará disponible pronto'
                })}
              >
                Configurar
              </Button>
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Plantillas de mensajes"
              secondary="Crea plantillas reutilizables para respuestas rápidas"
            />
            <ListItemSecondaryAction>
              <Button
                variant="outlined"
                size="small"
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Próximamente',
                  message: 'Esta funcionalidad estará disponible pronto'
                })}
              >
                Configurar
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>

      {/* Modal para seleccionar tipo de canal */}
      <Dialog
        open={newChannelModalOpen}
        onClose={() => setNewChannelModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Agregar Nuevo Canal
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Selecciona el tipo de canal que deseas configurar
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Tipo de Canal</InputLabel>
            <Select
              value={selectedChannelType || ''}
              label="Tipo de Canal"
              onChange={(e) => setSelectedChannelType(e.target.value as ChannelType)}
            >
              <MenuItem value={ChannelType.WHATSAPP}>
                WhatsApp Business
              </MenuItem>
              <MenuItem value={ChannelType.EMAIL}>
                Email
              </MenuItem>
              <MenuItem value={ChannelType.SMS}>
                SMS
              </MenuItem>
              <MenuItem value={ChannelType.INSTAGRAM}>
                Instagram Direct
              </MenuItem>
              <MenuItem value={ChannelType.FACEBOOK}>
                Facebook Messenger
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChannelModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSelectChannelType}
            disabled={!selectedChannelType}
            startIcon={<AddIcon />}
          >
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de configuración de canal */}
      <ChannelConfigModal
        open={configModalOpen}
        channel={selectedChannel}
        isNewChannel={!selectedChannel}
        channelType={selectedChannelType || undefined}
        onClose={handleCloseConfigModal}
        onSave={handleChannelSaved}
      />
    </Box>
  );
}

export default ChannelsPage;