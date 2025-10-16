/**
 * Conversations Page
 * Página principal para gestionar conversaciones omnicanal
 */

import { Box, Typography } from '@mui/material';
import { ConversationView } from '../components/conversations';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { WebSocketIndicator } from '../components/common/WebSocketIndicator';
import { tokenService } from '@/shared/services/tokenService';

function ConversationsPage() {
  const token = tokenService.getAccessToken();
  const wsEnabled = import.meta.env.VITE_WEBSOCKET_ENABLED !== 'false';

  return (
    <WebSocketProvider token={token} enabled={wsEnabled}>
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Conversaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestiona todas tus conversaciones desde un solo lugar
            </Typography>
          </Box>

          {/* WebSocket Status Indicator */}
          {wsEnabled && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WebSocketIndicator showLabel size="small" />
            </Box>
          )}
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
