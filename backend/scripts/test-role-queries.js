const { Pool } = require('pg');

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function testQueries() {
  console.log('🧪 PROBANDO QUERIES DEL REPOSITORIO\n');
  console.log('='.repeat(80));

  try {
    // TEST 1: findSystemRoles (líneas 113-125)
    console.log('\n📝 TEST 1: findSystemRoles()');
    console.log('-'.repeat(80));
    const query1 = `
      SELECT r.*,
             COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      WHERE r.is_system_role = true
      AND r.deleted_at IS NULL
      GROUP BY r.id
      ORDER BY r.name ASC
    `;
    const result1 = await pool.query(query1);
    console.log(`✅ Resultado: ${result1.rowCount} roles encontrados\n`);
    result1.rows.forEach((r, i) => {
      console.log(`  [${i+1}] ${r.name}`);
      console.log(`      ID: ${r.id}`);
      console.log(`      User Count: ${r.user_count}`);
      console.log(`      Sistema: ${r.is_system_role}`);
      console.log(`      Status: ${r.status}\n`);
    });

    // TEST 2: findByCompany (líneas 100-112) - sin companyId específico
    console.log('\n📝 TEST 2: findByCompany() - SIN companyId');
    console.log('-'.repeat(80));
    const query2 = `
      SELECT r.*,
             COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.company_id = $1
      WHERE (r.company_id = $1 OR r.is_system_role = true)
      AND r.deleted_at IS NULL
      GROUP BY r.id
      ORDER BY r.is_system_role DESC, r.name ASC
    `;
    // Usar NULL como companyId para simular roles del sistema
    const result2 = await pool.query(query2, [null]);
    console.log(`✅ Resultado: ${result2.rowCount} roles encontrados\n`);
    result2.rows.forEach((r, i) => {
      console.log(`  [${i+1}] ${r.name} (user_count: ${r.user_count})`);
    });

    // TEST 3: findByCompany con companyId real
    console.log('\n📝 TEST 3: findByCompany() - CON companyId existente');
    console.log('-'.repeat(80));
    const existingCompany = await pool.query('SELECT id FROM companies LIMIT 1');
    if (existingCompany.rowCount > 0) {
      const companyId = existingCompany.rows[0].id;
      console.log(`Usando company_id: ${companyId}\n`);
      const result3 = await pool.query(query2, [companyId]);
      console.log(`✅ Resultado: ${result3.rowCount} roles encontrados\n`);
      result3.rows.forEach((r, i) => {
        console.log(`  [${i+1}] ${r.name}`);
        console.log(`      Sistema: ${r.is_system_role}`);
        console.log(`      Company: ${r.company_id || 'NULL'}`);
        console.log(`      User Count: ${r.user_count}\n`);
      });
    } else {
      console.log('⚠️  No hay companies en la BD');
    }

    // TEST 4: findWithPagination (líneas 319-376)
    console.log('\n📝 TEST 4: findWithPagination() - Sin filtros');
    console.log('-'.repeat(80));
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM roles r
      WHERE r.deleted_at IS NULL
    `;
    const dataQuery = `
      SELECT r.*,
             COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.id
      ORDER BY r.is_system_role DESC, r.name ASC
      LIMIT $1 OFFSET $2
    `;

    const [countRes, dataRes] = await Promise.all([
      pool.query(countQuery),
      pool.query(dataQuery, [limit, offset])
    ]);

    console.log(`✅ Total: ${countRes.rows[0].total} roles`);
    console.log(`✅ Página 1: ${dataRes.rowCount} roles\n`);
    dataRes.rows.forEach((r, i) => {
      console.log(`  [${i+1}] ${r.name} (${r.is_system_role ? 'SISTEMA' : 'CUSTOM'})`);
    });

    // TEST 5: findWithPagination con filtro isSystemRole
    console.log('\n\n📝 TEST 5: findWithPagination() - Solo roles del sistema');
    console.log('-'.repeat(80));
    const countQuery5 = `
      SELECT COUNT(*) as total
      FROM roles r
      WHERE r.deleted_at IS NULL AND r.is_system_role = $1
    `;
    const dataQuery5 = `
      SELECT r.*,
             COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      WHERE r.deleted_at IS NULL AND r.is_system_role = $1
      GROUP BY r.id
      ORDER BY r.is_system_role DESC, r.name ASC
      LIMIT $2 OFFSET $3
    `;

    const [countRes5, dataRes5] = await Promise.all([
      pool.query(countQuery5, [true]),
      pool.query(dataQuery5, [true, limit, offset])
    ]);

    console.log(`✅ Total: ${countRes5.rows[0].total} roles del sistema`);
    console.log(`✅ Resultado: ${dataRes5.rowCount} roles\n`);
    dataRes5.rows.forEach((r, i) => {
      console.log(`  [${i+1}] ${r.name}`);
    });

    // TEST 6: Verificar getRolePermissions
    console.log('\n\n📝 TEST 6: getRolePermissions() - Para Super Admin');
    console.log('-'.repeat(80));
    const superAdminRole = result1.rows.find(r => r.name === 'Super Admin');
    if (superAdminRole) {
      const permQuery = `
        SELECT p.*
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.resource, p.action
      `;
      const permRes = await pool.query(permQuery, [superAdminRole.id]);
      console.log(`✅ Permisos encontrados: ${permRes.rowCount}\n`);
      permRes.rows.forEach((p, i) => {
        console.log(`  [${i+1}] ${p.name} (${p.resource}:${p.action})`);
      });
    }

    // TEST 7: Simular llamada del controller
    console.log('\n\n📝 TEST 7: Simular respuesta del controller list()');
    console.log('-'.repeat(80));
    const mockControllerResponse = {
      success: true,
      data: dataRes.rows,
      pagination: {
        total: parseInt(countRes.rows[0].total),
        page: page,
        limit: limit,
        pages: Math.ceil(parseInt(countRes.rows[0].total) / limit)
      }
    };
    console.log(JSON.stringify(mockControllerResponse, null, 2));

    // TEST 8: Simular respuesta del controller getSystemRoles()
    console.log('\n\n📝 TEST 8: Simular respuesta del controller getSystemRoles()');
    console.log('-'.repeat(80));
    const mockSystemRolesResponse = {
      success: true,
      data: result1.rows
    };
    console.log(JSON.stringify(mockSystemRolesResponse, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('\n' + '='.repeat(80));
  }
}

testQueries();
