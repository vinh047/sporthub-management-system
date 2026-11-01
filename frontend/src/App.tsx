import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './utils/authGuard';
import HomePage from './page/user/HomePage';
import LoginPage from './page/auth/LoginPage';
import RegisterPage from './page/auth/RegisterPage';
import PlayerLayout from './layouts/PlayerLayout';
import PlayerHomePage from './page/user/PlayerHomePage';
import AdminLayout from './layouts/AdminLayout';
import StaffHomePage from './page/admin/StaffHomePage';
import AdminHomePage from './page/admin/AdminHomePage';
import ReceptionPage from './page/admin/ReceptionPage';
import PosPage from './page/admin/PosPage';

function App() {
  return (
    <BrowserRouter>
      {/* Cấu hình Toast Notification */}
      <Toaster
        position="top-right"
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
        </Route>

        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
