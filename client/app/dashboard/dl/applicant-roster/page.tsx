"use client";

import React, { useState, useEffect, useRef } from "react";

interface Applicant {
  id: number | string;
  name: string;
  phone: string;
  email: string | null;
  clearance: string | null;
  status: string | null;
  dl_reference_id: string;
}

export default function ApplicantRosterPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchedRef = useRef(false);

  const loadApplicants = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/dl/applicants`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setApplicants(data.applicants || []);
    } catch (err) {
      console.error("Failed to fetch applicant roster:", err);
      setErrorMessage("Could not load applicants. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      loadApplicants();
    }
  }, []);

  const filteredApplicants = applicants.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.phone?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.dl_reference_id?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Applicant Roster
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of registered prosumers and clearance statuses for your DL
            office.
          </p>
        </div>
        <button
          onClick={loadApplicants}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-lg shadow-sm transition-opacity"
        >
          Refresh Roster
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
        <label
          htmlFor="search-input"
          className="block text-xs font-medium text-muted-foreground mb-1"
        >
          Search Roster
        </label>
        <input
          id="search-input"
          type="text"
          placeholder="Filter by name, phone, email, or reference ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
      </div>

      {/* Error Feedback */}
      {errorMessage && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Clearance
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border text-sm">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    Loading roster records...
                  </td>
                </tr>
              ) : filteredApplicants.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No applicants found.
                  </td>
                </tr>
              ) : (
                filteredApplicants.map((applicant) => (
                  <tr
                    key={applicant.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-medium text-brand-gold">
                      {applicant.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-card-foreground">
                      {applicant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {applicant.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {applicant.email || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {applicant.clearance
                        ? new Date(applicant.clearance).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          applicant.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {applicant.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
