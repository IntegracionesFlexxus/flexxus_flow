#!/usr/bin/env node

/**
 * Script para limpiar código muerto y TODOs del proyecto
 * Elimina código comentado, archivos obsoletos y genera reporte de TODOs
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

class DeadCodeCleaner {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      commentedCodeRemoved: 0,
      todosFound: [],
      stubMethodsFound: [],
      emptyFilesRemoved: 0,
      backupFilesRemoved: 0,
      oldFilesRemoved: 0,
      totalLinesRemoved: 0
    };

    this.todoPatterns = [
      /\/\/\s*(TODO|FIXME|HACK|XXX|OPTIMIZE|REFACTOR):\s*(.+)$/gm,
      /\/\*\s*(TODO|FIXME|HACK|XXX|OPTIMIZE|REFACTOR):\s*([\s\S]*?)\*\//gm
    ];

    this.commentedCodePatterns = [
      /\/\*\s*COMENTADO[\s\S]*?\*\//gm,
      /\/\*\s*DEPRECATED[\s\S]*?\*\//gm,
      /\/\*\s*OLD[\s\S]*?\*\//gm,
      /\/\*\s*UNUSED[\s\S]*?\*\//gm,
      /\/\*\s*TEMP[\s\S]*?\*\//gm
    ];

    this.stubPatterns = [
      /async\s+\w+\([^)]*\)[^{]*\{\s*(\/\/[^\n]*)?\s*return\s*(null|undefined|\[\]|\{\});\s*\}/gm,
      /\w+\([^)]*\)[^{]*\{\s*(\/\/[^\n]*)?\s*\/\/\s*TODO:.*\s*\}/gm,
      /\w+\([^)]*\)[^{]*\{\s*(\/\/[^\n]*)?\s*throw\s+new\s+Error\(['"]Not\s+implemented['"]\);\s*\}/gm
    ];
  }

  async run(options = {}) {
    const {
      dryRun = false,
      backup = true,
      interactive = false,
      cleanComments = true,
      cleanOldFiles = true,
      generateReport = true
    } = options;

    console.log(`${colors.blue}🧹 Dead Code Cleaner${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    if (dryRun) {
      console.log(`${colors.yellow}⚠️  DRY RUN MODE - No files will be modified${colors.reset}\n`);
    }

    // Step 1: Clean old and backup files
    if (cleanOldFiles) {
      await this.cleanOldFiles(dryRun);
    }

    // Step 2: Process TypeScript files
    const files = glob.sync('src/**/*.ts', {
      cwd: process.cwd(),
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts', '**/*.test.ts']
    });

    console.log(`${colors.blue}📁 Processing ${files.length} TypeScript files...${colors.reset}\n`);

    for (const file of files) {
      await this.processFile(file, { dryRun, backup, cleanComments });
    }

    // Step 3: Generate TODO report
    if (generateReport) {
      await this.generateTodoReport();
    }

    // Step 4: Print summary
    this.printSummary();

    // Step 5: Create restoration script
    if (!dryRun && backup) {
      await this.createRestorationScript();
    }
  }

  async cleanOldFiles(dryRun) {
    console.log(`${colors.magenta}🗑️  Cleaning old and backup files...${colors.reset}`);

    // Find .old, .backup, .tmp files
    const patterns = [
      '**/*.old.ts',
      '**/*.backup.ts',
      '**/*.tmp.ts',
      '**/*.orig',
      '**/*~'
    ];

    for (const pattern of patterns) {
      const files = glob.sync(pattern, {
        cwd: process.cwd(),
        ignore: ['**/node_modules/**']
      });

      for (const file of files) {
        const fullPath = path.join(process.cwd(), file);
        
        if (!dryRun) {
          await fs.unlink(fullPath);
        }
        
        console.log(`  ${colors.red}✗${colors.reset} Removed: ${file}`);
        
        if (file.endsWith('.old.ts')) {
          this.stats.oldFilesRemoved++;
        } else if (file.endsWith('.backup.ts')) {
          this.stats.backupFilesRemoved++;
        }
      }
    }

    console.log();
  }

  async processFile(filePath, options) {
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      let content = await fs.readFile(fullPath, 'utf8');
      const originalContent = content;
      const originalLines = content.split('\n').length;
      
      // Extract TODOs for report
      this.extractTodos(content, filePath);
      
      // Find stub methods
      this.findStubMethods(content, filePath);
      
      if (options.cleanComments) {
        // Remove large commented code blocks
        content = this.removeCommentedCode(content);
        
        // Remove consecutive comment lines (more than 5)
        content = this.removeExcessiveComments(content);
        
        // Clean up empty lines left after removal
        content = this.cleanupEmptyLines(content);
      }
      
      const newLines = content.split('\n').length;
      const linesRemoved = originalLines - newLines;
      
      if (content !== originalContent) {
        // Backup original file
        if (options.backup && !options.dryRun) {
          await fs.writeFile(fullPath + '.backup', originalContent);
        }
        
        // Write cleaned content
        if (!options.dryRun) {
          await fs.writeFile(fullPath, content);
        }
        
        this.stats.filesProcessed++;
        this.stats.totalLinesRemoved += linesRemoved;
        
        console.log(`${colors.green}✓${colors.reset} ${filePath} (${linesRemoved} lines removed)`);
      }
      
      // Check if file is now empty or trivial
      if (this.isFileTrivial(content)) {
        console.log(`  ${colors.yellow}⚠${colors.reset} File is now trivial/empty`);
        this.stats.emptyFilesRemoved++;
      }
      
    } catch (error) {
      console.error(`${colors.red}✗ Error processing ${filePath}: ${error.message}${colors.reset}`);
    }
  }

  extractTodos(content, filePath) {
    for (const pattern of this.todoPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        this.stats.todosFound.push({
          file: filePath,
          line,
          type: match[1],
          message: match[2].trim(),
          priority: this.inferPriority(match[1], match[2])
        });
      }
    }
  }

  findStubMethods(content, filePath) {
    for (const pattern of this.stubPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const line = content.substring(0, match.index).split('\n').length;
        const methodName = this.extractMethodName(match[0]);
        
        this.stats.stubMethodsFound.push({
          file: filePath,
          line,
          method: methodName,
          type: 'stub'
        });
      }
    }
  }

  removeCommentedCode(content) {
    let cleaned = content;
    
    // Remove large commented blocks
    for (const pattern of this.commentedCodePatterns) {
      const matches = cleaned.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const lines = match.split('\n').length;
          if (lines > 5) { // Only remove large blocks
            cleaned = cleaned.replace(match, '');
            this.stats.commentedCodeRemoved += lines;
          }
        });
      }
    }
    
    return cleaned;
  }

  removeExcessiveComments(content) {
    const lines = content.split('\n');
    const result = [];
    let consecutiveComments = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('//') && !this.isImportantComment(trimmed)) {
        consecutiveComments.push(line);
      } else {
        // If we have more than 5 consecutive comment lines, remove them
        if (consecutiveComments.length > 5) {
          this.stats.commentedCodeRemoved += consecutiveComments.length;
          // Keep first line as indicator
          result.push('// [Removed ' + consecutiveComments.length + ' lines of commented code]');
        } else {
          // Keep the comments if 5 or fewer
          result.push(...consecutiveComments);
        }
        consecutiveComments = [];
        result.push(line);
      }
    }
    
    return result.join('\n');
  }

  isImportantComment(comment) {
    const important = [
      'TODO', 'FIXME', 'HACK', 'NOTE', 'WARNING',
      '@param', '@returns', '@throws', '@deprecated',
      'Copyright', 'License', 'eslint', 'prettier'
    ];
    
    return important.some(keyword => 
      comment.toUpperCase().includes(keyword.toUpperCase())
    );
  }

  cleanupEmptyLines(content) {
    // Replace multiple empty lines with single empty line
    return content
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s*\n/gm, '\n')
      .trim() + '\n';
  }

  isFileTrivial(content) {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const codeLines = lines.filter(line => 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('import') &&
      !line.trim().startsWith('export') &&
      line.trim() !== '{' &&
      line.trim() !== '}'
    );
    
    return codeLines.length < 5;
  }

  extractMethodName(methodString) {
    const match = methodString.match(/(\w+)\s*\(/);
    return match ? match[1] : 'unknown';
  }

  inferPriority(type, message) {
    const msg = message.toLowerCase();
    
    if (type === 'FIXME' || msg.includes('critical') || msg.includes('security')) {
      return 'CRITICAL';
    }
    if (msg.includes('high') || msg.includes('important') || msg.includes('urgent')) {
      return 'HIGH';
    }
    if (msg.includes('low') || msg.includes('minor') || msg.includes('nice to have')) {
      return 'LOW';
    }
    
    return 'MEDIUM';
  }

  async generateTodoReport() {
    console.log(`\n${colors.blue}📝 Generating TODO Report...${colors.reset}\n`);

    // Group TODOs by priority
    const byPriority = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };

    this.stats.todosFound.forEach(todo => {
      byPriority[todo.priority].push(todo);
    });

    // Create markdown report
    let report = '# TODO Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Total TODOs: ${this.stats.todosFound.length}\n`;
    report += `- Critical: ${byPriority.CRITICAL.length}\n`;
    report += `- High: ${byPriority.HIGH.length}\n`;
    report += `- Medium: ${byPriority.MEDIUM.length}\n`;
    report += `- Low: ${byPriority.LOW.length}\n\n`;

    // Add TODOs by priority
    for (const [priority, todos] of Object.entries(byPriority)) {
      if (todos.length === 0) continue;
      
      report += `## ${priority} Priority\n\n`;
      todos.forEach(todo => {
        report += `- **${todo.type}** [${todo.file}:${todo.line}]\n`;
        report += `  ${todo.message}\n\n`;
      });
    }

    // Add stub methods section
    if (this.stats.stubMethodsFound.length > 0) {
      report += `## Stub Methods Found\n\n`;
      this.stats.stubMethodsFound.forEach(stub => {
        report += `- \`${stub.method}()\` [${stub.file}:${stub.line}]\n`;
      });
    }

    // Save report
    await fs.writeFile('TODO_REPORT.md', report);
    console.log(`${colors.green}✓ TODO report saved to TODO_REPORT.md${colors.reset}`);
  }

  printSummary() {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}📊 SUMMARY${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    console.log(`📁 Files processed: ${colors.green}${this.stats.filesProcessed}${colors.reset}`);
    console.log(`🗑️  Lines removed: ${colors.green}${this.stats.totalLinesRemoved}${colors.reset}`);
    console.log(`💬 Comment blocks removed: ${colors.green}${this.stats.commentedCodeRemoved} lines${colors.reset}`);
    console.log(`📝 TODOs found: ${colors.yellow}${this.stats.todosFound.length}${colors.reset}`);
    console.log(`🔧 Stub methods found: ${colors.yellow}${this.stats.stubMethodsFound.length}${colors.reset}`);
    console.log(`📄 Old files removed: ${colors.green}${this.stats.oldFilesRemoved}${colors.reset}`);
    console.log(`💾 Backup files removed: ${colors.green}${this.stats.backupFilesRemoved}${colors.reset}`);

    if (this.stats.todosFound.length > 0) {
      const critical = this.stats.todosFound.filter(t => t.priority === 'CRITICAL').length;
      if (critical > 0) {
        console.log(`\n${colors.red}⚠️  ${critical} CRITICAL TODOs found!${colors.reset}`);
      }
    }

    console.log(`\n${colors.green}✅ Cleaning complete!${colors.reset}`);
  }

  async createRestorationScript() {
    const script = `#!/bin/bash
# Restoration script for dead code cleaning

echo "🔄 Restoring original files..."

for file in $(find . -name "*.ts.backup"); do
  original="\${file%.backup}"
  mv "$file" "$original"
  echo "✓ Restored: $original"
done

echo "✅ Restoration complete"
`;

    await fs.writeFile('restore-files.sh', script);
    await fs.chmod('restore-files.sh', '755');
    
    console.log(`\n${colors.blue}📝 Restoration script created: restore-files.sh${colors.reset}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    backup: !args.includes('--no-backup'),
    interactive: args.includes('--interactive'),
    cleanComments: !args.includes('--keep-comments'),
    cleanOldFiles: !args.includes('--keep-old'),
    generateReport: !args.includes('--no-report')
  };

  if (args.includes('--help')) {
    console.log(`
Dead Code Cleaner - Remove commented code and generate TODO reports

Usage: node clean-dead-code.js [options]

Options:
  --dry-run         Show what would be done without making changes
  --no-backup       Don't create backup files
  --interactive     Ask before each change
  --keep-comments   Don't remove commented code
  --keep-old        Don't remove .old and .backup files
  --no-report       Don't generate TODO report
  --help           Show this help message
    `);
    process.exit(0);
  }

  const cleaner = new DeadCodeCleaner();
  await cleaner.run(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = DeadCodeCleaner;