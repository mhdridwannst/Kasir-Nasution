import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  loginTenant,
  logoutTenant as apiLogout,
  getAuthToken,
  getTenantId,
  getTenantSlug,
  getUserRole,
  getUserEmail,
  getUserName,
} from '../utils/api';

export interface AuthUser {
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  isCashier: boolean;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedToken = getAuthToken();
    if (!savedToken) return null;
    return {
      email: getUserEmail() || '',
      name: getUserName() || 'Pengguna',
      role: getUserRole() || 'Staff',
      tenantId: getTenantId() || '',
      tenantSlug: getTenantSlug() || '',
    };
  });

  useEffect(() => {
    // Listen to local storage changes or sync on mount
    const syncUser = () => {
      const currentToken = getAuthToken();
      setToken(currentToken);
      if (currentToken) {
        setUser({
          email: getUserEmail() || '',
          name: getUserName() || 'Pengguna',
          role: getUserRole() || 'Staff',
          tenantId: getTenantId() || '',
          tenantSlug: getTenantSlug() || '',
        });
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const login = async (email: string, password: string, tenantSlug: string) => {
    await loginTenant(email, password, tenantSlug);
    const newToken = getAuthToken();
    setToken(newToken);
    setUser({
      email: getUserEmail() || email,
      name: getUserName() || 'Pengguna',
      role: getUserRole() || 'Staff',
      tenantId: getTenantId() || '',
      tenantSlug: getTenantSlug() || tenantSlug,
    });
  };

  const logout = () => {
    apiLogout();
    setToken(null);
    setUser(null);
  };

  const isOwner = user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'superadmin';
  const isCashier = user?.role?.toLowerCase() === 'cashier';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        isOwner,
        isCashier,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
