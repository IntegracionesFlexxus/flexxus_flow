#!/usr/bin/env node

/**
 * Script para reemplazar automáticamente todos los console.log/error/warn
 * con el LoggerService seguro
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

class ConsoleLogReplacer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      totalReplacements: 0,
      consoleLog: 0,
      consoleError: 0,
      consoleWarn: 0,
      consoleInfo: 0,
      consoleDebug: 0,
      skippedFiles: []
    };

    // Archivos a excluir
    this.excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/test/**',
      '**/LoggerService.ts', // No modificar el propio LoggerService
      '**/scripts/**'
    ];

    // Archivos que requieren revisión manual
    this.sensitiveFiles = [
      'DatabaseConnection.ts',
      'SecretsManager.ts',
      'AuthService.ts',
      'container.ts'
    ];
  }

  async run() {
    console.log(`${colors.blue}🔍 Buscando archivos TypeScript...${colors.reset}`);
    
    const files = glob.sync('src/**/*.ts', {
      cwd: process.cwd(),
      ignore: this.excludePatterns
    });

    console.log(`${colors.green}✓ Encontrados ${files.length} archivos${colors.reset}\n`);

    for (const file of files) {
      await this.processFile(file);
    }

    this.printReport();
    this.generateBackupScript();
  }

  async processFile(filePath) {
    const fullPath = path.join(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    
    // Verificar si es un archivo sensible
    const isSensitive = this.sensitiveFiles.some(sensitive => 
      fileName.includes(sensitive)
    );

    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      let replacements = 0;

      // Verificar si ya tiene LoggerService importado
      const hasLoggerImport = content.includes('LoggerService') || 
                             content.includes('ILoggerService');
      
      // Verificar si usa inyección de dependencias
      const usesInjection = content.includes('@injectable()') || 
                           content.includes('@inject(');
      
      // Detectar si es una clase
      const isClass = /class\s+\w+/.test(content);

      // Solo procesar si tiene console statements
      if (!this.hasConsoleStatements(content)) {
        return;
      }

      // Backup del archivo original
      if (!fs.existsSync(fullPath + '.backup')) {
        fs.writeFileSync(fullPath + '.backup', originalContent);
      }

      // Si no tiene import de logger, agregarlo
      if (!hasLoggerImport && isClass && usesInjection) {
        content = this.addLoggerImport(content);
        content = this.addLoggerInjection(content);
      } else if (!hasLoggerImport) {
        content = this.addStaticLoggerImport(content);
      }

      // Reemplazar console statements
      const patterns = [
        {
          pattern: /console\.log\((.*?)\);?$/gm,
          replacement: 'this.logger.info($1);',
          staticReplacement: 'logger.info($1);',
          type: 'consoleLog'
        },
        {
          pattern: /console\.error\((.*?)\);?$/gm,
          replacement: 'this.logger.error($1);',
          staticReplacement: 'logger.error($1);',
          type: 'consoleError'
        },
        {
          pattern: /console\.warn\((.*?)\);?$/gm,
          replacement: 'this.logger.warn($1);',
          staticReplacement: 'logger.warn($1);',
          type: 'consoleWarn'
        },
        {
          pattern: /console\.info\((.*?)\);?$/gm,
          replacement: 'this.logger.info($1);',
          staticReplacement: 'logger.info($1);',
          type: 'consoleInfo'
        },
        {
          pattern: /console\.debug\((.*?)\);?$/gm,
          replacement: 'this.logger.debug($1);',
          staticReplacement: 'logger.debug($1);',
          type: 'consoleDebug'
        }
      ];

      for (const { pattern, replacement, staticReplacement, type } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          const count = matches.length;
          this.stats[type] += count;
          replacements += count;

          if (isClass && usesInjection) {
            content = content.replace(pattern, replacement);
          } else {
            content = content.replace(pattern, staticReplacement);
          }
        }
      }

      // Si es archivo sensible, agregar comentario de revisión
      if (isSensitive && replacements > 0) {
        content = `// TODO: SECURITY REVIEW - Este archivo contiene información sensible\n// Verificar que todos los logs estén correctamente sanitizados\n\n${content}`;
        this.stats.skippedFiles.push({
          file: filePath,
          reason: 'Archivo sensible - Requiere revisión manual',
          replacements
        });
      }

      // Guardar archivo modificado
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        this.stats.filesProcessed++;
        this.stats.totalReplacements += replacements;
        
        console.log(`${colors.green}✓${colors.reset} ${filePath} (${replacements} reemplazos)`);
        
        if (isSensitive) {
          console.log(`  ${colors.yellow}⚠ Archivo sensible - Requiere revisión manual${colors.reset}`);
        }
      }

    } catch (error) {
      console.error(`${colors.red}✗ Error procesando ${filePath}: ${error.message}${colors.reset}`);
    }
  }

  hasConsoleStatements(content) {
    return /console\.(log|error|warn|info|debug)/.test(content);
  }

  addLoggerImport(content) {
    const importStatement = `import { ILoggerService } from '@/shared/services/logger/LoggerService';\n`;
    
    // Buscar el último import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      return content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    }
    
    return importStatement + content;
  }

  addLoggerInjection(content) {
    // Buscar el constructor
    const constructorMatch = content.match(/constructor\s*\([^)]*\)/);
    if (constructorMatch) {
      const constructorText = constructorMatch[0];
      
      // Si el constructor está vacío
      if (constructorText.includes('()')) {
        const newConstructor = `constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService
  )`;
        content = content.replace(constructorText, newConstructor);
        
        // Agregar import de TYPES si no existe
        if (!content.includes('TYPES')) {
          content = this.addTypesImport(content);
        }
      } else {
        // Agregar al final de los parámetros
        const newParam = `,\n    @inject(TYPES.LoggerService) private logger: ILoggerService`;
        const insertPos = constructorText.lastIndexOf(')');
        const newConstructor = constructorText.slice(0, insertPos) + newParam + constructorText.slice(insertPos);
        content = content.replace(constructorText, newConstructor);
      }
    }
    
    return content;
  }

  addTypesImport(content) {
    const importStatement = `import { TYPES } from '@/container/types';\n`;
    return this.addImportAfterLastImport(content, importStatement);
  }

  addStaticLoggerImport(content) {
    const importStatement = `import { LoggerFactory } from '@/shared/services/logger/LoggerService';\n`;
    const loggerInit = `\n// Logger instance\nconst logger = LoggerFactory.create({ file: __filename });\n\n`;
    
    content = this.addImportAfterLastImport(content, importStatement);
    
    // Agregar inicialización después de imports
    const firstNonImportLine = this.findFirstNonImportLine(content);
    return content.slice(0, firstNonImportLine) + loggerInit + content.slice(firstNonImportLine);
  }

  addImportAfterLastImport(content, importStatement) {
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, importStatement.trim());
    } else {
      lines.unshift(importStatement.trim());
    }
    
    return lines.join('\n');
  }

  findFirstNonImportLine(content) {
    const lines = content.split('\n');
    let index = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('import ') && 
          !line.startsWith('//') && 
          !line.startsWith('/*') &&
          line.length > 0) {
        index = content.indexOf(lines[i]);
        break;
      }
    }
    
    return index;
  }

  printReport() {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}📊 REPORTE DE REEMPLAZO${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    console.log(`📁 Archivos procesados: ${colors.green}${this.stats.filesProcessed}${colors.reset}`);
    console.log(`🔄 Total de reemplazos: ${colors.green}${this.stats.totalReplacements}${colors.reset}\n`);

    console.log(`Desglose de reemplazos:`);
    console.log(`  • console.log:   ${colors.yellow}${this.stats.consoleLog}${colors.reset}`);
    console.log(`  • console.error: ${colors.yellow}${this.stats.consoleError}${colors.reset}`);
    console.log(`  • console.warn:  ${colors.yellow}${this.stats.consoleWarn}${colors.reset}`);
    console.log(`  • console.info:  ${colors.yellow}${this.stats.consoleInfo}${colors.reset}`);
    console.log(`  • console.debug: ${colors.yellow}${this.stats.consoleDebug}${colors.reset}`);

    if (this.stats.skippedFiles.length > 0) {
      console.log(`\n${colors.yellow}⚠ Archivos que requieren revisión manual:${colors.reset}`);
      this.stats.skippedFiles.forEach(({ file, reason, replacements }) => {
        console.log(`  • ${file}`);
        console.log(`    Razón: ${reason}`);
        console.log(`    Reemplazos: ${replacements}`);
      });
    }

    console.log(`\n${colors.green}✅ Proceso completado${colors.reset}`);
    console.log(`\n${colors.blue}Próximos pasos:${colors.reset}`);
    console.log('1. Revisar archivos sensibles marcados con TODO: SECURITY REVIEW');
    console.log('2. Ejecutar npm run typecheck para verificar tipos');
    console.log('3. Ejecutar npm test para verificar funcionamiento');
    console.log('4. Agregar LoggerService al container de inversify');
  }

  generateBackupScript() {
    const restoreScript = `#!/bin/bash
# Script para restaurar archivos originales si algo sale mal

echo "Restaurando archivos originales..."

for file in $(find src -name "*.ts.backup"); do
  original="\${file%.backup}"
  mv "$file" "$original"
  echo "Restaurado: $original"
done

echo "✅ Restauración completa"
`;

    fs.writeFileSync('restore-console-logs.sh', restoreScript);
    fs.chmodSync('restore-console-logs.sh', '755');
    
    console.log(`\n${colors.blue}📝 Script de restauración creado: restore-console-logs.sh${colors.reset}`);
  }
}

// Ejecutar
const replacer = new ConsoleLogReplacer();
replacer.run().catch(error => {
  console.error(`${colors.red}Error fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});