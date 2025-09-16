/**
 * Profile Preferences Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Componente para gestión de preferencias de usuario
 * Implementa principios SOLID con responsabilidad única para preferencias
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
import { toast } from 'sonner';
import { profileService, type UserPreferences } from '@modules/auth/services/profileService';
import { useUIStore } from '@/shared/store/uiStore';
import {
  Monitor,
  Sun,
  Moon,
  Palette,
  Globe,
  Clock,
  Calendar,
  Save,
  Loader2,
  Type,
  Eye,
  Zap,
  Check
} from 'lucide-react';

// Schema de validación - Principio de Segregación de Interfaces
const preferencesSchema = yup.object({
  theme: yup.string().oneOf(['light', 'dark', 'system']).required('El tema es requerido'),
  language: yup.string().required('El idioma es requerido'),
  timezone: yup.string().required('La zona horaria es requerida'),
  dateFormat: yup.string().required('El formato de fecha es requerido'),
  timeFormat: yup.string().oneOf(['12h', '24h']).required('El formato de hora es requerido'),
  accessibility: yup.object({
    highContrast: yup.boolean(),
    fontSize: yup.string().oneOf(['small', 'medium', 'large']),
    reducedMotion: yup.boolean()
  })
});

type PreferencesFormData = yup.InferType<typeof preferencesSchema>;

// Constantes de configuración
const AVAILABLE_LANGUAGES = [
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' }
];

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' }
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: '31/12/2024', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31', example: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: '31-12-2024', example: '31-12-2024' }
];

export const ProfilePreferences: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const { darkMode, setDarkMode } = useUIStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue
  } = useForm<PreferencesFormData>({
    resolver: yupResolver(preferencesSchema),
    defaultValues: {
      theme: 'system',
      language: 'es',
      timezone: 'America/Argentina/Buenos_Aires',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        reducedMotion: false
      }
    }
  });

  const watchTheme = watch('theme');
  const watchFontSize = watch('accessibility.fontSize');
  const watchHighContrast = watch('accessibility.highContrast');

  // Cargar preferencias al montar
  useEffect(() => {
    loadPreferences();
  }, []);

  // Aplicar tema cuando cambia
  useEffect(() => {
    if (watchTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else if (watchTheme === 'light') {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Sistema - detectar preferencia del navegador
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [watchTheme, setDarkMode]);

  // Aplicar tamaño de fuente cuando cambia
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-small', 'text-medium', 'text-large');
    root.classList.add(`text-${watchFontSize}`);
  }, [watchFontSize]);

  // Aplicar alto contraste cuando cambia
  useEffect(() => {
    const root = document.documentElement;
    if (watchHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [watchHighContrast]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getPreferences();
      setPreferences(data);
      
      // Actualizar el formulario con los datos cargados
      reset({
        theme: data.theme || 'system',
        language: data.language || 'es',
        timezone: data.timezone || 'America/Argentina/Buenos_Aires',
        dateFormat: data.dateFormat || 'DD/MM/YYYY',
        timeFormat: data.timeFormat || '24h',
        accessibility: {
          highContrast: data.accessibility?.highContrast || false,
          fontSize: data.accessibility?.fontSize || 'medium',
          reducedMotion: data.accessibility?.reducedMotion || false
        }
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Error al cargar las preferencias');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PreferencesFormData) => {
    setIsSaving(true);
    try {
      const response = await profileService.updatePreferences(data);
      
      if (response.success) {
        setPreferences(response.data.preferences);
        toast.success('Preferencias actualizadas correctamente');
        reset(data); // Reset para limpiar el estado dirty
      } else {
        throw new Error(response.message || 'Error al actualizar preferencias');
      }
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error(error.message || 'Error al actualizar las preferencias');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (value: string) => {
    setValue('theme', value as 'light' | 'dark' | 'system');
  };

  const handleLanguageChange = (value: string) => {
    setValue('language', value);
    // En el futuro, aquí se cambiaría el idioma de la aplicación
    toast.info(`Idioma cambiado a ${AVAILABLE_LANGUAGES.find(l => l.value === value)?.label}`);
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
      {/* Tema y Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema y Apariencia
          </CardTitle>
          <CardDescription>
            Personaliza cómo se ve la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">Tema de la aplicación</Label>
            <Select value={watch('theme')} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme" className="mt-2">
                <SelectValue placeholder="Selecciona un tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Claro</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>Oscuro</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.theme && (
              <p className="text-sm text-destructive mt-1">{errors.theme.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuración Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuración Regional
          </CardTitle>
          <CardDescription>
            Ajusta idioma, zona horaria y formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="language">Idioma</Label>
            <Select value={watch('language')} onValueChange={handleLanguageChange}>
              <SelectTrigger id="language" className="mt-2">
                <SelectValue placeholder="Selecciona un idioma" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.language && (
              <p className="text-sm text-destructive mt-1">{errors.language.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Select 
              value={watch('timezone')} 
              onValueChange={(value) => setValue('timezone', value)}
            >
              <SelectTrigger id="timezone" className="mt-2">
                <SelectValue placeholder="Selecciona zona horaria" />
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
            {errors.timezone && (
              <p className="text-sm text-destructive mt-1">{errors.timezone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="dateFormat">Formato de Fecha</Label>
            <Select 
              value={watch('dateFormat')} 
              onValueChange={(value) => setValue('dateFormat', value)}
            >
              <SelectTrigger id="dateFormat" className="mt-2">
                <SelectValue placeholder="Selecciona formato de fecha" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(format => (
                  <SelectItem key={format.value} value={format.value}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format.example}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dateFormat && (
              <p className="text-sm text-destructive mt-1">{errors.dateFormat.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="timeFormat">Formato de Hora</Label>
            <Select 
              value={watch('timeFormat')} 
              onValueChange={(value) => setValue('timeFormat', value as '12h' | '24h')}
            >
              <SelectTrigger id="timeFormat" className="mt-2">
                <SelectValue placeholder="Selecciona formato de hora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>12 horas (3:30 PM)</span>
                  </div>
                </SelectItem>
                <SelectItem value="24h">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>24 horas (15:30)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.timeFormat && (
              <p className="text-sm text-destructive mt-1">{errors.timeFormat.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accesibilidad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accesibilidad
          </CardTitle>
          <CardDescription>
            Mejora la experiencia de uso según tus necesidades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fontSize">Tamaño de Fuente</Label>
            <Select 
              value={watch('accessibility.fontSize')} 
              onValueChange={(value) => setValue('accessibility.fontSize', value as 'small' | 'medium' | 'large')}
            >
              <SelectTrigger id="fontSize" className="mt-2">
                <SelectValue placeholder="Selecciona tamaño" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3" />
                    <span>Pequeño</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    <span>Mediano</span>
                  </div>
                </SelectItem>
                <SelectItem value="large">
                  <div className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    <span>Grande</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="highContrast">Alto Contraste</Label>
              <p className="text-sm text-muted-foreground">
                Mejora la visibilidad con colores más definidos
              </p>
            </div>
            <Switch
              id="highContrast"
              checked={watch('accessibility.highContrast')}
              onCheckedChange={(checked) => setValue('accessibility.highContrast', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reducedMotion">Reducir Movimiento</Label>
              <p className="text-sm text-muted-foreground">
                Minimiza animaciones y transiciones
              </p>
            </div>
            <Switch
              id="reducedMotion"
              checked={watch('accessibility.reducedMotion')}
              onCheckedChange={(checked) => setValue('accessibility.reducedMotion', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!isDirty || isSaving}
          className="min-w-[120px]"
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

export default ProfilePreferences;