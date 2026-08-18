import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { AdminLoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { PaymentSettingsPage } from './pages/PaymentSettingsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ProfilePage } from './pages/ProfilePage';

export function AdminApp() {
    return (
        <AdminAuthProvider>
            <Routes>
                <Route path="login" element={<AdminLoginPage />} />
                <Route
                    path="*"
                    element={
                        <ProtectedRoute>
                            <AdminLayout>
                                <Routes>
                                    <Route index element={<Navigate to="dashboard" replace />} />
                                    <Route path="dashboard" element={<DashboardPage />} />
                                    <Route path="products" element={<ProductsPage />} />
                                    <Route path="products/new" element={<ProductFormPage />} />
                                    <Route path="products/:id/edit" element={<ProductFormPage />} />
                                    <Route path="categories" element={<CategoriesPage />} />
                                    <Route path="orders" element={<OrdersPage />} />
                                    <Route path="orders/:id" element={<OrderDetailPage />} />
                                    <Route path="payment-settings" element={<PaymentSettingsPage />} />
                                    <Route path="admins" element={
                                        <ProtectedRoute requireSuperAdmin>
                                            <AdminUsersPage />
                                        </ProtectedRoute>
                                    } />
                                    <Route path="profile" element={<ProfilePage />} />
                                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                                </Routes>
                            </AdminLayout>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </AdminAuthProvider>
    );
}
