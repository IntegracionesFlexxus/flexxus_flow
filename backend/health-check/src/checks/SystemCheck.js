const os = require('os');
const fs = require('fs').promises;
const path = require('path');

// Clase para checks del sistema
class SystemCheck {
  constructor(options = {}) {
    this.name = 'system';
    this.thresholds = {
      memoryUsagePercent: options.memoryThreshold || 90,
      cpuUsagePercent: options.cpuThreshold || 80,
      diskUsagePercent: options.diskThreshold || 85,
      ...options.thresholds
    };
  }

  // Check de memoria
  async checkMemory() {
    const startTime = Date.now();
    
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const usagePercent = (usedMemory / totalMemory) * 100;
      
      const status = usagePercent < this.thresholds.memoryUsagePercent ? 'healthy' : 'degraded';
      
      return {
        name: 'memory',
        status,
        responseTime: Date.now() - startTime,
        details: {
          total: Math.round(totalMemory / (1024 * 1024 * 1024) * 100) / 100, // GB
          used: Math.round(usedMemory / (1024 * 1024 * 1024) * 100) / 100,
          free: Math.round(freeMemory / (1024 * 1024 * 1024) * 100) / 100,
          usagePercent: Math.round(usagePercent * 100) / 100,
          threshold: this.thresholds.memoryUsagePercent
        }
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Check de CPU
  async checkCPU() {
    const startTime = Date.now();
    
    try {
      const cpus = os.cpus();
      const loadAverage = os.loadavg();
      
      // Calcular uso promedio de CPU
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usagePercent = 100 - ~~(100 * idle / total);
      
      const status = usagePercent < this.thresholds.cpuUsagePercent ? 'healthy' : 'degraded';
      
      return {
        name: 'cpu',
        status,
        responseTime: Date.now() - startTime,
        details: {
          cores: cpus.length,
          model: cpus[0].model,
          usagePercent,
          loadAverage: {
            '1min': loadAverage[0],
            '5min': loadAverage[1],
            '15min': loadAverage[2]
          },
          threshold: this.thresholds.cpuUsagePercent
        }
      };
    } catch (error) {
      return {
        name: 'cpu',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Check de disco
  async checkDisk(targetPath = '/') {
    const startTime = Date.now();
    
    try {
      // En Windows usar C:\ como default
      if (process.platform === 'win32' && targetPath === '/') {
        targetPath = 'C:\\';
      }
      
      const stats = await fs.statfs(targetPath);
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      const usagePercent = (used / total) * 100;
      
      const status = usagePercent < this.thresholds.diskUsagePercent ? 'healthy' : 'degraded';
      
      return {
        name: 'disk',
        status,
        responseTime: Date.now() - startTime,
        details: {
          path: targetPath,
          total: Math.round(total / (1024 * 1024 * 1024) * 100) / 100, // GB
          used: Math.round(used / (1024 * 1024 * 1024) * 100) / 100,
          free: Math.round(free / (1024 * 1024 * 1024) * 100) / 100,
          usagePercent: Math.round(usagePercent * 100) / 100,
          threshold: this.thresholds.diskUsagePercent
        }
      };
    } catch (error) {
      // Fallback para sistemas que no soportan statfs
      return {
        name: 'disk',
        status: 'unknown',
        responseTime: Date.now() - startTime,
        error: 'Disk check not supported on this system',
        details: {
          platform: process.platform
        }
      };
    }
  }

  // Check de uptime
  async checkUptime() {
    const startTime = Date.now();
    
    try {
      const uptime = process.uptime();
      const systemUptime = os.uptime();
      
      return {
        name: 'uptime',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          process: {
            seconds: Math.floor(uptime),
            human: this.formatUptime(uptime)
          },
          system: {
            seconds: Math.floor(systemUptime),
            human: this.formatUptime(systemUptime)
          }
        }
      };
    } catch (error) {
      return {
        name: 'uptime',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Check de proceso
  async checkProcess() {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      
      return {
        name: 'process',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: {
            rss: Math.round(memUsage.rss / (1024 * 1024) * 100) / 100, // MB
            heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024) * 100) / 100,
            heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024) * 100) / 100,
            external: Math.round(memUsage.external / (1024 * 1024) * 100) / 100
          },
          env: process.env.NODE_ENV || 'development'
        }
      };
    } catch (error) {
      return {
        name: 'process',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  // Ejecutar todos los checks del sistema
  async checkAll() {
    const results = await Promise.all([
      this.checkMemory(),
      this.checkCPU(),
      this.checkDisk(),
      this.checkUptime(),
      this.checkProcess()
    ]);

    const overall = this.aggregateStatus(results);

    return {
      name: this.name,
      status: overall,
      checks: results
    };
  }

  // Agregar estados
  aggregateStatus(results) {
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');
    
    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }

  // Formatear uptime
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }
}

module.exports = SystemCheck;