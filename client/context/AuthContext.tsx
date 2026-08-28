// context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Complete User interface with optional role & office metadata
export interface User {
  id: number | string;
  name?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  type?: string;
  phoneNumber?: string;
  validated?: boolean;
  dlOffice?: string;
  officeName?: string;
  dlOfficerId?: string | number;
  officerId?: string | number;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
}

// Safely initialize with undefined to satisfy TS types
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data: { user: User } = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err: unknown) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
