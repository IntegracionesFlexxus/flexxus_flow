/**
 * Script de Diagnóstico - Problema de Usuarios en Grilla
 * ========================================================
 * Ejecutar este script en la consola del navegador después de hacer login
 *
 * PROBLEMA IDENTIFICADO:
 * ---------------------
 * Hay una discrepancia entre la estructura de datos que envía el backend
 * y la que espera el frontend.
 *
 * FLUJO DE DATOS ACTUAL:
 * ----------------------
 * 1. Backend (UserController.ts línea 148-151):
 *    Devuelve: { success: true, data: { users: [...], total: X } }
 *
 * 2. Frontend (userService.ts línea 73):
 *    Extrae: response.data.data
 *    Resultado: { users: [...], total: X }
 *
 * 3. Frontend (UserManagement.tsx línea 309):
 *    Busca: usersData?.data (esperando array)
 *    Resultado: undefined (porque debería buscar usersData?.users)
 *
 * SOLUCIÓN PROPUESTA:
 * -------------------
 * OPCIÓN A: Cambiar UserManagement.tsx línea 309
 *   De: const usersList = Array.isArray(usersData?.data) ? usersData.data : [];
 *   A:  const usersList = Array.isArray(usersData?.users) ? usersData.users : [];
 *
 * OPCIÓN B: Cambiar el backend para devolver estructura consistente
 *   En UserController.ts línea 150
 *   De: data: users
 *   A:  data: { data: users.users, total: users.total, page, limit, totalPages }
 *
 * OPCIÓN C: Cambiar userService.ts línea 73
 *   De: return response.data.data;
 *   A:  return { data: response.data.data.users, total: response.data.data.total };
 */

console.log('🔧 INICIANDO DIAGNÓSTICO DE USUARIOS');
console.log('=====================================\n');

// 1. Verificar almacenamiento local
console.group('📦 1. VERIFICACIÓN DE ALMACENAMIENTO LOCAL');
const companyId = localStorage.getItem('company_id');
const userId = localStorage.getItem('user_id');
const token = localStorage.getItem('access_token');

console.log('Company ID:', companyId || '❌ NO ENCONTRADO');
console.log('User ID:', userId || '❌ NO ENCONTRADO');
console.log('Token:', token ? '✅ EXISTE' : '❌ NO ENCONTRADO');
console.groupEnd();

if (!companyId || !token) {
  console.error('❌ Faltan datos críticos. Por favor, asegúrate de haber iniciado sesión.');
  return;
}

// 2. Hacer petición manual al endpoint
console.group('\n📡 2. PETICIÓN MANUAL AL BACKEND');
console.log('Endpoint:', `/api/v1/users/company/${companyId}`);

fetch(`/api/v1/users/company/${companyId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Status HTTP:', response.status);
  console.log('Headers:', response.headers);
  return response.json();
})
.then(data => {
  console.groupEnd();

  console.group('\n📊 3. ANÁLISIS DE ESTRUCTURA DE RESPUESTA');
  console.log('Respuesta completa:', data);
  console.log('Tipo de data:', typeof data);
  console.log('Propiedades de nivel superior:', Object.keys(data));

  if (data.success) {
    console.log('\n✅ Respuesta exitosa');
    console.log('data.data:', data.data);
    console.log('Tipo de data.data:', typeof data.data);

    if (data.data) {
      console.log('Propiedades de data.data:', Object.keys(data.data));
      console.log('data.data.users:', data.data.users);
      console.log('data.data.total:', data.data.total);
      console.log('data.data.data:', data.data.data);

      // Verificar dónde están los usuarios
      const usuariosEncontrados =
        data.data.users ||
        data.data.data ||
        data.users ||
        data.data;

      if (Array.isArray(usuariosEncontrados)) {
        console.log(`\n✅ USUARIOS ENCONTRADOS: ${usuariosEncontrados.length} usuarios`);
        console.log('Ubicación:',
          data.data.users ? 'data.data.users' :
          data.data.data ? 'data.data.data' :
          data.users ? 'data.users' :
          'data.data'
        );
        console.log('Primer usuario:', usuariosEncontrados[0]);
      } else if (usuariosEncontrados && typeof usuariosEncontrados === 'object' && usuariosEncontrados.users) {
        console.log(`\n✅ USUARIOS ENCONTRADOS EN OBJETO: ${usuariosEncontrados.users.length} usuarios`);
        console.log('Primer usuario:', usuariosEncontrados.users[0]);
      } else {
        console.log('\n❌ NO SE ENCONTRARON USUARIOS EN LA RESPUESTA');
      }
    }
  } else {
    console.log('\n❌ Respuesta con error:', data.message || 'Sin mensaje de error');
  }
  console.groupEnd();

  console.group('\n🔍 4. DIAGNÓSTICO DEL PROBLEMA');
  console.log('PROBLEMA IDENTIFICADO:');
  console.log('---------------------');
  console.log('El backend devuelve: { success: true, data: { users: [...], total: X } }');
  console.log('El frontend busca: data.data (esperando un array)');
  console.log('Pero recibe: { users: [...], total: X }');
  console.log('\nPor lo tanto, en UserManagement.tsx:');
  console.log('- usersData = { users: [...], total: X }');
  console.log('- usersData.data = undefined');
  console.log('- Array.isArray(usersData?.data) = false');
  console.log('- Resultado: usersList = []');
  console.groupEnd();

  console.group('\n✅ 5. SOLUCIÓN RECOMENDADA');
  console.log('Cambiar UserManagement.tsx línea 309:');
  console.log('DE:  const usersList = Array.isArray(usersData?.data) ? usersData.data : [];');
  console.log('A:   const usersList = Array.isArray(usersData?.users) ? usersData.users : [];');
  console.groupEnd();

  console.log('\n=====================================');
  console.log('🔧 DIAGNÓSTICO COMPLETADO');
})
.catch(error => {
  console.groupEnd();
  console.error('❌ Error al hacer la petición:', error);
});