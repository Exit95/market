import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { authService } from '@/services/auth-service';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setSession, setLoading, signOut } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const data = await authService.getMe();
        setSession({ user: data.user, profile: data.profile });
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }

  async function login(email: string, password: string) {
    const data = await authService.login(email, password);
    setSession({ user: data.user, profile: data.profile });
    return data;
  }

  async function register(email: string, password: string, displayName?: string) {
    const data = await authService.register(email, password, displayName);
    setSession({ user: data.user, profile: data.profile });
    return data;
  }

  async function logout() {
    await authService.logout();
    signOut();
  }

  return { user, isAuthenticated, isLoading, login, register, logout, checkAuth };
}
