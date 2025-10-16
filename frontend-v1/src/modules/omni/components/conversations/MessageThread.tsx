/**
 * MessageThread Component
 * Vista de mensajes de una conversación con scroll automático
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Stack,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Link
} from '@mui/material';
import {
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as FileIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { messageService } from '../../services/messageService';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import {
  Message,
  MessageDirection,
  MessageStatus,
  MessageContentType
} from '../../types/message.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessageThreadProps {
  conversationId: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // WebSocket context para mensajes en tiempo real
  const { lastMessage, joinConversation, leaveConversation } = useWebSocketContext();

  // Query para obtener mensajes iniciales
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messageService.getConversationMessages(conversationId),
    enabled: !!conversationId
  });

  // Actualizar estado local cuando llegan datos iniciales
  useEffect(() => {
    if (data) {
      console.log('[MessageThread] Setting initial messages:', data.length);
      setMessages(data);
      if (autoScroll) {
        scrollToBottom();
      }
    }
  }, [data, autoScroll]);

  // Unirse/salir de la sala WebSocket
  useEffect(() => {
    if (conversationId) {
      console.log('[MessageThread] Joining conversation:', conversationId);
      joinConversation(conversationId);

      return () => {
        console.log('[MessageThread] Leaving conversation:', conversationId);
        leaveConversation(conversationId);
      };
    }
  }, [conversationId, joinConversation, leaveConversation]);

  // Escuchar mensajes nuevos por WebSocket
  useEffect(() => {
    if (!lastMessage || lastMessage.conversation_id !== conversationId) {
      return;
    }

    console.log('[MessageThread] New message received via WebSocket:', lastMessage);

    setMessages(prev => {
      // Evitar duplicados
      if (prev.some(m => m.id === lastMessage.id)) {
        console.log('[MessageThread] Duplicate message, ignoring');
        return prev;
      }

      console.log('[MessageThread] Adding new message to thread');
      return [...prev, lastMessage];
    });

    // Auto scroll si está en el fondo
    if (autoScroll) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [lastMessage, conversationId, autoScroll]);

  // Detectar si el usuario está scrolleando manualmente
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll al fondo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Obtener icono de estado del mensaje
  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case MessageStatus.PENDING:
        return <ScheduleIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
      case MessageStatus.SENT:
        return <DoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
      case MessageStatus.DELIVERED:
        return <DoneAllIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
      case MessageStatus.READ:
        return <DoneAllIcon fontSize="small" sx={{ color: 'primary.main' }} />;
      case MessageStatus.FAILED:
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return null;
    }
  };

  // Obtener icono de tipo de contenido
  const getContentTypeIcon = (contentType: MessageContentType) => {
    switch (contentType) {
      case MessageContentType.IMAGE:
        return <ImageIcon />;
      case MessageContentType.VIDEO:
        return <VideoIcon />;
      case MessageContentType.AUDIO:
        return <AudioIcon />;
      case MessageContentType.DOCUMENT:
        return <FileIcon />;
      case MessageContentType.LOCATION:
        return <LocationIcon />;
      default:
        return null;
    }
  };

  // Renderizar contenido del mensaje según tipo
  const renderMessageContent = (message: Message) => {
    switch (message.content_type) {
      case MessageContentType.IMAGE:
        return (
          <Box>
            {message.content && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {message.content}
              </Typography>
            )}
            {message.media_url && (
              <Box
                component="img"
                src={message.media_url}
                alt="Imagen"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 1,
                  cursor: 'pointer'
                }}
                onClick={() => window.open(message.media_url, '_blank')}
              />
            )}
          </Box>
        );

      case MessageContentType.VIDEO:
        return (
          <Box>
            {message.content && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {message.content}
              </Typography>
            )}
            {message.media_url && (
              <video
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 4
                }}
              >
                <source src={message.media_url} type={message.media_type || 'video/mp4'} />
                Tu navegador no soporta el tag de video.
              </video>
            )}
          </Box>
        );

      case MessageContentType.AUDIO:
        return (
          <Box>
            {message.content && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {message.content}
              </Typography>
            )}
            {message.media_url && (
              <audio controls style={{ width: '100%' }}>
                <source src={message.media_url} type={message.media_type || 'audio/mpeg'} />
                Tu navegador no soporta el tag de audio.
              </audio>
            )}
          </Box>
        );

      case MessageContentType.DOCUMENT:
        return (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <FileIcon />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  {message.content || 'Documento'}
                </Typography>
                {message.metadata?.fileName && (
                  <Typography variant="caption" color="text.secondary">
                    {message.metadata.fileName}
                  </Typography>
                )}
              </Box>
              {message.media_url && (
                <IconButton
                  size="small"
                  component="a"
                  href={message.media_url}
                  download
                  target="_blank"
                >
                  <DownloadIcon />
                </IconButton>
              )}
            </Stack>
          </Box>
        );

      case MessageContentType.LOCATION:
        return (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocationIcon />
              <Typography variant="body2">
                {message.content || 'Ubicación compartida'}
              </Typography>
            </Stack>
            {message.metadata?.latitude && message.metadata?.longitude && (
              <Link
                href={`https://www.google.com/maps?q=${message.metadata.latitude},${message.metadata.longitude}`}
                target="_blank"
                sx={{ display: 'block', mt: 1 }}
              >
                Ver en Google Maps
              </Link>
            )}
          </Box>
        );

      case MessageContentType.TEXT:
      default:
        return (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        );
    }
  };

  // Formatear fecha/hora
  const formatTime = (date: string) => {
    try {
      return format(new Date(date), 'HH:mm', { locale: es });
    } catch (error) {
      return '';
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd 'de' MMMM, yyyy", { locale: es });
    } catch (error) {
      return '';
    }
  };

  // Agrupar mensajes por fecha
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const dateKey = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const messagesByDate = groupMessagesByDate(messages);

  if (!conversationId) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Selecciona una conversación para ver los mensajes
        </Typography>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Área de mensajes */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'grey.50'
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No hay mensajes en esta conversación
            </Typography>
          </Box>
        ) : (
          <>
            {Object.entries(messagesByDate).map(([dateKey, dateMessages]) => (
              <Box key={dateKey}>
                {/* Separador de fecha */}
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <Chip
                    label={formatDate(dateMessages[0].created_at)}
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                  />
                </Box>

                {/* Mensajes del día */}
                {dateMessages.map((message) => {
                  const isInbound = message.direction === MessageDirection.INBOUND;
                  const isOutbound = message.direction === MessageDirection.OUTBOUND;

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '70%',
                          display: 'flex',
                          gap: 1,
                          flexDirection: isOutbound ? 'row-reverse' : 'row'
                        }}
                      >
                        {/* Avatar */}
                        {isInbound && (
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {message.sender_name?.[0] || 'C'}
                          </Avatar>
                        )}

                        {/* Burbuja de mensaje */}
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            bgcolor: isOutbound ? 'primary.main' : 'background.paper',
                            color: isOutbound ? 'primary.contrastText' : 'text.primary',
                            borderRadius: 2,
                            ...(isOutbound && {
                              borderBottomRightRadius: 4
                            }),
                            ...(isInbound && {
                              borderBottomLeftRadius: 4
                            })
                          }}
                        >
                          {/* Contenido del mensaje */}
                          {renderMessageContent(message)}

                          {/* Información del mensaje */}
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            justifyContent="flex-end"
                            sx={{ mt: 0.5 }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: isOutbound ? 'primary.contrastText' : 'text.secondary',
                                opacity: 0.7,
                                fontSize: '0.7rem'
                              }}
                            >
                              {formatTime(message.created_at)}
                            </Typography>

                            {/* Icono de estado (solo para mensajes salientes, excepto cuando falla) */}
                            {isOutbound && message.status !== MessageStatus.FAILED && (
                              <Tooltip title={message.status}>
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                                  {getStatusIcon(message.status)}
                                </Box>
                              </Tooltip>
                            )}

                            {/* Botón de reintentar si falló */}
                            {message.status === MessageStatus.FAILED && (
                              <Tooltip title="Reintentar">
                                <IconButton
                                  size="small"
                                  onClick={() => messageService.retryMessage(message.id)}
                                  sx={{ ml: 0.5, color: 'error.main' }}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>

                          {/* Mensaje de error */}
                          {message.error_message && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{ display: 'block', mt: 0.5 }}
                            >
                              {message.error_message}
                            </Typography>
                          )}
                        </Paper>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))}

            {/* Referencia para auto-scroll */}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>
    </Paper>
  );
};
