import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './utils/authGuard';

// Thay thế các pages bằng lazy load sau này
const Login = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="glass p-8 rounded-lg shadow-lg max-w-md w-full animate-fade-in border border-border">
      <h2 className="text-2xl font-bold text-center text-text mb-6">Đăng Nhập SportHub</h2>
      <input className="w-full p-3 mb-4 bg-surface text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Số điện thoại" />
      <input className="w-full p-3 mb-6 bg-surface text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary" type="password" placeholder="Mật khẩu" />
      <button className="btn btn-primary w-full py-3 rounded text-white font-semibold shadow-md hover:shadow-lg transition">Đăng Nhập</button>
    </div>
  </div>
);
const Register = () => <div className="p-8 animate-fade-in"><h1>Register Page (Placeholder)</h1></div>;
const Home = () => <div className="p-8 animate-fade-in"><h1>Trang chủ (Placeholder)</h1></div>;
const Dashboard = () => <div className="p-8 animate-fade-in"><h1>Dashboard (Placeholder)</h1></div>;

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
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Player Routes */}
        <Route 
          path="/player/*" 
          element={
            <ProtectedRoute allowedRoles={['PLAYER']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Staff Routes */}
        <Route 
          path="/staff/*" 
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
