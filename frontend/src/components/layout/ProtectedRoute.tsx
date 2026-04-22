import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types';

interface Props { children: React.ReactNode; requiredRole?: UserRole }

const LOCAL_ADMIN_EMAIL = 'kazarif02@gmail.com';

export const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { isAuthenticated, user } = useAuthStore();
  const effectiveRole: UserRole =
    user?.role === 'admin' && user.email?.toLowerCase() === LOCAL_ADMIN_EMAIL
      ? 'admin'
      : (user?.role ?? 'user');

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const roleOrder: Record<UserRole, number> = { user: 0, verified: 1, admin: 2 };
    if (roleOrder[effectiveRole] < roleOrder[requiredRole]) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
