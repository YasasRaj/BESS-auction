"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// --- TypeScript Interfaces ---

export interface Auction {
  id: number;
  title: string;
  status: string;
  opens_at?: string;
  closes_at?: string;
  quarterly_cap_kw?: number;
}

export interface Bid {
  id: number;
  bid_value: number;
  bid_status: string;
  bid_time: string;
  created_at: string;
  prosumer_name: string;
  cleared_inverter_rating_kw: number;
  clearance_date: string;
  dl_clearance_officer_name: string;
  pseudonym?: string;
}

export interface Registration {
  id: number;
  registered_at: string;
  registration_status: number;
  bids_left: number;
  prosumer_name: string;
  cleared_inverter_rating_kw: number;
  clearance_date: string;
  dl_clearance_officer_name: string;
  pseudonym?: string;
}

export interface Certification {
  id: number;
  notes: string | null;
  created_at: string;
  auction_title: string;
  certifier_name: string;
}

export interface Annulment {
  id: number;
  reason: string;
  created_at: string;
  auction_title: string;
  certifier_name: string;
}

export interface AuctionDetailsData {
  success: boolean;
  message?: string;
  auction: Auction;
  bids: Bid[];
  registrations: Registration[];
  certifications: Certification[];
  annulments: Annulment[];
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

// --- Generic DataTable Component with Sort & Column Filtering ---

type ColumnDef<T> = {
  header: string;
  accessor: keyof T & string;
  render?: (val: unknown, row: T) => React.ReactNode;
};

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
}

function DataTable<T extends object>({ columns, data }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<(keyof T & string) | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Filtering
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return columns.every((col) => {
        const filterVal = filters[col.accessor];

        if (!filterVal) return true;

        const cellVal = String(
          (row as Record<string, unknown>)[col.accessor] ?? "",
        ).toLowerCase();

        return cellVal.includes(filterVal.toLowerCase());
      });
    });
  }, [data, columns, filters]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey];
      const valB = (b as Record<string, unknown>)[sortKey];

      if (valA == null) {
        return sortDir === "asc" ? 1 : -1;
      }

      if (valB == null) {
        return sortDir === "asc" ? -1 : 1;
      }

      if (valA < valB) {
        return sortDir === "asc" ? -1 : 1;
      }

      if (valA > valB) {
        return sortDir === "asc" ? 1 : -1;
      }

      return 0;
    });
  }, [filteredData, sortKey, sortDir]);

  const handleSort = (key: keyof T & string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="overflow-x-auto border border-border rounded-lg shadow-sm bg-card">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor}
                className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                <div
                  className="cursor-pointer hover:text-foreground flex items-center justify-between"
                  onClick={() => handleSort(col.accessor)}
                >
                  {col.header}

                  {sortKey === col.accessor && (
                    <span className="ml-1 text-xs text-foreground">
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder={`Filter ${col.header}...`}
                    value={filters[col.accessor] || ""}
                    onChange={(e) =>
                      handleFilterChange(col.accessor, e.target.value)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-xs border border-border bg-background text-foreground rounded-md font-normal focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {sortedData.length > 0 ? (
            sortedData.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.accessor}
                    className="px-4 py-3.5 whitespace-nowrap text-foreground"
                  >
                    {col.render
                      ? col.render(
                          (row as Record<string, unknown>)[col.accessor],
                          row,
                        )
                      : ((row as Record<string, unknown>)[
                          col.accessor
                        ] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                No matching records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Main Page Component ---

export default function CertifierAuctionDetails() {
  const { id } = useParams();
  const router = useRouter();

  const auctionId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuctionDetailsData | null>(null);

  // Action states & modals
  const [actionLoading, setActionLoading] = useState(false);

  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [certifyNotes, setCertifyNotes] = useState("");

  const [showAnnulModal, setShowAnnulModal] = useState(false);
  const [annulReason, setAnnulReason] = useState("");

  /*
   * PSEUDONYMS ARE DERIVED DATA.
   *
   * They don't need their own useState because they can always
   * be calculated from the current API data.
   */
  const pseudonyms = useMemo(() => {
    if (!data) return {};

    const uniqueNames = new Set<string>();

    data.bids?.forEach((b) => {
      if (b.prosumer_name) {
        uniqueNames.add(b.prosumer_name);
      }
    });

    data.registrations?.forEach((r) => {
      if (r.prosumer_name) {
        uniqueNames.add(r.prosumer_name);
      }
    });

    const nameMap: Record<string, string> = {};

    Array.from(uniqueNames).forEach((name, index) => {
      nameMap[name] = `Bidder ${index + 1}`;
    });

    return nameMap;
  }, [data]);

  /*
   * Reusable function for refreshing auction details.
   *
   * IMPORTANT:
   * This function does not control the initial loading state.
   * That prevents the page from flashing "Loading audit data..."
   * after certifying or annulling an auction.
   */
  const fetchAuctionDetails = async (
    auctionIdToFetch: string,
  ): Promise<boolean> => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/certifier/auction/${auctionIdToFetch}`,
        {
          credentials: "include",
        },
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch auction data (${res.status})`);
      }

      const result: AuctionDetailsData = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load auction data.");
      }

      setData(result);
      setError(null);

      return true;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );

      return false;
    }
  };

  /*
   * Initial auction loading.
   *
   * The request itself lives inside the effect instead of
   * directly calling a function that performs setState().
   *
   * This also prevents stale requests from updating the component
   * after the auction ID changes or the component unmounts.
   */
  useEffect(() => {
    if (!auctionId) {
      setError("Auction ID is missing.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAuction = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/certifier/auction/${auctionId}`,
          {
            credentials: "include",
          },
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch auction data (${res.status})`);
        }

        const result: AuctionDetailsData = await res.json();

        if (cancelled) return;

        if (!result.success) {
          setError(result.message || "Failed to load auction data.");
          return;
        }

        setData(result);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "An unexpected error occurred.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAuction();

    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  // --- Certify Auction ---

  const handleCertifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auctionId) return;

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/certifier/auction/${auctionId}/certify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            notes: certifyNotes,
          }),
        },
      );

      const result = await res.json();

      if (!result.success) {
        setActionMessage({
          type: "error",
          text: result.message || "Failed to submit certification.",
        });
      } else {
        setActionMessage({
          type: "success",
          text: result.message,
        });

        setShowCertifyModal(false);
        setCertifyNotes("");

        // Refresh data after successful certification
        await fetchAuctionDetails(auctionId);
      }
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Annul Auction ---

  const handleAnnulSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auctionId) return;

    if (!annulReason.trim()) {
      setActionMessage({
        type: "error",
        text: "An explicit reason is required to annul an auction.",
      });
      return;
    }

    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/certifier/auction/${auctionId}/annul`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            reason: annulReason,
          }),
        },
      );

      const result = await res.json();

      if (!result.success) {
        setActionMessage({
          type: "error",
          text: result.message || "Failed to annul auction.",
        });
      } else {
        setActionMessage({
          type: "success",
          text: result.message,
        });

        setShowAnnulModal(false);
        setAnnulReason("");

        // Refresh data after successful annulment
        await fetchAuctionDetails(auctionId);
      }
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Loading State ---

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center text-sm text-muted-foreground">
        Loading audit data...
      </div>
    );
  }

  // --- Error State ---

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-4 border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg">
          <h3 className="font-bold mb-2">Access Restricted / Error</h3>

          <p>{error || "No data available."}</p>

          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition text-xs font-semibold cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { auction, bids, registrations, certifications, annulments } = data;

  // --- Map Pseudonyms ---

  const mappedBids: Bid[] = (bids || []).map((b) => ({
    ...b,
    pseudonym: pseudonyms[b.prosumer_name] || "Unknown Bidder",
  }));

  const mappedRegistrations: Registration[] = (registrations || []).map(
    (r) => ({
      ...r,
      pseudonym: pseudonyms[r.prosumer_name] || "Unknown Bidder",
    }),
  );

  // --- Table Columns ---

  const bidColumns: ColumnDef<Bid>[] = [
    {
      header: "Bidder (Pseudonym)",
      accessor: "pseudonym",
    },
    {
      header: "Bid Value (LKR/kWh)",
      accessor: "bid_value",
      render: (val) => (
        <span className="font-mono">
          {val != null ? Number(val).toFixed(2) : "N/A"}
        </span>
      ),
    },
    {
      header: "Bid Time",
      accessor: "bid_time",
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(val as string)}
        </span>
      ),
    },
    {
      header: "Inverter Rating (kW)",
      accessor: "cleared_inverter_rating_kw",
      render: (val) => (
        <span className="font-mono">
          {val != null ? Number(val).toLocaleString() : "N/A"}
        </span>
      ),
    },
    {
      header: "DL Officer",
      accessor: "dl_clearance_officer_name",
    },
  ];

  const registrationColumns: ColumnDef<Registration>[] = [
    {
      header: "Bidder (Pseudonym)",
      accessor: "pseudonym",
    },
    {
      header: "Registered At",
      accessor: "registered_at",
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(val as string)}
        </span>
      ),
    },
    {
      header: "Inverter Rating (kW)",
      accessor: "cleared_inverter_rating_kw",
      render: (val) => (
        <span className="font-mono">
          {val != null ? Number(val).toLocaleString() : "N/A"}
        </span>
      ),
    },
    {
      header: "DL Officer",
      accessor: "dl_clearance_officer_name",
    },
  ];

  const certificationColumns: ColumnDef<Certification>[] = [
    {
      header: "Auction Title",
      accessor: "auction_title",
    },
    {
      header: "Certifier",
      accessor: "certifier_name",
    },
    {
      header: "Timestamp",
      accessor: "created_at",
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(val as string)}
        </span>
      ),
    },
    {
      header: "Notes",
      accessor: "notes",
    },
  ];

  const annulmentColumns: ColumnDef<Annulment>[] = [
    {
      header: "Auction Title",
      accessor: "auction_title",
    },
    {
      header: "Certifier",
      accessor: "certifier_name",
    },
    {
      header: "Timestamp",
      accessor: "created_at",
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(val as string)}
        </span>
      ),
    },
    {
      header: "Reason",
      accessor: "reason",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 text-foreground relative">
      {/* Breadcrumbs */}

      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>

        <span>/</span>

        <Link href="/dashboard/certifier/auctions" className="hover:underline">
          Certifier Portal
        </Link>

        <span>/</span>

        <span className="text-foreground font-medium">Audit View</span>
      </div>

      {/* Action feedback banner */}

      {actionMessage && (
        <div
          className={`p-4 rounded-md text-sm border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold">Audit View: {auction.title}</h1>

            <p className="text-sm text-muted-foreground mt-0.5">
              Review detailed submission history, registrations, and official
              certification records.
            </p>
          </div>

          {/* Certify & Annul Buttons */}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCertifyModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              Certify Auction
            </button>

            <button
              onClick={() => setShowAnnulModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              Annul Auction
            </button>
          </div>
        </div>

        <div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeStyle(
              auction.status,
            )}`}
          >
            {auction.status}
          </span>
        </div>
      </div>

      {/* Tables */}

      <div className="space-y-10">
        {/* Auction Bids */}

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Auction Bids
            </h2>

            <p className="text-sm text-muted-foreground">
              All submitted bids. Identities are pseudonymized for audit
              neutrality.
            </p>
          </div>

          <DataTable columns={bidColumns} data={mappedBids} />
        </section>

        {/* Registrations */}

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Registrations
            </h2>

            <p className="text-sm text-muted-foreground">
              List of approved participants who registered for this auction.
            </p>
          </div>

          <DataTable columns={registrationColumns} data={mappedRegistrations} />
        </section>

        {/* Certifications */}

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Certifications
            </h2>

            <p className="text-sm text-muted-foreground">
              Record of official certifications applied to this auction.
            </p>
          </div>

          <DataTable
            columns={certificationColumns}
            data={certifications || []}
          />
        </section>

        {/* Annulments */}

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Annulments
            </h2>

            <p className="text-sm text-muted-foreground">
              Record of annulments or cancellations applied to this auction.
            </p>
          </div>

          <DataTable columns={annulmentColumns} data={annulments || []} />
        </section>
      </div>

      {/* Certify Modal */}

      {showCertifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Certify Auction</h3>

            <p className="text-xs text-muted-foreground">
              Provide optional notes or remarks for your certification
              endorsement.
            </p>

            <form onSubmit={handleCertifySubmit} className="space-y-4">
              <textarea
                rows={3}
                placeholder="Optional notes..."
                value={certifyNotes}
                onChange={(e) => setCertifyNotes(e.target.value)}
                className="w-full p-2.5 text-sm border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCertifyModal(false);
                    setActionMessage(null);
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs border border-border rounded-md hover:bg-muted cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Confirm Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Annul Modal */}

      {showAnnulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-rose-600">Annul Auction</h3>

            <p className="text-xs text-muted-foreground">
              An explicit reason is required to annul an auction. This action
              changes the state to ANNULLED.
            </p>

            <form onSubmit={handleAnnulSubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                placeholder="Enter annulment reason..."
                value={annulReason}
                onChange={(e) => setAnnulReason(e.target.value)}
                className="w-full p-2.5 text-sm border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAnnulModal(false);
                    setActionMessage(null);
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs border border-border rounded-md hover:bg-muted cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md shadow transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Confirm Annulment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
