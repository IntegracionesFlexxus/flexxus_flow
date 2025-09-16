const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'flexxus_shared',
  user: 'admin',
  password: 'admin123'
});

async function fixAdminPassword() {
  try {
    console.log('Conectando a la base de datos...');
    
    // Verificar si el usuario existe
    const checkUserQuery = `
      SELECT id, email, password_hash, status 
      FROM users 
      WHERE email = 'admin@flexxus.com'
    `;
    
    const userResult = await pool.query(checkUserQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario admin@flexxus.com no encontrado');
      console.log('Creando usuario admin...');
      
      // Crear hash de la contraseña
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Crear usuario admin
      const createUserQuery = `
        INSERT INTO users (
          id, 
          email, 
          password_hash, 
          first_name, 
          last_name, 
          status,
          email_verified_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          'admin@flexxus.com',
          $1,
          'Admin',
          'User',
          'active',
          NOW(),
          NOW(),
          NOW()
        ) RETURNING id, email
      `;
      
      const newUser = await pool.query(createUserQuery, [hashedPassword]);
      console.log('✅ Usuario admin creado:', newUser.rows[0]);
      
    } else {
      console.log('✅ Usuario encontrado:', userResult.rows[0].email);
      console.log('Estado actual:', userResult.rows[0].status);
      
      // Actualizar la contraseña
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const updateQuery = `
        UPDATE users 
        SET password_hash = $1, 
            updated_at = NOW(),
            status = 'active',
            email_verified_at = COALESCE(email_verified_at, NOW())
        WHERE email = 'admin@flexxus.com'
        RETURNING id, email
      `;
      
      const updateResult = await pool.query(updateQuery, [hashedPassword]);
      console.log('✅ Contraseña actualizada para:', updateResult.rows[0].email);
    }
    
    // Verificar el hash actualizado
    const verifyQuery = `
      SELECT password_hash 
      FROM users 
      WHERE email = 'admin@flexxus.com'
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    const storedHash = verifyResult.rows[0].password_hash;
    
    // Probar que el hash funciona
    const isValid = await bcrypt.compare('admin123', storedHash);
    console.log('🔐 Verificación del hash:', isValid ? '✅ Correcto' : '❌ Incorrecto');
    
    console.log('\n📝 Resumen:');
    console.log('- Email: admin@flexxus.com');
    console.log('- Contraseña: admin123');
    console.log('- Estado: active');
    console.log('\n🚀 Ahora puedes hacer login con estas credenciales');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAdminPassword();