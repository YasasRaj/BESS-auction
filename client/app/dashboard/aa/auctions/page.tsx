"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Auction {
  id: number | string;
  title: string;
  created_by_name?: string;
  created_by_user_id?: number | string;
  cutoff_price: number;
  ceiling_delta: number;
  eta_ref: number;
  registered_cap_kw?: number;
  quarterly_cap_kw: number;
  opens_at: string;
  closes_at: string;
  status: "DRAFT" | "PENDING" | "OPEN" | "CLOSED" | string;
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

export default function AuctionsOverviewPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<
    string | number | null
  >(null);

  // Helper function for user-triggered re-fetches (e.g., Retry, post-delete)
  const reloadAuctions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/aa/auctions`, {
        credentials: "include",
      });
      const data = (await res.json()) as FetchAuctionsResponse;

      if (res.ok && data.auctions) {
        setAuctions(data.auctions);
      } else {
        setErrorMsg(data.message || "Failed to load auctions list.");
      }
    } catch (err: unknown) {
      console.error("Error fetching auctions:", err);
      const msg =
        err instanceof Error ? err.message : "A network error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial auction list
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/aa/auctions`, {
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
        console.error("Error fetching auctions:", err);
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

  // Handle Close Auction action
  const handleCloseAuction = async (id: string | number) => {
    if (!confirm(`Are you sure you want to close Auction #${id}?`)) return;

    try {
      setActionLoadingId(id);
      const res = await fetch(`${API_BASE_URL}/api/aa/auctions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (res.ok) {
        reloadAuctions();
      } else {
        const errData = (await res.json()) as { message?: string };
        alert(errData.message || "Failed to close auction.");
      }
    } catch (err: unknown) {
      console.error("Error closing auction:", err);
      alert("Failed to close auction due to a network error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Draft action
  const handleDeleteDraft = async (id: string | number) => {
    if (!confirm(`Are you sure you want to delete draft Auction #${id}?`)) {
      return;
    }

    try {
      setActionLoadingId(id);
      const res = await fetch(`${API_BASE_URL}/api/aa/auctions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setAuctions((prev) => prev.filter((item) => item.id !== id));
      } else {
        const errData = (await res.json()) as { message?: string };
        alert(errData.message || "Failed to delete auction draft.");
      }
    } catch (err: unknown) {
      console.error("Error deleting draft:", err);
      alert("Failed to delete draft due to a network error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case "DRAFT":
        return "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 cursor-pointer";
      case "OPEN":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "PENDING":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "CLOSED":
        return "bg-slate-100 text-slate-700 border-slate-300";
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
        <span className="text-muted-foreground">Auction Admin</span>
        <span>/</span>
        <span className="text-foreground font-medium">Auctions Overview</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">Auction Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View, configure, edit drafts, and monitor open or upcoming auction
            rounds.
          </p>
        </div>
        <Link
          href="/dashboard/aa/create"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90 transition shadow-sm w-fit"
        >
          + Create New Auction
        </Link>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={reloadAuctions}
            className="underline font-semibold hover:opacity-80 ml-4"
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
              No auctions found in the system.
            </p>
            <Link
              href="/dashboard/aa/create"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90 transition"
            >
              Create First Auction
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Cutoff Price</th>
                  <th className="py-3 px-4">Ceiling Δ</th>
                  <th className="py-3 px-4">
                    <span className="normal-case">η</span>_ref
                  </th>
                  <th className="py-3 px-4">Registered Cap</th>
                  <th className="py-3 px-4">Quarterly Cap</th>
                  <th className="py-3 px-4">Opens At</th>
                  <th className="py-3 px-4">Closes At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auctions.map((auction) => {
                  const isDraft = auction.status.toUpperCase() === "DRAFT";
                  const isOpen = auction.status.toUpperCase() === "OPEN";
                  const isPending = auction.status.toUpperCase() === "PENDING";
                  const isActionBusy = actionLoadingId === auction.id;

                  return (
                    <tr
                      key={auction.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Title */}
                      <td className="py-3.5 px-4 font-semibold text-foreground max-w-[220px] truncate">
                        {auction.title}
                      </td>

                      {/* Created By */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {auction.created_by_name ||
                          `User #${auction.created_by_user_id ?? "N/A"}`}
                      </td>

                      {/* Cutoff Price */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {auction.cutoff_price}
                      </td>

                      {/* Ceiling Delta */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {auction.ceiling_delta}
                      </td>

                      {/* η_ref */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {auction.eta_ref}
                      </td>

                      {/* Registered Cap */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {Number(
                          auction.registered_cap_kw ?? 0,
                        ).toLocaleString()}{" "}
                        kW
                      </td>

                      {/* Quarterly Cap */}
                      <td className="py-3.5 px-4 text-foreground font-mono">
                        {Number(auction.quarterly_cap_kw ?? 0).toLocaleString()}{" "}
                        kW
                      </td>

                      {/* Opens At */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(auction.opens_at)}
                      </td>

                      {/* Closes At */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(auction.closes_at)}
                      </td>

                      {/* Status Button (Clickable if DRAFT) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isDraft ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/aa/create?id=${auction.id}`,
                              )
                            }
                            title="Click to edit draft"
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border transition ${getStatusBadgeStyle(
                              auction.status,
                            )}`}
                          >
                            DRAFT (Edit)
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyle(
                              auction.status,
                            )}`}
                          >
                            {auction.status}
                          </span>
                        )}
                      </td>

                      {/* Action Button Next to Status */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {(isOpen || isPending) && (
                          <button
                            disabled={isActionBusy}
                            onClick={() => handleCloseAuction(auction.id)}
                            className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 text-xs font-semibold rounded transition cursor-pointer disabled:opacity-50"
                          >
                            {isActionBusy ? "Closing..." : "Close"}
                          </button>
                        )}

                        {isDraft && (
                          <button
                            disabled={isActionBusy}
                            onClick={() => handleDeleteDraft(auction.id)}
                            className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 text-xs font-semibold rounded transition cursor-pointer disabled:opacity-50"
                          >
                            {isActionBusy ? "Deleting..." : "Delete"}
                          </button>
                        )}

                        {!(isOpen || isPending) && !isDraft && (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
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
