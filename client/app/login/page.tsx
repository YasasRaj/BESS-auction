"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, User } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface LoginResponse {
  message?: string;
  user?: User;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Attaches/accepts session cookie
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const contentType = res.headers.get("content-type");
      let data: LoginResponse = {};

      // ✅ Parse response body EXACTLY ONCE
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      }

      // Check for server error status using already-parsed 'data'
      if (!res.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      // Sync global AuthContext state immediately
      if (data.user) {
        login(data.user);
      }

      setMessage({ type: "success", text: "Login successful! Redirecting..." });

      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err as Error).message || "Could not log in. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show a loading state while initial session check completes
  if (authLoading || user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            Checking authorization...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-foreground">
      <div className="max-w-md w-full space-y-6 bg-card text-card-foreground p-8 rounded-lg border border-border shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Sign In to Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Alert Notification */}
        {message && (
          <div
            className={`p-4 rounded-md text-sm font-medium border ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive border-destructive/30"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 text-sm font-semibold bg-primary text-primary-foreground rounded-md shadow-sm transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/register-bidder")}
            className="text-primary underline hover:opacity-80 font-medium cursor-pointer"
          >
            Register as Bidder
          </button>
        </div>
      </div>
    </div>
  );
}
