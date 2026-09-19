import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import ProductDetail from './pages/ProductDetail'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { CartProvider } from './contexts/cart-context'
import { AuthProvider } from './hooks/use-auth'
import { TenantProvider } from './contexts/tenant-context'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminLayout from './pages/admin/AdminLayout'
import AdminLogin from './pages/admin/Login'
import AdminResetPassword from './pages/admin/ResetPassword'
import AdminDashboard from './pages/admin/Dashboard'
import AdminProducts from './pages/admin/Products'
import AdminSettings from './pages/admin/Settings'
import AdminLayoutSettings from './pages/admin/LayoutSettings'
import LicensesPage from './pages/admin/LicensesPage'
import CategoryPage from './pages/Category'
import ContentPage from './pages/ContentPage'
import StoresPage from './pages/Stores'
import PublicOnboarding from './pages/PublicOnboarding'
import MasterDashboard from './pages/master/MasterDashboard'
import { MasterRoute } from './components/MasterRoute'

const App = () => (
  <BrowserRouter>
    <TenantProvider>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/categoria/:id" element={<CategoryPage />} />
                <Route path="/produto/:id" element={<ProductDetail />} />
                <Route path="/pagina/:slug" element={<ContentPage />} />
                <Route path="/nossas-lojas" element={<StoresPage />} />
              </Route>

              <Route path="/cadastro" element={<PublicOnboarding />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/reset-password"
                element={
                  <ProtectedRoute>
                    <AdminResetPassword />
                  </ProtectedRoute>
                }
              />

              {/* Rota do Painel Master Global */}
              <Route
                path="/master"
                element={
                  <MasterRoute>
                    <MasterDashboard />
                  </MasterRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="licenses" element={<LicensesPage />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="layout" element={<AdminLayoutSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </TenantProvider>
  </BrowserRouter>
)

export default App
