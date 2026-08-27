"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// --- DL Officer Panel ---
function DLOfficerPanel() {
  const router = useRouter();

  return (
    <div className="mt-6 p-4 border border-border rounded-lg bg-card text-card-foreground shadow-sm">
      <h2 className="text-lg font-semibold mb-3 text-primary">
        Distribution Location (DL) Officer Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Submit cleared applicants */}
        <Link
          href="/dashboard/dl/submit-applicants"
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm"
        >
          Submit Applicants
        </Link>

        {/* 2. Correct contact numbers (audited) */}
        <Link
          href="/dashboard/dl/correct-contacts"
          className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm border border-border"
        >
          Correct Contacts
        </Link>

        {/* 3. View own DL's applicant roster and OTP-validation status */}
        <Link
          href="/dashboard/dl/applicant-roster"
          className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm border border-border"
        >
          Applicant Roster & OTP
        </Link>

        {/* 4. After award release: print own DL's winners' agreements for signature */}
        <button
          onClick={() => router.push("/dashboard/dl/winner-agreements")}
          className="px-4 py-2.5 bg-accent text-accent-foreground rounded hover:opacity-90 transition font-medium text-sm shadow-sm cursor-pointer"
        >
          Print Winner Agreements
        </button>
      </div>
    </div>
  );
}

// --- Auction Admin Panel ---
function AuctionAdminPanel() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAuction, setNewAuction] = useState({
    title: "",
    type: "Net Accounting",
    capacity_kw: "",
    start_date: "",
    end_date: "",
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Auction "${newAuction.title}" scheduled successfully!`);
    setShowCreateModal(false);
    setNewAuction({
      title: "",
      type: "Net Accounting",
      capacity_kw: "",
      start_date: "",
      end_date: "",
    });
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="p-4 border border-border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">
            Auction Admin Control Center
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Configure and Open Auctions */}
          <Link
            href="/dashboard/aa/create"
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm"
          >
            Configure and Open Auctions
          </Link>

          {/* 2. View Auction Details */}
          <Link
            href="/dashboard/aa/auctions"
            className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm border border-border"
          >
            View Auction Details
          </Link>

          {/* 3. View Bids */}
          <Link
            href="/dashboard/aa/bids"
            className="px-4 py-2.5 bg-accent text-accent-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm col-span-1 sm:col-span-2"
          >
            View Bids (Testing only)
          </Link>
        </div>
      </div>

      {/* Modal: Quick Create Auction */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 space-y-4 shadow-lg text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Launch New Auction Round</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Auction Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Commercial Solar Tender"
                  value={newAuction.title}
                  onChange={(e) =>
                    setNewAuction({ ...newAuction, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Scheme
                  </label>
                  <select
                    value={newAuction.type}
                    onChange={(e) =>
                      setNewAuction({ ...newAuction, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Net Accounting">Net Accounting</option>
                    <option value="Net Plus">Net Plus</option>
                    <option value="Net Plus Plus">Net Plus Plus</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Total Capacity (kW) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1000"
                    value={newAuction.capacity_kw}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        capacity_kw: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAuction.start_date}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAuction.end_date}
                    onChange={(e) =>
                      setNewAuction({ ...newAuction, end_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border rounded text-sm hover:bg-muted font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:opacity-90 font-medium transition cursor-pointer"
                >
                  Save & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Bidder Panel ---
interface BidderPanelProps {
  isValidated: boolean;
  statusText: string;
}

function BidderPanel({ isValidated, statusText }: BidderPanelProps) {
  return (
    <div className="mt-6 space-y-4">
      {/* Account Validation Status Banner */}
      {!isValidated ? (
        <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg text-amber-700 dark:text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">
              Account Status: <span className="font-bold">{statusText}</span>
            </p>
            <p className="text-xs mt-0.5 opacity-90">
              {statusText === "INACTIVE"
                ? "Your account is marked inactive. Complete validation to reactivate."
                : statusText === "UNKNOWN"
                  ? "No clearance record found for your account. Please submit clearance details."
                  : "Complete your facility validation details to participate in active auctions."}
            </p>
          </div>
          <Link
            href="/validate-account"
            className="px-4 py-2 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition text-center shrink-0"
          >
            Validate Account →
          </Link>
        </div>
      ) : (
        <div className="p-3 border border-emerald-500/30 bg-emerald-500/10 rounded-lg text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Account Validated – Eligible to participate in active tariff auctions.
        </div>
      )}

      {/* Main Bidder Actions Grid */}
      <div className="p-4 border border-border rounded-lg bg-card text-card-foreground shadow-sm">
        <h2 className="text-lg font-semibold mb-3 text-primary">
          Bidder Portal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Active Tariff Auctions */}
          <Link
            href="/dashboard/bidder/auctions"
            className={`px-4 py-2.5 rounded font-medium text-sm text-center shadow-sm transition ${
              isValidated
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground pointer-events-none opacity-60"
            }`}
          >
            View Active Auctions
          </Link>

          {/* 2. My Active / Submitted Bids */}
          <Link
            href="/dashboard/bidder/my-bids"
            className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm border border-border"
          >
            My Submitted Bids
          </Link>

          {/* 3. Facility & Solar System Details */}
          <Link
            href="/dashboard/bidder/facility"
            className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm border border-border"
          >
            Facility & Meter Details
          </Link>

          {/* 4. Results & Winner Agreements */}
          <Link
            href="/dashboard/bidder/awards"
            className="px-4 py-2.5 bg-accent text-accent-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm"
          >
            Auction Awards & Results
          </Link>
        </div>
      </div>
    </div>
  );
}

// --- Certifier Panel ---
function CertifierPanel() {
  return (
    <div className="mt-6 p-4 border border-border rounded-lg bg-card text-card-foreground shadow-sm">
      <h2 className="text-lg font-semibold mb-3 text-primary">
        Certifier Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* View & Certify Auctions */}
        <Link
          href="/dashboard/certifier/auctions"
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded hover:opacity-90 transition font-medium text-sm text-center shadow-sm col-span-1 sm:col-span-2"
        >
          View Auction List & Certify Results
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [bidderStatus, setBidderStatus] = useState<string>("UNKNOWN");
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);

  const rawRole = user?.role || user?.type || "Bidder";
  const normalizedRole = String(rawRole).toLowerCase();

  const isDLOfficer =
    normalizedRole === "dl officer" ||
    normalizedRole === "officer" ||
    normalizedRole === "dl_officer";

  const isAuctionAdmin =
    normalizedRole === "auction admin" ||
    normalizedRole === "auction_admin" ||
    normalizedRole === "admin";

  const isBidder = normalizedRole === "bidder";

  const isCertifier = normalizedRole === "certifier";

  // Fetch bidder status dynamically from backend route (/api/bidder/status)
  useEffect(() => {
    async function fetchBidderStatus() {
      if (!user || !isBidder) {
        setStatusLoading(false);
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/bidder/status`
          : "/api/bidder/status";

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          const rawStatus = data.bidder_info?.status
            ? String(data.bidder_info.status).trim().toUpperCase()
            : "UNKNOWN";

          setBidderStatus(rawStatus);
          setIsValidated(data.isValidated ?? rawStatus === "ACTIVE");
        } else {
          setIsValidated(false);
          setBidderStatus("UNKNOWN");
        }
      } catch (err) {
        console.error("Failed to fetch bidder status:", err);
        setIsValidated(false);
        setBidderStatus("UNKNOWN");
      } finally {
        setStatusLoading(false);
      }
    }

    fetchBidderStatus();
  }, [user, isBidder]);

  if (loading || (isBidder && statusLoading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-foreground text-sm">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-foreground text-sm">
        Please log in to view this page.
      </div>
    );
  }

  // DL Officer Context Metadata
  const dlOfficerId = user.dlOfficerId || user.officerId || user.id;
  const dlOffice = user.dlOffice || user.officeName || "Office 1";

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : user.name || user.email || "User";

  return (
    <div className="max-w-3xl mx-auto p-6 text-foreground space-y-6">
      {/* Header Profile Summary */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>

          <div className="mt-1 text-sm text-muted-foreground space-y-0.5">
            <p className="capitalize">
              Role:{" "}
              <span className="font-medium text-foreground">{rawRole}</span>
            </p>
            {isDLOfficer && (
              <p>
                Officer ID:{" "}
                <span className="font-mono text-foreground">{dlOfficerId}</span>{" "}
                | Office:{" "}
                <span className="font-medium text-foreground">{dlOffice}</span>
              </p>
            )}
            {isBidder && (
              <p>
                Status:{" "}
                <span
                  className={`font-medium ${
                    isValidated
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {bidderStatus}
                </span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className="px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded hover:opacity-90 transition font-medium cursor-pointer shadow-sm"
        >
          Sign Out
        </button>
      </div>

      {/* Render DL Officer Action Panel */}
      {isDLOfficer && <DLOfficerPanel />}

      {/* Render Auction Admin Action Panel */}
      {isAuctionAdmin && <AuctionAdminPanel />}

      {/* Render Auction Admin Action Panel */}
      {isCertifier && <CertifierPanel />}

      {/* Render Bidder Action Panel */}
      {isBidder && (
        <BidderPanel isValidated={isValidated} statusText={bidderStatus} />
      )}
    </div>
  );
}
