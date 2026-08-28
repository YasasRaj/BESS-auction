"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface AuctionData {
  id?: string | number;
  title?: string;
  quarterly_cap_kw?: number;
  ceiling_delta?: number;
  min_decrement?: number;
  bid_precision?: number;
  eta_ref?: number;
  opens_at?: string;
  closes_at?: string;
  peak_window_start?: string;
  peak_window_end?: string;
  revision_budget?: number;
  quarter?: string;
  year?: number;
}

interface ApiResponse {
  message?: string;
  auction?: AuctionData;
  [key: string]: unknown;
}

const getNowDatetimeString = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatForDatetimeLocal = (
  dateVal: string | Date | null | undefined,
): string => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

// Defensive helper to handle HTML 404/500 responses gracefully without throwing SyntaxError
async function parseJsonResponse(res: Response): Promise<ApiResponse> {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await res.json()) as ApiResponse;
  }
  const text = await res.text();
  throw new Error(
    `Server returned status ${res.status} (${res.statusText}) non-JSON response: ${text.slice(0, 120)}...`,
  );
}

function CreateAuctionFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auctionId = searchParams.get("id");

  const { user, loading: authLoading } = useAuth();
  const [fetchingDraft, setFetchingDraft] = useState<boolean>(!!auctionId);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [minDatetime] = useState<string>(getNowDatetimeString);

  const [formData, setFormData] = useState({
    title: "",
    quarterly_cap_kw: 1000,
    ceiling_delta: 0.5,
    min_decrement: 0.05,
    bid_precision: 2,
    eta_ref: 0.85,
    opens_at: "",
    closes_at: "",
    peak_window_start: "18:30",
    peak_window_end: "22:30",
    revision_budget: 3,
    quarter: "Q3",
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    async function loadExistingAuction() {
      if (!auctionId) return;

      try {
        setFetchingDraft(true);
        const res = await fetch(
          `${API_BASE_URL}/api/aa/auctions/${auctionId}`,
          {
            credentials: "include",
          },
        );
        const responseData = await parseJsonResponse(res);

        if (res.ok) {
          const data = (responseData.auction || responseData) as AuctionData;

          setFormData((prev) => ({
            ...prev,
            title: data.title ?? prev.title,
            quarterly_cap_kw: data.quarterly_cap_kw ?? prev.quarterly_cap_kw,
            ceiling_delta: data.ceiling_delta ?? prev.ceiling_delta,
            min_decrement: data.min_decrement ?? prev.min_decrement,
            bid_precision: data.bid_precision ?? prev.bid_precision,
            eta_ref: data.eta_ref ?? prev.eta_ref,
            opens_at: formatForDatetimeLocal(data.opens_at) || prev.opens_at,
            closes_at: formatForDatetimeLocal(data.closes_at) || prev.closes_at,
            peak_window_start: data.peak_window_start ?? prev.peak_window_start,
            peak_window_end: data.peak_window_end ?? prev.peak_window_end,
            revision_budget: data.revision_budget ?? prev.revision_budget,
            quarter: data.quarter ?? prev.quarter,
            year: data.year ?? prev.year,
          }));
        } else {
          setErrorMsg(
            responseData.message ||
              "Could not fetch the specified auction draft.",
          );
        }
      } catch (err: unknown) {
        console.error("Failed to load auction draft:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load draft data.";
        setErrorMsg(message);
      } finally {
        setFetchingDraft(false);
      }
    }

    loadExistingAuction();
  }, [auctionId]);

  const rawRole = user?.role || user?.type || "";
  const normalizedRole = String(rawRole).toLowerCase();
  const isAuctionAdmin =
    normalizedRole === "auction admin" ||
    normalizedRole === "auction_admin" ||
    normalizedRole === "admin";

  if (authLoading || fetchingDraft) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-foreground text-sm">
        {authLoading
          ? "Verifying authorization..."
          : "Loading auction draft..."}
      </div>
    );
  }

  if (!user || !isAuctionAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 border border-destructive/30 bg-destructive/10 rounded-lg text-center space-y-4">
        <h2 className="text-lg font-bold text-destructive">Access Denied</h2>
        <p className="text-sm text-muted-foreground">
          Only an authorized <strong>Auction Admin</strong> has permission to
          create or configure auction rounds.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:opacity-90 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleSave = async (targetStatus: "DRAFT" | "PENDING") => {
    setErrorMsg(null);

    let formattedOpensAt = "";
    let formattedClosesAt = "";

    if (formData.opens_at) {
      const opensAtDate = new Date(formData.opens_at);
      const now = new Date();

      if (opensAtDate < now) {
        setErrorMsg(
          "Start date and time (Opens At) cannot be set in the past.",
        );
        return;
      }
      formattedOpensAt = opensAtDate.toISOString();

      if (formData.closes_at) {
        const closesAtDate = new Date(formData.closes_at);
        if (closesAtDate <= opensAtDate) {
          setErrorMsg("Closing time must be strictly after the start time.");
          return;
        }
        formattedClosesAt = closesAtDate.toISOString();
      }
    } else if (targetStatus === "PENDING") {
      setErrorMsg("Opening date and time are required to launch an auction.");
      return;
    }

    setSubmitting(true);

    const payload = {
      ...formData,
      ...(auctionId ? { id: auctionId } : {}),
      opens_at: formattedOpensAt,
      closes_at: formattedClosesAt,
      status: targetStatus,
      created_by_user_id: user.id,
      quarterly_cap_kw: Number(formData.quarterly_cap_kw),
      ceiling_delta: Number(formData.ceiling_delta),
      min_decrement: Number(formData.min_decrement),
      bid_precision: Number(formData.bid_precision),
      eta_ref: Number(formData.eta_ref),
      revision_budget: Number(formData.revision_budget),
      year: Number(formData.year),
    };

    try {
      const endpoint = auctionId
        ? `${API_BASE_URL}/api/aa/auctions/${auctionId}`
        : `${API_BASE_URL}/api/aa/create-auction`;
      const method = auctionId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const resData = await parseJsonResponse(response);

      if (response.ok) {
        alert(
          targetStatus === "DRAFT"
            ? "Auction draft saved successfully!"
            : "Auction saved and set to PENDING!",
        );
        router.push("/dashboard/aa/auctions");
      } else {
        setErrorMsg(
          resData.message ||
            "Failed to save auction. Please check your inputs.",
        );
      }
    } catch (err: unknown) {
      console.error("Auction save error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "A network error occurred while submitting.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-foreground space-y-6">
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-muted-foreground">Auction Admin</span>
        <span>/</span>
        <span className="text-foreground font-medium">
          {auctionId ? "Edit Draft Auction" : "Create Auction"}
        </span>
      </div>

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {auctionId
              ? `Edit Draft Auction (${auctionId})`
              : "Configure New Auction"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill out auction parameters, target capacity, timing windows, and
            revision limits.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave("PENDING");
        }}
        className="p-6 border border-border rounded-lg bg-card shadow-sm space-y-6"
      >
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
            1. Basic Metadata
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Auction Title *
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Q3 Commercial Solar Tariff Auction"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Quarter *
              </label>
              <select
                name="quarter"
                value={formData.quarter}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Year *
              </label>
              <input
                type="number"
                name="year"
                required
                min={2024}
                max={2035}
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
            2. Capacity, Tariff & Peak Window Controls
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Quarterly Capacity Limit (kW) *
              </label>
              <input
                type="number"
                name="quarterly_cap_kw"
                required
                step="0.01"
                placeholder="1000"
                value={formData.quarterly_cap_kw}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                ETA Ref (η ref) *
              </label>
              <input
                type="number"
                name="eta_ref"
                required
                step="0.01"
                placeholder="0.85"
                value={formData.eta_ref}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Ceiling Delta *
              </label>
              <input
                type="number"
                name="ceiling_delta"
                required
                step="0.01"
                placeholder="0.50"
                value={formData.ceiling_delta}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Minimum Decrement *
              </label>
              <input
                type="number"
                name="min_decrement"
                required
                step="0.001"
                placeholder="0.05"
                value={formData.min_decrement}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Bid Precision (Decimal Places) *
              </label>
              <input
                type="number"
                name="bid_precision"
                required
                min={0}
                max={4}
                value={formData.bid_precision}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Revision Budget (Max Bid Edits) *
              </label>
              <input
                type="number"
                name="revision_budget"
                required
                min={0}
                value={formData.revision_budget}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Peak Window Start *
              </label>
              <input
                type="time"
                name="peak_window_start"
                required
                value={formData.peak_window_start}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Peak Window End *
              </label>
              <input
                type="time"
                name="peak_window_end"
                required
                value={formData.peak_window_end}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary border-b border-border pb-2">
            3. Operational Timing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Opens At (Date & Time) *
              </label>
              <input
                type="datetime-local"
                name="opens_at"
                required
                min={minDatetime}
                value={formData.opens_at}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Closes At (Date & Time) *
              </label>
              <input
                type="datetime-local"
                name="closes_at"
                required
                min={formData.opens_at || minDatetime}
                value={formData.closes_at}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center space-x-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-border rounded text-sm hover:bg-muted font-medium transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSave("DRAFT")}
            className="px-4 py-2 border border-border bg-secondary text-secondary-foreground rounded text-sm font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:opacity-90 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {submitting ? "Processing..." : "Save & Launch Auction"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateAuctionPage() {
  return (
    <Suspense
      fallback={<div className="p-6 text-center text-sm">Loading page...</div>}
    >
      <CreateAuctionFormContent />
    </Suspense>
  );
}
