"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Bid {
  id: number | string;
  auction_id: number;
  auction_name?: string;
  bidder_id: number;
  prosumer_name?: string;
  dl_reference_id?: string;
  cleared_inverter_rating_kw?: number;
  bid_value: number;
  bid_status: "IN" | "OUT" | "PENDING" | string;
  bid_time: string;
  created_at: string;
}

interface AuctionDetails {
  id: number;
  title?: string;
  cutoff_price: number | null;
  quarterly_cap_kw: number;
  status: string;
}

export default function BidsDashboardPage({
  auctionId,
}: {
  auctionId?: number;
}) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [auction, setAuction] = useState<AuctionDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchedRef = useRef(false);

  // Wrapped in useCallback to resolve ESLint react-hooks/exhaustive-deps
  const loadBids = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    // If auctionId is passed, fetch specific auction bids; otherwise fetch all bids
    const endpoint = auctionId
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/aa/auctions/${auctionId}/bids`
      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/aa/bids`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setBids(data.bids || []);
      if (data.auction) {
        setAuction(data.auction);
      }
    } catch (err) {
      console.error("Failed to fetch bids roster:", err);
      setErrorMessage("Could not load auction bids. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      loadBids();
    }
  }, [loadBids]);

  // Search & Filter Logic
  const filteredBids = bids.filter((bid) => {
    const query = searchQuery.toLowerCase();
    const auctionName =
      bid.auction_name || auction?.title || `Auction #${bid.auction_id}`;

    const matchesSearch =
      bid.id.toString().includes(query) ||
      auctionName.toLowerCase().includes(query) ||
      bid.bidder_id.toString().includes(query) ||
      bid.prosumer_name?.toLowerCase().includes(query) ||
      bid.dl_reference_id?.toLowerCase().includes(query) ||
      bid.bid_value.toString().includes(query);

    const matchesStatus =
      statusFilter === "ALL" ||
      bid.bid_status?.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Auction Bids & Merit Roster
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of submitted bids, merit ranking, and cutoff status
            {auction?.title ? ` for ${auction.title}` : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadBids}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-lg shadow-sm transition-opacity"
          >
            Refresh Bids
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {auction && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Auction Status
            </p>
            <p className="text-lg font-semibold text-foreground mt-1">
              {auction.status || "OPEN"}
            </p>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Quarterly Cap
            </p>
            <p className="text-lg font-semibold text-foreground mt-1">
              {auction.quarterly_cap_kw
                ? `${auction.quarterly_cap_kw} kW`
                : "N/A"}
            </p>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Current Cutoff Price
            </p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {auction.cutoff_price !== null &&
              auction.cutoff_price !== undefined
                ? `LKR ${Number(auction.cutoff_price).toFixed(4)}`
                : "Not Calculated"}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-card p-4 rounded-xl shadow-sm border border-border flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label
            htmlFor="search-bids"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Search Bids
          </label>
          <input
            id="search-bids"
            type="text"
            placeholder="Filter by auction name, bidder ID, prosumer, DL reference, or price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          />
        </div>
        <div className="sm:w-48">
          <label
            htmlFor="status-filter"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Filter by Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN">Accepted (IN)</option>
            <option value="OUT">Rejected (OUT)</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Bids Data Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bid ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Auction Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bidder Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Capacity (kW)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bid Value (LKR)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Bid Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Merit Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    Loading auction bids...
                  </td>
                </tr>
              ) : filteredBids.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No matching bids found.
                  </td>
                </tr>
              ) : (
                filteredBids.map((bid) => {
                  const status = bid.bid_status
                    ? bid.bid_status.toUpperCase()
                    : "PENDING";
                  const auctionDisplayName =
                    bid.auction_name ||
                    auction?.title ||
                    `Auction #${bid.auction_id}`;

                  return (
                    <tr
                      key={bid.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-medium text-amber-500">
                        #{bid.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-card-foreground">
                        <Link
                          href={`/dashboard/aa/auctions/${bid.auction_id}`}
                          className="hover:underline text-primary"
                        >
                          {auctionDisplayName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-card-foreground">
                          {bid.prosumer_name || `Bidder #${bid.bidder_id}`}
                        </div>
                        {bid.dl_reference_id && (
                          <div className="text-xs text-muted-foreground font-mono">
                            DL: {bid.dl_reference_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {bid.cleared_inverter_rating_kw
                          ? `${bid.cleared_inverter_rating_kw} kW`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-foreground">
                        {Number(bid.bid_value).toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs font-mono">
                        {new Date(
                          bid.bid_time || bid.created_at,
                        ).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            status === "IN"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : status === "OUT"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {status === "IN"
                            ? "ACCEPTED (IN)"
                            : status === "OUT"
                              ? "REJECTED (OUT)"
                              : "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
