/**
 * Invitation Accept Page - Sprint 3
 * Página para aceptar invitaciones con proceso de onboarding
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { LoadingOverlay } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { invitationService } from '@/modules/auth/services/invitationService';
import { authService } from '@/modules/auth/services/authService';
import { useAuthStore } from '@/shared/store/authStore';
import {
  Mail,
  Building,
  User,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  Users,
  Briefcase,
  Heart,
  Sparkles,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

// Validation schemas
const registrationSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  bio: z.string().max(500, 'La biografía no puede exceder 500 caracteres').optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos y condiciones'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

/**
 * InvitationAcceptPage Component
 * Página completa para aceptar invitaciones con registro de usuario
 */
export const InvitationAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [acceptanceStep, setAcceptanceStep] = useState<'loading' | 'form' | 'processing' | 'success' | 'error'>('loading');

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      phone: '',
      bio: '',
      acceptTerms: false
    }
  });

  // Query para obtener detalles de la invitación
  const {
    data: invitation,
    isLoading: invitationLoading,
    error: invitationError
  } = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => invitationService.getInvitationPreview(token!),
    enabled: !!token,
    retry: false,
    staleTime: 0
  });

  // Mutation para aceptar la invitación
  const acceptInvitationMutation = useMutation({
    mutationFn: (data: RegistrationFormData) =>
      invitationService.acceptInvitation({
        token: token!,
        userRegistrationData: {
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: 'es'
        }
      }),
    onMutate: () => {
      setAcceptanceStep('processing');
    },
    onSuccess: (result) => {
      setAcceptanceStep('success');
      
      // Store auth data
      const authStore = useAuthStore.getState();
      authStore.login({
        user: result.user,
        company: result.company,
        accessToken: result.accessToken || '',
        permissions: result.permissions || []
      });

      toast.success('¡Bienvenido! Tu cuenta ha sido creada exitosamente');

      // Redirect to onboarding or dashboard
      setTimeout(() => {
        if (result.onboardingRequired) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    },
    onError: (error: any) => {
      setAcceptanceStep('error');
      toast.error(error.message || 'Error al aceptar la invitación');
    }
  });

  useEffect(() => {
    if (invitation) {
      setAcceptanceStep('form');
    } else if (invitationError) {
      setAcceptanceStep('error');
    }
  }, [invitation, invitationError]);

  const handleAcceptInvitation = (data: RegistrationFormData) => {
    acceptInvitationMutation.mutate(data);
  };

  const getStatusBadge = () => {
    if (!invitation) return null;

    const isExpired = invitation.isExpired;
    const status = invitation.status;

    if (isExpired) {
      return <Badge variant="destructive">Expirada</Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge variant="default">Pendiente</Badge>;
      case 'accepted':
        return <Badge variant="success">Aceptada</Badge>;
      case 'rejected':
        return <Badge variant="secondary">Rechazada</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Loading state
  if (invitationLoading || acceptanceStep === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <LoadingOverlay />
      </div>
    );
  }

  // Error state
  if (acceptanceStep === 'error' || invitationError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10">
            <EmptyState
              icon={AlertCircle}
              title="Invitación no válida"
              description={
                invitationError?.message || 
                'Esta invitación no existe, ha expirado o ya ha sido utilizada.'
              }
              action={
                <Button onClick={() => navigate('/login')}>
                  Ir al Login
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (acceptanceStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                ¡Bienvenido a {invitation.companyName}!
              </h2>
              <p className="text-green-700">
                Tu cuenta ha sido creada exitosamente. Serás redirigido en unos segundos...
              </p>
            </div>
            <Progress value={100} className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state
  if (acceptanceStep === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <div className="mb-6">
              <Sparkles className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-blue-900 mb-2">
                Creando tu cuenta...
              </h2>
              <p className="text-blue-700">
                Estamos configurando todo para ti. Este proceso puede tomar unos momentos.
              </p>
            </div>
            <Progress value={75} className="w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Invitación a {invitation.companyName}
          </h1>
          <p className="text-lg text-gray-600">
            {invitation.inviterName} te ha invitado a unirte a su equipo
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invitation Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Detalles de la Invitación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Empresa</Label>
                  <p className="font-semibold">{invitation.companyName}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Rol asignado</Label>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold">{invitation.roleName}</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Invitado por</Label>
                  <p className="font-semibold">{invitation.inviterName}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Estado</Label>
                  <div>{getStatusBadge()}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Expira</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">
                      {new Date(invitation.expiresAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                
                {invitation.personalMessage && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Mensaje personal</Label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">
                      <p className="text-sm text-blue-800 italic">
                        "{invitation.personalMessage}"
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Qué obtienes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Acceso al equipo de {invitation.companyName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-blue-500" />
                    <span className="text-sm">Herramientas de trabajo colaborativo</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-purple-500" />
                    <span className="text-sm">Rol de {invitation.roleName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm">Onboarding personalizado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Crear tu cuenta
                </CardTitle>
                <CardDescription>
                  Completa tu información para aceptar la invitación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(handleAcceptInvitation)} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nombre *</Label>
                      <Input
                        id="firstName"
                        {...form.register('firstName')}
                        placeholder="Tu nombre"
                        className={form.formState.errors.firstName ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="lastName">Apellido *</Label>
                      <Input
                        id="lastName"
                        {...form.register('lastName')}
                        placeholder="Tu apellido"
                        className={form.formState.errors.lastName ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          {...form.register('password')}
                          placeholder="Mínimo 8 caracteres"
                          className={form.formState.errors.password ? 'border-red-500' : ''}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {form.formState.errors.password && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...form.register('confirmPassword')}
                        placeholder="Repite tu contraseña"
                        className={form.formState.errors.confirmPassword ? 'border-red-500' : ''}
                      />
                      {form.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional Information */}
                  <div>
                    <Label htmlFor="phone">Teléfono (opcional)</Label>
                    <Input
                      id="phone"
                      {...form.register('phone')}
                      placeholder="+54 11 1234-5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Cuéntanos sobre ti (opcional)</Label>
                    <Textarea
                      id="bio"
                      {...form.register('bio')}
                      placeholder="Una breve descripción sobre tu experiencia o intereses..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {form.watch('bio')?.length || 0}/500 caracteres
                    </p>
                  </div>

                  <Separator />

                  {/* Terms and Conditions */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        {...form.register('acceptTerms')}
                        className="mt-0.5"
                      />
                      <Label htmlFor="acceptTerms" className="text-sm leading-relaxed">
                        Acepto los{' '}
                        <a href="/terms" target="_blank" className="text-blue-600 underline">
                          términos y condiciones
                        </a>{' '}
                        y la{' '}
                        <a href="/privacy" target="_blank" className="text-blue-600 underline">
                          política de privacidad
                        </a>{' '}
                        de FlexxusFlow.
                      </Label>
                    </div>
                    {form.formState.errors.acceptTerms && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.acceptTerms.message}
                      </p>
                    )}
                  </div>

                  {/* Security Notice */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900 text-sm">Tu información está segura</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Utilizamos encriptación de grado empresarial para proteger tus datos.
                      Tu información personal nunca será compartida sin tu consentimiento.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={acceptInvitationMutation.isPending}
                  >
                    {acceptInvitationMutation.isPending ? (
                      'Creando cuenta...'
                    ) : (
                      <>
                        Aceptar invitación y crear cuenta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationAcceptPage;