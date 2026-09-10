"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Users, UserPlus, Upload, Building, Mail, FileSpreadsheet, Search, CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";
import Papa from "papaparse";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Single invite form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TRAINEE");
  const [department, setDepartment] = useState("IMD New Delhi");
  const [submitting, setSubmitting] = useState(false);

  // Bulk CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);

  const fetchBlocks = async () => {
    try {
      const res = await fetch("/api/competency-blocks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBlocks(data);
      }
    } catch (err) {
      console.error("Failed to load competency blocks:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSpecializationChange = async (userId: string, assignedBlockId: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, assignedBlockId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  assignedBlockId: updated.assignedBlockId,
                  specialization: updated.specialization,
                  assignedBlock: updated.assignedBlock,
                }
              : u
          )
        );
      }
    } catch (err) {
      console.error("Failed to update specialization:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTrainerApproval = async (userId: string, action: "APPROVE" | "REJECT") => {
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/trainer-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  role: action === "APPROVE" ? "TRAINER" : u.role,
                  trainerStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
                }
              : u
          )
        );
      }
    } catch (err) {
      console.error("Failed to process trainer request:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBlocks();
  }, []);

  const handleSingleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, department }),
      });
      if (res.ok) {
        setShowInviteModal(false);
        setName("");
        setEmail("");
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvPreview(results.data);
        },
      });
    }
  };

  const handleCsvUpload = async () => {
    if (!csvPreview.length) return;
    setCsvUploading(true);
    setCsvSuccess(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(csvPreview),
      });
      const data = await res.json();
      if (res.ok) {
        setCsvSuccess(`Successfully onboarded ${data.count} personnel.`);
        fetchUsers();
        setTimeout(() => {
          setShowCsvModal(false);
          setCsvFile(null);
          setCsvPreview([]);
          setCsvSuccess(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-950">
      <Navbar role="ADMIN" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950 flex items-center">
                <Users className="w-5 h-5 mr-2 text-zinc-700" />
                Personnel &amp; Cadre Directory
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                {users.length} Registered
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Onboard trainees and scientific officers individually or via bulk CSV roster batch.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCsvModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>Bulk CSV Batch</span>
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Single User</span>
            </button>
          </div>
        </div>

        {/* Pending Trainer Accreditation Applications Queue */}
        {users.some((u) => u.trainerStatus === "PENDING") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <h2 className="text-xs font-semibold text-amber-950 uppercase tracking-wider font-mono">
                  Pending Trainer Accreditation Applications ({users.filter((u) => u.trainerStatus === "PENDING").length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                Action Required
              </span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              The following scientific officers have applied for Trainer / Instructor privileges. Review their credentials and grant or decline course authoring access.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {users
                .filter((u) => u.trainerStatus === "PENDING")
                .map((applicant) => (
                  <div
                    key={applicant.id}
                    className="p-3.5 rounded-md bg-white border border-amber-200/90 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xs font-semibold text-zinc-950">{applicant.name}</h3>
                          <p className="text-[11px] font-mono text-zinc-500">{applicant.email}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">
                          {applicant.department}
                        </span>
                      </div>

                      {applicant.trainerRequestNote && (
                        <div className="mt-2.5 p-2 rounded bg-zinc-50 border border-zinc-150 text-[11px] text-zinc-700 italic">
                          &ldquo;{applicant.trainerRequestNote}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleTrainerApproval(applicant.id, "REJECT")}
                        disabled={updatingId === applicant.id}
                        className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium transition-colors flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTrainerApproval(applicant.id, "APPROVE")}
                        disabled={updatingId === applicant.id}
                        className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve Trainer</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-lg border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personnel by name, email, or institute..."
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#FBFBFA] border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs">
            {["ALL", "ADMIN", "TRAINER", "TRAINEE"].map((roleKey) => (
              <button
                key={roleKey}
                onClick={() => setRoleFilter(roleKey)}
                className={`px-3 py-1.5 rounded-md font-mono text-[11px] transition-colors ${
                  roleFilter === roleKey
                    ? "bg-zinc-900 text-white font-medium"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
                }`}
              >
                {roleKey}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <div className="rounded-lg border border-zinc-200/90 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBFBFA] border-b border-zinc-200 text-zinc-600 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Name &amp; Identity</th>
                  <th className="px-6 py-3.5">Institute / Autonomous Body</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Assigned Specialization / Pathway</th>
                  <th className="px-6 py-3.5">Registered Date</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      Loading user directory...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No personnel records found.
                    </td>
                  </tr>
                ) : users.filter((u) => {
                    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
                    const q = searchQuery.toLowerCase().trim();
                    const matchesSearch =
                      !q ||
                      u.name?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q) ||
                      u.department?.toLowerCase().includes(q);
                    return matchesRole && matchesSearch;
                  }).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No personnel matching filters.
                    </td>
                  </tr>
                ) : (
                  users
                    .filter((u) => {
                      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
                      const q = searchQuery.toLowerCase().trim();
                      const matchesSearch =
                        !q ||
                        u.name?.toLowerCase().includes(q) ||
                        u.email?.toLowerCase().includes(q) ||
                        u.department?.toLowerCase().includes(q);
                      return matchesRole && matchesSearch;
                    })
                    .map((u) => {
                      const roleColor =
                        u.role === "ADMIN"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : u.role === "TRAINER"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-blue-50 text-blue-800 border-blue-200";

                    return (
                      <tr key={u.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-950 text-xs">{u.name}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center mt-0.5 font-mono">
                            <Mail className="w-3 h-3 mr-1 text-zinc-400" />
                            {u.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-zinc-700">
                            <Building className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                            {u.department}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <select
                              value={u.role}
                              disabled={updatingId === u.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-medium border bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer disabled:opacity-50 ${roleColor}`}
                              title="Click to promote or alter role"
                            >
                              <option value="TRAINEE">TRAINEE</option>
                              <option value="TRAINER">TRAINER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>

                            {u.trainerStatus === "PENDING" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-300 font-semibold animate-pulse">
                                Applied
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {u.role === "TRAINER" ? (
                            <select
                              value={u.assignedBlockId || ""}
                              disabled={updatingId === u.id}
                              onChange={(e) => handleSpecializationChange(u.id, e.target.value)}
                              className="text-xs px-2.5 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-900 font-medium focus:outline-none focus:border-zinc-900 cursor-pointer disabled:opacity-50 max-w-[220px] truncate"
                              title="Assign trainer to an authorized subject pathway"
                            >
                              <option value="">-- Assign Specialization --</option>
                              {blocks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-mono italic">
                              N/A ({u.role})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center text-[11px] text-emerald-800 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
                            Active
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

        {/* Single Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-zinc-200 rounded-lg w-full max-w-md p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">Onboard Personnel Record</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Provision access credentials for a Ministry officer.</p>
              </div>

              <form onSubmit={handleSingleInvite} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Babu"
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh.babu@niot.res.in"
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                    >
                      <option value="TRAINEE">Trainee</option>
                      <option value="TRAINER">Trainer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                    >
                      <option value="IMD New Delhi">IMD New Delhi</option>
                      <option value="INCOIS Hyderabad">INCOIS Hyderabad</option>
                      <option value="NIOT Chennai">NIOT Chennai</option>
                      <option value="IITM Pune">IITM Pune</option>
                      <option value="NCMRWF Noida">NCMRWF Noida</option>
                      <option value="NCPOR Goa">NCPOR Goa</option>
                      <option value="MoES HQ">MoES HQ</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {submitting ? "Onboarding..." : "Onboard Officer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV Modal */}
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-zinc-200 rounded-lg w-full max-w-lg p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-zinc-700" />
                  Bulk CSV Cadre Ingestion
                </h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Upload a standard CSV roster containing columns: <code className="font-mono text-[11px] bg-zinc-100 px-1 py-0.5 rounded">name</code>, <code className="font-mono text-[11px] bg-zinc-100 px-1 py-0.5 rounded">email</code>, <code className="font-mono text-[11px] bg-zinc-100 px-1 py-0.5 rounded">department</code>, <code className="font-mono text-[11px] bg-zinc-100 px-1 py-0.5 rounded">role</code>.
                </p>
              </div>

              <div className="border border-dashed border-zinc-300 rounded-md p-6 text-center bg-[#FBFBFA] space-y-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="block w-full text-xs text-zinc-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                />
              </div>

              {csvSuccess && (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  {csvSuccess}
                </div>
              )}

              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-zinc-600">Parsed {csvPreview.length} records</span>
                  <div className="max-h-32 overflow-y-auto border border-zinc-200 rounded-md p-2 text-[11px] font-mono bg-[#FBFBFA]">
                    {csvPreview.slice(0, 5).map((row, i) => (
                      <div key={i} className="truncate text-zinc-700 py-0.5">
                        {row.name} &bull; {row.email} &bull; {row.department}
                      </div>
                    ))}
                    {csvPreview.length > 5 && (
                      <div className="text-zinc-500 py-0.5">...and {csvPreview.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvUpload}
                  disabled={csvUploading || !csvPreview.length}
                  className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50"
                >
                  {csvUploading ? "Uploading..." : `Import ${csvPreview.length} Cadres`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
