/**
 * ConversationView Component
 * Vista principal que integra lista de conversaciones, mensajes e input
 */

import React, { useState } from 'react';
import { Box, Grid, Paper } from '@mui/material';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { Conversation } from '../../types/conversation.types';

interface ConversationViewProps {
  // Props opcionales para personalizar el comportamiento
  defaultConversationId?: string;
  showFilters?: boolean;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  defaultConversationId,
  showFilters = true
}) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      <Grid container sx={{ height: '100%' }}>
        {/* Lista de conversaciones - 30% */}
        <Grid item xs={12} md={4} lg={3} sx={{ height: '100%', borderRight: 1, borderColor: 'divider' }}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </Grid>

        {/* Área de mensajes - 70% */}
        <Grid item xs={12} md={8} lg={9} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header de conversación */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ fontWeight: 600 }}>
                    {selectedConversation.customer_first_name && selectedConversation.customer_last_name
                      ? `${selectedConversation.customer_first_name} ${selectedConversation.customer_last_name}`
                      : selectedConversation.customer_phone || selectedConversation.customer_email || selectedConversation.external_id || 'Cliente desconocido'}
                  </Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    {selectedConversation.channel_name || selectedConversation.channel_type}
                  </Box>
                </Box>
              </Paper>

              {/* Thread de mensajes */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <MessageThread conversationId={selectedConversation.id} />
              </Box>

              {/* Input de mensaje */}
              <MessageInput
                conversationId={selectedConversation.id}
                channelId={selectedConversation.channel_id}
                recipient={selectedConversation.external_id || selectedConversation.customer_phone || ''}
              />
            </>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary'
              }}
            >
              Selecciona una conversación para comenzar
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
