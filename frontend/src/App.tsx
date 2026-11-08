import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './utils/authGuard';
import HomePage from './page/user/HomePage';
import LoginPage from './page/auth/LoginPage';
import RegisterPage from './page/auth/RegisterPage';
import PlayerLayout from './layouts/PlayerLayout';
import PlayerHomePage from './page/user/PlayerHomePage';
import BookingPage from './page/user/BookingPage';
import MyBookingsPage from './page/user/MyBookingsPage';
import AdminLayout from './layouts/AdminLayout';
import StaffHomePage from './page/admin/StaffHomePage';
import AdminHomePage from './page/admin/AdminHomePage';
import ReceptionPage from './page/admin/ReceptionPage';
import PosPage from './page/admin/PosPage';
import FacilitiesPage from './page/admin/FacilitiesPage';
import MaintenancePage from './page/admin/MaintenancePage';
import PricingPage from './page/admin/PricingPage';
import PromotionsPage from './page/admin/PromotionsPage';
import VouchersPage from './page/user/VouchersPage';

function App() {
  return (
    <BrowserRouter>
      {/* Cấu hình Toast Notification */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)'
          }
        }}
      />

      <Routes>
        {/* Công khai */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Người chơi */}
        <Route
          path="/player"
          element={
            <ProtectedRoute allowedRoles={['PLAYER']}>
              <PlayerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PlayerHomePage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="my-bookings" element={<MyBookingsPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
        </Route>

        {/* Nhân viên (Admin cũng vào được) */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <AdminLayout area="staff" />
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffHomePage />} />
          <Route path="reception" element={<ReceptionPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
        </Route>

        {/* Quản trị */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLayout area="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHomePage />} />
          <Route path="reception" element={<ReceptionPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
        </Route>

        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
