/**
 * Script para verificar roles en la base de datos
 * Verifica la existencia y estructura de datos de roles
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function checkRoles() {
  try {
    console.log('\n=== VERIFICACIÓN DE ROLES EN BASE DE DATOS ===\n');

    // 1. Verificar tabla roles
    console.log('1. Verificando tabla roles...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'roles'
      ) as table_exists;
    `);
    console.log('Tabla roles existe:', tableCheck.rows[0].table_exists);

    // 2. Contar roles totales
    console.log('\n2. Contando roles...');
    const countResult = await pool.query('SELECT COUNT(*) as total FROM roles WHERE deleted_at IS NULL');
    console.log('Total de roles:', countResult.rows[0].total);

    // 3. Listar todos los roles
    console.log('\n3. Listando roles:');
    const rolesResult = await pool.query(`
      SELECT
        id,
        name,
        description,
        is_system_role,
        company_id,
        status,
        created_at,
        updated_at
      FROM roles
      WHERE deleted_at IS NULL
      ORDER BY name
    `);
    console.table(rolesResult.rows);

    // 4. Verificar roles del sistema
    console.log('\n4. Roles del sistema:');
    const systemRolesResult = await pool.query(`
      SELECT id, name, is_system_role
      FROM roles
      WHERE is_system_role = true AND deleted_at IS NULL
    `);
    console.table(systemRolesResult.rows);

    // 5. Verificar tabla user_roles
    console.log('\n5. Verificando tabla user_roles...');
    const userRolesTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_roles'
      ) as table_exists;
    `);
    console.log('Tabla user_roles existe:', userRolesTableCheck.rows[0].table_exists);

    // 6. Contar asignaciones de roles
    console.log('\n6. Asignaciones de roles:');
    const userRolesCount = await pool.query('SELECT COUNT(*) as total FROM user_roles');
    console.log('Total asignaciones:', userRolesCount.rows[0].total);

    // 7. Verificar estructura de columnas de la tabla roles
    console.log('\n7. Estructura de la tabla roles:');
    const columnsResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'roles'
      ORDER BY ordinal_position
    `);
    console.table(columnsResult.rows);

    console.log('\n=== VERIFICACIÓN COMPLETADA ===\n');

  } catch (error) {
    console.error('Error durante la verificación:', error);
  } finally {
    await pool.end();
  }
}

checkRoles();
