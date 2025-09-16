/**
 * Advanced User Preferences Component - Sprint 3
 * Siguiendo lineamientos nivel 2: Preferencias avanzadas de usuario
 * Implementa personalización completa y configuraciones de productividad
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { toast } from 'sonner';
import { 
  Palette,
  Layout,
  Zap,
  Users,
  Lock,
  Save,
  Loader2,
  Settings,
  Monitor,
  Keyboard,
  MousePointer,
  Eye,
  Bell,
  Share,
  Calendar,
  Clock,
  Target,
  Filter,
  Grid3x3,
  List,
  Kanban,
  BarChart3,
  Activity,
  Shield
} from 'lucide-react';

// Interfaces para preferencias avanzadas
interface PersonalizationPreferences {
  dashboard: {
    layout: 'grid' | 'list' | 'cards' | 'kanban';
    widgetConfiguration: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      settings: any;
      visible: boolean;
    }>;
    customColors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    shortcuts: Array<{
      key: string;
      action: string;
      description: string;
    }>;
  };
  workspaceCustomization: {
    favoriteViews: string[];
    quickActions: string[];
    toolbarConfiguration: any;
    sidebarPreferences: {
      collapsed: boolean;
      width: number;
      pinnedItems: string[];
    };
  };
}

interface IntegrationPreferences {
  externalConnections: {
    calendar: {
      enabled: boolean;
      provider: 'google' | 'outlook' | 'apple';
      syncFrequency: number;
    };
    cloudStorage: {
      enabled: boolean;
      provider: 'gdrive' | 'onedrive' | 'dropbox';
      defaultFolder: string;
    };
    communicationTools: {
      slack: { enabled: boolean; workspaceId?: string };
      teams: { enabled: boolean; tenantId?: string };
      discord: { enabled: boolean; serverId?: string };
    };
  };
  automations: {
    enableSmartSuggestions: boolean;
    autoTagging: boolean;
    smartPrioritization: boolean;
    workflowTriggers: Array<{
      trigger: string;
      action: string;
      conditions: any[];
    }>;
  };
}

interface CollaborationPreferences {
  teamSettings: {
    defaultVisibility: 'private' | 'team' | 'organization';
    shareByDefault: boolean;
    allowComments: boolean;
    enableRealTimeCollaboration: boolean;
  };
  communicationStyle: {
    preferredMeetingLength: number;
    availabilityStatus: 'always' | 'business_hours' | 'custom';
    customHours?: {
      start: string;
      end: string;
      timezone: string;
    };
    responseTimeExpectation: 'immediate' | 'within_hour' | 'within_day';
  };
  permissions: {
    allowDirectMessages: boolean;
    allowMentions: boolean;
    allowCalendarAccess: boolean;
    sharePresenceStatus: boolean;
  };
}

interface ProductivityPreferences {
  focusMode: {
    enableFocusMode: boolean;
    focusHours: {
      start: string;
      end: string;
    };
    blockedApps: string[];
    allowedNotifications: string[];
  };
  taskManagement: {
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
    autoDeadlineReminders: boolean;
    reminderIntervals: number[];
    enableTimeTracking: boolean;
    pomodoroSettings: {
      enabled: boolean;
      workMinutes: number;
      breakMinutes: number;
      longBreakMinutes: number;
      sessionsUntilLongBreak: number;
    };
  };
  analytics: {
    enableProductivityTracking: boolean;
    weeklyReports: boolean;
    goalSetting: boolean;
    timeAnalysis: boolean;
  };
}

interface SecurityPreferences {
  privacy: {
    profileVisibility: 'public' | 'team' | 'private';
    shareActivityStatus: boolean;
    shareWorkingHours: boolean;
    allowDataCollection: boolean;
  };
  security: {
    requireBiometric: boolean;
    enableSecurityAlerts: boolean;
    logSecurityEvents: boolean;
    trustedDevices: Array<{
      id: string;
      name: string;
      type: string;
      lastUsed: Date;
    }>;
  };
  dataHandling: {
    autoDeleteOldData: boolean;
    dataRetentionDays: number;
    exportFormat: 'json' | 'csv' | 'xml';
    enableDataPortability: boolean;
  };
}

interface AdvancedUserPreferencesData {
  personalization: PersonalizationPreferences;
  integration: IntegrationPreferences;
  collaboration: CollaborationPreferences;
  productivity: ProductivityPreferences;
  security: SecurityPreferences;
}

// Schema de validación
const advancedPreferencesSchema = yup.object({
  personalization: yup.object({
    dashboard: yup.object({
      customColors: yup.object({
        primary: yup.string().required(),
        secondary: yup.string().required(),
        accent: yup.string().required(),
        background: yup.string().required()
      })
    }),
    workspaceCustomization: yup.object({
      sidebarPreferences: yup.object({
        width: yup.number().min(200).max(400)
      })
    })
  }),
  productivity: yup.object({
    taskManagement: yup.object({
      pomodoroSettings: yup.object({
        workMinutes: yup.number().min(15).max(60),
        breakMinutes: yup.number().min(5).max(15),
        longBreakMinutes: yup.number().min(15).max(30),
        sessionsUntilLongBreak: yup.number().min(2).max(8)
      })
    })
  }),
  security: yup.object({
    dataHandling: yup.object({
      dataRetentionDays: yup.number().min(30).max(2555)
    })
  })
});

// Constantes
const DASHBOARD_LAYOUTS = [
  { value: 'grid', label: 'Cuadrícula', icon: Grid3x3 },
  { value: 'list', label: 'Lista', icon: List },
  { value: 'cards', label: 'Tarjetas', icon: Monitor },
  { value: 'kanban', label: 'Kanban', icon: Kanban }
];

const CALENDAR_PROVIDERS = [
  { value: 'google', label: 'Google Calendar' },
  { value: 'outlook', label: 'Outlook Calendar' },
  { value: 'apple', label: 'Apple Calendar' }
];

const CLOUD_PROVIDERS = [
  { value: 'gdrive', label: 'Google Drive' },
  { value: 'onedrive', label: 'OneDrive' },
  { value: 'dropbox', label: 'Dropbox' }
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Privado - Solo yo' },
  { value: 'team', label: 'Equipo - Mi equipo' },
  { value: 'organization', label: 'Organización - Toda la empresa' }
];

const RESPONSE_TIMES = [
  { value: 'immediate', label: 'Inmediata (< 5 min)' },
  { value: 'within_hour', label: 'Dentro de 1 hora' },
  { value: 'within_day', label: 'Dentro del día' }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Baja', color: 'text-green-600' },
  { value: 'medium', label: 'Media', color: 'text-yellow-600' },
  { value: 'high', label: 'Alta', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600' }
];

export const AdvancedUserPreferences: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personalization' | 'integration' | 'collaboration' | 'productivity' | 'security'>('personalization');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<AdvancedUserPreferencesData>({
    resolver: yupResolver(advancedPreferencesSchema),
    defaultValues: {
      personalization: {
        dashboard: {
          layout: 'grid',
          widgetConfiguration: [],
          customColors: {
            primary: '#3B82F6',
            secondary: '#64748B',
            accent: '#06B6D4',
            background: '#FFFFFF'
          },
          shortcuts: []
        },
        workspaceCustomization: {
          favoriteViews: [],
          quickActions: [],
          toolbarConfiguration: {},
          sidebarPreferences: {
            collapsed: false,
            width: 280,
            pinnedItems: []
          }
        }
      },
      integration: {
        externalConnections: {
          calendar: {
            enabled: false,
            provider: 'google',
            syncFrequency: 15
          },
          cloudStorage: {
            enabled: false,
            provider: 'gdrive',
            defaultFolder: '/FlexxusFlow'
          },
          communicationTools: {
            slack: { enabled: false },
            teams: { enabled: false },
            discord: { enabled: false }
          }
        },
        automations: {
          enableSmartSuggestions: true,
          autoTagging: false,
          smartPrioritization: true,
          workflowTriggers: []
        }
      },
      collaboration: {
        teamSettings: {
          defaultVisibility: 'team',
          shareByDefault: false,
          allowComments: true,
          enableRealTimeCollaboration: true
        },
        communicationStyle: {
          preferredMeetingLength: 30,
          availabilityStatus: 'business_hours',
          responseTimeExpectation: 'within_hour'
        },
        permissions: {
          allowDirectMessages: true,
          allowMentions: true,
          allowCalendarAccess: false,
          sharePresenceStatus: true
        }
      },
      productivity: {
        focusMode: {
          enableFocusMode: false,
          focusHours: {
            start: '09:00',
            end: '17:00'
          },
          blockedApps: [],
          allowedNotifications: []
        },
        taskManagement: {
          defaultPriority: 'medium',
          autoDeadlineReminders: true,
          reminderIntervals: [60, 30, 10],
          enableTimeTracking: false,
          pomodoroSettings: {
            enabled: false,
            workMinutes: 25,
            breakMinutes: 5,
            longBreakMinutes: 15,
            sessionsUntilLongBreak: 4
          }
        },
        analytics: {
          enableProductivityTracking: false,
          weeklyReports: false,
          goalSetting: false,
          timeAnalysis: false
        }
      },
      security: {
        privacy: {
          profileVisibility: 'team',
          shareActivityStatus: true,
          shareWorkingHours: true,
          allowDataCollection: false
        },
        security: {
          requireBiometric: false,
          enableSecurityAlerts: true,
          logSecurityEvents: true,
          trustedDevices: []
        },
        dataHandling: {
          autoDeleteOldData: false,
          dataRetentionDays: 365,
          exportFormat: 'json',
          enableDataPortability: true
        }
      }
    }
  });

  const watchPersonalization = watch('personalization');
  const watchIntegration = watch('integration');
  const watchCollaboration = watch('collaboration');
  const watchProductivity = watch('productivity');
  const watchSecurity = watch('security');

  // Cargar preferencias
  useEffect(() => {
    loadAdvancedPreferences();
  }, []);

  const loadAdvancedPreferences = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar llamada a la API
      toast.info('Cargando preferencias avanzadas...');
    } catch (error) {
      console.error('Error loading advanced preferences:', error);
      toast.error('Error al cargar las preferencias avanzadas');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AdvancedUserPreferencesData) => {
    setIsSaving(true);
    try {
      // TODO: Implementar llamada a la API
      console.log('Saving advanced preferences:', data);
      toast.success('Preferencias avanzadas guardadas correctamente');
      reset(data);
    } catch (error: any) {
      console.error('Error saving advanced preferences:', error);
      toast.error(error.message || 'Error al guardar las preferencias avanzadas');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de navegación */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg overflow-x-auto">
        <Button
          type="button"
          variant={activeTab === 'personalization' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('personalization')}
          className="flex-1 min-w-fit"
        >
          <Palette className="mr-2 h-4 w-4" />
          Personalización
        </Button>
        <Button
          type="button"
          variant={activeTab === 'integration' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('integration')}
          className="flex-1 min-w-fit"
        >
          <Zap className="mr-2 h-4 w-4" />
          Integraciones
        </Button>
        <Button
          type="button"
          variant={activeTab === 'collaboration' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('collaboration')}
          className="flex-1 min-w-fit"
        >
          <Users className="mr-2 h-4 w-4" />
          Colaboración
        </Button>
        <Button
          type="button"
          variant={activeTab === 'productivity' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('productivity')}
          className="flex-1 min-w-fit"
        >
          <Target className="mr-2 h-4 w-4" />
          Productividad
        </Button>
        <Button
          type="button"
          variant={activeTab === 'security' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('security')}
          className="flex-1 min-w-fit"
        >
          <Lock className="mr-2 h-4 w-4" />
          Privacidad
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personalización */}
        {activeTab === 'personalization' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Dashboard Personalizado
                </CardTitle>
                <CardDescription>
                  Configura la apariencia y organización de tu espacio de trabajo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Diseño del dashboard</Label>
                  <Select 
                    value={watchPersonalization.dashboard.layout}
                    onValueChange={(value) => setValue('personalization.dashboard.layout', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DASHBOARD_LAYOUTS.map(layout => (
                        <SelectItem key={layout.value} value={layout.value}>
                          <div className="flex items-center gap-2">
                            <layout.icon className="h-4 w-4" />
                            <span>{layout.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Colores personalizados</Label>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm">Color primario</Label>
                      <div className="mt-2">
                        <ColorPicker
                          color={watchPersonalization.dashboard.customColors.primary}
                          onChange={(color) => setValue('personalization.dashboard.customColors.primary', color)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Color secundario</Label>
                      <div className="mt-2">
                        <ColorPicker
                          color={watchPersonalization.dashboard.customColors.secondary}
                          onChange={(color) => setValue('personalization.dashboard.customColors.secondary', color)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Color de acento</Label>
                      <div className="mt-2">
                        <ColorPicker
                          color={watchPersonalization.dashboard.customColors.accent}
                          onChange={(color) => setValue('personalization.dashboard.customColors.accent', color)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Fondo</Label>
                      <div className="mt-2">
                        <ColorPicker
                          color={watchPersonalization.dashboard.customColors.background}
                          onChange={(color) => setValue('personalization.dashboard.customColors.background', color)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración del Workspace
                </CardTitle>
                <CardDescription>
                  Personaliza tu área de trabajo y barras de herramientas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sidebar colapsado</Label>
                      <p className="text-sm text-muted-foreground">Iniciar con la barra lateral colapsada</p>
                    </div>
                    <Switch
                      checked={watchPersonalization.workspaceCustomization.sidebarPreferences.collapsed}
                      onCheckedChange={(checked) => setValue('personalization.workspaceCustomization.sidebarPreferences.collapsed', checked)}
                    />
                  </div>

                  <div>
                    <Label>Ancho del sidebar (px)</Label>
                    <Input
                      type="number"
                      min={200}
                      max={400}
                      {...register('personalization.workspaceCustomization.sidebarPreferences.width')}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integraciones */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Conexiones Externas
                </CardTitle>
                <CardDescription>
                  Conecta con tus herramientas favoritas para mejorar el flujo de trabajo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Integración de calendario</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sincronizar calendario</Label>
                        <p className="text-sm text-muted-foreground">Conectar con tu calendario externo</p>
                      </div>
                      <Switch
                        checked={watchIntegration.externalConnections.calendar.enabled}
                        onCheckedChange={(checked) => setValue('integration.externalConnections.calendar.enabled', checked)}
                      />
                    </div>

                    {watchIntegration.externalConnections.calendar.enabled && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <Label>Proveedor de calendario</Label>
                          <Select 
                            value={watchIntegration.externalConnections.calendar.provider}
                            onValueChange={(value) => setValue('integration.externalConnections.calendar.provider', value as any)}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CALENDAR_PROVIDERS.map(provider => (
                                <SelectItem key={provider.value} value={provider.value}>
                                  {provider.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Frecuencia de sincronización (minutos)</Label>
                          <Input
                            type="number"
                            min={5}
                            max={1440}
                            {...register('integration.externalConnections.calendar.syncFrequency')}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Almacenamiento en la nube</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Conectar almacenamiento</Label>
                        <p className="text-sm text-muted-foreground">Integrar con servicio de almacenamiento en la nube</p>
                      </div>
                      <Switch
                        checked={watchIntegration.externalConnections.cloudStorage.enabled}
                        onCheckedChange={(checked) => setValue('integration.externalConnections.cloudStorage.enabled', checked)}
                      />
                    </div>

                    {watchIntegration.externalConnections.cloudStorage.enabled && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <Label>Proveedor de almacenamiento</Label>
                          <Select 
                            value={watchIntegration.externalConnections.cloudStorage.provider}
                            onValueChange={(value) => setValue('integration.externalConnections.cloudStorage.provider', value as any)}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CLOUD_PROVIDERS.map(provider => (
                                <SelectItem key={provider.value} value={provider.value}>
                                  {provider.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Carpeta por defecto</Label>
                          <Input
                            {...register('integration.externalConnections.cloudStorage.defaultFolder')}
                            placeholder="/FlexxusFlow"
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Automatizaciones
                </CardTitle>
                <CardDescription>
                  Configura funciones inteligentes para mejorar tu productividad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sugerencias inteligentes</Label>
                      <p className="text-sm text-muted-foreground">Recibir recomendaciones basadas en IA</p>
                    </div>
                    <Switch
                      checked={watchIntegration.automations.enableSmartSuggestions}
                      onCheckedChange={(checked) => setValue('integration.automations.enableSmartSuggestions', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Etiquetado automático</Label>
                      <p className="text-sm text-muted-foreground">Etiquetar contenido automáticamente</p>
                    </div>
                    <Switch
                      checked={watchIntegration.automations.autoTagging}
                      onCheckedChange={(checked) => setValue('integration.automations.autoTagging', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Priorización inteligente</Label>
                      <p className="text-sm text-muted-foreground">Priorizar tareas automáticamente</p>
                    </div>
                    <Switch
                      checked={watchIntegration.automations.smartPrioritization}
                      onCheckedChange={(checked) => setValue('integration.automations.smartPrioritization', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Colaboración */}
        {activeTab === 'collaboration' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Configuración de Equipo
                </CardTitle>
                <CardDescription>
                  Define cómo compartes y colaboras con tu equipo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Visibilidad por defecto</Label>
                  <Select 
                    value={watchCollaboration.teamSettings.defaultVisibility}
                    onValueChange={(value) => setValue('collaboration.teamSettings.defaultVisibility', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compartir por defecto</Label>
                      <p className="text-sm text-muted-foreground">Compartir nuevo contenido automáticamente</p>
                    </div>
                    <Switch
                      checked={watchCollaboration.teamSettings.shareByDefault}
                      onCheckedChange={(checked) => setValue('collaboration.teamSettings.shareByDefault', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Permitir comentarios</Label>
                      <p className="text-sm text-muted-foreground">Habilitar comentarios en contenido compartido</p>
                    </div>
                    <Switch
                      checked={watchCollaboration.teamSettings.allowComments}
                      onCheckedChange={(checked) => setValue('collaboration.teamSettings.allowComments', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Colaboración en tiempo real</Label>
                      <p className="text-sm text-muted-foreground">Edición simultánea de documentos</p>
                    </div>
                    <Switch
                      checked={watchCollaboration.teamSettings.enableRealTimeCollaboration}
                      onCheckedChange={(checked) => setValue('collaboration.teamSettings.enableRealTimeCollaboration', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Estilo de Comunicación
                </CardTitle>
                <CardDescription>
                  Configura tus preferencias de comunicación con el equipo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Duración preferida de reuniones (minutos)</Label>
                  <Select 
                    value={watchCollaboration.communicationStyle.preferredMeetingLength.toString()}
                    onValueChange={(value) => setValue('collaboration.communicationStyle.preferredMeetingLength', parseInt(value))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Expectativa de tiempo de respuesta</Label>
                  <Select 
                    value={watchCollaboration.communicationStyle.responseTimeExpectation}
                    onValueChange={(value) => setValue('collaboration.communicationStyle.responseTimeExpectation', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESPONSE_TIMES.map(time => (
                        <SelectItem key={time.value} value={time.value}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{time.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Estado de disponibilidad</Label>
                  <Select 
                    value={watchCollaboration.communicationStyle.availabilityStatus}
                    onValueChange={(value) => setValue('collaboration.communicationStyle.availabilityStatus', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Siempre disponible</SelectItem>
                      <SelectItem value="business_hours">Solo en horario laboral</SelectItem>
                      <SelectItem value="custom">Horario personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Productividad */}
        {activeTab === 'productivity' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Gestión de Tareas
                </CardTitle>
                <CardDescription>
                  Optimiza tu flujo de trabajo y gestión del tiempo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Prioridad por defecto</Label>
                  <Select 
                    value={watchProductivity.taskManagement.defaultPriority}
                    onValueChange={(value) => setValue('productivity.taskManagement.defaultPriority', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_LEVELS.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <div className={`flex items-center gap-2 ${priority.color}`}>
                            <div className={`w-2 h-2 rounded-full bg-current`} />
                            <span>{priority.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Recordatorios automáticos</Label>
                      <p className="text-sm text-muted-foreground">Recordar deadlines próximos</p>
                    </div>
                    <Switch
                      checked={watchProductivity.taskManagement.autoDeadlineReminders}
                      onCheckedChange={(checked) => setValue('productivity.taskManagement.autoDeadlineReminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Seguimiento de tiempo</Label>
                      <p className="text-sm text-muted-foreground">Habilitar tracker de tiempo en tareas</p>
                    </div>
                    <Switch
                      checked={watchProductivity.taskManagement.enableTimeTracking}
                      onCheckedChange={(checked) => setValue('productivity.taskManagement.enableTimeTracking', checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Técnica Pomodoro</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Habilitar Pomodoro</Label>
                        <p className="text-sm text-muted-foreground">Usar la técnica Pomodoro para gestión del tiempo</p>
                      </div>
                      <Switch
                        checked={watchProductivity.taskManagement.pomodoroSettings.enabled}
                        onCheckedChange={(checked) => setValue('productivity.taskManagement.pomodoroSettings.enabled', checked)}
                      />
                    </div>

                    {watchProductivity.taskManagement.pomodoroSettings.enabled && (
                      <div className="ml-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Trabajo (min)</Label>
                          <Input
                            type="number"
                            min={15}
                            max={60}
                            {...register('productivity.taskManagement.pomodoroSettings.workMinutes')}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Descanso (min)</Label>
                          <Input
                            type="number"
                            min={5}
                            max={15}
                            {...register('productivity.taskManagement.pomodoroSettings.breakMinutes')}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Descanso largo (min)</Label>
                          <Input
                            type="number"
                            min={15}
                            max={30}
                            {...register('productivity.taskManagement.pomodoroSettings.longBreakMinutes')}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Sesiones hasta descanso largo</Label>
                          <Input
                            type="number"
                            min={2}
                            max={8}
                            {...register('productivity.taskManagement.pomodoroSettings.sessionsUntilLongBreak')}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Análisis de Productividad
                </CardTitle>
                <CardDescription>
                  Seguimiento y análisis de tu rendimiento laboral
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Seguimiento de productividad</Label>
                      <p className="text-sm text-muted-foreground">Analizar patrones de trabajo y productividad</p>
                    </div>
                    <Switch
                      checked={watchProductivity.analytics.enableProductivityTracking}
                      onCheckedChange={(checked) => setValue('productivity.analytics.enableProductivityTracking', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reportes semanales</Label>
                      <p className="text-sm text-muted-foreground">Recibir resúmenes semanales de actividad</p>
                    </div>
                    <Switch
                      checked={watchProductivity.analytics.weeklyReports}
                      onCheckedChange={(checked) => setValue('productivity.analytics.weeklyReports', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Establecimiento de metas</Label>
                      <p className="text-sm text-muted-foreground">Definir y seguir objetivos de productividad</p>
                    </div>
                    <Switch
                      checked={watchProductivity.analytics.goalSetting}
                      onCheckedChange={(checked) => setValue('productivity.analytics.goalSetting', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Análisis de tiempo</Label>
                      <p className="text-sm text-muted-foreground">Analizar cómo se distribuye tu tiempo</p>
                    </div>
                    <Switch
                      checked={watchProductivity.analytics.timeAnalysis}
                      onCheckedChange={(checked) => setValue('productivity.analytics.timeAnalysis', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Privacidad y Seguridad */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Privacidad
                </CardTitle>
                <CardDescription>
                  Controla qué información compartes y cómo se usa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Visibilidad del perfil</Label>
                  <Select 
                    value={watchSecurity.privacy.profileVisibility}
                    onValueChange={(value) => setValue('security.privacy.profileVisibility', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público - Visible para todos</SelectItem>
                      <SelectItem value="team">Equipo - Solo mi equipo</SelectItem>
                      <SelectItem value="private">Privado - Solo yo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compartir estado de actividad</Label>
                      <p className="text-sm text-muted-foreground">Mostrar cuándo estás activo/inactivo</p>
                    </div>
                    <Switch
                      checked={watchSecurity.privacy.shareActivityStatus}
                      onCheckedChange={(checked) => setValue('security.privacy.shareActivityStatus', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compartir horario de trabajo</Label>
                      <p className="text-sm text-muted-foreground">Mostrar tus horarios de disponibilidad</p>
                    </div>
                    <Switch
                      checked={watchSecurity.privacy.shareWorkingHours}
                      onCheckedChange={(checked) => setValue('security.privacy.shareWorkingHours', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Permitir recolección de datos</Label>
                      <p className="text-sm text-muted-foreground">Permitir análisis anónimo para mejorar la plataforma</p>
                    </div>
                    <Switch
                      checked={watchSecurity.privacy.allowDataCollection}
                      onCheckedChange={(checked) => setValue('security.privacy.allowDataCollection', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Seguridad
                </CardTitle>
                <CardDescription>
                  Configuraciones adicionales de seguridad para tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Requerir autenticación biométrica</Label>
                      <p className="text-sm text-muted-foreground">Usar huella dactilar o reconocimiento facial</p>
                    </div>
                    <Switch
                      checked={watchSecurity.security.requireBiometric}
                      onCheckedChange={(checked) => setValue('security.security.requireBiometric', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Alertas de seguridad</Label>
                      <p className="text-sm text-muted-foreground">Recibir notificaciones de actividad sospechosa</p>
                    </div>
                    <Switch
                      checked={watchSecurity.security.enableSecurityAlerts}
                      onCheckedChange={(checked) => setValue('security.security.enableSecurityAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Registrar eventos de seguridad</Label>
                      <p className="text-sm text-muted-foreground">Mantener un log de accesos y actividades</p>
                    </div>
                    <Switch
                      checked={watchSecurity.security.logSecurityEvents}
                      onCheckedChange={(checked) => setValue('security.security.logSecurityEvents', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Manejo de Datos
                </CardTitle>
                <CardDescription>
                  Configuración de retención y portabilidad de datos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Días de retención de datos</Label>
                  <Input
                    type="number"
                    min={30}
                    max={2555}
                    {...register('security.dataHandling.dataRetentionDays')}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Tiempo que se mantendrán tus datos antes de ser eliminados (30-2555 días)
                  </p>
                </div>

                <div>
                  <Label>Formato de exportación</Label>
                  <Select 
                    value={watchSecurity.dataHandling.exportFormat}
                    onValueChange={(value) => setValue('security.dataHandling.exportFormat', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Eliminación automática</Label>
                      <p className="text-sm text-muted-foreground">Eliminar datos antiguos automáticamente</p>
                    </div>
                    <Switch
                      checked={watchSecurity.dataHandling.autoDeleteOldData}
                      onCheckedChange={(checked) => setValue('security.dataHandling.autoDeleteOldData', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Portabilidad de datos</Label>
                      <p className="text-sm text-muted-foreground">Permitir exportación completa de datos</p>
                    </div>
                    <Switch
                      checked={watchSecurity.dataHandling.enableDataPortability}
                      onCheckedChange={(checked) => setValue('security.dataHandling.enableDataPortability', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botón de guardar */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!isDirty || isSaving}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdvancedUserPreferences;