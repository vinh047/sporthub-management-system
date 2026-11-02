import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { homePathFor } from './roleHome';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'STAFF' | 'PLAYER')[];
}

/**
 * Bọc Route cần đăng nhập. Redirect về /login nếu chưa auth.
 * Kiểm tra role nếu allowedRoles được truyền vào.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Sai vai trò thì đưa về trang chính của vai trò đó
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <>{children}</>;
}
