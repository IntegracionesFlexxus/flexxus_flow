/**
 * ChannelList Component
 * Lista de canales con gestión de estado usando React Query
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Fab,
  Skeleton,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChannelCard } from './ChannelCard';
import { channelService } from '../../services';
import { Channel } from '../../types';
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';

interface ChannelListProps {
  onConfigureChannel: (channel: Channel | null) => void;
  onAddChannel?: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  onConfigureChannel,
  onAddChannel
}) => {
  // Medir tiempo de montaje del componente
  const componentMountTime = React.useRef(Date.now());

  React.useEffect(() => {
    const mountDuration = Date.now() - componentMountTime.current;
    console.log('📦 [ChannelList] Componente montado en:', mountDuration, 'ms');
    console.log('⏰ [ChannelList] Timestamp de montaje:', new Date().toISOString());

    return () => {
      console.log('🔴 [ChannelList] Componente desmontado');
    };
  }, []);

  const queryClient = useQueryClient();
  const { currentCompany } = useAuthStore();
  const { addNotification } = useUIStore();
  const [togglingChannelId, setTogglingChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  // Log cuando currentCompany esté disponible
  React.useEffect(() => {
    if (currentCompany?.id) {
      console.log('✅ [ChannelList] currentCompany disponible:', currentCompany.id);
      console.log('⏱️ [ChannelList] Tiempo desde montaje hasta tener company:', Date.now() - componentMountTime.current, 'ms');
    } else {
      console.log('⏳ [ChannelList] Esperando currentCompany...');
    }
  }, [currentCompany]);

  // Verificar estado de enabled antes de la query
  const isQueryEnabled = !!currentCompany?.id;
  React.useEffect(() => {
    console.log('🔑 [ChannelList] Query enabled status:', isQueryEnabled);
    if (isQueryEnabled) {
      console.log('✅ [ChannelList] Query HABILITADA - la query puede ejecutarse');
    } else {
      console.log('⛔ [ChannelList] Query DESHABILITADA - esperando currentCompany');
    }
  }, [isQueryEnabled]);

  // Query para obtener canales
  const {
    data: channels = [],
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['channels', currentCompany?.id],
    queryFn: async () => {
      const queryStartTime = Date.now();
      const timeSinceMount = Date.now() - componentMountTime.current;
      console.log('⏱️ [ChannelList useQuery] Query function starting at:', new Date().toISOString());
      console.log('⏰ [ChannelList useQuery] Tiempo desde montaje del componente:', timeSinceMount, 'ms');
      console.log('🔍 [ChannelList useQuery] Current company:', currentCompany?.id);

      try {
        const serviceStartTime = Date.now();
        const result = await channelService.getChannels(currentCompany?.id);
        const serviceEndTime = Date.now();

        console.log('✅ [ChannelList useQuery] Service call took:', serviceEndTime - serviceStartTime, 'ms');

        const totalTime = Date.now() - queryStartTime;
        console.log('🏁 [ChannelList useQuery] Total query time:', totalTime, 'ms');
        console.log('📊 [ChannelList useQuery] Channels loaded:', result?.length || 0);
        console.log('⏰ [ChannelList useQuery] Tiempo total desde montaje:', Date.now() - componentMountTime.current, 'ms');

        return result || [];
      } catch (err) {
        const errorTime = Date.now() - queryStartTime;
        console.error('❌ [ChannelList useQuery] Error after', errorTime, 'ms:', err);
        return [];
      }
    },
    enabled: isQueryEnabled,
    refetchInterval: 60000, // Refrescar cada minuto
    retry: 1, // Reducir reintentos para fallar más rápido
    retryDelay: 1000,
    // REMOVED: initialData - Esto causaba que React Query esperara 60s antes de ejecutar
    // La query ahora se ejecuta INMEDIATAMENTE cuando enabled=true
    onError: (err) => {
      console.error('❌ [ChannelList useQuery] Query error:', err);
    }
  });

  // Log de cambios en el estado de la query
  React.useEffect(() => {
    console.log('📊 [ChannelList] Query state changed:', {
      isLoading,
      isFetching,
      hasData: channels.length > 0,
      hasError: !!error
    });
  }, [isLoading, isFetching, channels.length, error]);

  // Mutation para toggle de activación
  const toggleMutation = useMutation({
    mutationFn: async ({ channel }: { channel: Channel }) => {
      setTogglingChannelId(channel.id);
      return channelService.toggleChannel(channel.id, !channel.is_active);
    },
    onSuccess: (updatedChannel, { channel }) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      addNotification({
        type: 'success',
        title: `Canal ${updatedChannel.is_active ? 'activado' : 'desactivado'}`,
        message: `${updatedChannel.name} se ha ${updatedChannel.is_active ? 'activado' : 'desactivado'} correctamente`
      });
    },
    onError: (error: any, { channel }) => {
      addNotification({
        type: 'error',
        title: 'Error al cambiar estado del canal',
        message: error.response?.data?.message || error.message || 'Ocurrió un error inesperado'
      });
    },
    onSettled: () => {
      setTogglingChannelId(null);
    }
  });

  // Mutation para eliminar canal
  const deleteMutation = useMutation({
    mutationFn: async (channel: Channel) => {
      setDeletingChannelId(channel.id);
      if (window.confirm(`¿Estás seguro de eliminar el canal "${channel.name}"? Esta acción no se puede deshacer.`)) {
        return channelService.deleteChannel(channel.id);
      }
      throw new Error('Eliminación cancelada');
    },
    onSuccess: (_, channel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      addNotification({
        type: 'success',
        title: 'Canal eliminado',
        message: `${channel.name} se ha eliminado correctamente`
      });
    },
    onError: (error: any) => {
      if (error.message !== 'Eliminación cancelada') {
        addNotification({
          type: 'error',
          title: 'Error al eliminar canal',
          message: error.response?.data?.message || error.message || 'No se pudo eliminar el canal'
        });
      }
    },
    onSettled: () => {
      setDeletingChannelId(null);
    }
  });

  // Mutation para verificar salud
  const healthCheckMutation = useMutation({
    mutationFn: (channel: Channel) => channelService.checkHealth(channel.id),
    onSuccess: (result, channel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      addNotification({
        type: result.healthy ? 'success' : 'warning',
        title: 'Estado de salud actualizado',
        message: `${channel.name}: ${result.status || (result.healthy ? 'Funcionando correctamente' : 'Requiere atención')}`
      });
    },
    onError: (error: any, channel) => {
      addNotification({
        type: 'error',
        title: 'Error al verificar salud',
        message: `No se pudo verificar el estado de ${channel.name}`
      });
    }
  });

  // Mutation para probar conexión
  const testConnectionMutation = useMutation({
    mutationFn: async (channel: Channel) => {
      setTestingChannelId(channel.id);
      return channelService.testConnection(channel.id);
    },
    onSuccess: (result, channel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      addNotification({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Conexión exitosa' : 'Error en conexión',
        message: result.message || (result.success ? 'El canal está funcionando correctamente' : 'No se pudo conectar al canal'),
        autoClose: !result.success ? false : true
      });

      // Log details for debugging
      if (result.details) {
        console.log('Test details:', result.details);
      }
    },
    onError: (error: any, channel) => {
      addNotification({
        type: 'error',
        title: 'Error al probar conexión',
        message: `No se pudo probar el canal ${channel.name}`
      });
    },
    onSettled: () => {
      setTestingChannelId(null);
    }
  });

  // Handlers
  const handleToggleChannel = (channel: Channel) => {
    toggleMutation.mutate({ channel });
  };

  const handleDeleteChannel = (channel: Channel) => {
    deleteMutation.mutate(channel);
  };

  const handleRefreshHealth = (channel: Channel) => {
    healthCheckMutation.mutate(channel);
  };

  const handleTestConnection = (channel: Channel) => {
    testConnectionMutation.mutate(channel);
  };

  const handleRefreshAll = () => {
    refetch();
  };

  // Estados de carga
  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Estado de error - pero mostrar opción de crear canal
  if (error && !channels.length) {
    return (
      <Box>
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">
            <AlertTitle>No se pudieron cargar los canales</AlertTitle>
            {(error as any)?.message || 'Ocurrió un error al cargar los canales existentes'}
            <Button size="small" onClick={handleRefreshAll} sx={{ ml: 2 }}>
              Reintentar
            </Button>
          </Alert>

          {/* Mostrar opción de crear canal incluso con error */}
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Puedes crear tu primer canal
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Comienza agregando un canal de comunicación para empezar a recibir mensajes
            </Typography>
            {onAddChannel && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAddChannel}
                size="large"
              >
                Crear Primer Canal
              </Button>
            )}
          </Box>
        </Box>

        {/* FAB también visible en error */}
        {onAddChannel && (
          <Fab
            color="primary"
            aria-label="add channel"
            onClick={onAddChannel}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>
    );
  }

  // Estado vacío
  if (channels.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            No hay canales configurados
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Comienza agregando tu primer canal de comunicación para empezar a recibir mensajes
            de tus clientes.
          </Typography>
          {onAddChannel && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddChannel}
              sx={{ mt: 2 }}
            >
              Agregar Canal
            </Button>
          )}
        </Paper>
      </Box>
    );
  }

  // Lista de canales
  return (
    <Box>
      {/* Header con acciones */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h5">
          Canales de Comunicación ({channels.length})
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={isFetching ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefreshAll}
            disabled={isFetching}
          >
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* Grid de canales */}
      <Grid container spacing={3}>
        {channels.map((channel) => (
          <Grid item xs={12} sm={6} md={4} key={channel.id}>
            <ChannelCard
              channel={channel}
              onToggle={handleToggleChannel}
              onConfigure={onConfigureChannel}
              onDelete={handleDeleteChannel}
              onRefreshHealth={handleRefreshHealth}
              onTestConnection={handleTestConnection}
              isToggling={togglingChannelId === channel.id}
              isDeleting={deletingChannelId === channel.id}
              isTesting={testingChannelId === channel.id}
            />
          </Grid>
        ))}
      </Grid>

      {/* FAB para agregar canal */}
      {onAddChannel && (
        <Fab
          color="primary"
          aria-label="add channel"
          onClick={onAddChannel}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};