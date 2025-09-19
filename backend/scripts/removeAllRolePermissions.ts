#!/usr/bin/env ts-node
/**
 * Script para remover todos los permisos de todos los roles
 * Uso: npm run script removeAllRolePermissions.ts
 */

import { Container } from 'inversify';
import { config } from '../src/config/environment';
import { TYPES } from '../src/container/types';
import { IRoleRepository } from '../src/modules/auth/interfaces/IRoleRepository';
import { Database } from '../src/shared/database/Database';

interface Role {
  id: string;
  name: string;
  company_id: string | null;
  is_system_role: boolean;
}

async function removeAllRolePermissions() {
  let database: Database | null = null;

  try {
    console.log('🚀 Iniciando script para remover permisos de todos los roles...');

    // Configurar contenedor e instancias
    const container = new Container();

    // Configurar base de datos
    database = new Database(config.database);
    await database.connect();
    console.log('✅ Conexión a base de datos establecida');

    // Registrar base de datos en el contenedor
    container.bind<Database>(TYPES.Database).toConstantValue(database);

    // Importar y registrar repositorio
    const { RoleRepository } = await import('../src/modules/auth/repositories/RoleRepository');
    container.bind<IRoleRepository>(TYPES.RoleRepository).to(RoleRepository);

    const roleRepository = container.get<IRoleRepository>(TYPES.RoleRepository);

    // Obtener todos los roles
    console.log('📋 Obteniendo lista de todos los roles...');
    const query = `
      SELECT id, name, company_id, is_system_role
      FROM roles
      WHERE deleted_at IS NULL
      ORDER BY is_system_role DESC, name ASC
    `;

    const result = await database.query(query);
    const roles: Role[] = result.rows;

    console.log(`📊 Se encontraron ${roles.length} roles:`);
    roles.forEach(role => {
      const type = role.is_system_role ? '[SISTEMA]' : '[EMPRESA]';
      console.log(`  ${type} ${role.name} (ID: ${role.id})`);
    });

    // Confirmar antes de proceder
    console.log('\n⚠️  ADVERTENCIA: Esta operación removerá TODOS los permisos de TODOS los roles.');
    console.log('   Los roles quedarán sin permisos asignados.');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirm = await new Promise<string>((resolve) => {
      rl.question('¿Desea continuar? (escriba "CONFIRMAR" para proceder): ', resolve);
    });

    rl.close();

    if (confirm !== 'CONFIRMAR') {
      console.log('❌ Operación cancelada por el usuario');
      return;
    }

    console.log('\n🔄 Iniciando remoción de permisos...');

    // Remover permisos de cada rol
    let processedCount = 0;
    let errorCount = 0;

    for (const role of roles) {
      try {
        console.log(`🔧 Procesando: ${role.name}...`);

        // Obtener permisos actuales del rol
        const currentPermissions = await roleRepository.getRolePermissions(role.id);

        if (currentPermissions.length === 0) {
          console.log(`  ✓ ${role.name} ya no tiene permisos asignados`);
        } else {
          // Remover todos los permisos
          await roleRepository.assignPermissions(role.id, []);
          console.log(`  ✅ ${role.name}: ${currentPermissions.length} permisos removidos`);
        }

        processedCount++;

      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error procesando ${role.name}:`, error.message);
      }
    }

    // Mostrar resumen
    console.log('\n📈 RESUMEN DE LA OPERACIÓN:');
    console.log(`   ✅ Roles procesados correctamente: ${processedCount}`);
    console.log(`   ❌ Roles con errores: ${errorCount}`);
    console.log(`   📊 Total de roles: ${roles.length}`);

    if (errorCount === 0) {
      console.log('🎉 ¡Operación completada exitosamente!');
      console.log('   Todos los roles ahora están sin permisos asignados.');
    } else {
      console.log('⚠️  Operación completada con algunos errores.');
      console.log('   Revise los mensajes de error arriba para más detalles.');
    }

  } catch (error) {
    console.error('💥 Error crítico durante la ejecución:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);

  } finally {
    // Cerrar conexión a base de datos
    if (database) {
      await database.disconnect();
      console.log('🔌 Conexión a base de datos cerrada');
    }
  }
}

// Ejecutar el script
removeAllRolePermissions()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error no manejado:', error);
    process.exit(1);
  });