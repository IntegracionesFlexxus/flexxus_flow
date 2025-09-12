/**
 * Configuration Validator Component - Sprint 3
 * Siguiendo lineamientos nivel 2: Componente de validación de configuraciones
 * Implementa validación en tiempo real y reportes de estado siguiendo principios SOLID
 */

import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileCheck,
  Settings,
  Shield,
  Database,
  Zap,
  Clock,
  Activity,
  AlertCircle,
  Info
} from 'lucide-react';

// Interfaces para validación
interface ValidationRule {
  id: string;
  category: 'security' | 'performance' | 'compliance' | 'integration' | 'data';
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  message?: string;
  suggestion?: string;
  affectedSettings?: string[];
  executionTime?: number;
}

interface ValidationReport {
  id: string;
  timestamp: Date;
  overallStatus: 'passed' | 'warnings' | 'errors';
  totalRules: number;
  passedRules: number;
  warningRules: number;
  errorRules: number;
  executionTime: number;
  rules: ValidationRule[];
}

interface ValidationConfig {
  categories: {
    security: boolean;
    performance: boolean;
    compliance: boolean;
    integration: boolean;
    data: boolean;
  };
  severity: {
    includeErrors: boolean;
    includeWarnings: boolean;
    includeInfo: boolean;
  };
  scope: {
    company: boolean;
    user: boolean;
    system: boolean;
  };
}

export const ConfigurationValidator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentReport, setCurrentReport] = useState<ValidationReport | null>(null);
  const [validationConfig, setValidationConfig] = useState<ValidationConfig>({
    categories: {
      security: true,
      performance: true,
      compliance: true,
      integration: false,
      data: true
    },
    severity: {
      includeErrors: true,
      includeWarnings: true,
      includeInfo: false
    },
    scope: {
      company: true,
      user: true,
      system: true
    }
  });

  // Reglas de validación simuladas
  const mockValidationRules: ValidationRule[] = [
    // Reglas de Seguridad
    {
      id: 'sec_001',
      category: 'security',
      name: 'Política de Contraseñas',
      description: 'Verificar que la política de contraseñas cumple con los estándares mínimos',
      severity: 'error',
      status: 'pending'
    },
    {
      id: 'sec_002',
      category: 'security',
      name: 'Autenticación de Dos Factores',
      description: 'Comprobar configuración de 2FA',
      severity: 'warning',
      status: 'pending'
    },
    {
      id: 'sec_003',
      category: 'security',
      name: 'Timeout de Sesión',
      description: 'Validar tiempo de expiración de sesiones',
      severity: 'info',
      status: 'pending'
    },
    
    // Reglas de Rendimiento
    {
      id: 'perf_001',
      category: 'performance',
      name: 'Configuración de Caché',
      description: 'Verificar optimización de caché',
      severity: 'warning',
      status: 'pending'
    },
    {
      id: 'perf_002',
      category: 'performance',
      name: 'Límites del Sistema',
      description: 'Comprobar límites operacionales',
      severity: 'error',
      status: 'pending'
    },
    
    // Reglas de Compliance
    {
      id: 'comp_001',
      category: 'compliance',
      name: 'Retención de Datos',
      description: 'Verificar políticas de retención de datos',
      severity: 'error',
      status: 'pending'
    },
    {
      id: 'comp_002',
      category: 'compliance',
      name: 'Auditoría',
      description: 'Comprobar configuración de auditoría',
      severity: 'warning',
      status: 'pending'
    },
    
    // Reglas de Datos
    {
      id: 'data_001',
      category: 'data',
      name: 'Backup Automático',
      description: 'Verificar configuración de backups automáticos',
      severity: 'error',
      status: 'pending'
    },
    {
      id: 'data_002',
      category: 'data',
      name: 'Encriptación',
      description: 'Comprobar nivel de encriptación de datos',
      severity: 'warning',
      status: 'pending'
    }
  ];

  const runValidation = async () => {
    setIsRunning(true);
    setProgress(0);

    // Filtrar reglas según configuración
    const rulesToRun = mockValidationRules.filter(rule => {
      const categoryEnabled = validationConfig.categories[rule.category];
      const severityIncluded = 
        (rule.severity === 'error' && validationConfig.severity.includeErrors) ||
        (rule.severity === 'warning' && validationConfig.severity.includeWarnings) ||
        (rule.severity === 'info' && validationConfig.severity.includeInfo);
      
      return categoryEnabled && severityIncluded;
    });

    const startTime = Date.now();
    const processedRules: ValidationRule[] = [];

    // Simular ejecución de reglas
    for (let i = 0; i < rulesToRun.length; i++) {
      const rule = { ...rulesToRun[i] };
      rule.status = 'running';
      setProgress(((i + 1) / rulesToRun.length) * 100);

      // Simular tiempo de ejecución
      const executionStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      rule.executionTime = Date.now() - executionStart;

      // Simular resultado
      const random = Math.random();
      if (random < 0.7) {
        rule.status = 'passed';
        rule.message = 'Configuración correcta';
      } else if (random < 0.9) {
        rule.status = 'failed';
        rule.message = 'Configuración no cumple con los estándares';
        rule.suggestion = generateSuggestion(rule);
        rule.affectedSettings = [`${rule.category}.${rule.id.split('_')[1]}`];
      } else {
        rule.status = 'skipped';
        rule.message = 'Regla no aplicable en el contexto actual';
      }

      processedRules.push(rule);
    }

    const executionTime = Date.now() - startTime;
    const passedRules = processedRules.filter(r => r.status === 'passed').length;
    const warningRules = processedRules.filter(r => r.status === 'failed' && r.severity === 'warning').length;
    const errorRules = processedRules.filter(r => r.status === 'failed' && r.severity === 'error').length;

    const report: ValidationReport = {
      id: `report_${Date.now()}`,
      timestamp: new Date(),
      overallStatus: errorRules > 0 ? 'errors' : warningRules > 0 ? 'warnings' : 'passed',
      totalRules: processedRules.length,
      passedRules,
      warningRules,
      errorRules,
      executionTime,
      rules: processedRules
    };

    setCurrentReport(report);
    setIsRunning(false);
    setProgress(100);

    // Mostrar resultado
    if (report.overallStatus === 'passed') {
      toast.success(`Validación completada: ${passedRules} reglas pasaron correctamente`);
    } else if (report.overallStatus === 'warnings') {
      toast.warning(`Validación completada con advertencias: ${warningRules} advertencias encontradas`);
    } else {
      toast.error(`Validación falló: ${errorRules} errores críticos encontrados`);
    }
  };

  const generateSuggestion = (rule: ValidationRule): string => {
    const suggestions: { [key: string]: string } = {
      'sec_001': 'Incrementar la longitud mínima de contraseña a 12 caracteres y habilitar caracteres especiales',
      'sec_002': 'Habilitar 2FA obligatorio para usuarios administrativos',
      'perf_001': 'Habilitar caché agresivo para mejorar el rendimiento',
      'perf_002': 'Ajustar límites de usuarios concurrentes según la capacidad del servidor',
      'comp_001': 'Aumentar el período de retención a 2 años para cumplir normativas',
      'comp_002': 'Habilitar auditoría detallada para acciones críticas',
      'data_001': 'Configurar backups automáticos diarios con retención de 30 días',
      'data_002': 'Actualizar a encriptación de alto nivel para datos sensibles'
    };

    return suggestions[rule.id] || 'Revisar la documentación para obtener recomendaciones específicas';
  };

  const getStatusIcon = (status: ValidationRule['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: ValidationRule['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: ValidationRule['category']) => {
    switch (category) {
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'performance':
        return <Zap className="h-4 w-4" />;
      case 'compliance':
        return <FileCheck className="h-4 w-4" />;
      case 'data':
        return <Database className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel de Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Validador de Configuraciones
          </CardTitle>
          <CardDescription>
            Ejecuta validaciones automáticas para verificar la integridad y seguridad de las configuraciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuración de Validación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">Categorías</h4>
              <div className="space-y-2">
                {Object.entries(validationConfig.categories).map(([category, enabled]) => (
                  <label key={category} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setValidationConfig(prev => ({
                        ...prev,
                        categories: {
                          ...prev.categories,
                          [category]: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(category as ValidationRule['category'])}
                      <span className="capitalize">{category}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Severidad</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={validationConfig.severity.includeErrors}
                    onChange={(e) => setValidationConfig(prev => ({
                      ...prev,
                      severity: {
                        ...prev.severity,
                        includeErrors: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-red-600">Errores</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={validationConfig.severity.includeWarnings}
                    onChange={(e) => setValidationConfig(prev => ({
                      ...prev,
                      severity: {
                        ...prev.severity,
                        includeWarnings: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-yellow-600">Advertencias</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={validationConfig.severity.includeInfo}
                    onChange={(e) => setValidationConfig(prev => ({
                      ...prev,
                      severity: {
                        ...prev.severity,
                        includeInfo: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-blue-600">Información</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Alcance</h4>
              <div className="space-y-2">
                {Object.entries(validationConfig.scope).map(([scope, enabled]) => (
                  <label key={scope} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setValidationConfig(prev => ({
                        ...prev,
                        scope: {
                          ...prev.scope,
                          [scope]: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="capitalize">{scope === 'company' ? 'Empresa' : scope === 'user' ? 'Usuario' : 'Sistema'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Controles de Ejecución */}
          <div className="flex items-center justify-between">
            <Button 
              onClick={runValidation}
              disabled={isRunning}
              className="min-w-[140px]"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Ejecutar Validación
                </>
              )}
            </Button>

            {isRunning && (
              <div className="flex items-center gap-2">
                <Progress value={progress} className="w-48" />
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reporte de Resultados */}
      {currentReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Reporte de Validación
              <Badge 
                variant={currentReport.overallStatus === 'passed' ? 'default' : currentReport.overallStatus === 'warnings' ? 'secondary' : 'destructive'}
                className="ml-2"
              >
                {currentReport.overallStatus === 'passed' ? 'Exitoso' : 
                 currentReport.overallStatus === 'warnings' ? 'Con Advertencias' : 'Con Errores'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Ejecutado el {currentReport.timestamp.toLocaleString()} - Tiempo total: {currentReport.executionTime}ms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">{currentReport.totalRules}</div>
                <div className="text-sm text-muted-foreground">Total de reglas</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{currentReport.passedRules}</div>
                <div className="text-sm text-muted-foreground">Aprobadas</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{currentReport.warningRules}</div>
                <div className="text-sm text-muted-foreground">Advertencias</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{currentReport.errorRules}</div>
                <div className="text-sm text-muted-foreground">Errores</div>
              </div>
            </div>

            <Separator />

            {/* Lista Detallada de Reglas */}
            <div className="space-y-3">
              <h4 className="font-medium">Detalle de Reglas</h4>
              {currentReport.rules.map((rule) => (
                <div 
                  key={rule.id}
                  className={`p-4 rounded-lg border ${
                    rule.status === 'failed' ? 'border-red-200 bg-red-50' :
                    rule.status === 'passed' ? 'border-green-200 bg-green-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(rule.status)}
                      {getCategoryIcon(rule.category)}
                      <div>
                        <h5 className="font-medium">{rule.name}</h5>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(rule.severity)}>
                        {rule.severity.toUpperCase()}
                      </Badge>
                      {rule.executionTime && (
                        <span className="text-xs text-muted-foreground">
                          {rule.executionTime}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {rule.message && (
                    <div className="mt-2 text-sm">
                      <p className={
                        rule.status === 'failed' ? 'text-red-700' :
                        rule.status === 'passed' ? 'text-green-700' :
                        'text-gray-700'
                      }>
                        <strong>Resultado:</strong> {rule.message}
                      </p>
                    </div>
                  )}

                  {rule.suggestion && (
                    <div className="mt-2 text-sm">
                      <p className="text-blue-700">
                        <strong>Sugerencia:</strong> {rule.suggestion}
                      </p>
                    </div>
                  )}

                  {rule.affectedSettings && rule.affectedSettings.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        <strong>Configuraciones afectadas:</strong> {rule.affectedSettings.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConfigurationValidator;