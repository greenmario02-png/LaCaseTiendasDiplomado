import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Layout from './components/layout/Layout';
import { useAuthStore } from './stores/authStore';
import { useWishlistStore } from './stores/wishlistStore';
import { useCurrencyStore } from './stores/currencyStore';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'));
const SellerReviewsPage = lazy(() => import('./pages/SellerReviewsPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SellerRegisterPage = lazy(() => import('./pages/SellerRegisterPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage'));
const AuctionsPage = lazy(() => import('./pages/AuctionsPage'));
const AuctionDetailPage = lazy(() => import('./pages/AuctionDetailPage'));
const AuctionWatchlistPage = lazy(() => import('./pages/AuctionWatchlistPage'));
const PcBuilderPage = lazy(() => import('./pages/PcBuilderPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const ForumPage = lazy(() => import('./pages/ForumPage'));
const ForumFeedPage = lazy(() => import('./pages/ForumPage/ForumFeedPage').then((m) => ({ default: m.ForumFeedPage })));
const ForumPostPage = lazy(() => import('./pages/ForumPage/ForumPostPage').then((m) => ({ default: m.ForumPostPage })));
const ForumCategoriesPage = lazy(() => import('./pages/ForumPage/ForumCategoriesPage').then((m) => ({ default: m.ForumCategoriesPage })));
const ForumProfilePage = lazy(() => import('./pages/ForumPage/ForumProfilePage').then((m) => ({ default: m.ForumProfilePage })));

const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage'));
const NotificationsPage = lazy(() => import('./pages/account/NotificationsPage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const AddressesPage = lazy(() => import('./pages/account/AddressesPage'));
const WishlistPage = lazy(() => import('./pages/account/WishlistPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const AffiliatePage = lazy(() => import('./pages/AffiliatePage'));

const SellerLayout = lazy(() => import('./pages/seller/SellerLayout'));
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'));
const SellerProducts = lazy(() => import('./pages/seller/SellerProducts'));
const SellerProductForm = lazy(() => import('./pages/seller/SellerProductForm'));
const SellerBulkProducts = lazy(() => import('./pages/seller/SellerBulkProducts'));
const SellerOrders = lazy(() => import('./pages/seller/SellerOrders'));
const SellerAuctions = lazy(() => import('./pages/seller/SellerAuctions'));
const SellerReturns = lazy(() => import('./pages/seller/SellerReturnsPage'));
const SellerSettings = lazy(() => import('./pages/seller/SellerSettings'));
const SellerPrivileged = lazy(() => import('./pages/seller/SellerPrivileged'));
const SellerCoupons = lazy(() => import('./pages/seller/SellerCoupons'));
const SellerGifts = lazy(() => import('./pages/seller/SellerGifts'));
const SellerPromotions = lazy(() => import('./pages/seller/SellerPromotions'));
const SellerPayouts = lazy(() => import('./pages/seller/SellerPayouts'));
const SellerTeam = lazy(() => import('./pages/seller/SellerTeam'));
const SellerLabels = lazy(() => import('./pages/seller/SellerLabels'));
const SellerCalendar = lazy(() => import('./pages/seller/SellerCalendar'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminSellers = lazy(() => import('./pages/admin/AdminSellers'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners'));
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions'));
const AdminCurrency = lazy(() => import('./pages/admin/AdminCurrency'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminVerification = lazy(() => import('./pages/admin/AdminVerification'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminPayouts = lazy(() => import('./pages/admin/AdminPayouts'));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturnsPage'));
const AdminTaxes = lazy(() => import('./pages/admin/AdminTaxesPage'));
const AdminAffiliates = lazy(() => import('./pages/admin/AdminAffiliatesPage'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminCalendar = lazy(() => import('./pages/admin/AdminCalendar'));
const AdminRbac = lazy(() => import('./pages/admin/AdminRbac'));
const AdminForumPage = lazy(() => import('./pages/admin/AdminForumPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const EventsPage = lazy(() => import('./pages/events/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/events/EventDetailPage'));
const OrganizerLayout = lazy(() => import('./pages/organizer/OrganizerLayout'));
const EventsListPage = lazy(() => import('./pages/organizer/EventsListPage'));
const EventWizardPage = lazy(() => import('./pages/organizer/EventWizardPage'));
const OrgPedidosPage = lazy(() => import('./pages/organizer/OrgPedidosPage'));
const OrgEquipoPage = lazy(() => import('./pages/organizer/OrgEquipoPage'));
const OrgEstadisticasPage = lazy(() => import('./pages/organizer/OrgEstadisticasPage'));
const OrgConfiguracionPage = lazy(() => import('./pages/organizer/OrgConfiguracionPage'));
function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );
}

function Protected({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const user = useAuthStore((s) => s.user);
  const booted = useAuthStore((s) => s.booted);
  const location = useLocation();

  // Espera a que loadFromStorage/fetchMe restaure la sesión antes de decidir
  if (!booted) return null;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireStoreAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user && user.role === 'SELLER' && user.storeRole === 'EMPLOYEE') {
    return <Navigate to="/seller" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const user = useAuthStore((s) => s.user);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const initCurrency = useCurrencyStore((s) => s.init);

  useEffect(() => {
    loadFromStorage();
    initCurrency();
  }, [loadFromStorage, initCurrency]);

  useEffect(() => {
    if (user) {
      fetchWishlist().catch(() => {});
    }
  }, [user, fetchWishlist]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/producto/:id/:slug" element={<ProductDetailPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          <Route path="/vendedor/:id" element={<SellerProfilePage />} />
          <Route path="/vendedor/:id/resenas" element={<SellerReviewsPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/registro-vendedor" element={<SellerRegisterPage />} />
          <Route path="/promociones" element={<PromotionsPage />} />
          <Route path="/subastas" element={<AuctionsPage />} />
          <Route path="/subasta/:id" element={<AuctionDetailPage />} />
          <Route
            path="/subastas/mis"
            element={
              <Protected>
                <AuctionWatchlistPage />
              </Protected>
            }
          />
          <Route path="/arma-tu-pc" element={<PcBuilderPage />} />
          <Route path="/ayuda" element={<HelpPage />} />

          <Route path="/foro" element={<ForumPage />}>
            <Route index element={<ForumFeedPage />} />
            <Route path="categorias" element={<ForumCategoriesPage />} />
            <Route path="post/:id" element={<ForumPostPage />} />
            <Route path="u/:username" element={<ForumProfilePage />} />
          </Route>

          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/eventos/:slug" element={<EventDetailPage />} />
          <Route
            path="/organizador"
            element={
              <Protected>
                <OrganizerLayout />
              </Protected>
            }
          >
            <Route index element={<EventsListPage />} />
            <Route path="eventos/nuevo" element={<EventWizardPage />} />
            <Route path="pedidos" element={<OrgPedidosPage />} />
            <Route path="equipo" element={<OrgEquipoPage />} />
            <Route path="estadisticas" element={<OrgEstadisticasPage />} />
            <Route path="configuracion" element={<OrgConfiguracionPage />} />
          </Route>

          <Route
            path="/checkout"
            element={
              <Protected>
                <CheckoutPage />
              </Protected>
            }
          />
          <Route
            path="/checkout/confirmacion/:id"
            element={
              <Protected>
                <OrderConfirmationPage />
              </Protected>
            }
          />

          <Route
            path="/cuenta"
            element={
              <Protected>
                <AccountPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/pedidos"
            element={
              <Protected>
                <OrdersPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/pedidos/:id"
            element={
              <Protected>
                <OrderDetailPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/direcciones"
            element={
              <Protected>
                <AddressesPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/notificaciones"
            element={
              <Protected>
                <NotificationsPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/wishlist"
            element={
              <Protected>
                <WishlistPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/devoluciones"
            element={
              <Protected>
                <ReturnsPage />
              </Protected>
            }
          />
          <Route
            path="/cuenta/afiliados"
            element={
              <Protected>
                <AffiliatePage />
              </Protected>
            }
          />
          <Route
            path="/mensajes"
            element={
              <Protected>
                <ChatPage />
              </Protected>
            }
          />
          <Route
            path="/mensajes/:id"
            element={
              <Protected>
                <ChatPage />
              </Protected>
            }
          />
        </Route>

        <Route
          path="/seller"
          element={
            <Protected roles={['SELLER', 'ADMIN']}>
              <SellerLayout />
            </Protected>
          }
        >
          <Route index element={<SellerDashboard />} />
          <Route path="productos" element={<SellerProducts />} />
          <Route path="productos/nuevo" element={<SellerProductForm />} />
          <Route path="productos/varios" element={<SellerBulkProducts />} />
          <Route path="productos/:id/editar" element={<SellerProductForm />} />
          <Route path="pedidos" element={<SellerOrders />} />
          <Route path="subastas" element={<SellerAuctions />} />
          <Route path="configuracion" element={<RequireStoreAdmin><SellerSettings /></RequireStoreAdmin>} />
          <Route path="privilegiados" element={<RequireStoreAdmin><SellerPrivileged /></RequireStoreAdmin>} />
          <Route path="cupones" element={<RequireStoreAdmin><SellerCoupons /></RequireStoreAdmin>} />
          <Route path="regalos" element={<RequireStoreAdmin><SellerGifts /></RequireStoreAdmin>} />
          <Route path="promociones" element={<RequireStoreAdmin><SellerPromotions /></RequireStoreAdmin>} />
          <Route path="pagos" element={<RequireStoreAdmin><SellerPayouts /></RequireStoreAdmin>} />
          <Route path="equipo" element={<RequireStoreAdmin><SellerTeam /></RequireStoreAdmin>} />
          <Route path="etiquetas" element={<SellerLabels />} />
          <Route path="calendario" element={<SellerCalendar />} />
          <Route path="devoluciones" element={<SellerReturns />} />
        </Route>

        <Route
          path="/admin"
          element={
            <Protected roles={['ADMIN']}>
              <AdminLayout />
            </Protected>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="vendedores" element={<AdminSellers />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="promociones" element={<AdminPromotions />} />
          <Route path="moneda" element={<AdminCurrency />} />
          <Route path="reportes" element={<AdminReports />} />
          <Route path="contenido" element={<AdminContent />} />
          <Route path="verificacion" element={<AdminVerification />} />
          <Route path="cupones" element={<AdminCoupons />} />
          <Route path="pagos" element={<AdminPayouts />} />
          <Route path="devoluciones" element={<AdminReturns />} />
          <Route path="impuestos" element={<AdminTaxes />} />
          <Route path="afiliados" element={<AdminAffiliates />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="calendario" element={<AdminCalendar />} />
          <Route path="foro" element={<AdminForumPage />} />
          <Route path="configuracion" element={<AdminSettingsPage />} />
          <Route path="rbac" element={<AdminRbac />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
