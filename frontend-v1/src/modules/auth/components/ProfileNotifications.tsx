/**
 * Profile Notifications Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Componente para gestión de notificaciones
 * Implementa principios SOLID con responsabilidad única para preferencias de notificación
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { profileService, type NotificationPreferences } from '@modules/auth/services/profileService';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Shield,
  TrendingUp,
  Package,
  Calendar,
  Users,
  AlertCircle,
  Save,
  Loader2,
  BellOff,
  Volume2,
  Vibrate,
  Check,
  X
} from 'lucide-react';

// Tipos para el formulario
interface NotificationFormData {
  email: {
    marketing: boolean;
    updates: boolean;
    security: boolean;
    reports: boolean;
    news: boolean;
    tips: boolean;
  };
  push: {
    enabled: boolean;
    sound: boolean;
    vibrate: boolean;
    desktop: boolean;
    mobile: boolean;
  };
  sms: {
    enabled: boolean;
    security: boolean;
    critical: boolean;
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
    showBadge: boolean;
  };
  schedule: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    weekendsEnabled: boolean;
  };
}

// Categorías de notificaciones con descripciones
const NOTIFICATION_CATEGORIES = {
  email: {
    icon: Mail,
    title: 'Notificaciones por Email',
    description: 'Controla qué emails recibes',
    options: [
      {
        key: 'marketing',
        label: 'Marketing y Promociones',
        description: 'Ofertas especiales, nuevas características y eventos',
        icon: TrendingUp
      },
      {
        key: 'updates',
        label: 'Actualizaciones del Producto',
        description: 'Nuevas versiones, mejoras y cambios importantes',
        icon: Package
      },
      {
        key: 'security',
        label: 'Alertas de Seguridad',
        description: 'Inicios de sesión, cambios de contraseña y actividad sospechosa',
        icon: Shield,
        important: true
      },
      {
        key: 'reports',
        label: 'Reportes y Resúmenes',
        description: 'Resúmenes semanales, reportes mensuales y estadísticas',
        icon: Calendar
      },
      {
        key: 'news',
        label: 'Noticias y Blog',
        description: 'Artículos, tutoriales y contenido educativo',
        icon: MessageSquare
      },
      {
        key: 'tips',
        label: 'Tips y Mejores Prácticas',
        description: 'Consejos para aprovechar mejor la plataforma',
        icon: AlertCircle
      }
    ]
  },
  push: {
    icon: Bell,
    title: 'Notificaciones Push',
    description: 'Notificaciones en tiempo real en tu navegador',
    options: [
      {
        key: 'enabled',
        label: 'Habilitar Notificaciones Push',
        description: 'Recibe notificaciones en tu navegador',
        icon: Bell
      },
      {
        key: 'sound',
        label: 'Sonido de Notificación',
        description: 'Reproducir sonido con las notificaciones',
        icon: Volume2
      },
      {
        key: 'vibrate',
        label: 'Vibración (Móvil)',
        description: 'Vibrar en dispositivos móviles',
        icon: Vibrate
      },
      {
        key: 'desktop',
        label: 'Notificaciones de Escritorio',
        description: 'Mostrar en escritorio cuando estés fuera de la app',
        icon: Bell
      },
      {
        key: 'mobile',
        label: 'Notificaciones Móviles',
        description: 'Recibir en la app móvil',
        icon: Smartphone
      }
    ]
  },
  sms: {
    icon: MessageSquare,
    title: 'Notificaciones SMS',
    description: 'Mensajes de texto importantes',
    options: [
      {
        key: 'enabled',
        label: 'Habilitar SMS',
        description: 'Recibe mensajes de texto',
        icon: MessageSquare
      },
      {
        key: 'security',
        label: 'Alertas de Seguridad',
        description: 'Códigos 2FA y alertas críticas',
        icon: Shield,
        important: true
      },
      {
        key: 'critical',
        label: 'Alertas Críticas',
        description: 'Solo notificaciones muy importantes',
        icon: AlertCircle,
        important: true
      }
    ]
  }
};

export const ProfileNotifications: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  const {
    watch,
    setValue,
    handleSubmit,
    formState: { isDirty },
    reset
  } = useForm<NotificationFormData>({
    defaultValues: {
      email: {
        marketing: false,
        updates: true,
        security: true,
        reports: false,
        news: false,
        tips: false
      },
      push: {
        enabled: false,
        sound: true,
        vibrate: true,
        desktop: false,
        mobile: false
      },
      sms: {
        enabled: false,
        security: true,
        critical: true
      },
      inApp: {
        enabled: true,
        sound: true,
        showBadge: true
      },
      schedule: {
        enabled: false,
        startHour: 9,
        endHour: 18,
        weekendsEnabled: false
      }
    }
  });

  // Verificar permisos de notificaciones push
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Cargar preferencias al montar
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getPreferences();
      
      if (data.notifications) {
        setPreferences(data.notifications);
        
        // Actualizar el formulario con los datos cargados
        reset({
          email: {
            marketing: data.notifications.email?.marketing || false,
            updates: data.notifications.email?.updates || true,
            security: data.notifications.email?.security || true,
            reports: data.notifications.email?.reports || false,
            news: false,
            tips: false
          },
          push: {
            enabled: data.notifications.push?.enabled || false,
            sound: data.notifications.push?.sound || true,
            vibrate: data.notifications.push?.vibrate || true,
            desktop: false,
            mobile: false
          },
          sms: {
            enabled: data.notifications.sms?.enabled || false,
            security: data.notifications.sms?.security || true,
            critical: true
          },
          inApp: {
            enabled: true,
            sound: true,
            showBadge: true
          },
          schedule: {
            enabled: false,
            startHour: 9,
            endHour: 18,
            weekendsEnabled: false
          }
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast.error('Error al cargar las preferencias de notificación');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        
        if (permission === 'granted') {
          setValue('push.enabled', true);
          toast.success('Notificaciones push habilitadas');
        } else if (permission === 'denied') {
          setValue('push.enabled', false);
          toast.error('Has denegado los permisos de notificación');
        }
      } catch (error) {
        console.error('Error requesting push permission:', error);
        toast.error('Error al solicitar permisos de notificación');
      }
    } else {
      toast.error('Tu navegador no soporta notificaciones push');
    }
  };

  const onSubmit = async (data: NotificationFormData) => {
    setIsSaving(true);
    try {
      // Construir objeto de preferencias para enviar
      const notificationPrefs: NotificationPreferences = {
        email: {
          marketing: data.email.marketing,
          updates: data.email.updates,
          security: data.email.security,
          reports: data.email.reports
        },
        push: {
          enabled: data.push.enabled,
          sound: data.push.sound,
          vibrate: data.push.vibrate
        },
        sms: {
          enabled: data.sms.enabled,
          security: data.sms.security
        }
      };

      const response = await profileService.updatePreferences({
        notifications: notificationPrefs
      });
      
      if (response.success) {
        setPreferences(response.data.preferences.notifications);
        toast.success('Preferencias de notificación actualizadas');
        reset(data); // Reset para limpiar el estado dirty
      } else {
        throw new Error(response.message || 'Error al actualizar preferencias');
      }
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.message || 'Error al actualizar las preferencias');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAll = (category: 'email' | 'push' | 'sms', enabled: boolean) => {
    const categoryData = watch(category);
    Object.keys(categoryData).forEach(key => {
      setValue(`${category}.${key}` as any, enabled);
    });
  };

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Notificación de Prueba', {
        body: 'Esta es una notificación de prueba desde tu perfil',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: watch('push.vibrate') ? [200, 100, 200] : undefined
      });
    } else {
      toast.info('Las notificaciones push no están habilitadas');
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Notificaciones por Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Notificaciones por Email</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll('email', true)}
              >
                Activar todas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll('email', false)}
              >
                Desactivar todas
              </Button>
            </div>
          </div>
          <CardDescription>
            Controla qué emails recibes de nosotros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CATEGORIES.email.options.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.key} className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`email-${option.key}`}>{option.label}</Label>
                      {option.important && (
                        <Badge variant="secondary" className="text-xs">
                          Importante
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`email-${option.key}`}
                  checked={watch(`email.${option.key as keyof typeof NOTIFICATION_CATEGORIES.email.options}`)}
                  onCheckedChange={(checked) => 
                    setValue(`email.${option.key as keyof typeof NOTIFICATION_CATEGORIES.email.options}`, checked)
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notificaciones Push */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notificaciones Push</CardTitle>
            </div>
            {pushPermission === 'default' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestPushPermission}
              >
                Habilitar Push
              </Button>
            )}
            {pushPermission === 'granted' && (
              <Badge variant="success" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Habilitado
              </Badge>
            )}
            {pushPermission === 'denied' && (
              <Badge variant="destructive" className="text-xs">
                <X className="h-3 w-3 mr-1" />
                Bloqueado
              </Badge>
            )}
          </div>
          <CardDescription>
            Notificaciones en tiempo real en tu navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushPermission === 'denied' && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              Las notificaciones push están bloqueadas. Para habilitarlas, 
              cambia los permisos del sitio en la configuración de tu navegador.
            </div>
          )}
          
          {NOTIFICATION_CATEGORIES.push.options.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.key} className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor={`push-${option.key}`}>{option.label}</Label>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`push-${option.key}`}
                  checked={watch(`push.${option.key as keyof typeof NOTIFICATION_CATEGORIES.push.options}`)}
                  onCheckedChange={(checked) => 
                    setValue(`push.${option.key as keyof typeof NOTIFICATION_CATEGORIES.push.options}`, checked)
                  }
                  disabled={pushPermission !== 'granted' && option.key === 'enabled'}
                />
              </div>
            );
          })}
          
          {pushPermission === 'granted' && watch('push.enabled') && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testNotification}
                className="w-full"
              >
                <Bell className="mr-2 h-4 w-4" />
                Enviar Notificación de Prueba
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notificaciones SMS */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Notificaciones SMS</CardTitle>
          </div>
          <CardDescription>
            Mensajes de texto para alertas importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CATEGORIES.sms.options.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.key} className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`sms-${option.key}`}>{option.label}</Label>
                      {option.important && (
                        <Badge variant="secondary" className="text-xs">
                          Recomendado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={`sms-${option.key}`}
                  checked={watch(`sms.${option.key as keyof typeof NOTIFICATION_CATEGORIES.sms.options}`)}
                  onCheckedChange={(checked) => 
                    setValue(`sms.${option.key as keyof typeof NOTIFICATION_CATEGORIES.sms.options}`, checked)
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Horario de Notificaciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Horario de Notificaciones</CardTitle>
          </div>
          <CardDescription>
            Define cuándo quieres recibir notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="schedule-enabled">Horario Personalizado</Label>
              <p className="text-sm text-muted-foreground">
                Solo recibir notificaciones en horarios específicos
              </p>
            </div>
            <Switch
              id="schedule-enabled"
              checked={watch('schedule.enabled')}
              onCheckedChange={(checked) => setValue('schedule.enabled', checked)}
            />
          </div>
          
          {watch('schedule.enabled') && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-hour">Hora de Inicio</Label>
                  <select
                    id="start-hour"
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={watch('schedule.startHour')}
                    onChange={(e) => setValue('schedule.startHour', parseInt(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="end-hour">Hora de Fin</Label>
                  <select
                    id="end-hour"
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={watch('schedule.endHour')}
                    onChange={(e) => setValue('schedule.endHour', parseInt(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekends">Incluir Fines de Semana</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones sábados y domingos
                  </p>
                </div>
                <Switch
                  id="weekends"
                  checked={watch('schedule.weekendsEnabled')}
                  onCheckedChange={(checked) => setValue('schedule.weekendsEnabled', checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-2">
        <Button 
          type="button"
          variant="outline"
          onClick={() => loadPreferences()}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={!isDirty || isSaving}
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
  );
};

export default ProfileNotifications;