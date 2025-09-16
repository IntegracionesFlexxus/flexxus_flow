/**
 * Configuration Manager Component - Sprint 2 & 3
 * Siguiendo lineamientos nivel 2: Panel principal de gestión de configuraciones
 * Orquesta todas las configuraciones de empresa y usuario siguiendo principios SOLID
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Settings,
  Building2,
  User,
  Shield,
  Zap,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  FileCheck,
  Save,
  RotateCcw,
  Download,
  Upload,
  Copy,
  Trash2
} from 'lucide-react';

// Importar los componentes de configuración
import { CompanySettings } from './CompanySettings';
import { AdvancedCompanySettings } from './AdvancedCompanySettings';
import { ProfilePreferences } from './ProfilePreferences';
import { AdvancedUserPreferences } from './AdvancedUserPreferences';

// Interfaces para el estado del sistema
interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  services: {
    database: 'healthy' | 'warning' | 'error';
    cache: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
  };
  lastCheck: Date;
}

interface ConfigurationSnapshot {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdBy: string;
  type: 'full' | 'company' | 'user';
  size: number;
}

type ConfigurationSection = 
  | 'overview'
  | 'company-basic' 
  | 'company-advanced' 
  | 'user-basic' 
  | 'user-advanced'
  | 'system'
  | 'backups';

interface ConfigurationStats {
  totalSettings: number;
  lastModified: Date;
  modifiedBy: string;
  validationStatus: 'valid' | 'warnings' | 'errors';
  cacheStatus: 'active' | 'stale' | 'disabled';
}

export const ConfigurationManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ConfigurationSection>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'healthy',
    services: {
      database: 'healthy',
      cache: 'healthy',
      api: 'healthy',
      storage: 'healthy'
    },
    lastCheck: new Date()
  });
  const [configStats, setConfigStats] = useState<ConfigurationStats>({
    totalSettings: 142,
    lastModified: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    modifiedBy: 'Usuario Actual',
    validationStatus: 'valid',
    cacheStatus: 'active'
  });
  const [snapshots, setSnapshots] = useState<ConfigurationSnapshot[]>([
    {
      id: '1',
      name: 'Configuración Inicial',
      description: 'Snapshot después de la configuración inicial del sistema',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
      createdBy: 'Sistema',
      type: 'full',
      size: 1.2
    },
    {
      id: '2',
      name: 'Pre Sprint 3',
      description: 'Backup antes de implementar configuraciones avanzadas',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      createdBy: 'Admin',
      type: 'full',
      size: 2.8
    }
  ]);

  // Cargar estado del sistema al montar
  useEffect(() => {
    loadSystemHealth();
    loadConfigurationStats();
  }, []);

  const loadSystemHealth = async () => {
    try {
      // TODO: Implementar llamada real a la API de health check
      // Simulando verificación de estado
      setTimeout(() => {
        setSystemHealth(prev => ({
          ...prev,
          lastCheck: new Date()
        }));
      }, 1000);
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  };

  const loadConfigurationStats = async () => {
    try {
      // TODO: Implementar llamada real a la API de stats
      // Por ahora usando datos simulados
    } catch (error) {
      console.error('Error loading configuration stats:', error);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsLoading(true);
    try {
      const newSnapshot: ConfigurationSnapshot = {
        id: Date.now().toString(),
        name: `Snapshot ${new Date().toLocaleDateString()}`,
        description: 'Snapshot manual creado desde el panel de administración',
        createdAt: new Date(),
        createdBy: 'Usuario Actual',
        type: 'full',
        size: 3.1
      };

      setSnapshots(prev => [newSnapshot, ...prev]);
      toast.success('Snapshot creado correctamente');
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('Error al crear el snapshot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;

    setIsLoading(true);
    try {
      // TODO: Implementar restauración real
      toast.success(`Configuración restaurada desde: ${snapshot.name}`);
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      toast.error('Error al restaurar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateConfiguration = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar validación real
      setTimeout(() => {
        setConfigStats(prev => ({
          ...prev,
          validationStatus: 'valid'
        }));
        toast.success('Configuración validada correctamente');
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error validating configuration:', error);
      toast.error('Error al validar la configuración');
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar limpieza de caché real
      setTimeout(() => {
        setConfigStats(prev => ({
          ...prev,
          cacheStatus: 'active'
        }));
        toast.success('Caché limpiado correctamente');
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Error al limpiar el caché');
      setIsLoading(false);
    }
  };

  const getHealthIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getHealthColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Estado del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Estado del Sistema
                </CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real del sistema de configuraciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className={`p-3 rounded-lg ${getHealthColor(systemHealth.overall)}`}>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(systemHealth.overall)}
                      <span className="font-medium">General</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${getHealthColor(systemHealth.services.database)}`}>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(systemHealth.services.database)}
                      <span className="font-medium">Base de Datos</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${getHealthColor(systemHealth.services.cache)}`}>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(systemHealth.services.cache)}
                      <span className="font-medium">Caché</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${getHealthColor(systemHealth.services.api)}`}>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(systemHealth.services.api)}
                      <span className="font-medium">API</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${getHealthColor(systemHealth.services.storage)}`}>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(systemHealth.services.storage)}
                      <span className="font-medium">Almacenamiento</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Última verificación: {systemHealth.lastCheck.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Estadísticas de Configuración */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Estadísticas de Configuración
                </CardTitle>
                <CardDescription>
                  Resumen del estado actual de las configuraciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{configStats.totalSettings}</div>
                    <div className="text-sm text-muted-foreground">Configuraciones totales</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {configStats.validationStatus === 'valid' ? '✓' : '!'}
                    </div>
                    <div className="text-sm text-muted-foreground">Estado de validación</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {configStats.cacheStatus === 'active' ? '●' : '○'}
                    </div>
                    <div className="text-sm text-muted-foreground">Estado del caché</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.floor((Date.now() - configStats.lastModified.getTime()) / (1000 * 60))}m
                    </div>
                    <div className="text-sm text-muted-foreground">Última modificación</div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Última modificación por: {configStats.modifiedBy}</p>
                  <p>Fecha: {configStats.lastModified.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Acciones Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Acciones Rápidas
                </CardTitle>
                <CardDescription>
                  Herramientas de administración y mantenimiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={handleValidateConfiguration}
                    disabled={isLoading}
                    className="h-auto flex-col py-4"
                  >
                    <FileCheck className="h-5 w-5 mb-2" />
                    <span>Validar Configuración</span>
                  </Button>

                  <Button 
                    onClick={handleClearCache}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto flex-col py-4"
                  >
                    <Database className="h-5 w-5 mb-2" />
                    <span>Limpiar Caché</span>
                  </Button>

                  <Button 
                    onClick={handleCreateSnapshot}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto flex-col py-4"
                  >
                    <Save className="h-5 w-5 mb-2" />
                    <span>Crear Backup</span>
                  </Button>

                  <Button 
                    onClick={loadSystemHealth}
                    disabled={isLoading}
                    variant="outline"
                    className="h-auto flex-col py-4"
                  >
                    <Activity className="h-5 w-5 mb-2" />
                    <span>Verificar Sistema</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'company-basic':
        return <CompanySettings />;

      case 'company-advanced':
        return <AdvancedCompanySettings />;

      case 'user-basic':
        return <ProfilePreferences />;

      case 'user-advanced':
        return <AdvancedUserPreferences />;

      case 'backups':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Gestión de Snapshots
                </CardTitle>
                <CardDescription>
                  Administra backups y restauraciones de configuración
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Snapshots Disponibles</h3>
                  <Button onClick={handleCreateSnapshot} disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    Crear Snapshot
                  </Button>
                </div>

                <div className="space-y-3">
                  {snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{snapshot.name}</h4>
                        <p className="text-sm text-muted-foreground">{snapshot.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {snapshot.createdAt.toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {snapshot.createdBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {snapshot.size} MB
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreSnapshot(snapshot.id)}
                          disabled={isLoading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restaurar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Implementar descarga
                            toast.info('Descargando snapshot...');
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>Sección en desarrollo...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/40 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuraciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Panel de administración del sistema
          </p>
        </div>

        <nav className="space-y-2">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              General
            </h3>
            <Button
              variant={activeSection === 'overview' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('overview')}
            >
              <Activity className="mr-2 h-4 w-4" />
              Resumen General
            </Button>
          </div>

          <Separator className="my-4" />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Empresa
            </h3>
            <Button
              variant={activeSection === 'company-basic' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('company-basic')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Configuración Básica
            </Button>
            <Button
              variant={activeSection === 'company-advanced' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('company-advanced')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Configuración Avanzada
            </Button>
          </div>

          <Separator className="my-4" />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Usuario
            </h3>
            <Button
              variant={activeSection === 'user-basic' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('user-basic')}
            >
              <User className="mr-2 h-4 w-4" />
              Preferencias Básicas
            </Button>
            <Button
              variant={activeSection === 'user-advanced' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('user-advanced')}
            >
              <Zap className="mr-2 h-4 w-4" />
              Preferencias Avanzadas
            </Button>
          </div>

          <Separator className="my-4" />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sistema
            </h3>
            <Button
              variant={activeSection === 'backups' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveSection('backups')}
            >
              <Database className="mr-2 h-4 w-4" />
              Backups y Snapshots
            </Button>
          </div>
        </nav>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ConfigurationManager;