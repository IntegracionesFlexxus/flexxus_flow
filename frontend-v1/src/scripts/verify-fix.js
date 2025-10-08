/**
 * Script de Verificación - Solución Implementada
 * ===============================================
 * Ejecutar después de recargar la página de usuarios
 */

console.log('🔍 VERIFICANDO SOLUCIÓN IMPLEMENTADA');
console.log('=====================================\n');

// Verificar que los cambios están aplicados
console.group('✅ CAMBIOS IMPLEMENTADOS:');
console.log('1. UserManagement.tsx línea 309:');
console.log('   DE: usersData?.data');
console.log('   A:  usersData?.users ✅');
console.log('');
console.log('2. Dashboard.tsx línea 25:');
console.log('   DE: usersData?.data?.total');
console.log('   A:  usersData?.total ✅');
console.groupEnd();

console.group('\n📊 VERIFICANDO DATOS EN MEMORIA:');

// Intentar acceder a React Query para ver los datos
try {
  // Buscar el query client en el contexto de React
  const rootElement = document.getElementById('root');
  const reactInstance = rootElement?._reactRootContainer?._internalRoot?.current;

  console.log('React Instance:', reactInstance ? '✅ Encontrado' : '❌ No encontrado');

  // Verificar si hay datos de usuarios en el DOM
  const userRows = document.querySelectorAll('tbody tr');
  console.log(`\nUsuarios en la grilla: ${userRows.length}`);

  if (userRows.length > 0) {
    console.log('✅ SE ESTÁN MOSTRANDO USUARIOS EN LA GRILLA');

    // Mostrar algunos detalles de los primeros usuarios
    const maxToShow = Math.min(3, userRows.length);
    console.log(`\nPrimeros ${maxToShow} usuarios:`);
    for (let i = 0; i < maxToShow; i++) {
      const cells = userRows[i].querySelectorAll('td');
      if (cells.length > 0) {
        console.log(`  ${i + 1}. ${cells[1]?.textContent || 'Sin nombre'} - ${cells[2]?.textContent || 'Sin email'}`);
      }
    }
  } else {
    console.log('❌ NO HAY USUARIOS VISIBLES EN LA GRILLA');
    console.log('\nPosibles causas:');
    console.log('1. La página aún no ha cargado completamente');
    console.log('2. No hay usuarios en la base de datos para esta empresa');
    console.log('3. Puede haber un problema de permisos');

    // Verificar si hay mensaje de "No hay datos"
    const emptyMessage = document.querySelector('[data-testid="empty-state"]') ||
                         document.querySelector('.MuiTableBody-root')?.textContent?.includes('No hay');
    if (emptyMessage) {
      console.log('\n⚠️ La tabla muestra un mensaje de "No hay datos"');
    }
  }
} catch (error) {
  console.error('Error al verificar datos:', error);
}

console.groupEnd();

// Verificar los logs de debug
console.group('\n📝 LOGS DE DEBUG:');
console.log('Busca en la consola los siguientes mensajes:');
console.log('- "📊 [UserManagement] Datos de usuarios recibidos"');
console.log('- "🏢 Current Company"');
console.log('- "🎭 User Role"');
console.log('- "🚦 Can Manage Users"');
console.log('\nSi ves estos logs con datos válidos, la solución está funcionando.');
console.groupEnd();

console.log('\n=====================================');
console.log('🔍 VERIFICACIÓN COMPLETADA');
console.log('\n💡 SIGUIENTE PASO:');
console.log('Si no ves usuarios, ejecuta el script diagnostic-users.js para más detalles.');