import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SearchPage } from '@/pages/SearchPage';
import { MapPage } from '@/pages/MapPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { MerchantDashboardPage } from '@/pages/MerchantDashboardPage';
import { MerchantApplyPage } from '@/pages/MerchantApplyPage';
import { AdminStoresPage } from '@/pages/AdminStoresPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/PublicOnlyRoute';
import { AdminRoute } from '@/features/auth/AdminRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'map',
        element: <MapPage />,
      },
      {
        path: 'favorites',
        element: <FavoritesPage />,
      },
      {
        path: 'product/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'merchant',
        element: (
          <ProtectedRoute>
            <MerchantDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'merchant/apply',
        element: (
          <ProtectedRoute>
            <MerchantApplyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminStoresPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/stores',
        element: (
          <AdminRoute>
            <AdminStoresPage />
          </AdminRoute>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
