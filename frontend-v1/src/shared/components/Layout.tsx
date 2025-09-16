// Re-exportar MainLayout como Layout para compatibilidad
// TODO: En Nivel 2 migrar todas las referencias a MainLayout
import { MainLayout } from '@/components/layout'

function Layout() {
  console.log('🏠 Layout component rendering, path:', window.location.pathname)
  return <MainLayout />
}

export default Layout