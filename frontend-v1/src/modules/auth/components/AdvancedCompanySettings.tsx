/**
 * Advanced Company Settings Component - Sprint 3
 * Siguiendo lineamientos nivel 2: Configuraciones empresariales avanzadas
 * Implementa gestión de procesos de negocio, compliance y rendimiento
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
import { toast } from 'sonner';
import { 
  Workflow,
  Shield,
  Performance,
  Integration,
  Save,
  Loader2,
  Settings,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Database,
  Clock,
  Users,
  Target,
  Zap,
  Lock,
  FileCheck,
  Monitor,
  BarChart3
} from 'lucide-react';

// Interfaces para configuraciones avanzadas
interface BusinessProcessSettings {
  workflowConfig: {
    enableCustomWorkflows: boolean;
    maxConcurrentProcesses: number;
    defaultApprovalFlow: 'single' | 'multi' | 'conditional';
    escalationRules: {
      enabled: boolean;
      timeoutHours: number;
      escalationLevels: number;
    };
    automaticAssignment: {
      enabled: boolean;
      strategy: 'round_robin' | 'workload' | 'skill_based' | 'random';
    };
  };
  complianceConfig: {
    dataRetentionDays: number;
    auditLevel: 'basic' | 'detailed' | 'comprehensive';
    requireApprovalFor: string[];
    automaticBackup: boolean;
    complianceReports: boolean;
  };
  qualityAssurance: {
    enableReviews: boolean;
    mandatoryReviews: boolean;
    reviewerAssignment: 'automatic' | 'manual';
    qualityMetrics: boolean;
  };
}

interface IntegrationSettings {
  apiManagement: {
    enableRateLimit: boolean;
    rateLimitPerHour: number;
    enableApiKeys: boolean;
    logApiCalls: boolean;
  };
  externalServices: {
    enableWebhooks: boolean;
    webhookRetries: number;
    enableSSOIntegration: boolean;
    allowedDomains: string[];
  };
  dataExchange: {
    enableExports: boolean;
    exportFormats: string[];
    enableImports: boolean;
    importValidation: boolean;
  };
}

interface SecurityGovernance {
  accessControl: {
    enableRBAC: boolean;
    sessionManagement: {
      maxConcurrentSessions: number;
      sessionTimeout: number;
      forceLogoutInactive: boolean;
    };
    ipRestrictions: {
      enabled: boolean;
      allowedIPs: string[];
      blockSuspiciousActivity: boolean;
    };
  };
  dataProtection: {
    encryptionLevel: 'standard' | 'high' | 'military';
    enableDataMasking: boolean;
    personalDataHandling: {
      anonymization: boolean;
      rightToBeForgotten: boolean;
      consentManagement: boolean;
    };
  };
}

interface PerformanceOptimization {
  systemLimits: {
    maxUsersPerSession: number;
    maxFileUploadSize: number;
    queryTimeoutSeconds: number;
    cacheRetentionHours: number;
  };
  monitoring: {
    enablePerformanceTracking: boolean;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
    };
  };
  optimization: {
    enableCaching: boolean;
    cacheStrategy: 'aggressive' | 'moderate' | 'conservative';
    enableCompression: boolean;
    enableCDN: boolean;
  };
}

interface AdvancedCompanySettingsData {
  businessProcess: BusinessProcessSettings;
  integration: IntegrationSettings;
  security: SecurityGovernance;
  performance: PerformanceOptimization;
}

// Schema de validación
const advancedSettingsSchema = yup.object({
  businessProcess: yup.object({
    workflowConfig: yup.object({
      maxConcurrentProcesses: yup.number().min(1).max(1000).required(),
      escalationRules: yup.object({
        timeoutHours: yup.number().min(1).max(168).required(),
        escalationLevels: yup.number().min(1).max(10).required()
      })
    }),
    complianceConfig: yup.object({
      dataRetentionDays: yup.number().min(30).max(2555).required()
    })
  }),
  integration: yup.object({
    apiManagement: yup.object({
      rateLimitPerHour: yup.number().min(100).max(100000).required()
    })
  }),
  security: yup.object({
    accessControl: yup.object({
      sessionManagement: yup.object({
        maxConcurrentSessions: yup.number().min(1).max(10).required(),
        sessionTimeout: yup.number().min(5).max(480).required()
      })
    })
  }),
  performance: yup.object({
    systemLimits: yup.object({
      maxUsersPerSession: yup.number().min(10).max(10000).required(),
      maxFileUploadSize: yup.number().min(1).max(1000).required(),
      queryTimeoutSeconds: yup.number().min(5).max(300).required(),
      cacheRetentionHours: yup.number().min(1).max(168).required()
    })
  })
});

// Constantes
const APPROVAL_FLOWS = [
  { value: 'single', label: 'Aprobación única' },
  { value: 'multi', label: 'Aprobación múltiple' },
  { value: 'conditional', label: 'Aprobación condicional' }
];

const ASSIGNMENT_STRATEGIES = [
  { value: 'round_robin', label: 'Rotación circular' },
  { value: 'workload', label: 'Por carga de trabajo' },
  { value: 'skill_based', label: 'Por habilidades' },
  { value: 'random', label: 'Aleatorio' }
];

const AUDIT_LEVELS = [
  { value: 'basic', label: 'Básico - Solo acciones críticas' },
  { value: 'detailed', label: 'Detallado - Todas las acciones' },
  { value: 'comprehensive', label: 'Completo - Incluye datos sensibles' }
];

const ENCRYPTION_LEVELS = [
  { value: 'standard', label: 'Estándar (AES-256)' },
  { value: 'high', label: 'Alto (AES-256 + RSA-4096)' },
  { value: 'military', label: 'Militar (Multi-capa)' }
];

const CACHE_STRATEGIES = [
  { value: 'aggressive', label: 'Agresiva - Máximo rendimiento' },
  { value: 'moderate', label: 'Moderada - Balance performance/memoria' },
  { value: 'conservative', label: 'Conservadora - Mínimo uso de memoria' }
];

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' }
];

export const AdvancedCompanySettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'integration' | 'security' | 'performance'>('business');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<AdvancedCompanySettingsData>({
    resolver: yupResolver(advancedSettingsSchema),
    defaultValues: {
      businessProcess: {
        workflowConfig: {
          enableCustomWorkflows: false,
          maxConcurrentProcesses: 50,
          defaultApprovalFlow: 'single',
          escalationRules: {
            enabled: false,
            timeoutHours: 24,
            escalationLevels: 3
          },
          automaticAssignment: {
            enabled: true,
            strategy: 'round_robin'
          }
        },
        complianceConfig: {
          dataRetentionDays: 365,
          auditLevel: 'detailed',
          requireApprovalFor: [],
          automaticBackup: true,
          complianceReports: true
        },
        qualityAssurance: {
          enableReviews: false,
          mandatoryReviews: false,
          reviewerAssignment: 'automatic',
          qualityMetrics: false
        }
      },
      integration: {
        apiManagement: {
          enableRateLimit: true,
          rateLimitPerHour: 1000,
          enableApiKeys: true,
          logApiCalls: true
        },
        externalServices: {
          enableWebhooks: false,
          webhookRetries: 3,
          enableSSOIntegration: false,
          allowedDomains: []
        },
        dataExchange: {
          enableExports: true,
          exportFormats: ['csv', 'json'],
          enableImports: false,
          importValidation: true
        }
      },
      security: {
        accessControl: {
          enableRBAC: true,
          sessionManagement: {
            maxConcurrentSessions: 3,
            sessionTimeout: 60,
            forceLogoutInactive: false
          },
          ipRestrictions: {
            enabled: false,
            allowedIPs: [],
            blockSuspiciousActivity: true
          }
        },
        dataProtection: {
          encryptionLevel: 'standard',
          enableDataMasking: false,
          personalDataHandling: {
            anonymization: false,
            rightToBeForgotten: true,
            consentManagement: true
          }
        }
      },
      performance: {
        systemLimits: {
          maxUsersPerSession: 100,
          maxFileUploadSize: 50,
          queryTimeoutSeconds: 30,
          cacheRetentionHours: 24
        },
        monitoring: {
          enablePerformanceTracking: true,
          alertThresholds: {
            responseTime: 2000,
            errorRate: 5,
            memoryUsage: 80
          }
        },
        optimization: {
          enableCaching: true,
          cacheStrategy: 'moderate',
          enableCompression: true,
          enableCDN: false
        }
      }
    }
  });

  const watchBusinessProcess = watch('businessProcess');
  const watchIntegration = watch('integration');
  const watchSecurity = watch('security');
  const watchPerformance = watch('performance');

  // Cargar configuraciones
  useEffect(() => {
    loadAdvancedSettings();
  }, []);

  const loadAdvancedSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar llamada a la API
      toast.info('Cargando configuraciones avanzadas...');
    } catch (error) {
      console.error('Error loading advanced settings:', error);
      toast.error('Error al cargar las configuraciones avanzadas');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AdvancedCompanySettingsData) => {
    setIsSaving(true);
    try {
      // TODO: Implementar llamada a la API
      console.log('Saving advanced settings:', data);
      toast.success('Configuraciones avanzadas guardadas correctamente');
      reset(data);
    } catch (error: any) {
      console.error('Error saving advanced settings:', error);
      toast.error(error.message || 'Error al guardar las configuraciones avanzadas');
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
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          type="button"
          variant={activeTab === 'business' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('business')}
          className="flex-1"
        >
          <Workflow className="mr-2 h-4 w-4" />
          Procesos
        </Button>
        <Button
          type="button"
          variant={activeTab === 'integration' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('integration')}
          className="flex-1"
        >
          <Integration className="mr-2 h-4 w-4" />
          Integraciones
        </Button>
        <Button
          type="button"
          variant={activeTab === 'security' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('security')}
          className="flex-1"
        >
          <Shield className="mr-2 h-4 w-4" />
          Seguridad
        </Button>
        <Button
          type="button"
          variant={activeTab === 'performance' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('performance')}
          className="flex-1"
        >
          <Performance className="mr-2 h-4 w-4" />
          Rendimiento
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Procesos de Negocio */}
        {activeTab === 'business' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Configuración de Workflows
                </CardTitle>
                <CardDescription>
                  Gestión de procesos y flujos de trabajo automatizados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Workflows personalizados</Label>
                    <p className="text-sm text-muted-foreground">Permitir creación de workflows personalizados</p>
                  </div>
                  <Switch
                    checked={watchBusinessProcess.workflowConfig.enableCustomWorkflows}
                    onCheckedChange={(checked) => setValue('businessProcess.workflowConfig.enableCustomWorkflows', checked)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Procesos concurrentes máximos</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      {...register('businessProcess.workflowConfig.maxConcurrentProcesses')}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Flujo de aprobación por defecto</Label>
                    <Select 
                      value={watchBusinessProcess.workflowConfig.defaultApprovalFlow}
                      onValueChange={(value) => setValue('businessProcess.workflowConfig.defaultApprovalFlow', value as any)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPROVAL_FLOWS.map(flow => (
                          <SelectItem key={flow.value} value={flow.value}>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>{flow.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Reglas de escalación</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Habilitar escalación automática</Label>
                        <p className="text-sm text-muted-foreground">Escalar tareas no atendidas automáticamente</p>
                      </div>
                      <Switch
                        checked={watchBusinessProcess.workflowConfig.escalationRules.enabled}
                        onCheckedChange={(checked) => setValue('businessProcess.workflowConfig.escalationRules.enabled', checked)}
                      />
                    </div>

                    {watchBusinessProcess.workflowConfig.escalationRules.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                        <div>
                          <Label>Tiempo límite (horas)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={168}
                            {...register('businessProcess.workflowConfig.escalationRules.timeoutHours')}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Niveles de escalación</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            {...register('businessProcess.workflowConfig.escalationRules.escalationLevels')}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Asignación automática</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Habilitar asignación automática</Label>
                        <p className="text-sm text-muted-foreground">Asignar tareas automáticamente a usuarios</p>
                      </div>
                      <Switch
                        checked={watchBusinessProcess.workflowConfig.automaticAssignment.enabled}
                        onCheckedChange={(checked) => setValue('businessProcess.workflowConfig.automaticAssignment.enabled', checked)}
                      />
                    </div>

                    {watchBusinessProcess.workflowConfig.automaticAssignment.enabled && (
                      <div>
                        <Label>Estrategia de asignación</Label>
                        <Select 
                          value={watchBusinessProcess.workflowConfig.automaticAssignment.strategy}
                          onValueChange={(value) => setValue('businessProcess.workflowConfig.automaticAssignment.strategy', value as any)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNMENT_STRATEGIES.map(strategy => (
                              <SelectItem key={strategy.value} value={strategy.value}>
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  <span>{strategy.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Compliance y Auditoría
                </CardTitle>
                <CardDescription>
                  Configuración de cumplimiento normativo y auditoría
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Días de retención de datos</Label>
                  <Input
                    type="number"
                    min={30}
                    max={2555}
                    {...register('businessProcess.complianceConfig.dataRetentionDays')}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Tiempo que se mantendrán los datos antes de ser archivados (30-2555 días)
                  </p>
                </div>

                <div>
                  <Label>Nivel de auditoría</Label>
                  <Select 
                    value={watchBusinessProcess.complianceConfig.auditLevel}
                    onValueChange={(value) => setValue('businessProcess.complianceConfig.auditLevel', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            <span>{level.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Backup automático</Label>
                      <p className="text-sm text-muted-foreground">Realizar copias de seguridad automáticas</p>
                    </div>
                    <Switch
                      checked={watchBusinessProcess.complianceConfig.automaticBackup}
                      onCheckedChange={(checked) => setValue('businessProcess.complianceConfig.automaticBackup', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reportes de compliance</Label>
                      <p className="text-sm text-muted-foreground">Generar reportes de cumplimiento automáticamente</p>
                    </div>
                    <Switch
                      checked={watchBusinessProcess.complianceConfig.complianceReports}
                      onCheckedChange={(checked) => setValue('businessProcess.complianceConfig.complianceReports', checked)}
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
                  <Zap className="h-5 w-5" />
                  Gestión de APIs
                </CardTitle>
                <CardDescription>
                  Configuración de acceso y límites de API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Límite de velocidad</Label>
                    <p className="text-sm text-muted-foreground">Habilitar límites de peticiones por hora</p>
                  </div>
                  <Switch
                    checked={watchIntegration.apiManagement.enableRateLimit}
                    onCheckedChange={(checked) => setValue('integration.apiManagement.enableRateLimit', checked)}
                  />
                </div>

                {watchIntegration.apiManagement.enableRateLimit && (
                  <div>
                    <Label>Peticiones por hora máximas</Label>
                    <Input
                      type="number"
                      min={100}
                      max={100000}
                      {...register('integration.apiManagement.rateLimitPerHour')}
                      className="mt-2"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>API Keys</Label>
                      <p className="text-sm text-muted-foreground">Requerir claves de API para acceso</p>
                    </div>
                    <Switch
                      checked={watchIntegration.apiManagement.enableApiKeys}
                      onCheckedChange={(checked) => setValue('integration.apiManagement.enableApiKeys', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Registro de llamadas API</Label>
                      <p className="text-sm text-muted-foreground">Registrar todas las llamadas a la API</p>
                    </div>
                    <Switch
                      checked={watchIntegration.apiManagement.logApiCalls}
                      onCheckedChange={(checked) => setValue('integration.apiManagement.logApiCalls', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Intercambio de Datos
                </CardTitle>
                <CardDescription>
                  Configuración de importación y exportación de datos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar exportaciones</Label>
                      <p className="text-sm text-muted-foreground">Permitir exportar datos del sistema</p>
                    </div>
                    <Switch
                      checked={watchIntegration.dataExchange.enableExports}
                      onCheckedChange={(checked) => setValue('integration.dataExchange.enableExports', checked)}
                    />
                  </div>

                  {watchIntegration.dataExchange.enableExports && (
                    <div>
                      <Label>Formatos de exportación</Label>
                      <div className="mt-2 space-y-2">
                        {EXPORT_FORMATS.map(format => (
                          <div key={format.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={format.value}
                              checked={watchIntegration.dataExchange.exportFormats.includes(format.value)}
                              onChange={(e) => {
                                const currentFormats = watchIntegration.dataExchange.exportFormats;
                                if (e.target.checked) {
                                  setValue('integration.dataExchange.exportFormats', [...currentFormats, format.value]);
                                } else {
                                  setValue('integration.dataExchange.exportFormats', currentFormats.filter(f => f !== format.value));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor={format.value} className="text-sm font-normal">
                              {format.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar importaciones</Label>
                      <p className="text-sm text-muted-foreground">Permitir importar datos al sistema</p>
                    </div>
                    <Switch
                      checked={watchIntegration.dataExchange.enableImports}
                      onCheckedChange={(checked) => setValue('integration.dataExchange.enableImports', checked)}
                    />
                  </div>

                  {watchIntegration.dataExchange.enableImports && (
                    <div className="flex items-center justify-between ml-6">
                      <div className="space-y-0.5">
                        <Label>Validación de importación</Label>
                        <p className="text-sm text-muted-foreground">Validar datos antes de importar</p>
                      </div>
                      <Switch
                        checked={watchIntegration.dataExchange.importValidation}
                        onCheckedChange={(checked) => setValue('integration.dataExchange.importValidation', checked)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración de Seguridad Avanzada */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Control de Acceso Avanzado
                </CardTitle>
                <CardDescription>
                  Gestión de sesiones y restricciones de acceso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Control de acceso basado en roles (RBAC)</Label>
                    <p className="text-sm text-muted-foreground">Habilitar sistema RBAC avanzado</p>
                  </div>
                  <Switch
                    checked={watchSecurity.accessControl.enableRBAC}
                    onCheckedChange={(checked) => setValue('security.accessControl.enableRBAC', checked)}
                  />
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Gestión de sesiones</Label>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Sesiones concurrentes máximas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...register('security.accessControl.sessionManagement.maxConcurrentSessions')}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Timeout de sesión (minutos)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        {...register('security.accessControl.sessionManagement.sessionTimeout')}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Forzar logout por inactividad</Label>
                        <p className="text-sm text-muted-foreground">Cerrar sesión automáticamente si está inactiva</p>
                      </div>
                      <Switch
                        checked={watchSecurity.accessControl.sessionManagement.forceLogoutInactive}
                        onCheckedChange={(checked) => setValue('security.accessControl.sessionManagement.forceLogoutInactive', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">Restricciones de IP</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Habilitar restricciones de IP</Label>
                        <p className="text-sm text-muted-foreground">Limitar acceso por dirección IP</p>
                      </div>
                      <Switch
                        checked={watchSecurity.accessControl.ipRestrictions.enabled}
                        onCheckedChange={(checked) => setValue('security.accessControl.ipRestrictions.enabled', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Bloquear actividad sospechosa</Label>
                        <p className="text-sm text-muted-foreground">Bloquear automáticamente IPs con comportamiento sospechoso</p>
                      </div>
                      <Switch
                        checked={watchSecurity.accessControl.ipRestrictions.blockSuspiciousActivity}
                        onCheckedChange={(checked) => setValue('security.accessControl.ipRestrictions.blockSuspiciousActivity', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Protección de Datos
                </CardTitle>
                <CardDescription>
                  Configuración de encriptación y manejo de datos personales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nivel de encriptación</Label>
                  <Select 
                    value={watchSecurity.dataProtection.encryptionLevel}
                    onValueChange={(value) => setValue('security.dataProtection.encryptionLevel', value as any)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENCRYPTION_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <span>{level.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enmascaramiento de datos</Label>
                      <p className="text-sm text-muted-foreground">Ocultar datos sensibles en la interfaz</p>
                    </div>
                    <Switch
                      checked={watchSecurity.dataProtection.enableDataMasking}
                      onCheckedChange={(checked) => setValue('security.dataProtection.enableDataMasking', checked)}
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium">Manejo de datos personales</Label>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Anonimización automática</Label>
                          <p className="text-sm text-muted-foreground">Anonimizar datos personales automáticamente</p>
                        </div>
                        <Switch
                          checked={watchSecurity.dataProtection.personalDataHandling.anonymization}
                          onCheckedChange={(checked) => setValue('security.dataProtection.personalDataHandling.anonymization', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Derecho al olvido</Label>
                          <p className="text-sm text-muted-foreground">Permitir eliminación completa de datos personales</p>
                        </div>
                        <Switch
                          checked={watchSecurity.dataProtection.personalDataHandling.rightToBeForgotten}
                          onCheckedChange={(checked) => setValue('security.dataProtection.personalDataHandling.rightToBeForgotten', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Gestión de consentimiento</Label>
                          <p className="text-sm text-muted-foreground">Sistema de gestión de consentimientos GDPR</p>
                        </div>
                        <Switch
                          checked={watchSecurity.dataProtection.personalDataHandling.consentManagement}
                          onCheckedChange={(checked) => setValue('security.dataProtection.personalDataHandling.consentManagement', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Optimización de Rendimiento */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Límites del Sistema
                </CardTitle>
                <CardDescription>
                  Configuración de límites operacionales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Usuarios máximos por sesión</Label>
                    <Input
                      type="number"
                      min={10}
                      max={10000}
                      {...register('performance.systemLimits.maxUsersPerSession')}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Tamaño máximo de archivo (MB)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      {...register('performance.systemLimits.maxFileUploadSize')}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Timeout de consultas (segundos)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={300}
                      {...register('performance.systemLimits.queryTimeoutSeconds')}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Retención de caché (horas)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      {...register('performance.systemLimits.cacheRetentionHours')}
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monitoreo de Rendimiento
                </CardTitle>
                <CardDescription>
                  Configuración de alertas y métricas de rendimiento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Habilitar seguimiento de rendimiento</Label>
                    <p className="text-sm text-muted-foreground">Monitorear métricas de rendimiento del sistema</p>
                  </div>
                  <Switch
                    checked={watchPerformance.monitoring.enablePerformanceTracking}
                    onCheckedChange={(checked) => setValue('performance.monitoring.enablePerformanceTracking', checked)}
                  />
                </div>

                {watchPerformance.monitoring.enablePerformanceTracking && (
                  <div>
                    <Label className="text-base font-medium">Umbrales de alerta</Label>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Tiempo de respuesta (ms)</Label>
                        <Input
                          type="number"
                          min={100}
                          max={10000}
                          {...register('performance.monitoring.alertThresholds.responseTime')}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Tasa de error (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          {...register('performance.monitoring.alertThresholds.errorRate')}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Uso de memoria (%)</Label>
                        <Input
                          type="number"
                          min={50}
                          max={95}
                          {...register('performance.monitoring.alertThresholds.memoryUsage')}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Optimización
                </CardTitle>
                <CardDescription>
                  Configuraciones para mejorar el rendimiento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar caché</Label>
                      <p className="text-sm text-muted-foreground">Usar caché para mejorar rendimiento</p>
                    </div>
                    <Switch
                      checked={watchPerformance.optimization.enableCaching}
                      onCheckedChange={(checked) => setValue('performance.optimization.enableCaching', checked)}
                    />
                  </div>

                  {watchPerformance.optimization.enableCaching && (
                    <div>
                      <Label>Estrategia de caché</Label>
                      <Select 
                        value={watchPerformance.optimization.cacheStrategy}
                        onValueChange={(value) => setValue('performance.optimization.cacheStrategy', value as any)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CACHE_STRATEGIES.map(strategy => (
                            <SelectItem key={strategy.value} value={strategy.value}>
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                <span>{strategy.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar compresión</Label>
                      <p className="text-sm text-muted-foreground">Comprimir respuestas para reducir transferencia</p>
                    </div>
                    <Switch
                      checked={watchPerformance.optimization.enableCompression}
                      onCheckedChange={(checked) => setValue('performance.optimization.enableCompression', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar CDN</Label>
                      <p className="text-sm text-muted-foreground">Usar red de distribución de contenido</p>
                    </div>
                    <Switch
                      checked={watchPerformance.optimization.enableCDN}
                      onCheckedChange={(checked) => setValue('performance.optimization.enableCDN', checked)}
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

export default AdvancedCompanySettings;