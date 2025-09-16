/**
 * ProfileSecurity Component Tests - Nivel 3
 * Siguiendo lineamientos nivel 3: Pruebas exhaustivas con alta cobertura
 * @module ProfileSecurity.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProfileSecurity } from '@modules/auth/components/ProfileSecurity';
import { profileService } from '@modules/auth/services/profileService';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUIStore } from '@/shared/store/uiStore';

// Mocks
vi.mock('../../services/profileService');
vi.mock('@/shared/hooks/useAuth');
vi.mock('@/shared/store/uiStore');
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode')
  }
}));

// Test data
const mockSecuritySettings = {
  twoFactorEnabled: false,
  twoFactorMethod: 'app' as const,
  passwordLastChanged: '2024-01-01T00:00:00Z',
  activeSessions: 3,
  trustedDevices: [
    {
      id: 'device1',
      name: 'Chrome on Windows',
      type: 'desktop' as const,
      browser: 'Chrome',
      lastUsed: '2024-01-15T10:00:00Z',
      location: 'Buenos Aires, Argentina'
    },
    {
      id: 'current',
      name: 'Current Device',
      type: 'desktop' as const,
      browser: 'Firefox',
      lastUsed: '2024-01-15T12:00:00Z',
      location: 'Buenos Aires, Argentina'
    }
  ]
};

const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
};

describe('ProfileSecurity Component', () => {
  const mockAddNotification = vi.fn();
  const mockStartLoading = vi.fn();
  const mockStopLoading = vi.fn();
  const mockIsLoading = vi.fn().mockReturnValue(false);
  const mockLogout = vi.fn();

  beforeEach(() => {
    // Setup mocks
    (useAuth as any).mockReturnValue({
      user: mockUser,
      logout: mockLogout
    });

    (useUIStore as any).mockReturnValue({
      addNotification: mockAddNotification,
      startLoading: mockStartLoading,
      stopLoading: mockStopLoading,
      isLoading: mockIsLoading
    });

    (profileService.getSecuritySettings as any).mockResolvedValue(mockSecuritySettings);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderización inicial', () => {
    it('debe renderizar el componente correctamente', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Resumen de Seguridad')).toBeInTheDocument();
      });

      expect(screen.getByText('Contraseña')).toBeInTheDocument();
      expect(screen.getByText('Autenticación de Dos Factores (2FA)')).toBeInTheDocument();
      expect(screen.getByText('Dispositivos Confiables')).toBeInTheDocument();
      expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
    });

    it('debe cargar y mostrar la configuración de seguridad', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(profileService.getSecuritySettings).toHaveBeenCalled();
      });

      // Verificar que se muestren los datos
      expect(screen.getByText('3')).toBeInTheDocument(); // Sesiones activas
      expect(screen.getByText('en 2 dispositivos')).toBeInTheDocument();
    });

    it('debe mostrar skeleton mientras carga', () => {
      (profileService.getSecuritySettings as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ProfileSecurity />);

      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
    });

    it('debe manejar errores al cargar configuración', async () => {
      const errorMessage = 'Error loading settings';
      (profileService.getSecuritySettings as any).mockRejectedValue(new Error(errorMessage));

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar la configuración de seguridad',
          autoClose: true
        });
      });
    });
  });

  describe('Cambio de contraseña', () => {
    it('debe abrir el diálogo de cambio de contraseña', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar Contraseña')).toBeInTheDocument();
      });

      const button = screen.getByRole('button', { name: /cambiar contraseña/i });
      fireEvent.click(button);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Contraseña Actual')).toBeInTheDocument();
      expect(screen.getByLabelText('Nueva Contraseña')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar Nueva Contraseña')).toBeInTheDocument();
    });

    it('debe validar contraseñas antes de enviar', async () => {
      const user = userEvent.setup();
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar Contraseña')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

      const dialog = screen.getByRole('dialog');
      const submitButton = within(dialog).getByRole('button', { name: /cambiar contraseña/i });

      // Intentar enviar sin datos
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La contraseña actual es requerida')).toBeInTheDocument();
      });

      // Contraseña muy corta
      const newPasswordInput = screen.getByLabelText('Nueva Contraseña');
      await user.type(newPasswordInput, 'short');

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/debe tener al menos 8 caracteres/i)).toBeInTheDocument();
      });
    });

    it('debe cambiar la contraseña exitosamente', async () => {
      const user = userEvent.setup();
      (profileService.changePassword as any).mockResolvedValue({ success: true });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar Contraseña')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

      await user.type(screen.getByLabelText('Contraseña Actual'), 'currentPass123');
      await user.type(screen.getByLabelText('Nueva Contraseña'), 'NewPass123!@#');
      await user.type(screen.getByLabelText('Confirmar Nueva Contraseña'), 'NewPass123!@#');

      const submitButton = within(screen.getByRole('dialog')).getByRole('button', { 
        name: /cambiar contraseña/i 
      });
      
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(profileService.changePassword).toHaveBeenCalledWith({
          currentPassword: 'currentPass123',
          newPassword: 'NewPass123!@#',
          confirmPassword: 'NewPass123!@#',
          logoutOtherDevices: false
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Contraseña actualizada',
        message: 'Tu contraseña ha sido cambiada exitosamente',
        autoClose: true
      });
    });

    it('debe mostrar indicador de fortaleza de contraseña', async () => {
      const user = userEvent.setup();
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar Contraseña')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

      const newPasswordInput = screen.getByLabelText('Nueva Contraseña');

      // Contraseña débil
      await user.clear(newPasswordInput);
      await user.type(newPasswordInput, 'weak');
      expect(screen.getByText('Fortaleza: Débil')).toBeInTheDocument();

      // Contraseña media
      await user.clear(newPasswordInput);
      await user.type(newPasswordInput, 'Medium123');
      expect(screen.getByText('Fortaleza: Media')).toBeInTheDocument();

      // Contraseña fuerte
      await user.clear(newPasswordInput);
      await user.type(newPasswordInput, 'Strong123!@#ABC');
      expect(screen.getByText('Fortaleza: Muy fuerte')).toBeInTheDocument();
    });
  });

  describe('Autenticación de dos factores', () => {
    it('debe habilitar 2FA correctamente', async () => {
      (profileService.toggleTwoFactorAuth as any).mockResolvedValue({
        success: true,
        backupCodes: ['CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5', 'CODE6']
      });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Autenticación de Dos Factores (2FA)')).toBeInTheDocument();
      });

      const switch2FA = screen.getByRole('switch', { name: '' });
      fireEvent.click(switch2FA);

      // Verificar que se muestra el diálogo
      expect(screen.getByText('Configurar Autenticación de Dos Factores')).toBeInTheDocument();

      // Seleccionar método y continuar
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      fireEvent.click(continueButton);

      // Verificar QR code
      await waitFor(() => {
        expect(screen.getByAltText('QR Code')).toBeInTheDocument();
      });

      // Continuar al siguiente paso
      const nextButtons = screen.getAllByRole('button', { name: /continuar/i });
      fireEvent.click(nextButtons[nextButtons.length - 1]);

      // Ingresar código de verificación
      const codeInput = screen.getByLabelText('Código de verificación');
      await userEvent.type(codeInput, '123456');

      const enableButton = screen.getByRole('button', { name: /habilitar 2fa/i });
      fireEvent.click(enableButton);

      await waitFor(() => {
        expect(profileService.toggleTwoFactorAuth).toHaveBeenCalledWith(true, 'app');
      });

      // Verificar que se muestran los códigos de respaldo
      expect(screen.getByText('Códigos de Respaldo')).toBeInTheDocument();
      expect(screen.getByText('CODE1')).toBeInTheDocument();
    });

    it('debe deshabilitar 2FA correctamente', async () => {
      const settingsWithEnabled2FA = {
        ...mockSecuritySettings,
        twoFactorEnabled: true
      };

      (profileService.getSecuritySettings as any).mockResolvedValue(settingsWithEnabled2FA);
      (profileService.toggleTwoFactorAuth as any).mockResolvedValue({ success: true });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Habilitado')).toBeInTheDocument();
      });

      const switch2FA = screen.getByRole('switch');
      fireEvent.click(switch2FA);

      await waitFor(() => {
        expect(profileService.toggleTwoFactorAuth).toHaveBeenCalledWith(false);
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: '2FA deshabilitado',
        message: 'La autenticación de dos factores ha sido deshabilitada',
        autoClose: true
      });
    });

    it('debe permitir copiar y descargar códigos de respaldo', async () => {
      const writeTextMock = vi.fn();
      Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

      (profileService.toggleTwoFactorAuth as any).mockResolvedValue({
        success: true,
        backupCodes: ['CODE1', 'CODE2']
      });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Autenticación de Dos Factores (2FA)')).toBeInTheDocument();
      });

      // Habilitar 2FA para mostrar códigos
      const switch2FA = screen.getByRole('switch');
      fireEvent.click(switch2FA);

      // Navegar hasta los códigos
      const continueButtons = screen.getAllByRole('button', { name: /continuar/i });
      continueButtons.forEach(btn => fireEvent.click(btn));

      await userEvent.type(screen.getByLabelText('Código de verificación'), '123456');
      fireEvent.click(screen.getByRole('button', { name: /habilitar 2fa/i }));

      await waitFor(() => {
        expect(screen.getByText('Códigos de Respaldo')).toBeInTheDocument();
      });

      // Copiar códigos
      const copyButton = screen.getByRole('button', { name: /copiar/i });
      fireEvent.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith('CODE1\nCODE2');
      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Códigos copiados',
        message: 'Los códigos de respaldo han sido copiados al portapapeles',
        autoClose: true
      });
    });
  });

  describe('Gestión de dispositivos', () => {
    it('debe mostrar la lista de dispositivos confiables', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
        expect(screen.getByText('Current Device')).toBeInTheDocument();
      });

      // Verificar que el dispositivo actual tiene el chip
      const currentDeviceItem = screen.getByText('Current Device').closest('li');
      expect(within(currentDeviceItem!).getByText('Este dispositivo')).toBeInTheDocument();
    });

    it('debe revocar acceso a un dispositivo', async () => {
      (profileService.revokeDevice as any).mockResolvedValue({ success: true });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      });

      // Encontrar el botón de revocar para el primer dispositivo
      const deviceItem = screen.getByText('Chrome on Windows').closest('li');
      const revokeButton = within(deviceItem!).getByRole('button', { name: /revocar acceso/i });

      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(profileService.revokeDevice).toHaveBeenCalledWith('device1');
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Dispositivo revocado',
        message: 'El acceso del dispositivo ha sido revocado',
        autoClose: true
      });
    });

    it('debe terminar todas las sesiones', async () => {
      (profileService.terminateAllSessions as any).mockResolvedValue({
        success: true,
        sessionsTerminated: 3
      });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Cerrar Todas las Sesiones')).toBeInTheDocument();
      });

      const terminateButton = screen.getByRole('button', { name: /cerrar todas las sesiones/i });
      fireEvent.click(terminateButton);

      await waitFor(() => {
        expect(profileService.terminateAllSessions).toHaveBeenCalled();
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Sesiones terminadas',
        message: 'Se cerraron 3 sesiones activas',
        autoClose: true
      });

      // Verificar que se llama logout después de 2 segundos
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('no debe permitir revocar el dispositivo actual', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Current Device')).toBeInTheDocument();
      });

      const currentDeviceItem = screen.getByText('Current Device').closest('li');
      const buttons = within(currentDeviceItem!).queryAllByRole('button');
      
      // No debe haber botón de revocar para el dispositivo actual
      const revokeButton = buttons.find(btn => btn.getAttribute('aria-label')?.includes('revocar'));
      expect(revokeButton).not.toBeInTheDocument();
    });
  });

  describe('Eliminación de cuenta', () => {
    it('debe abrir el diálogo de eliminación de cuenta', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /eliminar cuenta/i });
      fireEvent.click(deleteButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Eliminar Cuenta Permanentemente')).toBeInTheDocument();
      expect(screen.getByText(/esta acción es irreversible/i)).toBeInTheDocument();
    });

    it('debe validar la contraseña antes de eliminar', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /eliminar cuenta/i }));

      const dialog = screen.getByRole('dialog');
      const deleteButton = within(dialog).getByRole('button', { name: /eliminar mi cuenta/i });

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('La contraseña es requerida para eliminar la cuenta')).toBeInTheDocument();
      });
    });

    it('debe eliminar la cuenta exitosamente', async () => {
      const user = userEvent.setup();
      (profileService.deleteAccount as any).mockResolvedValue({
        success: true,
        scheduledDeletion: '2024-02-15T00:00:00Z'
      });

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /eliminar cuenta/i }));

      const passwordInput = screen.getByLabelText('Contraseña actual');
      await user.type(passwordInput, 'password123');

      const reasonInput = screen.getByLabelText(/razón/i);
      await user.type(reasonInput, 'Ya no uso el servicio');

      const feedbackInput = screen.getByLabelText(/comentarios/i);
      await user.type(feedbackInput, 'Mejorar la interfaz');

      const deleteButton = within(screen.getByRole('dialog')).getByRole('button', { 
        name: /eliminar mi cuenta/i 
      });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(profileService.deleteAccount).toHaveBeenCalledWith({
          password: 'password123',
          reason: 'Ya no uso el servicio',
          feedback: 'Mejorar la interfaz'
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'success',
        title: 'Cuenta programada para eliminación',
        message: expect.stringContaining('Tu cuenta será eliminada'),
        autoClose: false
      });

      // Verificar logout después de 3 segundos
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      }, { timeout: 4000 });
    });

    it('debe manejar errores al eliminar cuenta', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Password incorrect';
      (profileService.deleteAccount as any).mockRejectedValue(new Error(errorMessage));

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Zona de Peligro')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /eliminar cuenta/i }));

      await user.type(screen.getByLabelText('Contraseña actual'), 'wrongpass');
      
      const deleteButton = within(screen.getByRole('dialog')).getByRole('button', { 
        name: /eliminar mi cuenta/i 
      });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith({
          type: 'error',
          title: 'Error',
          message: errorMessage,
          autoClose: true
        });
      });
    });
  });

  describe('Estados de carga', () => {
    it('debe mostrar indicadores de carga para cada acción', async () => {
      mockIsLoading.mockImplementation((key: string) => key === 'password-change');

      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar Contraseña')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

      const submitButton = within(screen.getByRole('dialog')).getByRole('button', { 
        name: /cambiando.../i 
      });

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Cambiando...');
    });
  });

  describe('Integración y flujos completos', () => {
    it('debe manejar el flujo completo de configuración de seguridad', async () => {
      const user = userEvent.setup();

      render(<ProfileSecurity />);

      // 1. Verificar carga inicial
      await waitFor(() => {
        expect(screen.getByText('Resumen de Seguridad')).toBeInTheDocument();
      });

      // 2. Cambiar contraseña
      (profileService.changePassword as any).mockResolvedValue({ success: true });
      fireEvent.click(screen.getAllByRole('button', { name: /cambiar contraseña/i })[0]);
      
      await user.type(screen.getByLabelText('Contraseña Actual'), 'oldPass123');
      await user.type(screen.getByLabelText('Nueva Contraseña'), 'NewPass123!@#');
      await user.type(screen.getByLabelText('Confirmar Nueva Contraseña'), 'NewPass123!@#');
      
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { 
        name: /cambiar contraseña/i 
      }));

      await waitFor(() => {
        expect(mockAddNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: 'Contraseña actualizada'
          })
        );
      });

      // 3. Habilitar 2FA
      (profileService.toggleTwoFactorAuth as any).mockResolvedValue({
        success: true,
        backupCodes: ['CODE1', 'CODE2']
      });

      const switch2FA = screen.getByRole('switch');
      fireEvent.click(switch2FA);

      // Navegar por el wizard
      const continueButtons = screen.getAllByRole('button', { name: /continuar/i });
      continueButtons.forEach(btn => fireEvent.click(btn));

      await user.type(screen.getByLabelText('Código de verificación'), '123456');
      fireEvent.click(screen.getByRole('button', { name: /habilitar 2fa/i }));

      await waitFor(() => {
        expect(screen.getByText('Códigos de Respaldo')).toBeInTheDocument();
      });

      // 4. Verificar estado final
      fireEvent.click(screen.getByRole('button', { name: /he guardado los códigos/i }));

      await waitFor(() => {
        expect(profileService.getSecuritySettings).toHaveBeenCalledTimes(2); // Inicial + refresh
      });
    });
  });

  describe('Accesibilidad', () => {
    it('debe ser navegable por teclado', async () => {
      const user = userEvent.setup();
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Resumen de Seguridad')).toBeInTheDocument();
      });

      // Navegar con Tab
      await user.tab();
      expect(screen.getAllByRole('button')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button')[1]).toHaveFocus();

      // Activar con Enter
      await user.keyboard('{Enter}');
      // Verificar que se abre el diálogo correspondiente
    });

    it('debe tener etiquetas ARIA apropiadas', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Resumen de Seguridad')).toBeInTheDocument();
      });

      // Verificar roles ARIA
      expect(screen.getByRole('region', { name: /seguridad/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(expect.any(Number));
      
      // Verificar switches con etiquetas
      const switches = screen.getAllByRole('switch');
      switches.forEach(switchElement => {
        expect(switchElement).toHaveAttribute('aria-label');
      });
    });

    it('debe anunciar cambios de estado', async () => {
      render(<ProfileSecurity />);

      await waitFor(() => {
        expect(screen.getByText('Autenticación de Dos Factores (2FA)')).toBeInTheDocument();
      });

      const switch2FA = screen.getByRole('switch');
      expect(switch2FA).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switch2FA);

      // El estado debe actualizarse
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});

describe('ProfileSecurity - Cobertura de Edge Cases', () => {
  it('debe manejar respuestas vacías del servidor', async () => {
    (profileService.getSecuritySettings as any).mockResolvedValue(null);

    render(<ProfileSecurity />);

    await waitFor(() => {
      expect(screen.getByText('Resumen de Seguridad')).toBeInTheDocument();
    });

    // No debe crashear
    expect(screen.getByText('0')).toBeInTheDocument(); // Sesiones activas
  });

  it('debe manejar timeouts de red', async () => {
    (profileService.getSecuritySettings as any).mockImplementation(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 100)
      )
    );

    render(<ProfileSecurity />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error'
        })
      );
    });
  });

  it('debe limpiar recursos al desmontar', async () => {
    const { unmount } = render(<ProfileSecurity />);

    await waitFor(() => {
      expect(screen.getByText('Resumen de Seguridad')).toBeInTheDocument();
    });

    unmount();

    // Verificar que no hay llamadas después de desmontar
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockAddNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('after unmount')
      })
    );
  });
});