"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function RegisterBidderPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
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

  // Helper to safely extract response error messages (JSON or HTML)
  const handleResponseError = async (res: Response, defaultMsg: string) => {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      return data.message || defaultMsg;
    }
    const htmlText = await res.text();
    console.error("Non-JSON Server Response:", htmlText);
    return `${defaultMsg} (Server returned ${res.status})`;
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      // 1. Create user account
      const regRes = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Attaches/accepts session cookie if set on registration
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
        }),
      });

      if (!regRes.ok) {
        const errorMsg = await handleResponseError(
          regRes,
          "Failed to create user account.",
        );
        throw new Error(errorMsg);
      }

      // 2. Redirect directly to validation page
      router.push(
        `/validate-bidder?email=${encodeURIComponent(formData.email)}`,
      );
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err as Error).message || "Could not complete registration.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show a loading state while initial session check completes or during redirect
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
    <div className="max-w-4xl mx-auto space-y-8 py-4 text-foreground">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Bidder Registration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create account credentials (Step 1 of 2)
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
      <form onSubmit={handleRegisterUser} className="space-y-8">
        <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm space-y-4">
          <h2 className="text-base font-semibold border-b border-border pb-2">
            Portal Account Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                required
                placeholder="+94771234567"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-5 py-2.5 text-sm font-semibold text-foreground border border-border rounded-md hover:bg-muted transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-md shadow-sm transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </div>
      </form>
    </div>
  );
}
