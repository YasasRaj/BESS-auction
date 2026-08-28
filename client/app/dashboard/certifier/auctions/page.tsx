"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";

const res = await apiFetch("/api/users/me");

const data = await res.json();

interface Auction {
  id: number;
  created_by_user_id: number;
  title: string;
  status:
    | "DRAFT"
    | "PENDING"
    | "OPEN"
    | "CLOSED"
    | "RESULTS_FROZEN"
    | "CERTIFIED"
    | "AWARD_RELEASED"
    | "ANNULLED"
    | string;
  quarterly_cap_kw: number | string;
  ceiling_delta: number | string;
  min_decrement: number | string;
  bid_precision: number | string;
  eta_ref: number | string;
  opens_at: string;
  closes_at: string;
  peak_window_start: string;
  peak_window_end: string;
  revision_budget: number;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4" | null;
  year: number;
  cutoff_price?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

interface FetchAuctionsResponse {
  success?: boolean;
  auctions?: Auction[];
  message?: string;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Define statuses where certifiers are allowed to view details/certify
const VIEWABLE_STATUSES = new Set([
  "CLOSED",
  "RESULTS_FROZEN",
  "CERTIFIED",
  "AWARD_RELEASED",
]);

export default function CertifierAuctionsPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reloadAuctions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/certifier/auctions`, {
        credentials: "include",
      });
      const data = (await res.json()) as FetchAuctionsResponse;

      if (res.ok && data.auctions) {
        setAuctions(data.auctions);
      } else {
        setErrorMsg(data.message || "Failed to load auctions list.");
      }
    } catch (err: unknown) {
      console.error("Error fetching certifier auctions:", err);
      const msg =
        err instanceof Error ? err.message : "A network error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/certifier/auctions`, {
          credentials: "include",
        });
        const data = (await res.json()) as FetchAuctionsResponse;

        if (ignore) return;

        if (res.ok && data.auctions) {
          setAuctions(data.auctions);
        } else {
          setErrorMsg(data.message || "Failed to load auctions list.");
        }
      } catch (err: unknown) {
        if (ignore) return;
        console.error("Error fetching certifier auctions:", err);
        const msg =
          err instanceof Error ? err.message : "A network error occurred.";
        setErrorMsg(msg);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case "CERTIFIED":
      case "AWARD_RELEASED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800";
      case "CLOSED":
      case "PENDING":
      case "RESULTS_FROZEN":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800";
      case "OPEN":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800";
      case "ANNULLED":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 text-foreground">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-muted-foreground">Certifier Portal</span>
        <span>/</span>
        <span className="text-foreground font-medium">Auctions</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Auctions Certification List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View auction status and perform certification actions on closed
            auctions.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={reloadAuctions}
            className="underline font-semibold hover:opacity-80 ml-4 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading auctions...
          </div>
        ) : auctions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No auctions available for certification at this time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Ceiling Δ</th>
                  <th className="py-3 px-4">
                    <span className="normal-case">η</span>_ref
                  </th>
                  <th className="py-3 px-4">Quarterly Cap</th>
                  <th className="py-3 px-4">Opens At</th>
                  <th className="py-3 px-4">Closes At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auctions.map((auction) => {
                  const isViewable = VIEWABLE_STATUSES.has(
                    auction.status.toUpperCase(),
                  );

                  return (
                    <tr
                      key={auction.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4 font-semibold text-foreground max-w-[220px] truncate">
                        {auction.title}
                      </td>

                      {/* Ceiling Delta */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {auction.ceiling_delta != null
                          ? Number(auction.ceiling_delta).toFixed(2)
                          : "N/A"}
                      </td>

                      {/* η_ref */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {auction.eta_ref}
                      </td>

                      {/* Quarterly Cap */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {Number(auction.quarterly_cap_kw)?.toLocaleString()} kW
                      </td>

                      {/* Opens At */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(auction.opens_at)}
                      </td>

                      {/* Closes At */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(auction.closes_at)}
                      </td>

                      {/* Read-only Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyle(
                            auction.status,
                          )}`}
                        >
                          {auction.status}
                        </span>
                      </td>

                      {/* Actions: View Details (Only enabled when status is viewable) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isViewable ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/certifier/auction/${auction.id}`,
                              )
                            }
                            className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold rounded transition cursor-pointer shadow-sm"
                          >
                            View Details
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Certification is only accessible once the auction has closed."
                            className="px-3.5 py-1.5 bg-muted text-muted-foreground opacity-60 text-xs font-semibold rounded cursor-not-allowed"
                          >
                            Pending Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
