/**
 * Conversations Page
 * Página principal para gestionar conversaciones omnicanal
 */

import { Box, Typography } from '@mui/material';
import { ConversationView } from '../components/conversations';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { tokenService } from '@/shared/services/tokenService';

function ConversationsPage() {
  const token = tokenService.getAccessToken();

  return (
    <WebSocketProvider token={token} enabled={import.meta.env.VITE_WEBSOCKET_ENABLED !== 'false'}>
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Conversaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona todas tus conversaciones desde un solo lugar
          </Typography>
        </Box>

        {/* Vista de conversaciones */}
        <Box sx={{ flex: 1, overflow: 'hidden', px: 3, pb: 3 }}>
          <ConversationView />
        </Box>
      </Box>
    </WebSocketProvider>
  );
}

export default ConversationsPage;
