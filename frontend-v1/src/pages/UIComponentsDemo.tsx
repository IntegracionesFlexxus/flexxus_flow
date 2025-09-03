import { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  SuccessButton,
  Input,
  PasswordInput,
  SearchInput,
  Card,
  StatCard,
  InfoCard,
  Modal,
  ConfirmModal,
  InfoModal,
  Spinner,
  CenteredLoading,
  LoadingOverlay,
  ProgressBar,
  ContentSkeleton,
  Alert,
  Toast,
  useToast,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  DashboardIcon,
  PeopleIcon,
  TrendingUpIcon,
  EmailIcon
} from '@/components/ui'

// Página de demostración de componentes UI - MVP
// TODO: En Nivel 2 convertir en Storybook

function UIComponentsDemo() {
  // Estados para demos interactivos
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [search, setSearch] = useState('')
  const { showToast, ToastComponent } = useToast()

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        UI Component Library Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Biblioteca de componentes UI para MVP - Nivel 1
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* Botones */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>Botones</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <PrimaryButton>Primary</PrimaryButton>
              <SecondaryButton>Secondary</SecondaryButton>
              <SuccessButton>Success</SuccessButton>
              <DangerButton>Danger</DangerButton>
              <Button disabled>Disabled</Button>
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Con Loading</Typography>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Switch checked={loading} onChange={(e) => setLoading(e.target.checked)} />}
                label="Toggle Loading"
              />
              <PrimaryButton loading={loading}>Loading Button</PrimaryButton>
              <SecondaryButton loading={loading} size="small">Small</SecondaryButton>
              <SuccessButton loading={loading} size="large">Large</SuccessButton>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Inputs */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>Inputs</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Input
              label="Input básico"
              placeholder="Escribe algo..."
              helperText="Texto de ayuda"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Mínimo 8 caracteres"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Cards */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>Cards</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card
              title="Card Simple"
              subtitle="Con subtítulo"
              clickable
            >
              <Typography variant="body2">
                Este es el contenido del card. Puede contener cualquier elemento.
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Usuarios Activos"
              value="1,234"
              subtitle="+12% vs mes anterior"
              icon={<PeopleIcon />}
              color="primary"
              onClick={() => showToast('Card clickeado!', 'info')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Ingresos"
              value="$45,678"
              subtitle="+25% crecimiento"
              icon={<TrendingUpIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12}>
            <InfoCard title="Información">
              <Typography>
                Esta es una tarjeta de información con estilo especial.
              </Typography>
            </InfoCard>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Loading States */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>Loading States</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card title="Spinner">
              <Stack spacing={2} alignItems="center">
                <Spinner />
                <Spinner size={20} color="secondary" />
                <Spinner size={60} color="success" />
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card title="Progress Bar">
              <Stack spacing={2}>
                <ProgressBar />
                <ProgressBar variant="determinate" value={65} showLabel />
              </Stack>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card title="Skeleton">
              <ContentSkeleton lines={3} showAvatar />
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card title="Centered Loading">
              <CenteredLoading message="Cargando datos..." />
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setOverlayOpen(true)}
          >
            Mostrar Loading Overlay
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Alerts */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>Alerts & Notifications</Typography>
        <Stack spacing={2}>
          <SuccessAlert title="Éxito">
            La operación se completó correctamente.
          </SuccessAlert>
          <ErrorAlert title="Error">
            Ha ocurrido un error al procesar la solicitud.
          </ErrorAlert>
          <WarningAlert>
            Advertencia: Esta acción no se puede deshacer.
          </WarningAlert>
          <InfoAlert>
            Información: Nueva actualización disponible.
          </InfoAlert>
        </Stack>
        
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            color="success"
            onClick={() => showToast('¡Operación exitosa!', 'success')}
          >
            Show Success Toast
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => showToast('Error al procesar', 'error')}
          >
            Show Error Toast
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => showToast('Advertencia', 'warning')}
          >
            Show Warning Toast
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Modals */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>Modals</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => setModalOpen(true)}
          >
            Modal Simple
          </Button>
          <Button
            variant="outlined"
            onClick={() => setConfirmModalOpen(true)}
          >
            Modal de Confirmación
          </Button>
          <Button
            variant="outlined"
            onClick={() => setInfoModalOpen(true)}
          >
            Modal de Información
          </Button>
        </Stack>
      </Box>

      {/* Modals */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal Personalizado"
        subtitle="Con subtítulo opcional"
        actions={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <PrimaryButton onClick={() => setModalOpen(false)}>Aceptar</PrimaryButton>
          </>
        }
      >
        <Typography paragraph>
          Este es el contenido del modal. Puede contener cualquier elemento React.
        </Typography>
        <Input label="Campo en modal" placeholder="Ejemplo de input" />
      </Modal>

      <ConfirmModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          showToast('Acción confirmada', 'success')
          setConfirmModalOpen(false)
        }}
        title="Confirmar eliminación"
        message="¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        confirmColor="error"
      />

      <InfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="Información importante"
        message="Este es un mensaje informativo que el usuario debe leer."
      />

      <LoadingOverlay
        open={overlayOpen}
        message="Procesando..."
      />
      {overlayOpen && setTimeout(() => setOverlayOpen(false), 3000)}

      <ToastComponent />
    </Container>
  )
}

export default UIComponentsDemo