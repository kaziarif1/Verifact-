import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const { data } = await authService.login(email, password);
    setAuth(data.data.user, data.data.accessToken);
    navigate('/');
    toast.success('Welcome back!');
  };

  const register = async (payload: { email: string; username: string; displayName: string; password: string }) => {
    const { data } = await authService.register(payload);
    setAuth(data.data.user, data.data.accessToken);
    navigate('/');
    toast.success('Account created! Please verify your email.');
  };

  const logout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
    toast.success('Logged out');
  };

  return { user, isAuthenticated, login, register, logout };
};
