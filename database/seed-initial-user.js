/**
 * Script para crear usuario inicial
 * Crea empresa y usuario admin para poder iniciar sesión
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const colors = require('colors/safe');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'flexxus_app',
  password: 'app_password_123',
  database: 'flexxus_shared'
});

async function createInitialData() {
  console.log(colors.cyan('\n╔═══════════════════════════════════════════════╗'));
  console.log(colors.cyan('║     CREACIÓN DE USUARIO INICIAL              ║'));
  console.log(colors.cyan('╚═══════════════════════════════════════════════╝\n'));

  try {
    // 1. Crear empresa
    console.log(colors.blue('📦 Creando empresa inicial...'));
    const companyResult = await pool.query(`
      INSERT INTO companies (name, status) 
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, ['Flexxus Demo Company', 'active']);

    let companyId;
    if (companyResult.rows.length > 0) {
      companyId = companyResult.rows[0].id;
      console.log(colors.green(`  ✓ Empresa creada: ${companyResult.rows[0].name}`));
      console.log(`    ID: ${companyId}`);
    } else {
      // Si ya existe, obtener el ID
      const existingCompany = await pool.query(`
        SELECT id FROM companies WHERE name = 'Flexxus Demo Company'
      `);
      companyId = existingCompany.rows[0].id;
      console.log(colors.yellow(`  ⚠ Empresa ya existe, usando ID: ${companyId}`));
    }

    // 2. Crear usuario admin
    console.log(colors.blue('\n👤 Creando usuario administrador...'));
    
    // Hashear contraseña
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, status, email_verified_at) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `, ['admin@flexxus.com', hashedPassword, 'Admin', 'Sistema', 'active', new Date()]);

    let userId;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log(colors.green(`  ✓ Usuario creado: ${userResult.rows[0].email}`));
      console.log(`    ID: ${userId}`);
    } else {
      // Si ya existe, obtener el ID
      const existingUser = await pool.query(`
        SELECT id FROM users WHERE email = 'admin@flexxus.com'
      `);
      userId = existingUser.rows[0].id;
      console.log(colors.yellow(`  ⚠ Usuario ya existe, usando ID: ${userId}`));
    }

    // 3. Obtener rol de Admin
    console.log(colors.blue('\n🔑 Asignando rol de administrador...'));
    const roleResult = await pool.query(`
      SELECT id FROM roles WHERE name = 'Admin' AND is_system_role = true
    `);
    
    let roleId;
    if (roleResult.rows.length > 0) {
      roleId = roleResult.rows[0].id;
    } else {
      // Crear rol si no existe
      const newRole = await pool.query(`
        INSERT INTO roles (name, description, is_system_role, status)
        VALUES ('Admin', 'Administrador del sistema', true, 'active')
        RETURNING id
      `);
      roleId = newRole.rows[0].id;
    }

    // 4. Asociar usuario con empresa
    await pool.query(`
      INSERT INTO user_companies (user_id, company_id, role, is_default, status) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, company_id) 
      DO UPDATE SET role = $3, is_default = $4
    `, [userId, companyId, 'admin', true, 'active']);
    console.log(colors.green('  ✓ Usuario asociado a empresa'));

    // 5. Asignar rol al usuario
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id, company_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, company_id) 
      DO UPDATE SET role_id = $2
    `, [userId, roleId, companyId]);
    console.log(colors.green('  ✓ Rol asignado al usuario'));

    // 6. Crear usuario de prueba adicional
    console.log(colors.blue('\n👥 Creando usuario de prueba...'));
    const testPassword = await bcrypt.hash('test123', 10);
    const testUserResult = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, status, email_verified_at) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `, ['user@flexxus.com', testPassword, 'Usuario', 'Prueba', 'active', new Date()]);

    if (testUserResult.rows.length > 0) {
      const testUserId = testUserResult.rows[0].id;
      
      // Obtener rol de User
      const userRoleResult = await pool.query(`
        SELECT id FROM roles WHERE name = 'User' AND is_system_role = true
      `);
      const userRoleId = userRoleResult.rows[0]?.id;

      if (userRoleId) {
        // Asociar con empresa
        await pool.query(`
          INSERT INTO user_companies (user_id, company_id, role, is_default, status) 
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, company_id) 
          DO UPDATE SET role = $3
        `, [testUserId, companyId, 'user', true, 'active']);

        // Asignar rol
        await pool.query(`
          INSERT INTO user_roles (user_id, role_id, company_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, company_id) 
          DO UPDATE SET role_id = $2
        `, [testUserId, userRoleId, companyId]);

        console.log(colors.green(`  ✓ Usuario de prueba creado: ${testUserResult.rows[0].email}`));
      }
    }

    console.log(colors.cyan('\n═════════════════════════════════════════════════'));
    console.log(colors.green('✅ DATOS INICIALES CREADOS EXITOSAMENTE'));
    console.log(colors.cyan('═════════════════════════════════════════════════'));
    
    console.log(colors.yellow('\n📝 CREDENCIALES DE ACCESO:'));
    console.log(colors.white('\nUsuario Administrador:'));
    console.log('  Email: admin@flexxus.com');
    console.log('  Password: admin123');
    console.log(colors.white('\nUsuario de Prueba:'));
    console.log('  Email: user@flexxus.com');
    console.log('  Password: test123');
    
    console.log(colors.cyan('\n🌐 URL de acceso: http://localhost:3002'));
    console.log(colors.cyan('═════════════════════════════════════════════════\n'));

  } catch (error) {
    console.error(colors.red('Error creando datos iniciales:'), error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  createInitialData().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(colors.red('Error fatal:'), error);
    process.exit(1);
  });
}

module.exports = { createInitialData };