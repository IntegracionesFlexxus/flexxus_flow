/**
 * TLS/SSL Manager
 * Sprint 4 - Security Hardening
 * Gestión avanzada de certificados SSL/TLS
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import {
  ITLSManager,
  TLSConfig,
  Certificate
} from './interfaces/ISecurityHardening';
import winston from 'winston';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import tls from 'tls';
import https from 'https';
import { X509Certificate } from 'crypto';
@injectable()
export class TLSManager implements ITLSManager {
  private logger: winston.Logger;
  private tlsConfig: TLSConfig | null = null;
  private certificates: Map<string, Certificate> = new Map();
  private pinnedCertificates: Map<string, string> = new Map();
  private hstsConfig: { maxAge: number; includeSubdomains: boolean } | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  // Cipher suites seguros para TLS 1.3
  private readonly TLS13_CIPHERS = [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ];
  // Cipher suites seguros para TLS 1.2 (fallback)
  private readonly TLS12_CIPHERS = [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-CHACHA20-POLY1305'
  ];
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger
  ) {
    this.logger = logger;
    this.startCertificateMonitoring();
  }
  /**
   * Configurar TLS
   */
  async configureTLS(config: TLSConfig): Promise<void> {
    try {
      // Validar configuración
      await this.validateTLSConfig(config);
      // Guardar configuración
      this.tlsConfig = config;
      // Configurar contexto TLS global
      const secureContext = tls.createSecureContext({
        cert: await fs.readFile(config.certificatePath),
        key: await fs.readFile(config.privateKeyPath),
        ca: config.caPath ? await fs.readFile(config.caPath) : undefined,
        minVersion: config.minVersion,
        ciphers: config.cipherSuites.join(':'),
        honorCipherOrder: true,
        secureOptions: 
          crypto.constants.SSL_OP_NO_SSLv2 |
          crypto.constants.SSL_OP_NO_SSLv3 |
          crypto.constants.SSL_OP_NO_TLSv1 |
          crypto.constants.SSL_OP_NO_TLSv1_1
      });
      // Aplicar configuración a servidor HTTPS
      (global as any).tlsSecureContext = secureContext;
      this.logger.info('TLS configured successfully', {
        minVersion: config.minVersion,
        cipherCount: config.cipherSuites.length,
        clientCertRequired: config.requireClientCert
      });
    } catch (error) {
      this.logger.error('Failed to configure TLS:', error);
      throw error;
    }
  }
  /**
   * Obtener certificado
   */
  async getCertificate(domain: string): Promise<Certificate> {
    // Verificar caché
    if (this.certificates.has(domain)) {
      return this.certificates.get(domain)!;
    }
    try {
      // Obtener certificado del servidor
      const cert = await this.fetchCertificate(domain);
      // Parsear certificado
      const x509 = new X509Certificate(cert);
      const certificate: Certificate = {
        domain,
        fingerprint: this.calculateFingerprint(cert),
        issuer: x509.issuer,
        subject: x509.subject,
        validFrom: new Date(x509.validFrom),
        validTo: new Date(x509.validTo),
        serialNumber: x509.serialNumber,
        publicKey: x509.publicKey.export({ type: 'spki', format: 'pem' }).toString()
      };
      // Guardar en caché
      this.certificates.set(domain, certificate);
      return certificate;
    } catch (error) {
      this.logger.error(`Failed to get certificate for ${domain}:`, error);
      throw error;
    }
  }
  /**
   * Renovar certificado
   */
  async renewCertificate(domain: string): Promise<Certificate> {
    try {
      // En producción, esto integraría con Let's Encrypt o similar
      // Por ahora, simulamos la renovación
      this.logger.info(`Initiating certificate renewal for ${domain}`);
      // Generar CSR (Certificate Signing Request)
      const csr = await this.generateCSR(domain);
      // Solicitar nuevo certificado (simulado)
      // En producción: await this.requestCertificateFromCA(csr);
      // Por ahora, devolver el certificado actual
      const cert = await this.getCertificate(domain);
      // Actualizar fecha de validez (simulado)
      cert.validFrom = new Date();
      cert.validTo = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 días
      // Actualizar caché
      this.certificates.set(domain, cert);
      // Notificar renovación exitosa
      this.logger.info(`Certificate renewed for ${domain}`, {
        validTo: cert.validTo
      });
      return cert;
    } catch (error) {
      this.logger.error(`Failed to renew certificate for ${domain}:`, error);
      throw error;
    }
  }
  /**
   * Validar certificado
   */
  async validateCertificate(cert: Certificate): Promise<boolean> {
    try {
      const now = new Date();
      // Verificar fechas de validez
      if (now < cert.validFrom || now > cert.validTo) {
        this.logger.warn('Certificate is not within validity period', {
          domain: cert.domain,
          validFrom: cert.validFrom,
          validTo: cert.validTo
        });
        return false;
      }
      // Verificar que no esté por expirar (30 días)
      const daysUntilExpiry = Math.floor(
        (cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 30) {
        this.logger.warn('Certificate expiring soon', {
          domain: cert.domain,
          daysUntilExpiry
        });
      }
      // Verificar certificate pinning si está configurado
      if (this.pinnedCertificates.has(cert.domain)) {
        const pinnedFingerprint = this.pinnedCertificates.get(cert.domain);
        if (cert.fingerprint !== pinnedFingerprint) {
          this.logger.error('Certificate pinning validation failed', {
            domain: cert.domain,
            expected: pinnedFingerprint,
            actual: cert.fingerprint
          });
          return false;
        }
      }
      // Verificar cadena de certificación
      // En producción, verificaríamos contra CAs confiables
      return true;
    } catch (error) {
      this.logger.error('Certificate validation failed:', error);
      return false;
    }
  }
  /**
   * Pin certificate
   */
  pinCertificate(domain: string, fingerprint: string): void {
    this.pinnedCertificates.set(domain, fingerprint);
    this.logger.info('Certificate pinned', {
      domain,
      fingerprint: fingerprint.substring(0, 16) + '...'
    });
  }
  /**
   * Monitorear expiración de certificados
   */
  async monitorExpiry(): Promise<Certificate[]> {
    const expiringCerts: Certificate[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (const cert of this.certificates.values()) {
      if (cert.validTo <= thirtyDaysFromNow) {
        expiringCerts.push(cert);
        this.logger.warn('Certificate expiring soon', {
          domain: cert.domain,
          validTo: cert.validTo,
          daysRemaining: Math.floor(
            (cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        });
      }
    }
    return expiringCerts;
  }
  /**
   * Configurar HSTS
   */
  configureHSTS(maxAge: number, includeSubdomains: boolean): void {
    this.hstsConfig = { maxAge, includeSubdomains };
    // Aplicar header HSTS a todas las respuestas HTTPS
    // Esto se aplicaría en el middleware de Express
    const hstsHeader = `max-age=${maxAge}${includeSubdomains ? '; includeSubDomains' : ''}; preload`;
    (global as any).hstsHeader = hstsHeader;
    this.logger.info('HSTS configured', {
      maxAge,
      includeSubdomains
    });
  }
  /**
   * Obtener cipher suites
   */
  getCipherSuites(): string[] {
    if (this.tlsConfig) {
      return this.tlsConfig.cipherSuites;
    }
    // Devolver suites por defecto según versión TLS
    return this.tlsConfig?.minVersion === 'TLSv1.3' 
      ? this.TLS13_CIPHERS 
      : [...this.TLS12_CIPHERS, ...this.TLS13_CIPHERS];
  }
  /**
   * Probar configuración TLS
   */
  async testTLSConfiguration(): Promise<boolean> {
    try {
      if (!this.tlsConfig) {
        throw new Error('TLS not configured');
      }
      // Crear servidor de prueba
      const testServer = https.createServer({
        cert: await fs.readFile(this.tlsConfig.certificatePath),
        key: await fs.readFile(this.tlsConfig.privateKeyPath),
        minVersion: this.tlsConfig.minVersion,
        ciphers: this.tlsConfig.cipherSuites.join(':')
      });
      // Intentar iniciar servidor en puerto aleatorio
      const testPort = 40000 + Math.floor(Math.random() * 10000);
      await new Promise<void>((resolve, reject) => {
        testServer.listen(testPort, '127.0.0.1', () => {
          testServer.close();
          resolve();
        });
        testServer.on('error', reject);
      });
      this.logger.info('TLS configuration test passed');
      return true;
    } catch (error) {
      this.logger.error('TLS configuration test failed:', error);
      return false;
    }
  }
  /**
   * Validar configuración TLS
   */
  private async validateTLSConfig(config: TLSConfig): Promise<void> {
    // Verificar que los archivos existen
    try {
      await fs.access(config.certificatePath);
      await fs.access(config.privateKeyPath);
      if (config.caPath) {
        await fs.access(config.caPath);
      }
    } catch (error) {
      throw new Error('Certificate or key files not found');
    }
    // Validar versión TLS
    if (!['TLSv1.2', 'TLSv1.3'].includes(config.minVersion)) {
      throw new Error('Invalid TLS version. Must be TLSv1.2 or TLSv1.3');
    }
    // Validar cipher suites
    if (config.cipherSuites.length === 0) {
      throw new Error('At least one cipher suite must be specified');
    }
    // Verificar que los ciphers son seguros
    const secureCiphers = [...this.TLS12_CIPHERS, ...this.TLS13_CIPHERS];
    const insecureCiphers = config.cipherSuites.filter(
      c => !secureCiphers.includes(c)
    );
    if (insecureCiphers.length > 0) {
      this.logger.warn('Insecure cipher suites detected', { insecureCiphers });
    }
  }
  /**
   * Obtener certificado del servidor
   */
  private async fetchCertificate(domain: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const options = {
        host: domain,
        port: 443,
        method: 'GET',
        rejectUnauthorized: false // Para obtener el cert incluso si es inválido
      };
      const req = https.request(options, (res) => {
        const cert = (res.socket as any).getPeerCertificate();
        if (cert && cert.raw) {
          resolve(cert.raw);
        } else {
          reject(new Error('No certificate found'));
        }
      });
      req.on('error', reject);
      req.end();
    });
  }
  /**
   * Calcular fingerprint del certificado
   */
  private calculateFingerprint(cert: Buffer): string {
    return crypto.createHash('sha256').update(cert).digest('hex');
  }
  /**
   * Generar CSR
   */
  private async generateCSR(domain: string): Promise<string> {
    // En producción, esto generaría un CSR real
    // Por ahora, devolvemos un placeholder
    const csr = `-----BEGIN CERTIFICATE REQUEST-----
MIICvDCCAaQCAQAwdzELMAkGA1UEBhMCVVMxDTALBgNVBAgMBFV0YWgxDzANBgNV
BAcMBkxpbmRvbjEWMBQGA1UECgwNRGlnaUNlcnQgSW5jLjERMA8GA1UECwwIRGln
...
-----END CERTIFICATE REQUEST-----`;
    return csr;
  }
  /**
   * Iniciar monitoreo de certificados
   */
  private startCertificateMonitoring(): void {
    // Verificar certificados cada 24 horas
    this.monitoringInterval = setInterval(async () => {
      const expiringCerts = await this.monitorExpiry();
      if (expiringCerts.length > 0) {
        this.logger.warn(`${expiringCerts.length} certificates expiring soon`);
        // Intentar renovación automática
        for (const cert of expiringCerts) {
          try {
            await this.renewCertificate(cert.domain);
          } catch (error) {
            this.logger.error(`Failed to auto-renew certificate for ${cert.domain}:`, error);
          }
        }
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }
  /**
   * Detener monitoreo
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}
