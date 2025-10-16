/**
 * Typing Indicator Component
 * Indicador de usuarios escribiendo
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTypingUsers } from '../../contexts/WebSocketContext';

interface TypingIndicatorProps {
  conversationId: string | undefined;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const typingUsers = useTypingUsers(conversationId);

  if (typingUsers.length === 0) {
    return null;
  }

  const getUsersText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} está escribiendo`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} y ${typingUsers[1].userName} están escribiendo`;
    }
    return `${typingUsers.length} personas están escribiendo`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: 1
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '3px',
          alignItems: 'center'
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#666',
              animation: 'bounce 1.4s infinite ease-in-out',
              animationDelay: `${i * 0.15}s`,
              '@keyframes bounce': {
                '0%, 80%, 100%': {
                  transform: 'scale(0)',
                  opacity: 0.5
                },
                '40%': {
                  transform: 'scale(1)',
                  opacity: 1
                }
              }
            }}
          />
        ))}
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: '#666',
          fontStyle: 'italic',
          fontSize: '0.875rem'
        }}
      >
        {getUsersText()}
      </Typography>
    </Box>
  );
}
