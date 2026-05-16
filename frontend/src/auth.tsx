import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setApiToken } from "./services/api";

export type UserRole = "admin" | "crew_lead" | "worker";

interface AuthUser {
  username: string;
  role: UserRole;
  display_name: string;
  token: string;
  employee_id: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: () => {},
  isAdmin: false,
});

const API_BASE = "/api";
const STORAGE_KEY = "fft-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser;
        validateToken(parsed.token).then((valid) => {
          if (valid) {
            setUser(parsed);
            setApiToken(parsed.token);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
          setLoading(false);
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.valid === true;
    } catch {
      return false;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        return { ok: false, error: "用户名或密码错误" };
      }

      const data = await res.json();
      const authUser: AuthUser = {
        username: data.username,
        role: data.role,
        display_name: data.display_name,
        token: data.token,
        employee_id: data.employee_id ?? null,
      };

      setUser(authUser);
      setApiToken(authUser.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      return { ok: true };
    } catch {
      return { ok: false, error: "网络错误，请重试" };
    }
  };

  const logout = () => {
    if (user?.token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      }).catch(() => {});
    }
    setUser(null);
    setApiToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
