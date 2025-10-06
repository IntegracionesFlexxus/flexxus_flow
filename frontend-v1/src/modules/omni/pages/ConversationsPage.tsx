import {
  Box,
  Paper,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material'
import {
  Search as SearchIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Message as MessageIcon
} from '@mui/icons-material'

// Página de Conversaciones - Placeholder
function ConversationsPage() {
  // Mock data para demostración
  const conversations = [
    {
      id: '1',
      contact: 'Juan Pérez',
      channel: 'WhatsApp',
      lastMessage: 'Hola, necesito información sobre...',
      timestamp: '10:30 AM',
      unread: 2,
      status: 'active'
    },
    {
      id: '2',
      contact: 'María García',
      channel: 'Email',
      lastMessage: 'Gracias por la cotización',
      timestamp: '09:15 AM',
      unread: 0,
      status: 'closed'
    },
    {
      id: '3',
      contact: 'Carlos López',
      channel: 'SMS',
      lastMessage: '¿Cuándo pueden visitarme?',
      timestamp: 'Ayer',
      unread: 1,
      status: 'pending'
    }
  ]

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'WhatsApp':
        return <PhoneIcon />
      case 'Email':
        return <EmailIcon />
      case 'SMS':
        return <MessageIcon />
      default:
        return <MessageIcon />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'pending':
        return 'warning'
      case 'closed':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Conversaciones
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona todas tus conversaciones desde un solo lugar
      </Typography>

      <Grid container spacing={3}>
        {/* Lista de Conversaciones */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Búsqueda */}
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar conversaciones..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Divider />

            {/* Lista */}
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {conversations.map((conv) => (
                <ListItem
                  key={conv.id}
                  button
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>{conv.contact[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{conv.contact}</Typography>
                        <Chip
                          icon={getChannelIcon(conv.channel)}
                          label={conv.channel}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={conv.lastMessage}
                    secondaryTypographyProps={{
                      noWrap: true,
                    }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {conv.timestamp}
                    </Typography>
                    {conv.unread > 0 && (
                      <Chip
                        label={conv.unread}
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                    <Chip
                      label={conv.status}
                      size="small"
                      color={getStatusColor(conv.status) as any}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat / Conversación */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar>J</Avatar>
                <Box>
                  <Typography variant="subtitle1">Juan Pérez</Typography>
                  <Typography variant="caption" color="text.secondary">
                    WhatsApp • Activo hace 5 min
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Mensajes */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Chip label="Hoy" size="small" />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                Selecciona una conversación para ver los mensajes
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  TODO: Implementar vista de mensajes, envío de mensajes, adjuntos, etc.
                </Typography>
              </Box>
            </Box>

            {/* Input de mensaje */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <TextField
                fullWidth
                placeholder="Escribe un mensaje..."
                multiline
                maxRows={4}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton color="primary">
                        <SendIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ConversationsPage
