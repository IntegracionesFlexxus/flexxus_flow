// Exportación centralizada de componentes UI - MVP
// TODO: En Nivel 2 agregar más componentes y variantes

// Botones
export { 
  Button, 
  PrimaryButton, 
  SecondaryButton, 
  DangerButton, 
  SuccessButton 
} from './Button'

// Inputs
export { 
  Input, 
  PasswordInput, 
  SearchInput 
} from './Input'

// Cards
export { 
  Card, 
  StatCard, 
  InfoCard 
} from './Card'

// Modals
export { 
  Modal, 
  ConfirmModal, 
  InfoModal 
} from './Modal'

// Loading
export {
  Spinner,
  CenteredLoading,
  PageLoading,
  LoadingOverlay,
  ProgressBar,
  ContentSkeleton,
  InlineLoading
} from './Loading'

// Alerts
export {
  Alert,
  Toast,
  useToast,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  Banner
} from './Alert'

// Re-export componentes de Material-UI frecuentemente usados
export {
  Box,
  Container,
  Grid,
  Stack,
  Paper,
  Divider,
  Typography,
  IconButton,
  Chip,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Menu,
  MenuItem,
  Tooltip,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  Select,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Breadcrumbs,
  Link,
  Stepper,
  Step,
  StepLabel
} from '@mui/material'

// Re-export iconos frecuentemente usados
export {
  // Navegación
  Menu as MenuIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  
  // Acciones
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  
  // Estado
  Check as CheckIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon,
  
  // Usuario
  Person as PersonIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  
  // Comunicación
  Email as EmailIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  
  // Data
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  
  // Archivos
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  AttachFile as AttachFileIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material'