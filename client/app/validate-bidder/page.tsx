"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ValidateBidderForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const [formData, setFormData] = useState({
    // Step 2: Verification
    email: initialEmail,
    otp: "",

    // Step 3: Bidder Info
    prosumerName: "",
    nic: "",
    dlReferenceId: "",
    mobileNumber: "",
    clearedInverterRatingKw: "",
    clearanceDate: "",
    termDays: "7300",

    // Step 3: Daytime Tariff Details
    scheme: "Net Plus",
    daytimeFitBasis: "Legacy Vintage",
    solarConnectionAgreementStartDate: "",
    daytimeFitLkrKwh: "",
    daytimeFit2LkrKwh: "",
    fitStepDate: "",
    fitEndDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isPucslBasis = formData.daytimeFitBasis === "PUCSL Rate";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Invalid OTP code.");
      }

      setMessage({
        type: "success",
        text: "Email verified successfully! Please complete your prosumer details below.",
      });
      setIsOtpVerified(true);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err as Error).message || "Failed to verify OTP code.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit Prosumer Profile & Tariff Details
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/bidders/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to complete validation.");
      }

      setMessage({
        type: "success",
        text: "Bidder profile verified and saved successfully!",
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: (err as Error).message || "An error occurred during submission.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 text-foreground">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Validate Bidder Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {!isOtpVerified
            ? "Step 1: Security Code Verification"
            : "Step 2: Prosumer & Tariff Parameters"}
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

      {/* SECTION 1: OTP VERIFICATION */}
      {!isOtpVerified && (
        <form onSubmit={handleVerifyOtp} className="space-y-8">
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm space-y-4">
            <h2 className="text-base font-semibold border-b border-border pb-2">
              Security Verification
            </h2>

            <div className="space-y-4 text-sm max-w-sm">
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
                  One-Time Password (OTP) *
                </label>
                <input
                  type="text"
                  name="otp"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={formData.otp}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-center text-lg tracking-widest rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-md shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Code & Continue →"}
            </button>
          </div>
        </form>
      )}

      {/* SECTION 2: PROSUMER & TARIFF SPECS */}
      {isOtpVerified && (
        <form onSubmit={handleSubmitProfile} className="space-y-8">
          {/* Facility Info */}
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm space-y-4">
            <h2 className="text-base font-semibold border-b border-border pb-2">
              Prosumer & Facility Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Prosumer Full Name *
                </label>
                <input
                  type="text"
                  name="prosumerName"
                  required
                  value={formData.prosumerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  NIC Number *
                </label>
                <input
                  type="text"
                  name="nic"
                  required
                  value={formData.nic}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Distribution Licensee (DL) Reference ID *
                </label>
                <input
                  type="text"
                  name="dlReferenceId"
                  required
                  placeholder="e.g. CEB-DL-2024-8849"
                  value={formData.dlReferenceId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  name="mobileNumber"
                  required
                  placeholder="+94771234567"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Cleared Inverter Rating (kW) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="clearedInverterRatingKw"
                  required
                  value={formData.clearedInverterRatingKw}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Clearance Date *
                </label>
                <input
                  type="date"
                  name="clearanceDate"
                  required
                  value={formData.clearanceDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Term Duration (Days) *
                </label>
                <input
                  type="number"
                  name="termDays"
                  required
                  placeholder="7300"
                  value={formData.termDays}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Standard 20-year agreement duration equals 7,300 days.
                </p>
              </div>
            </div>
          </div>

          {/* Tariff Specs */}
          <div className="bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm space-y-4">
            <h2 className="text-base font-semibold border-b border-border pb-2">
              Daytime Tariff Agreement Specs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Scheme *
                </label>
                <select
                  name="scheme"
                  value={formData.scheme}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Net Accounting">Net Accounting</option>
                  <option value="Net Plus">Net Plus</option>
                  <option value="Net Plus Plus">Net Plus Plus</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Daytime FiT Basis *
                </label>
                <select
                  name="daytimeFitBasis"
                  value={formData.daytimeFitBasis}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Legacy Vintage">Legacy Vintage</option>
                  <option value="PUCSL Rate">PUCSL Rate</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Solar Agreement Start Date *
                </label>
                <input
                  type="date"
                  name="solarConnectionAgreementStartDate"
                  required
                  value={formData.solarConnectionAgreementStartDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Daytime FiT Tier 1 (LKR/kWh) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="daytimeFitLkrKwh"
                  required
                  value={formData.daytimeFitLkrKwh}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Daytime FiT Tier 2 (LKR/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="daytimeFit2LkrKwh"
                  disabled={isPucslBasis}
                  value={isPucslBasis ? "" : formData.daytimeFit2LkrKwh}
                  onChange={handleChange}
                  placeholder={
                    isPucslBasis ? "N/A for PUCSL Rate" : "e.g. 15.50"
                  }
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  FiT Step Date
                </label>
                <input
                  type="date"
                  name="fitStepDate"
                  disabled={isPucslBasis}
                  value={isPucslBasis ? "" : formData.fitStepDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  FiT End Date *
                </label>
                <input
                  type="date"
                  name="fitEndDate"
                  required
                  value={formData.fitEndDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-md shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Registering Record..." : "Register Bidder Record"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ValidateBidderPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-8 text-center text-muted-foreground">
          Loading bidder validation form...
        </div>
      }
    >
      <ValidateBidderForm />
    </Suspense>
  );
}
