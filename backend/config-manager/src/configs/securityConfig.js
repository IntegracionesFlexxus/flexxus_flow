const envLoader = require('../loaders/envLoader');

// Configuración de seguridad
class SecurityConfig {
  constructor() {
    this.config = this.loadConfig();
  }

  // Cargar configuración de seguridad
  loadConfig() {
    return {
      // JWT Configuration
      jwt: {
        secret: envLoader.getRequired('JWT_SECRET'),
        expiresIn: envLoader.get('JWT_EXPIRES_IN', '24h'),
        refreshExpiresIn: envLoader.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        algorithm: 'HS256',
        issuer: envLoader.get('APP_NAME', 'Flexxus Flow'),
        audience: envLoader.get('JWT_AUDIENCE', 'flexxus-users')
      },

      // Bcrypt Configuration
      bcrypt: {
        rounds: envLoader.getNumber('BCRYPT_ROUNDS', 10)
      },

      // API Key Configuration
      apiKey: {
        prefix: envLoader.get('API_KEY_PREFIX', 'flx_'),
        length: 32,
        algorithm: 'sha256'
      },

      // Session Configuration
      session: {
        secret: envLoader.get('SESSION_SECRET', envLoader.get('JWT_SECRET')),
        maxAge: envLoader.getNumber('SESSION_MAX_AGE', 86400000), // 24 horas
        name: 'flexxus.sid',
        secure: envLoader.isProduction(),
        httpOnly: true,
        sameSite: 'strict'
      },

      // Password Policy
      password: {
        minLength: envLoader.getNumber('PASSWORD_MIN_LENGTH', 8),
        requireUppercase: envLoader.getBoolean('PASSWORD_REQUIRE_UPPERCASE', true),
        requireLowercase: envLoader.getBoolean('PASSWORD_REQUIRE_LOWERCASE', true),
        requireNumbers: envLoader.getBoolean('PASSWORD_REQUIRE_NUMBERS', true),
        requireSpecialChars: envLoader.getBoolean('PASSWORD_REQUIRE_SPECIAL', false),
        maxAttempts: envLoader.getNumber('PASSWORD_MAX_ATTEMPTS', 5),
        lockoutDuration: envLoader.getNumber('PASSWORD_LOCKOUT_DURATION', 900000) // 15 minutos
      },

      // Two Factor Authentication
      twoFactor: {
        enabled: envLoader.getBoolean('FEATURE_TWO_FACTOR_AUTH', false),
        issuer: envLoader.get('APP_NAME', 'Flexxus Flow'),
        window: 1
      },

      // Security Headers
      headers: {
        frameOptions: 'DENY',
        xssProtection: true,
        noSniff: true,
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        contentSecurityPolicy: envLoader.get('CSP_POLICY', false)
      },

      // OAuth Providers (si están configurados)
      oauth: this.loadOAuthProviders()
    };
  }

  // Cargar proveedores OAuth
  loadOAuthProviders() {
    const providers = {};

    // Google OAuth
    if (envLoader.get('GOOGLE_CLIENT_ID')) {
      providers.google = {
        clientId: envLoader.get('GOOGLE_CLIENT_ID'),
        clientSecret: envLoader.get('GOOGLE_CLIENT_SECRET'),
        callbackUrl: envLoader.get('GOOGLE_CALLBACK_URL', '/auth/google/callback')
      };
    }

    // Facebook OAuth
    if (envLoader.get('FACEBOOK_APP_ID')) {
      providers.facebook = {
        appId: envLoader.get('FACEBOOK_APP_ID'),
        appSecret: envLoader.get('FACEBOOK_APP_SECRET'),
        callbackUrl: envLoader.get('FACEBOOK_CALLBACK_URL', '/auth/facebook/callback')
      };
    }

    return providers;
  }

  // Obtener configuración completa
  getAll() {
    return this.config;
  }

  // Obtener sección específica
  get(section) {
    return this.config[section];
  }

  // Verificar si OAuth está habilitado
  isOAuthEnabled() {
    return Object.keys(this.config.oauth).length > 0;
  }

  // Verificar si un proveedor OAuth específico está habilitado
  isOAuthProviderEnabled(provider) {
    return !!this.config.oauth[provider];
  }

  // Generar configuración para helmet (Express security middleware)
  getHelmetConfig() {
    return {
      frameguard: { action: this.config.headers.frameOptions.toLowerCase() },
      xssFilter: this.config.headers.xssProtection,
      noSniff: this.config.headers.noSniff,
      hsts: this.config.headers.hsts,
      contentSecurityPolicy: this.config.headers.contentSecurityPolicy
    };
  }

  // Validar fortaleza de contraseña
  validatePasswordStrength(password) {
    const policy = this.config.password;
    const errors = [];

    if (password.length < policy.minLength) {
      errors.push(`La contraseña debe tener al menos ${policy.minLength} caracteres`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una mayúscula');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una minúscula');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Obtener resumen de configuración
  getSummary() {
    return {
      jwt: {
        expiresIn: this.config.jwt.expiresIn,
        algorithm: this.config.jwt.algorithm
      },
      bcrypt: {
        rounds: this.config.bcrypt.rounds
      },
      passwordPolicy: {
        minLength: this.config.password.minLength,
        requirements: {
          uppercase: this.config.password.requireUppercase,
          lowercase: this.config.password.requireLowercase,
          numbers: this.config.password.requireNumbers,
          special: this.config.password.requireSpecialChars
        }
      },
      twoFactor: {
        enabled: this.config.twoFactor.enabled
      },
      oauth: {
        enabled: this.isOAuthEnabled(),
        providers: Object.keys(this.config.oauth)
      }
    };
  }
}

// Singleton instance
const securityConfig = new SecurityConfig();

module.exports = securityConfig;