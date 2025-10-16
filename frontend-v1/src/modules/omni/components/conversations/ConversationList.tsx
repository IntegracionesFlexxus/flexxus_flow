/**
 * ConversationList Component
 * Lista de conversaciones con búsqueda y filtros
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { conversationService } from '../../services/conversationService';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import {
  Conversation,
  ConversationStatus,
  ConversationPriority,
  ConversationFilters
} from '../../types/conversation.types';
import { ChannelType } from '../../types/channel.types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  selectedConversationId?: string;
  filters?: ConversationFilters;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  selectedConversationId,
  filters: externalFilters
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ConversationPriority | 'all'>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // WebSocket context para actualizaciones en tiempo real
  const { lastConversation, lastMessage } = useWebSocketContext();

  // Construir filtros combinados
  const filters: ConversationFilters = {
    ...externalFilters,
    search: searchQuery || externalFilters?.search,
    status: statusFilter !== 'all' ? statusFilter : externalFilters?.status,
    priority: priorityFilter !== 'all' ? priorityFilter : externalFilters?.priority
  };

  // Query para obtener conversaciones
  const { data, isLoading } = useQuery({
    queryKey: ['conversations', filters],
    queryFn: () => conversationService.getConversations(filters),
    // Configuración para NO hacer polling - usar WebSocket para actualizaciones
    refetchInterval: false,           // Sin refetch automático
    refetchOnWindowFocus: false,      // No refetch al cambiar de pestaña
    refetchOnReconnect: false,        // No refetch al reconectar internet
    staleTime: Infinity,              // Los datos nunca son "stale" (WebSocket los actualiza)
    gcTime: 1000 * 60 * 30  // Mantener en cache 30 minutos
  });

  // Actualizar estado local cuando llegan datos
  useEffect(() => {
    if (data) {
      setConversations(data);
    }
  }, [data]);

  // Manejar actualizaciones de conversaciones por WebSocket
  useEffect(() => {
    if (!lastConversation) return;

    console.log('[ConversationList] Conversation update received:', lastConversation);

    setConversations(prev => {
      const index = prev.findIndex(c => c.id === lastConversation.id);

      if (index >= 0) {
        // Actualizar conversación existente
        const newConversations = [...prev];
        newConversations[index] = lastConversation;

        // Mover al principio si cambió last_message_at
        if (lastConversation.last_message_at) {
          newConversations.splice(index, 1);
          return [lastConversation, ...newConversations];
        }

        return newConversations;
      } else {
        // Agregar nueva conversación al principio
        return [lastConversation, ...prev];
      }
    });
  }, [lastConversation]);

  // Actualizar last_message_at cuando llega un mensaje nuevo
  useEffect(() => {
    if (!lastMessage) return;

    console.log('[ConversationList] Message update received:', lastMessage);

    setConversations(prev => {
      return prev.map(conv => {
        if (conv.id === lastMessage.conversation_id) {
          return {
            ...conv,
            last_message_at: lastMessage.created_at,
            // Incrementar unread_count si el mensaje es inbound
            unread_count: lastMessage.direction === 'inbound'
              ? (conv.unread_count || 0) + 1
              : conv.unread_count
          };
        }
        return conv;
      });
    });
  }, [lastMessage]);

  // Función para obtener el icono del canal
  const getChannelIcon = (channelType: string) => {
    switch (channelType.toLowerCase()) {
      case ChannelType.WHATSAPP:
        return <WhatsAppIcon sx={{ color: '#25D366' }} />;
      case ChannelType.EMAIL:
        return <EmailIcon sx={{ color: '#EA4335' }} />;
      case ChannelType.SMS:
        return <SmsIcon sx={{ color: '#4285F4' }} />;
      case ChannelType.INSTAGRAM:
        return <InstagramIcon sx={{ color: '#E4405F' }} />;
      case ChannelType.FACEBOOK:
        return <FacebookIcon sx={{ color: '#1877F2' }} />;
      default:
        return <PersonIcon />;
    }
  };

  // Función para obtener el color de prioridad
  const getPriorityColor = (priority: ConversationPriority) => {
    switch (priority) {
      case ConversationPriority.URGENT:
        return 'error';
      case ConversationPriority.HIGH:
        return 'warning';
      case ConversationPriority.NORMAL:
        return 'info';
      case ConversationPriority.LOW:
        return 'default';
      default:
        return 'default';
    }
  };

  // Función para obtener el color de estado
  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.OPEN:
        return 'success';
      case ConversationStatus.PENDING:
        return 'warning';
      case ConversationStatus.RESOLVED:
        return 'default';
      case ConversationStatus.ARCHIVED:
        return 'default';
      default:
        return 'default';
    }
  };

  // Formatear tiempo relativo
  const formatTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: es
      });
    } catch (error) {
      return date;
    }
  };

  return (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de búsqueda y filtros */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar conversaciones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 2 }}
        />

        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={statusFilter}
              label="Estado"
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value={ConversationStatus.OPEN}>Abierto</MenuItem>
              <MenuItem value={ConversationStatus.PENDING}>Pendiente</MenuItem>
              <MenuItem value={ConversationStatus.RESOLVED}>Resuelto</MenuItem>
              <MenuItem value={ConversationStatus.ARCHIVED}>Archivado</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
            <InputLabel>Prioridad</InputLabel>
            <Select
              value={priorityFilter}
              label="Prioridad"
              onChange={(e) => setPriorityFilter(e.target.value as any)}
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value={ConversationPriority.URGENT}>Urgente</MenuItem>
              <MenuItem value={ConversationPriority.HIGH}>Alta</MenuItem>
              <MenuItem value={ConversationPriority.NORMAL}>Normal</MenuItem>
              <MenuItem value={ConversationPriority.LOW}>Baja</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Lista de conversaciones */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : conversations.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No hay conversaciones
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {conversations.map((conversation) => (
              <ListItem
                key={conversation.id}
                disablePadding
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: selectedConversationId === conversation.id ? 'action.selected' : 'transparent'
                }}
              >
                <ListItemButton
                  onClick={() => onSelectConversation?.(conversation)}
                  sx={{ py: 2 }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conversation.unread_count}
                      color="primary"
                      overlap="circular"
                    >
                      <Avatar>
                        {getChannelIcon(conversation.channel_type)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: conversation.unread_count > 0 ? 700 : 400,
                            flex: 1
                          }}
                        >
                          {conversation.customer_first_name
                            ? `${conversation.customer_first_name}${conversation.customer_last_name ? ' ' + conversation.customer_last_name : ''}`
                            : 'Cliente desconocido'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {conversation.last_message_at
                            ? formatTimeAgo(conversation.last_message_at)
                            : formatTimeAgo(conversation.created_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem'
                          }}
                        >
                          {conversation.channel_type.toLowerCase() === 'whatsapp' && conversation.customer_phone
                            ? conversation.customer_phone
                            : conversation.channel_type.toLowerCase() === 'email' && conversation.customer_email
                            ? conversation.customer_email
                            : conversation.channel_name || conversation.channel_type}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={conversation.status}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: conversation.status === ConversationStatus.OPEN
                                ? '#c8e6c9' // Verde pastel
                                : conversation.status === ConversationStatus.PENDING
                                ? '#fff3cd' // Amarillo pastel
                                : conversation.status === ConversationStatus.RESOLVED
                                ? '#e0e0e0' // Gris claro pastel
                                : '#f5f5f5', // Gris muy claro para archived
                              color: conversation.status === ConversationStatus.OPEN
                                ? '#2e7d32' // Verde oscuro para texto
                                : conversation.status === ConversationStatus.PENDING
                                ? '#856404' // Amarillo oscuro para texto
                                : '#616161', // Gris oscuro para texto
                              border: 'none'
                            }}
                          />
                          {conversation.priority !== ConversationPriority.NORMAL && (
                            <Chip
                              label={conversation.priority}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: conversation.priority === ConversationPriority.URGENT
                                  ? '#ffcdd2' // Rojo pastel
                                  : conversation.priority === ConversationPriority.HIGH
                                  ? '#ffe0b2' // Naranja pastel
                                  : conversation.priority === ConversationPriority.LOW
                                  ? '#e1f5fe' // Azul claro pastel
                                  : '#e3f2fd', // Azul muy claro para normal (aunque no se muestra)
                                color: conversation.priority === ConversationPriority.URGENT
                                  ? '#c62828' // Rojo oscuro para texto
                                  : conversation.priority === ConversationPriority.HIGH
                                  ? '#e65100' // Naranja oscuro para texto
                                  : '#01579b', // Azul oscuro para texto
                                border: 'none'
                              }}
                            />
                          )}
                          {conversation.assigned_to && (
                            <Chip
                              label={conversation.agent_name || 'Asignado'}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: '#f3e5f5', // Púrpura muy claro pastel
                                color: '#6a1b9a', // Púrpura oscuro para texto
                                border: 'none'
                              }}
                            />
                          )}
                        </Box>
                      </Stack>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};
