"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  FormEvent,
  use,
} from "react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BidderPlaceBidPage({ params }: PageProps) {
  // Unwrap Next.js dynamic params promise
  const { id: auctionId } = use(params);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [canBid, setCanBid] = useState<boolean>(false);
  const [auction, setAuction] = useState<any | null>(null);
  const [bidsLeft, setBidsLeft] = useState<number>(0);
  const [currentBid, setCurrentBid] = useState<number | null>(null);
  const [currentBidStatus, setCurrentBidStatus] = useState<number | null>(null);
  const [bidderInfo, setBidderInfo] = useState<any | null>(null);
  const [tariffDetails, setTariffDetails] = useState<any | null>(null);
  const [previousBids, setPreviousBids] = useState<any[]>([]);

  // Form input value
  const [newBidValue, setNewBidValue] = useState<string>("");

  const fetchBidDetails = useCallback(async () => {
    if (!auctionId) {
      setErrorMsg("No auction ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(
        `${API_BASE_URL}/api/bidder/auctions/${auctionId}/bid-details`,
        { credentials: "include" },
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setCanBid(data.canBid);

        if (!data.canBid) {
          setErrorMsg(
            data.message || "Bidding is unavailable for this auction.",
          );
          setAuction(data.auction || null);
          return;
        }

        setAuction(data.auction);
        setBidsLeft(data.bids_left);
        setCurrentBid(data.current_bid);
        setCurrentBidStatus(data.current_bid_status);
        setBidderInfo(data.bidder_info);
        setTariffDetails(data.daytime_tariff_details);
        setPreviousBids(data.previous_bids || []);

        if (data.current_bid !== null && data.current_bid !== undefined) {
          setNewBidValue(String(data.current_bid));
        } else if (data.auction) {
          const maxInitial =
            data.auction.ceiling_delta - data.auction.min_decrement;
          setNewBidValue(String(maxInitial));
        }
      } else {
        setErrorMsg(data.message || "Failed to load auction bidding details.");
      }
    } catch (err) {
      console.error("Error loading bid details:", err);
      setErrorMsg("A network error occurred while loading bid details.");
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchBidDetails();
  }, [fetchBidDetails]);

  // Derive Current Bid Status from previousBids list
  // const currentLowestBidStatus = useMemo(() => {
  //   if (currentBid === null || !previousBids.length) return null;
  //   const match = previousBids.find(
  //     (b) => Number(b.bid_value) === Number(currentBid),
  //   );
  //   return match?.bid_status || previousBids[0]?.bid_status || null;
  // }, [currentBid, previousBids]);

  // Max Allowed Bid Formula
  const maxAllowedBid = useMemo(() => {
    if (!auction) return 0;
    const base =
      currentBid !== null
        ? Math.min(auction.ceiling_delta, currentBid)
        : auction.ceiling_delta;
    return base - auction.min_decrement;
  }, [auction, currentBid]);

  // Night Tariff Calculation 1
  const calculatedNightTariff1 = useMemo(() => {
    if (!tariffDetails || !auction || !newBidValue) return null;
    const bidVal = parseFloat(newBidValue);
    if (isNaN(bidVal) || auction.eta_ref === 0) return null;
    return tariffDetails.daytime_fit_lkr_kwh / auction.eta_ref + bidVal;
  }, [tariffDetails, auction, newBidValue]);

  // Night Tariff Calculation 2 (Legacy Vintage)
  const calculatedNightTariff2 = useMemo(() => {
    if (!tariffDetails || !auction || !newBidValue) return null;
    if (tariffDetails.daytime_fit_basis !== "Legacy Vintage") return null;

    const bidVal = parseFloat(newBidValue);
    if (isNaN(bidVal)) return null;
    return tariffDetails.daytime_fit2_lkr_kwh - auction.eta_ref + bidVal;
  }, [tariffDetails, auction, newBidValue]);

  const handlePlaceBid = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (bidsLeft <= 0) {
      setErrorMsg("You have no bids left for this auction.");
      return;
    }

    const proposedBid = parseFloat(newBidValue);
    if (isNaN(proposedBid) || proposedBid < 0) {
      setErrorMsg("Please enter a valid non-negative bid value.");
      return;
    }

    if (proposedBid > maxAllowedBid) {
      setErrorMsg(
        `Bid must be at or below ${maxAllowedBid.toFixed(auction?.bid_precision || 2)}`,
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_BASE_URL}/api/bidder/auctions/${auctionId}/bid`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bid_value: proposedBid }),
        },
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg("Bid placed successfully!");
        fetchBidDetails();
      } else {
        setErrorMsg(data.message || "Failed to place bid.");
      }
    } catch (err) {
      console.error("Error submitting bid:", err);
      setErrorMsg("A network error occurred while placing the bid.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center text-sm text-muted-foreground">
        Loading bidding portal...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-foreground">
      {/* Navigation */}
      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/bidder/auctions" className="hover:underline">
          Auctions
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Place Bid</span>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">
          {auction ? auction.title : "Auction Bidding"}
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 border border-destructive/30 bg-destructive/10 text-destructive text-sm rounded-lg">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm rounded-lg">
          {successMsg}
        </div>
      )}

      {canBid && auction && (
        <>
          {/* Auction Details */}
          <div className="border border-border rounded-lg p-4 bg-card shadow-sm space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
              Auction Parameters
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">
                  Quarter / Year
                </span>
                <span className="font-semibold">
                  Q{auction.quarter} {auction.year}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Quarterly Cap
                </span>
                <span className="font-mono font-semibold">
                  {auction.quarterly_cap_kw} kW
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Ceiling Δ</span>
                <span className="font-mono font-semibold">
                  {auction.ceiling_delta}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Min Decrement
                </span>
                <span className="font-mono font-semibold">
                  {auction.min_decrement}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Precision</span>
                <span className="font-mono font-semibold">
                  {auction.bid_precision} decimals
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">η_ref</span>
                <span className="font-mono font-semibold">
                  {auction.eta_ref}
                </span>
              </div>
            </div>
          </div>

          {/* Bidding Form & Calculations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 border border-border rounded-lg p-6 bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-lg font-bold">New Bid Submission</h2>
                <div className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full font-semibold">
                  Bids Left: <span className="font-mono">{bidsLeft}</span>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-muted-foreground">
                    Current Lowest Bid:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {currentBid !== null ? currentBid : "None"}
                    </span>
                  </p>
                  {currentBidStatus && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground border border-border">
                      {currentBidStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Max Allowed Bid:{" "}
                  <span className="font-mono font-semibold text-emerald-700">
                    {maxAllowedBid.toFixed(auction.bid_precision)}
                  </span>
                </p>
              </div>

              <form onSubmit={handlePlaceBid} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Your Bid Value
                  </label>
                  <input
                    type="number"
                    step={Math.pow(10, -auction.bid_precision)}
                    max={maxAllowedBid}
                    min={0}
                    required
                    value={newBidValue}
                    onChange={(e) => setNewBidValue(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || bidsLeft <= 0}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-md shadow-sm"
                >
                  {submitting ? "Placing Bid..." : "Place Bid"}
                </button>
              </form>
            </div>

            {/* Tariff Details */}
            <div className="border border-border rounded-lg p-5 bg-card shadow-sm space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                Calculated Metrics
              </h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">
                    Calculated Night Tariff:
                  </span>
                  <span className="font-mono font-bold text-sm">
                    {calculatedNightTariff1 !== null
                      ? `${calculatedNightTariff1.toFixed(4)} LKR/kWh`
                      : "N/A"}
                  </span>
                </div>

                {tariffDetails?.daytime_fit_basis === "Legacy Vintage" && (
                  <div>
                    <span className="text-muted-foreground block">
                      Calculated Night Tariff (After{" "}
                      {tariffDetails?.fit_step_date || "Step Date"}):
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {calculatedNightTariff2 !== null
                        ? `${calculatedNightTariff2.toFixed(4)} LKR/kWh`
                        : "N/A"}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground block">
                    Peak Window:
                  </span>
                  <span className="font-mono font-semibold text-sm">
                    {auction?.peak_window_start && auction?.peak_window_end
                      ? `${auction.peak_window_start} - ${auction.peak_window_end}`
                      : "N/A"}
                  </span>
                </div>

                <div className="border-t border-border pt-2">
                  <span className="text-muted-foreground block">
                    Contract End Date:
                  </span>
                  <span className="font-semibold">
                    {bidderInfo?.contract_end_date || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Previous Bids Table */}
          <div className="border border-border rounded-lg bg-card shadow-sm p-6 space-y-3">
            <h3 className="text-base font-bold">Your Previous Bids</h3>
            {previousBids.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No previous bids submitted yet.
              </p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                    <th className="py-2 px-3">Submitted At</th>
                    <th className="py-2 px-3">Bid Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previousBids.map((bid) => (
                    <tr key={bid.id || bid.created_at}>
                      <td className="py-2 px-3 text-xs">{bid.created_at}</td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {bid.bid_value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
