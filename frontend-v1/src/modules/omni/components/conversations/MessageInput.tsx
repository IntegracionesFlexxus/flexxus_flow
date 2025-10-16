/**
 * MessageInput Component
 * Input para enviar mensajes con soporte para archivos adjuntos
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Chip,
  Stack,
  Paper
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  EmojiEmotions as EmojiIcon
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../../services/messageService';
import { MessageContentType, MessageSenderType, MessageDirection } from '../../types/message.types';
import { useNotifications } from '@/shared/hooks/useNotifications';

interface MessageInputProps {
  conversationId: string;
  channelId?: string;
  recipient: string;
  onMessageSent?: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  channelId,
  recipient,
  onMessageSent,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachMenuAnchor, setAttachMenuAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  // Mutation para enviar mensaje
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (selectedFile) {
        // Enviar mensaje con archivo
        return messageService.sendMessageWithMedia(conversationId, message, selectedFile);
      } else {
        // Enviar mensaje de texto
        return messageService.sendMessage({
          conversation_id: conversationId,
          channel_id: channelId,
          recipient,
          content: message,
          content_type: MessageContentType.TEXT,
          sender_type: MessageSenderType.AGENT,
          direction: MessageDirection.OUTBOUND
        });
      }
    },
    onSuccess: () => {
      // Limpiar input
      setMessage('');
      setSelectedFile(null);

      // Invalidar cache de mensajes para refrescar
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });

      // Callback si existe
      onMessageSent?.();

      addNotification({
        type: 'success',
        title: 'Mensaje enviado',
        message: 'El mensaje se envió correctamente'
      });
    },
    onError: (error: any) => {
      console.error('Error enviando mensaje:', error);
      addNotification({
        type: 'error',
        title: 'Error al enviar mensaje',
        message: error.response?.data?.message || error.message || 'No se pudo enviar el mensaje'
      });
    }
  });

  // Manejar envío del mensaje
  const handleSend = () => {
    if (!message.trim() && !selectedFile) return;
    if (sendMessageMutation.isPending) return;

    sendMessageMutation.mutate();
  };

  // Manejar presión de tecla Enter
  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Abrir menú de adjuntos
  const handleAttachClick = (event: React.MouseEvent<HTMLElement>) => {
    setAttachMenuAnchor(event.currentTarget);
  };

  // Cerrar menú de adjuntos
  const handleAttachClose = () => {
    setAttachMenuAnchor(null);
  };

  // Seleccionar tipo de archivo
  const handleFileTypeSelect = (accept: string) => {
    handleAttachClose();
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  // Manejar selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 10MB por ejemplo)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        addNotification({
          type: 'error',
          title: 'Archivo muy grande',
          message: 'El archivo no debe superar los 10MB'
        });
        return;
      }

      setSelectedFile(file);
    }
    // Limpiar input para poder seleccionar el mismo archivo de nuevo
    event.target.value = '';
  };

  // Quitar archivo seleccionado
  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  // Obtener icono del tipo de archivo
  const getFileIcon = () => {
    if (!selectedFile) return <FileIcon />;

    const type = selectedFile.type;
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type.startsWith('video/')) return <VideoIcon />;
    if (type.startsWith('audio/')) return <AudioIcon />;
    return <FileIcon />;
  };

  // Formatear tamaño del archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      {/* Preview del archivo seleccionado */}
      {selectedFile && (
        <Box sx={{ mb: 1 }}>
          <Chip
            icon={getFileIcon()}
            label={`${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
            onDelete={handleRemoveFile}
            deleteIcon={<CloseIcon />}
            size="small"
            sx={{ maxWidth: '100%' }}
          />
        </Box>
      )}

      {/* Input de mensaje */}
      <Stack direction="row" spacing={1} alignItems="flex-end">
        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Botón de adjuntar */}
        <Tooltip title="Adjuntar archivo">
          <IconButton
            onClick={handleAttachClick}
            disabled={disabled || sendMessageMutation.isPending}
            size="small"
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>

        {/* Campo de texto */}
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Escribe un mensaje..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || sendMessageMutation.isPending}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3
            }
          }}
        />

        {/* Botón de enviar */}
        <Tooltip title="Enviar mensaje">
          <span>
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={disabled || sendMessageMutation.isPending || (!message.trim() && !selectedFile)}
            >
              {sendMessageMutation.isPending ? (
                <CircularProgress size={24} />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Menú de tipos de adjuntos */}
      <Menu
        anchorEl={attachMenuAnchor}
        open={Boolean(attachMenuAnchor)}
        onClose={handleAttachClose}
      >
        <MenuItem onClick={() => handleFileTypeSelect('image/*')}>
          <ListItemIcon>
            <ImageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Imagen</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFileTypeSelect('video/*')}>
          <ListItemIcon>
            <VideoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Video</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFileTypeSelect('audio/*')}>
          <ListItemIcon>
            <AudioIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Audio</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFileTypeSelect('*')}>
          <ListItemIcon>
            <FileIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Documento</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
};
