import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Divider,
  Grid,
  Paper,
  Stack,
  Alert,
  Snackbar,
  InputAdornment,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListView,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Timer as TimerIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as CompletedIcon,
  AssignmentLate as OverdueIcon,
  TrendingUp as TrendingIcon,
  Group as GroupIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  LocalOffer as TagIcon,
  ContentCopy as DuplicateIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Share as ShareIcon,
  GetApp as ExportIcon,
  CloudUpload as ImportIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, addDays, isOverdue, differenceInDays } from 'date-fns';
import { useTheme } from '@mui/material/styles';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  tags: string[];
  attachments: number;
  comments: number;
  subtasks?: Task[];
  dependencies?: string[];
  relatedTo?: {
    type: 'lead' | 'opportunity' | 'account' | 'contact';
    id: string;
    name: string;
  };
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    endDate?: Date;
  };
  reminder?: {
    enabled: boolean;
    before: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  bookmarked?: boolean;
  timeTracking?: {
    isTracking: boolean;
    sessions: Array<{
      start: Date;
      end?: Date;
      duration?: number;
    }>;
    totalTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  columnId: string;
}

interface Column {
  id: string;
  title: string;
  taskIds: string[];
  color?: string;
  limit?: number;
  collapsed?: boolean;
}

interface TaskManagerProps {
  companyId: number;
  userId?: string;
  onTaskUpdate?: (task: Task) => void;
  onTaskCreate?: (task: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  view?: 'kanban' | 'list' | 'calendar';
  filters?: {
    status?: string[];
    priority?: string[];
    assignee?: string[];
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  };
}

const TaskManager: React.FC<TaskManagerProps> = ({
  companyId,
  userId,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  view: initialView = 'kanban',
  filters: initialFilters = {}
}) => {
  const theme = useTheme();
  const [view, setView] = useState(initialView);
  const [columns, setColumns] = useState<Record<string, Column>>({
    'pending': { id: 'pending', title: 'Por Hacer', taskIds: [] },
    'in_progress': { id: 'in_progress', title: 'En Progreso', taskIds: [], limit: 5 },
    'review': { id: 'review', title: 'En Revisión', taskIds: [] },
    'completed': { id: 'completed', title: 'Completadas', taskIds: [], collapsed: false }
  });
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'created'>('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignees: [],
    tags: [],
    completionPercentage: 0
  });

  // Load tasks from API
  useEffect(() => {
    loadTasks();
  }, [companyId, filters]);

  const loadTasks = async () => {
    try {
      // API call to load tasks
      // const response = await fetch(`/api/crm/companies/${companyId}/tasks`);
      // const data = await response.json();

      // Mock data for now
      const mockTasks: Record<string, Task> = {
        'task1': {
          id: 'task1',
          title: 'Preparar propuesta comercial',
          description: 'Crear propuesta para cliente potencial',
          status: 'in_progress',
          priority: 'high',
          assignees: ['user1', 'user2'],
          dueDate: addDays(new Date(), 2),
          completionPercentage: 60,
          tags: ['ventas', 'urgente'],
          attachments: 3,
          comments: 5,
          columnId: 'in_progress',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1',
          estimatedHours: 8,
          actualHours: 5,
          bookmarked: true
        },
        'task2': {
          id: 'task2',
          title: 'Seguimiento llamada cliente',
          status: 'pending',
          priority: 'medium',
          assignees: ['user1'],
          dueDate: addDays(new Date(), 1),
          completionPercentage: 0,
          tags: ['seguimiento'],
          attachments: 0,
          comments: 2,
          columnId: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1'
        },
        'task3': {
          id: 'task3',
          title: 'Revisar contrato',
          status: 'review',
          priority: 'low',
          assignees: ['user3'],
          completionPercentage: 90,
          tags: ['legal'],
          attachments: 1,
          comments: 0,
          columnId: 'review',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user2'
        }
      };

      setTasks(mockTasks);

      // Update columns with task IDs
      const newColumns = { ...columns };
      Object.values(mockTasks).forEach(task => {
        if (newColumns[task.columnId] && !newColumns[task.columnId].taskIds.includes(task.id)) {
          newColumns[task.columnId].taskIds.push(task.id);
        }
      });
      setColumns(newColumns);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar las tareas',
        severity: 'error'
      });
    }
  };

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = columns[source.droppableId];
    const finish = columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...start, taskIds: newTaskIds };
      setColumns({ ...columns, [newColumn.id]: newColumn });
    } else {
      const startTaskIds = Array.from(start.taskIds);
      startTaskIds.splice(source.index, 1);
      const newStart = { ...start, taskIds: startTaskIds };

      const finishTaskIds = Array.from(finish.taskIds);
      finishTaskIds.splice(destination.index, 0, draggableId);
      const newFinish = { ...finish, taskIds: finishTaskIds };

      setColumns({
        ...columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish
      });

      // Update task status
      const task = tasks[draggableId];
      const updatedTask = {
        ...task,
        status: destination.droppableId as Task['status'],
        columnId: destination.droppableId
      };
      setTasks({ ...tasks, [draggableId]: updatedTask });

      if (onTaskUpdate) {
        onTaskUpdate(updatedTask);
      }

      // Check WIP limit
      if (newFinish.limit && newFinish.taskIds.length > newFinish.limit) {
        setSnackbar({
          open: true,
          message: `¡Límite WIP excedido en ${newFinish.title}!`,
          severity: 'info'
        });
      }
    }
  };

  const handleCreateTask = () => {
    if (!taskForm.title) return;

    const newTask: Task = {
      id: `task${Date.now()}`,
      title: taskForm.title,
      description: taskForm.description,
      status: taskForm.status || 'pending',
      priority: taskForm.priority || 'medium',
      assignees: taskForm.assignees || [],
      dueDate: taskForm.dueDate,
      completionPercentage: 0,
      tags: taskForm.tags || [],
      attachments: 0,
      comments: 0,
      columnId: taskForm.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId || 'current_user',
      estimatedHours: taskForm.estimatedHours,
      reminder: taskForm.reminder,
      recurring: taskForm.recurring
    };

    setTasks({ ...tasks, [newTask.id]: newTask });

    const column = columns[newTask.columnId];
    const newTaskIds = [...column.taskIds, newTask.id];
    setColumns({ ...columns, [column.id]: { ...column, taskIds: newTaskIds } });

    if (onTaskCreate) {
      onTaskCreate(newTask);
    }

    setIsCreateDialogOpen(false);
    setTaskForm({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assignees: [],
      tags: [],
      completionPercentage: 0
    });

    setSnackbar({
      open: true,
      message: 'Tarea creada exitosamente',
      severity: 'success'
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks[taskId];
    const column = columns[task.columnId];
    const newTaskIds = column.taskIds.filter(id => id !== taskId);

    setColumns({ ...columns, [column.id]: { ...column, taskIds: newTaskIds } });

    const newTasks = { ...tasks };
    delete newTasks[taskId];
    setTasks(newTasks);

    if (onTaskDelete) {
      onTaskDelete(taskId);
    }

    setAnchorEl(null);
    setSnackbar({
      open: true,
      message: 'Tarea eliminada',
      severity: 'info'
    });
  };

  const handleToggleBookmark = (taskId: string) => {
    const task = tasks[taskId];
    const updatedTask = { ...task, bookmarked: !task.bookmarked };
    setTasks({ ...tasks, [taskId]: updatedTask });

    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleStartTimeTracking = (taskId: string) => {
    const task = tasks[taskId];
    const now = new Date();

    const updatedTask = {
      ...task,
      timeTracking: {
        isTracking: true,
        sessions: [
          ...(task.timeTracking?.sessions || []),
          { start: now }
        ],
        totalTime: task.timeTracking?.totalTime || 0
      }
    };

    setTasks({ ...tasks, [taskId]: updatedTask });

    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const handleStopTimeTracking = (taskId: string) => {
    const task = tasks[taskId];
    if (!task.timeTracking || !task.timeTracking.isTracking) return;

    const now = new Date();
    const sessions = [...task.timeTracking.sessions];
    const lastSession = sessions[sessions.length - 1];

    if (lastSession && !lastSession.end) {
      lastSession.end = now;
      lastSession.duration = (now.getTime() - lastSession.start.getTime()) / 1000 / 60; // in minutes
    }

    const totalTime = sessions.reduce((total, session) =>
      total + (session.duration || 0), 0
    );

    const updatedTask = {
      ...task,
      timeTracking: {
        isTracking: false,
        sessions,
        totalTime
      },
      actualHours: Math.round(totalTime / 60 * 10) / 10 // convert to hours
    };

    setTasks({ ...tasks, [taskId]: updatedTask });

    if (onTaskUpdate) {
      onTaskUpdate(updatedTask);
    }
  };

  const getTaskStats = () => {
    const taskArray = Object.values(tasks);
    return {
      total: taskArray.length,
      pending: taskArray.filter(t => t.status === 'pending').length,
      inProgress: taskArray.filter(t => t.status === 'in_progress').length,
      completed: taskArray.filter(t => t.status === 'completed').length,
      overdue: taskArray.filter(t => t.dueDate && isOverdue(t.dueDate, new Date())).length,
      highPriority: taskArray.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      myTasks: taskArray.filter(t => t.assignees.includes(userId || '')).length
    };
  };

  const renderPriorityChip = (priority: Task['priority']) => {
    const colors = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      urgent: 'error'
    };

    return (
      <Chip
        size="small"
        icon={<FlagIcon />}
        label={priority.toUpperCase()}
        color={colors[priority] as any}
        sx={{ height: 20 }}
      />
    );
  };

  const renderTaskCard = (task: Task, index: number) => {
    const isOverdueTask = task.dueDate && isOverdue(task.dueDate, new Date());
    const daysUntilDue = task.dueDate ? differenceInDays(task.dueDate, new Date()) : null;

    return (
      <Draggable draggableId={task.id} index={index} key={task.id}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              mb: 1,
              cursor: 'grab',
              opacity: snapshot.isDragging ? 0.8 : 1,
              transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
              border: isOverdueTask ? `2px solid ${theme.palette.error.main}` : 'none',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease'
              }
            }}
            onClick={() => {
              setSelectedTask(task);
              setIsTaskDialogOpen(true);
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {task.bookmarked && (
                      <BookmarkIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    )}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {task.title}
                    </Typography>
                  </Box>
                  {task.relatedTo && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {task.relatedTo.type}: {task.relatedTo.name}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnchorEl(e.currentTarget);
                    setSelectedTaskId(task.id);
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>

              {task.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {task.description}
                </Typography>
              )}

              <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                {renderPriorityChip(task.priority)}
                {task.tags.map((tag, idx) => (
                  <Chip key={idx} label={tag} size="small" variant="outlined" sx={{ height: 20 }} />
                ))}
              </Box>

              {task.completionPercentage > 0 && (
                <Box mb={1}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption">Progreso</Typography>
                    <Typography variant="caption">{task.completionPercentage}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={task.completionPercentage}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              )}

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" gap={1} alignItems="center">
                  {task.dueDate && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <CalendarIcon sx={{ fontSize: 14, color: isOverdueTask ? 'error.main' : 'text.secondary' }} />
                      <Typography
                        variant="caption"
                        color={isOverdueTask ? 'error.main' : 'text.secondary'}
                      >
                        {daysUntilDue !== null && daysUntilDue >= 0
                          ? `${daysUntilDue}d`
                          : format(task.dueDate, 'dd MMM')
                        }
                      </Typography>
                    </Box>
                  )}

                  {task.estimatedHours && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <TimerIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {task.actualHours || 0}/{task.estimatedHours}h
                      </Typography>
                    </Box>
                  )}

                  {task.attachments > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <AttachFileIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{task.attachments}</Typography>
                    </Box>
                  )}

                  {task.comments > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <CommentIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">{task.comments}</Typography>
                    </Box>
                  )}
                </Box>

                {task.assignees.length > 0 && (
                  <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
                    {task.assignees.map((assignee, idx) => (
                      <Avatar key={idx} sx={{ bgcolor: theme.palette.primary.main }}>
                        {assignee[0].toUpperCase()}
                      </Avatar>
                    ))}
                  </AvatarGroup>
                )}
              </Box>

              {task.timeTracking?.isTracking && (
                <Box
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  mt={1}
                  p={0.5}
                  bgcolor="success.light"
                  borderRadius={1}
                >
                  <TimerIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  <Typography variant="caption" color="success.main">
                    Tracking tiempo...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Draggable>
    );
  };

  const renderKanbanView = () => {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box display="flex" gap={2} overflow="auto" pb={2}>
          {Object.values(columns).map(column => (
            <Box
              key={column.id}
              sx={{
                minWidth: 300,
                maxWidth: 350,
                bgcolor: 'background.paper',
                borderRadius: 2,
                p: 2,
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {column.title}
                  </Typography>
                  <Chip
                    label={column.taskIds.length}
                    size="small"
                    color={column.limit && column.taskIds.length > column.limit ? 'error' : 'default'}
                  />
                  {column.limit && (
                    <Typography variant="caption" color="text.secondary">
                      (Límite: {column.limit})
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newColumn = { ...column, collapsed: !column.collapsed };
                    setColumns({ ...columns, [column.id]: newColumn });
                  }}
                >
                  {column.collapsed ? <PlayIcon /> : <PauseIcon />}
                </IconButton>
              </Box>

              {!column.collapsed && (
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minHeight: 200,
                        backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                        borderRadius: 1,
                        p: 1,
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {column.taskIds.map((taskId, index) => {
                        const task = tasks[taskId];
                        if (!task) return null;
                        return renderTaskCard(task, index);
                      })}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              )}

              <Button
                startIcon={<AddIcon />}
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => {
                  setTaskForm({ ...taskForm, status: column.id as Task['status'], columnId: column.id });
                  setIsCreateDialogOpen(true);
                }}
              >
                Agregar tarea
              </Button>
            </Box>
          ))}
        </Box>
      </DragDropContext>
    );
  };

  const renderListView = () => {
    const taskArray = Object.values(tasks);
    const filteredTasks = taskArray.filter(task => {
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filters.status && filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }
      if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
        return false;
      }
      return true;
    });

    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            size="small"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
          <Button
            variant="outlined"
            startIcon={<SortIcon />}
          >
            Ordenar: {sortBy}
          </Button>
        </Box>

        {showFilters && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    multiple
                    value={filters.status || []}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="pending">Pendiente</MenuItem>
                    <MenuItem value="in_progress">En Progreso</MenuItem>
                    <MenuItem value="completed">Completada</MenuItem>
                    <MenuItem value="blocked">Bloqueada</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Prioridad</InputLabel>
                  <Select
                    multiple
                    value={filters.priority || []}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value as string[] })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="low">Baja</MenuItem>
                    <MenuItem value="medium">Media</MenuItem>
                    <MenuItem value="high">Alta</MenuItem>
                    <MenuItem value="urgent">Urgente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        )}

        {filteredTasks.map((task) => (
          <Card key={task.id} sx={{ mb: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Checkbox
                  checked={bulkSelection.includes(task.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setBulkSelection([...bulkSelection, task.id]);
                    } else {
                      setBulkSelection(bulkSelection.filter(id => id !== task.id));
                    }
                  }}
                />

                <IconButton
                  size="small"
                  onClick={() => handleToggleBookmark(task.id)}
                >
                  {task.bookmarked ? <BookmarkIcon color="warning" /> : <BookmarkBorderIcon />}
                </IconButton>

                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    {task.title}
                  </Typography>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                  )}
                </Box>

                <Box display="flex" gap={1} alignItems="center">
                  {renderPriorityChip(task.priority)}

                  {task.dueDate && (
                    <Chip
                      size="small"
                      icon={<CalendarIcon />}
                      label={format(task.dueDate, 'dd MMM')}
                      color={isOverdue(task.dueDate, new Date()) ? 'error' : 'default'}
                    />
                  )}

                  {task.assignees.length > 0 && (
                    <AvatarGroup max={3}>
                      {task.assignees.map((assignee, idx) => (
                        <Avatar key={idx} sx={{ width: 28, height: 28 }}>
                          {assignee[0].toUpperCase()}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  )}

                  {task.timeTracking?.isTracking ? (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleStopTimeTracking(task.id)}
                    >
                      <PauseIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleStartTimeTracking(task.id)}
                    >
                      <PlayIcon />
                    </IconButton>
                  )}

                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Paper>
    );
  };

  const stats = getTaskStats();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" fontWeight="bold">
              Gestión de Tareas
            </Typography>
            <Box display="flex" gap={2} mt={1}>
              <Chip icon={<AssignmentIcon />} label={`${stats.total} Total`} />
              <Chip icon={<ScheduleIcon />} label={`${stats.pending} Pendientes`} color="default" />
              <Chip icon={<PlayIcon />} label={`${stats.inProgress} En Progreso`} color="info" />
              <Chip icon={<CheckCircleIcon />} label={`${stats.completed} Completadas`} color="success" />
              {stats.overdue > 0 && (
                <Chip icon={<OverdueIcon />} label={`${stats.overdue} Vencidas`} color="error" />
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Nueva Tarea
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadTasks}
              >
                Actualizar
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
              >
                Exportar
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* View Tabs */}
        <Tabs
          value={view === 'kanban' ? 0 : view === 'list' ? 1 : 2}
          onChange={(e, val) => setView(val === 0 ? 'kanban' : val === 1 ? 'list' : 'calendar')}
          sx={{ mt: 2 }}
        >
          <Tab icon={<KanbanIcon />} label="Kanban" />
          <Tab icon={<ListView />} label="Lista" />
          <Tab icon={<CalendarIcon />} label="Calendario" />
        </Tabs>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {view === 'kanban' && renderKanbanView()}
        {view === 'list' && renderListView()}
        {view === 'calendar' && (
          <Alert severity="info">Vista de calendario en desarrollo</Alert>
        )}
      </Box>

      {/* Task Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && Boolean(selectedTaskId)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            const task = tasks[selectedTaskId!];
            setSelectedTask(task);
            setIsTaskDialogOpen(true);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            // Duplicate task
            const task = tasks[selectedTaskId!];
            const newTask = {
              ...task,
              id: `task${Date.now()}`,
              title: `${task.title} (copia)`,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setTasks({ ...tasks, [newTask.id]: newTask });
            const column = columns[task.columnId];
            setColumns({
              ...columns,
              [column.id]: {
                ...column,
                taskIds: [...column.taskIds, newTask.id]
              }
            });
            setAnchorEl(null);
          }}
        >
          <ListItemIcon><DuplicateIcon /></ListItemIcon>
          <ListItemText>Duplicar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const task = tasks[selectedTaskId!];
            handleToggleBookmark(task.id);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            {tasks[selectedTaskId!]?.bookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          </ListItemIcon>
          <ListItemText>
            {tasks[selectedTaskId!]?.bookmarked ? 'Quitar marcador' : 'Agregar marcador'}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleDeleteTask(selectedTaskId!);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Task Dialog */}
      <Dialog
        open={isCreateDialogOpen || isTaskDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isCreateDialogOpen ? 'Nueva Tarea' : 'Editar Tarea'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                value={selectedTask?.title || taskForm.title}
                onChange={(e) => {
                  if (selectedTask) {
                    setSelectedTask({ ...selectedTask, title: e.target.value });
                  } else {
                    setTaskForm({ ...taskForm, title: e.target.value });
                  }
                }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descripción"
                value={selectedTask?.description || taskForm.description}
                onChange={(e) => {
                  if (selectedTask) {
                    setSelectedTask({ ...selectedTask, description: e.target.value });
                  } else {
                    setTaskForm({ ...taskForm, description: e.target.value });
                  }
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={selectedTask?.status || taskForm.status}
                  onChange={(e) => {
                    if (selectedTask) {
                      setSelectedTask({ ...selectedTask, status: e.target.value as Task['status'] });
                    } else {
                      setTaskForm({ ...taskForm, status: e.target.value as Task['status'] });
                    }
                  }}
                >
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="in_progress">En Progreso</MenuItem>
                  <MenuItem value="review">En Revisión</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="blocked">Bloqueada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={selectedTask?.priority || taskForm.priority}
                  onChange={(e) => {
                    if (selectedTask) {
                      setSelectedTask({ ...selectedTask, priority: e.target.value as Task['priority'] });
                    } else {
                      setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] });
                    }
                  }}
                >
                  <MenuItem value="low">Baja</MenuItem>
                  <MenuItem value="medium">Media</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Fecha de vencimiento"
                  value={selectedTask?.dueDate || taskForm.dueDate || null}
                  onChange={(date) => {
                    if (selectedTask) {
                      setSelectedTask({ ...selectedTask, dueDate: date || undefined });
                    } else {
                      setTaskForm({ ...taskForm, dueDate: date || undefined });
                    }
                  }}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Horas estimadas"
                value={selectedTask?.estimatedHours || taskForm.estimatedHours || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  if (selectedTask) {
                    setSelectedTask({ ...selectedTask, estimatedHours: value });
                  } else {
                    setTaskForm({ ...taskForm, estimatedHours: value });
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsCreateDialogOpen(false);
              setIsTaskDialogOpen(false);
              setSelectedTask(null);
              setTaskForm({
                title: '',
                description: '',
                status: 'pending',
                priority: 'medium',
                assignees: [],
                tags: [],
                completionPercentage: 0
              });
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (isCreateDialogOpen) {
                handleCreateTask();
              } else if (selectedTask) {
                setTasks({ ...tasks, [selectedTask.id]: selectedTask });
                if (onTaskUpdate) {
                  onTaskUpdate(selectedTask);
                }
                setIsTaskDialogOpen(false);
                setSelectedTask(null);
                setSnackbar({
                  open: true,
                  message: 'Tarea actualizada exitosamente',
                  severity: 'success'
                });
              }
            }}
          >
            {isCreateDialogOpen ? 'Crear' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskManager;