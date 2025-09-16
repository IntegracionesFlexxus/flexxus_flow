/**
 * Company Settings Component - Sprint 2 & 3
 * Siguiendo lineamientos nivel 2: Gestión completa de configuraciones de empresa
 * Implementa principios SOLID con responsabilidad única para configuración empresarial
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
  Building2,
  Shield,
  Bell,
  Zap,
  Settings,
  Save,
  Loader2,
  Lock,
  Users,
  Mail,
  Calendar,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Smartphone
} from 'lucide-react';

// Interfaces para tipado fuerte
interface GeneralSettings {
  companyName: string;
  companyDescription?: string;
  website?: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  timezone: string;
  language: string;
  currency: string;
}

interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  twoFactorAuth: {
    enabled: boolean;
    required: boolean;
  };
  sessionTimeout: number;
  ipWhitelist: string[];
  auditLogging: boolean;
}

interface NotificationSettings {
  emailNotifications: {
    enabled: boolean;
    types: string[];
  };
  pushNotifications: {
    enabled: boolean;
    types: string[];
  };
  webhooks: {
    enabled: boolean;
    urls: string[];
  };
}

interface CompanySettingsData {
  general: GeneralSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
}

// Schema de validación
const companySettingsSchema = yup.object({
  general: yup.object({
    companyName: yup.string().required('El nombre de la empresa es requerido').min(2, 'Mínimo 2 caracteres'),
    companyDescription: yup.string().max(500, 'Máximo 500 caracteres'),
    website: yup.string().url('URL no válida').nullable(),
    industry: yup.string().required('La industria es requerida'),
    size: yup.string().oneOf(['startup', 'small', 'medium', 'large', 'enterprise']).required(),
    timezone: yup.string().required('La zona horaria es requerida'),
    language: yup.string().required('El idioma es requerido'),
    currency: yup.string().required('La moneda es requerida')
  }),
  security: yup.object({
    passwordPolicy: yup.object({
      minLength: yup.number().min(8, 'Mínimo 8 caracteres').max(32, 'Máximo 32 caracteres').required(),
      requireUppercase: yup.boolean(),
      requireNumbers: yup.boolean(),
      requireSpecialChars: yup.boolean()
    }),
    twoFactorAuth: yup.object({
      enabled: yup.boolean(),
      required: yup.boolean()
    }),
    sessionTimeout: yup.number().min(5, 'Mínimo 5 minutos').max(480, 'Máximo 8 horas').required(),
    auditLogging: yup.boolean()
  }),
  notifications: yup.object({
    emailNotifications: yup.object({
      enabled: yup.boolean(),
      types: yup.array().of(yup.string())
    }),
    pushNotifications: yup.object({
      enabled: yup.boolean(),
      types: yup.array().of(yup.string())
    }),
    webhooks: yup.object({
      enabled: yup.boolean(),
      urls: yup.array().of(yup.string().url('URL no válida'))
    })
  })
});

// Constantes de configuración
const INDUSTRIES = [
  { value: 'technology', label: 'Tecnología' },
  { value: 'finance', label: 'Finanzas' },
  { value: 'healthcare', label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'retail', label: 'Retail' },
  { value: 'consulting', label: 'Consultoría' },
  { value: 'other', label: 'Otro' }
];

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10 empleados)' },
  { value: 'small', label: 'Pequeña (11-50 empleados)' },
  { value: 'medium', label: 'Mediana (51-200 empleados)' },
  { value: 'large', label: 'Grande (201-1000 empleados)' },
  { value: 'enterprise', label: 'Empresa (1000+ empleados)' }
];

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' }
];

const LANGUAGES = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' }
];

const CURRENCIES = [
  { value: 'ARS', label: 'Peso Argentino (ARS)', symbol: '$' },
  { value: 'USD', label: 'Dólar (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'Libra (GBP)', symbol: '£' }
];

const NOTIFICATION_TYPES = [
  { value: 'user_login', label: 'Inicios de sesión' },
  { value: 'user_registration', label: 'Registros de usuario' },
  { value: 'password_change', label: 'Cambios de contraseña' },
  { value: 'security_alerts', label: 'Alertas de seguridad' },
  { value: 'system_updates', label: 'Actualizaciones del sistema' }
];

export const CompanySettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications'>('general');

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<CompanySettingsData>({
    resolver: yupResolver(companySettingsSchema),
    defaultValues: {
      general: {
        companyName: '',
        companyDescription: '',
        website: '',
        industry: 'technology',
        size: 'small',
        timezone: 'America/Argentina/Buenos_Aires',
        language: 'es',
        currency: 'ARS'
      },
      security: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialChars: false
        },
        twoFactorAuth: {
          enabled: false,
          required: false
        },
        sessionTimeout: 60,
        ipWhitelist: [],
        auditLogging: true
      },
      notifications: {
        emailNotifications: {
          enabled: true,
          types: ['security_alerts']
        },
        pushNotifications: {
          enabled: false,
          types: []
        },
        webhooks: {
          enabled: false,
          urls: []
        }
      }
    }
  });

  const watchSecurity = watch('security');
  const watchNotifications = watch('notifications');

  // Cargar configuraciones al montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar llamada a la API
      toast.info('Cargando configuraciones...');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar las configuraciones');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CompanySettingsData) => {
    setIsSaving(true);
    try {
      // TODO: Implementar llamada a la API
      console.log('Saving settings:', data);
      toast.success('Configuraciones guardadas correctamente');
      reset(data); // Reset para limpiar el estado dirty
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Error al guardar las configuraciones');
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
          variant={activeTab === 'general' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('general')}
          className="flex-1"
        >
          <Building2 className="mr-2 h-4 w-4" />
          General
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
          variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('notifications')}
          className="flex-1"
        >
          <Bell className="mr-2 h-4 w-4" />
          Notificaciones
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Configuración General */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información de la Empresa
                </CardTitle>
                <CardDescription>
                  Configuración básica de la organización
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                    <Input
                      id="companyName"
                      {...register('general.companyName')}
                      placeholder="Mi Empresa S.A."
                      className="mt-2"
                    />
                    {errors.general?.companyName && (
                      <p className="text-sm text-destructive mt-1">{errors.general.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="website">Sitio Web</Label>
                    <Input
                      id="website"
                      {...register('general.website')}
                      placeholder="https://www.miempresa.com"
                      className="mt-2"
                    />
                    {errors.general?.website && (
                      <p className="text-sm text-destructive mt-1">{errors.general.website.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyDescription">Descripción</Label>
                  <Input
                    id="companyDescription"
                    {...register('general.companyDescription')}
                    placeholder="Descripción breve de la empresa..."
                    className="mt-2"
                  />
                  {errors.general?.companyDescription && (
                    <p className="text-sm text-destructive mt-1">{errors.general.companyDescription.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry">Industria *</Label>
                    <Select 
                      value={watch('general.industry')} 
                      onValueChange={(value) => setValue('general.industry', value)}
                    >
                      <SelectTrigger id="industry" className="mt-2">
                        <SelectValue placeholder="Selecciona industria" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(industry => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.general?.industry && (
                      <p className="text-sm text-destructive mt-1">{errors.general.industry.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="size">Tamaño de Empresa *</Label>
                    <Select 
                      value={watch('general.size')} 
                      onValueChange={(value) => setValue('general.size', value as any)}
                    >
                      <SelectTrigger id="size" className="mt-2">
                        <SelectValue placeholder="Selecciona tamaño" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map(size => (
                          <SelectItem key={size.value} value={size.value}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{size.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.general?.size && (
                      <p className="text-sm text-destructive mt-1">{errors.general.size.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configuración Regional
                </CardTitle>
                <CardDescription>
                  Ajustes de localización y formato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="timezone">Zona Horaria *</Label>
                    <Select 
                      value={watch('general.timezone')} 
                      onValueChange={(value) => setValue('general.timezone', value)}
                    >
                      <SelectTrigger id="timezone" className="mt-2">
                        <SelectValue placeholder="Selecciona zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{tz.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">Idioma *</Label>
                    <Select 
                      value={watch('general.language')} 
                      onValueChange={(value) => setValue('general.language', value)}
                    >
                      <SelectTrigger id="language" className="mt-2">
                        <SelectValue placeholder="Selecciona idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{lang.flag}</span>
                              <span>{lang.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="currency">Moneda *</Label>
                    <Select 
                      value={watch('general.currency')} 
                      onValueChange={(value) => setValue('general.currency', value)}
                    >
                      <SelectTrigger id="currency" className="mt-2">
                        <SelectValue placeholder="Selecciona moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(currency => (
                          <SelectItem key={currency.value} value={currency.value}>
                            <div className="flex items-center gap-2">
                              <span>{currency.symbol}</span>
                              <span>{currency.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración de Seguridad */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Política de Contraseñas
                </CardTitle>
                <CardDescription>
                  Define los requisitos de seguridad para las contraseñas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="minLength">Longitud mínima</Label>
                  <Input
                    id="minLength"
                    type="number"
                    min={8}
                    max={32}
                    {...register('security.passwordPolicy.minLength')}
                    className="mt-2"
                  />
                  {errors.security?.passwordPolicy?.minLength && (
                    <p className="text-sm text-destructive mt-1">{errors.security.passwordPolicy.minLength.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireUppercase">Requerir mayúsculas</Label>
                      <p className="text-sm text-muted-foreground">Al menos una letra mayúscula</p>
                    </div>
                    <Switch
                      id="requireUppercase"
                      checked={watchSecurity.passwordPolicy.requireUppercase}
                      onCheckedChange={(checked) => setValue('security.passwordPolicy.requireUppercase', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireNumbers">Requerir números</Label>
                      <p className="text-sm text-muted-foreground">Al menos un dígito</p>
                    </div>
                    <Switch
                      id="requireNumbers"
                      checked={watchSecurity.passwordPolicy.requireNumbers}
                      onCheckedChange={(checked) => setValue('security.passwordPolicy.requireNumbers', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireSpecialChars">Requerir caracteres especiales</Label>
                      <p className="text-sm text-muted-foreground">Al menos un símbolo (!@#$%^&*)</p>
                    </div>
                    <Switch
                      id="requireSpecialChars"
                      checked={watchSecurity.passwordPolicy.requireSpecialChars}
                      onCheckedChange={(checked) => setValue('security.passwordPolicy.requireSpecialChars', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Autenticación de Dos Factores
                </CardTitle>
                <CardDescription>
                  Configuración de 2FA para mayor seguridad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactorEnabled">Habilitar 2FA</Label>
                    <p className="text-sm text-muted-foreground">Permitir autenticación de dos factores</p>
                  </div>
                  <Switch
                    id="twoFactorEnabled"
                    checked={watchSecurity.twoFactorAuth.enabled}
                    onCheckedChange={(checked) => setValue('security.twoFactorAuth.enabled', checked)}
                  />
                </div>

                {watchSecurity.twoFactorAuth.enabled && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="twoFactorRequired">2FA obligatorio</Label>
                      <p className="text-sm text-muted-foreground">Requerir 2FA para todos los usuarios</p>
                    </div>
                    <Switch
                      id="twoFactorRequired"
                      checked={watchSecurity.twoFactorAuth.required}
                      onCheckedChange={(checked) => setValue('security.twoFactorAuth.required', checked)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Configuración de Sesiones
                </CardTitle>
                <CardDescription>
                  Gestión de sesiones de usuario y auditoría
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sessionTimeout">Tiempo de expiración de sesión (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min={5}
                    max={480}
                    {...register('security.sessionTimeout')}
                    className="mt-2"
                  />
                  {errors.security?.sessionTimeout && (
                    <p className="text-sm text-destructive mt-1">{errors.security.sessionTimeout.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auditLogging">Registro de auditoría</Label>
                    <p className="text-sm text-muted-foreground">Registrar todas las acciones importantes</p>
                  </div>
                  <Switch
                    id="auditLogging"
                    checked={watchSecurity.auditLogging}
                    onCheckedChange={(checked) => setValue('security.auditLogging', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración de Notificaciones */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Notificaciones por Email
                </CardTitle>
                <CardDescription>
                  Configuración de notificaciones por correo electrónico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailEnabled">Habilitar notificaciones por email</Label>
                    <p className="text-sm text-muted-foreground">Enviar notificaciones importantes por correo</p>
                  </div>
                  <Switch
                    id="emailEnabled"
                    checked={watchNotifications.emailNotifications.enabled}
                    onCheckedChange={(checked) => setValue('notifications.emailNotifications.enabled', checked)}
                  />
                </div>

                {watchNotifications.emailNotifications.enabled && (
                  <div className="space-y-3">
                    <Label>Tipos de notificaciones</Label>
                    {NOTIFICATION_TYPES.map(type => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={type.value}
                          checked={watchNotifications.emailNotifications.types.includes(type.value)}
                          onChange={(e) => {
                            const currentTypes = watchNotifications.emailNotifications.types;
                            if (e.target.checked) {
                              setValue('notifications.emailNotifications.types', [...currentTypes, type.value]);
                            } else {
                              setValue('notifications.emailNotifications.types', currentTypes.filter(t => t !== type.value));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={type.value} className="text-sm font-normal">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificaciones Push
                </CardTitle>
                <CardDescription>
                  Configuración de notificaciones push en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushEnabled">Habilitar notificaciones push</Label>
                    <p className="text-sm text-muted-foreground">Notificaciones instantáneas en la aplicación</p>
                  </div>
                  <Switch
                    id="pushEnabled"
                    checked={watchNotifications.pushNotifications.enabled}
                    onCheckedChange={(checked) => setValue('notifications.pushNotifications.enabled', checked)}
                  />
                </div>

                {watchNotifications.pushNotifications.enabled && (
                  <div className="space-y-3">
                    <Label>Tipos de notificaciones</Label>
                    {NOTIFICATION_TYPES.map(type => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`push_${type.value}`}
                          checked={watchNotifications.pushNotifications.types.includes(type.value)}
                          onChange={(e) => {
                            const currentTypes = watchNotifications.pushNotifications.types;
                            if (e.target.checked) {
                              setValue('notifications.pushNotifications.types', [...currentTypes, type.value]);
                            } else {
                              setValue('notifications.pushNotifications.types', currentTypes.filter(t => t !== type.value));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`push_${type.value}`} className="text-sm font-normal">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>
                  Configuración de webhooks para integraciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="webhooksEnabled">Habilitar webhooks</Label>
                    <p className="text-sm text-muted-foreground">Enviar eventos a sistemas externos</p>
                  </div>
                  <Switch
                    id="webhooksEnabled"
                    checked={watchNotifications.webhooks.enabled}
                    onCheckedChange={(checked) => setValue('notifications.webhooks.enabled', checked)}
                  />
                </div>

                {watchNotifications.webhooks.enabled && (
                  <div className="space-y-3">
                    <Label>URLs de webhook</Label>
                    <p className="text-sm text-muted-foreground">
                      Lista de URLs separadas por comas donde se enviarán los eventos
                    </p>
                    <Input
                      placeholder="https://api.miservicio.com/webhook, https://otro-servicio.com/events"
                      onChange={(e) => {
                        const urls = e.target.value.split(',').map(url => url.trim()).filter(url => url);
                        setValue('notifications.webhooks.urls', urls);
                      }}
                    />
                  </div>
                )}
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

export default CompanySettings;