"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function SubmitApplicantsPage() {
  const { user, loading } = useAuth();

  // Base API URL pointing to your backend server (defaults to http://localhost:5000)
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Form State initialized with default testing/demo values
  const [formData, setFormData] = useState({
    // --- bidder_info fields ---
    mobile_number: "16045550192",
    prosumer_name: "Alex Morgan",
    nic: "199012345678",
    dl_reference_id: "DL-REF-2026-001",
    cleared_inverter_rating_kw: "50.00",

    // --- daytime_tariff_details fields ---
    scheme: "Net Accounting",
    daytime_fit_basis: "Legacy Vintage",
    solar_connection_agreement_start_date: "2026-01-01",
    daytime_fit_lkr_kwh: "22.00",
    fit_step_date: "2031-01-01",
    daytime_fit2_lkr_kwh: "18.00",
    fit_end_date: "2046-01-01",
  });

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (loading)
    return <div className="p-6 text-foreground">Loading session...</div>;

  if (!user) {
    return (
      <div className="p-6 text-foreground">
        Please log in to view this page.
      </div>
    );
  }

  // Check the database field 'type' instead of 'role'
  if (user.type !== "DL Officer") {
    return (
      <div className="p-6 text-destructive border border-destructive/20 bg-destructive/10 rounded-md">
        Access Forbidden: Only DL Officers are authorized to submit applicants.
      </div>
    );
  }

  const dlOffice = user.dlOffice || user.officeName || "Office 1";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Clear stepped tariff details if switched to PUCSL Rate
      if (name === "daytime_fit_basis" && value === "PUCSL Rate") {
        updated.fit_step_date = "";
        updated.daytime_fit2_lkr_kwh = "";
      }
      return updated;
    });
  };

  const resetForm = () => {
    setFormData({
      mobile_number: "94771234567",
      prosumer_name: "John Doe",
      nic: "199012345678",
      dl_reference_id: "DL-REF-2026-001",
      cleared_inverter_rating_kw: "50.00",
      scheme: "Net Accounting",
      daytime_fit_basis: "Legacy Vintage",
      solar_connection_agreement_start_date: "2026-01-01",
      daytime_fit_lkr_kwh: "22.00",
      fit_step_date: "2031-01-01",
      daytime_fit2_lkr_kwh: "18.00",
      fit_end_date: "2046-01-01",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const isPucsl = formData.daytime_fit_basis === "PUCSL Rate";

    try {
      const response = await fetch(`${API_BASE_URL}/api/dl/submit-applicant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bidder_info: {
            mobile_number: formData.mobile_number,
            prosumer_name: formData.prosumer_name,
            nic: formData.nic,
            dl_reference_id: formData.dl_reference_id,
            cleared_inverter_rating_kw: parseFloat(
              formData.cleared_inverter_rating_kw,
            ),
          },
          daytime_tariff_details: {
            scheme: formData.scheme || undefined,
            daytime_fit_basis: formData.daytime_fit_basis || undefined,
            solar_connection_agreement_start_date:
              formData.solar_connection_agreement_start_date || undefined,
            daytime_fit_lkr_kwh: formData.daytime_fit_lkr_kwh
              ? parseFloat(formData.daytime_fit_lkr_kwh)
              : undefined,
            fit_step_date: isPucsl ? null : formData.fit_step_date || null,
            daytime_fit2_lkr_kwh:
              isPucsl || !formData.daytime_fit2_lkr_kwh
                ? null
                : parseFloat(formData.daytime_fit2_lkr_kwh),
            fit_end_date: formData.fit_end_date || null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to submit applicant data.",
        );
      }

      setFeedback({
        type: "success",
        message: `Applicant ${formData.prosumer_name} (DL Ref: ${formData.dl_reference_id}) successfully submitted!`,
      });

      resetForm();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setFeedback({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isPucslRate = formData.daytime_fit_basis === "PUCSL Rate";

  return (
    <div className="max-w-4xl mx-auto p-6 text-foreground space-y-6">
      {/* Header & Navigation */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Submit Cleared Applicant</h1>
          <p className="text-sm text-muted-foreground">
            Distribution Licensee Office:{" "}
            <span className="font-semibold text-foreground">{dlOffice}</span>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border text-sm rounded hover:bg-muted transition font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Alert Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-lg border text-sm font-medium ${
            feedback.type === "success"
              ? "bg-accent/15 text-accent border-accent"
              : "bg-destructive/15 text-destructive border-destructive"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: BIDDER INFO */}
        <div className="p-6 border border-border rounded-lg bg-card space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-lg font-semibold text-primary">
              1. Bidder Information
            </h2>
            <p className="text-xs text-muted-foreground">
              User account lookup is performed using the registered Mobile
              Number.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mobile Number (User Lookup) *
              </label>
              <input
                type="tel"
                name="mobile_number"
                required
                value={formData.mobile_number}
                onChange={handleChange}
                placeholder="e.g. 94771234567"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Prosumer Name *
              </label>
              <input
                type="text"
                name="prosumer_name"
                required
                value={formData.prosumer_name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                NIC / National ID *
              </label>
              <input
                type="text"
                name="nic"
                required
                value={formData.nic}
                onChange={handleChange}
                placeholder="e.g. 199012345678"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                DL Reference ID *
              </label>
              <input
                type="text"
                name="dl_reference_id"
                required
                value={formData.dl_reference_id}
                onChange={handleChange}
                placeholder="e.g. DL-REF-2026-001"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cleared Inverter Rating (kW) *
              </label>
              <input
                type="number"
                step="0.01"
                name="cleared_inverter_rating_kw"
                required
                value={formData.cleared_inverter_rating_kw}
                onChange={handleChange}
                placeholder="e.g. 50.00"
                className="w-full sm:w-1/2 px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DAYTIME TARIFF DETAILS */}
        <div className="p-6 border border-border rounded-lg bg-card space-y-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-lg font-semibold text-primary">
              2. Daytime Tariff Details
            </h2>
            <p className="text-xs text-muted-foreground">
              Required if no tariff record exists for DL Reference ID (
              {formData.dl_reference_id || "DL-REF"}).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Scheme
              </label>
              <select
                name="scheme"
                value={formData.scheme}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Net Accounting">Net Accounting</option>
                <option value="Net Plus">Net Plus</option>
                <option value="Net Plus Plus">Net Plus Plus</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Daytime FiT Basis
              </label>
              <select
                name="daytime_fit_basis"
                value={formData.daytime_fit_basis}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Legacy Vintage">Legacy Vintage</option>
                <option value="PUCSL Rate">PUCSL Rate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Agreement Start Date
              </label>
              <input
                type="date"
                name="solar_connection_agreement_start_date"
                value={formData.solar_connection_agreement_start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Daytime FiT (LKR/kWh)
              </label>
              <input
                type="number"
                step="0.0001"
                name="daytime_fit_lkr_kwh"
                value={formData.daytime_fit_lkr_kwh}
                onChange={handleChange}
                placeholder="e.g. 22.00"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {!isPucslRate && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    FiT Step Date
                  </label>
                  <input
                    type="date"
                    name="fit_step_date"
                    value={formData.fit_step_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Daytime FiT after step date (LKR/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    name="daytime_fit2_lkr_kwh"
                    value={formData.daytime_fit2_lkr_kwh}
                    onChange={handleChange}
                    placeholder="e.g. 18.00 (Optional)"
                    className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}

            <div
              className={`space-y-1.5 ${
                isPucslRate ? "sm:col-span-1" : "sm:col-span-2"
              }`}
            >
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                FiT End Date
              </label>
              <input
                type="date"
                name="fit_end_date"
                value={formData.fit_end_date}
                onChange={handleChange}
                className={`w-full ${
                  isPucslRate ? "w-full" : "sm:w-1/2"
                } px-3 py-2 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring`}
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm hover:bg-muted transition font-medium"
          >
            Reset Form
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 transition font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Applicant Data"}
          </button>
        </div>
      </form>
    </div>
  );
}
