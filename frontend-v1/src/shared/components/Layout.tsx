// Re-exportar MainLayout como Layout para compatibilidad
// TODO: En Nivel 2 migrar todas las referencias a MainLayout
import { MainLayout } from '@/components/layout'

function Layout() {
  return <MainLayout />
}

export default Layout