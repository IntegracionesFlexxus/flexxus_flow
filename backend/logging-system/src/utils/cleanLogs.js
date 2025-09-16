const fs = require('fs');
const path = require('path');
const { cleanOldLogs, getLogFiles } = require('../transports/fileTransports');

// Script para limpiar logs antiguos
function cleanLogs(options = {}) {
  const {
    directory = './logs',
    daysToKeep = 30,
    showStats = true
  } = options;

  console.log('=== Limpieza de Logs ===\n');
  console.log(`Directorio: ${path.resolve(directory)}`);
  console.log(`Retención: ${daysToKeep} días\n`);

  // Obtener estadísticas antes de limpiar
  if (showStats) {
    const filesBefore = getLogFiles(directory);
    const totalSizeBefore = filesBefore.reduce((sum, file) => sum + file.size, 0);
    
    console.log('Estado actual:');
    console.log(`  - Archivos: ${filesBefore.length}`);
    console.log(`  - Tamaño total: ${(totalSizeBefore / (1024 * 1024)).toFixed(2)} MB`);
    console.log();
  }

  // Ejecutar limpieza
  console.log('Limpiando archivos antiguos...');
  const result = cleanOldLogs(directory, daysToKeep);

  // Mostrar resultados
  console.log(`\n✓ Archivos eliminados: ${result.cleaned}`);
  
  if (result.errors.length > 0) {
    console.log('\n✗ Errores encontrados:');
    result.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  // Mostrar estadísticas después
  if (showStats) {
    const filesAfter = getLogFiles(directory);
    const totalSizeAfter = filesAfter.reduce((sum, file) => sum + file.size, 0);
    const spaceSaved = totalSizeBefore - totalSizeAfter;
    
    console.log('\nEstado final:');
    console.log(`  - Archivos: ${filesAfter.length}`);
    console.log(`  - Tamaño total: ${(totalSizeAfter / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  - Espacio liberado: ${(spaceSaved / (1024 * 1024)).toFixed(2)} MB`);
  }

  console.log('\n=== Limpieza completada ===');
  
  return result;
}

// Función para obtener estadísticas de logs
function getLogStats(directory = './logs') {
  console.log('=== Estadísticas de Logs ===\n');
  
  const files = getLogFiles(directory);
  
  if (files.length === 0) {
    console.log('No se encontraron archivos de log');
    return null;
  }

  // Agrupar por tipo
  const byType = {};
  files.forEach(file => {
    const type = file.name.split('-')[0] || 'other';
    if (!byType[type]) {
      byType[type] = {
        count: 0,
        size: 0,
        files: []
      };
    }
    byType[type].count++;
    byType[type].size += file.size;
    byType[type].files.push(file);
  });

  // Calcular totales
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const compressedCount = files.filter(f => f.isCompressed).length;

  // Mostrar resumen
  console.log('Resumen general:');
  console.log(`  Total de archivos: ${files.length}`);
  console.log(`  Tamaño total: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Archivos comprimidos: ${compressedCount}`);
  console.log();

  // Mostrar por tipo
  console.log('Por tipo de log:');
  Object.entries(byType).forEach(([type, data]) => {
    console.log(`  ${type}:`);
    console.log(`    - Archivos: ${data.count}`);
    console.log(`    - Tamaño: ${(data.size / (1024 * 1024)).toFixed(2)} MB`);
  });
  console.log();

  // Mostrar archivos más grandes
  console.log('Archivos más grandes:');
  const largestFiles = files
    .sort((a, b) => b.size - a.size)
    .slice(0, 5);
  
  largestFiles.forEach(file => {
    console.log(`  - ${file.name}: ${file.sizeInMB} MB`);
  });
  console.log();

  // Mostrar archivos más antiguos
  console.log('Archivos más antiguos:');
  const oldestFiles = files
    .sort((a, b) => a.created - b.created)
    .slice(0, 5);
  
  oldestFiles.forEach(file => {
    console.log(`  - ${file.name}: ${file.created.toLocaleDateString()}`);
  });

  return {
    total: files.length,
    totalSize,
    byType,
    compressed: compressedCount,
    files
  };
}

// Función para archivar logs
function archiveLogs(directory = './logs', archiveDir = './logs/archive') {
  console.log('=== Archivando Logs ===\n');

  // Crear directorio de archivo si no existe
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const files = getLogFiles(directory);
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  let archived = 0;
  const errors = [];

  files.forEach(file => {
    // Solo archivar archivos de más de 7 días
    const age = now - file.modified.getTime();
    if (age > 7 * dayInMs && !file.path.includes('archive')) {
      try {
        const archivePath = path.join(archiveDir, file.name);
        fs.renameSync(file.path, archivePath);
        archived++;
        console.log(`✓ Archivado: ${file.name}`);
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
      }
    }
  });

  console.log(`\n✓ Archivos archivados: ${archived}`);
  
  if (errors.length > 0) {
    console.log('\n✗ Errores:');
    errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  return { archived, errors };
}

// Si se ejecuta directamente
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'stats';

  switch (command) {
    case 'clean':
      const days = parseInt(args[1]) || 30;
      cleanLogs({ daysToKeep: days });
      break;
    
    case 'stats':
      getLogStats();
      break;
    
    case 'archive':
      archiveLogs();
      break;
    
    default:
      console.log('Uso:');
      console.log('  node cleanLogs.js stats     - Mostrar estadísticas');
      console.log('  node cleanLogs.js clean [días] - Limpiar logs antiguos');
      console.log('  node cleanLogs.js archive    - Archivar logs antiguos');
  }
}

module.exports = {
  cleanLogs,
  getLogStats,
  archiveLogs
};