"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Compass, Plus, Layers } from "lucide-react";

export default function AdminPathwaysPage() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Ocean Sciences & Technology");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchBlocks = async () => {
    try {
      const res = await fetch("/api/competency-blocks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBlocks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    try {
      const res = await fetch("/api/competency-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, description }),
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setShowModal(false);
        fetchBlocks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    "Ocean Sciences & Technology",
    "Meteorology & Climate",
    "Geohazards & Early Warning",
    "Polar & Cryosphere Sciences",
    "Atmospheric Modeling",
  ];

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 selection:bg-zinc-200 selection:text-zinc-950">
      <Navbar role="ADMIN" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif-heading text-2xl sm:text-3xl font-normal tracking-tight text-zinc-950 flex items-center">
                <Compass className="w-5 h-5 mr-2 text-zinc-700" />
                Competency Blocks Architecture
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                {blocks.length} Approved Pathways
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Define organization-wide skill frameworks, core domains, and align curricula across MoES institutes.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Competency Block</span>
          </button>
        </div>

        {/* Blocks Grid */}
        {loading ? (
          <div className="text-center py-20 text-xs text-zinc-500">Loading competency blocks...</div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
            <Layers className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs text-zinc-600 font-medium">No competency blocks defined yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="p-6 rounded-lg bg-white border border-zinc-200/90 hover:border-zinc-300 transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {block.category}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {block.courses?.length || 0} Courses
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-950 mb-1.5 leading-snug">{block.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed font-normal">{block.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-500">
                      Curriculums aligned:
                    </p>
                    {block.courses?.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic">No courses mapped yet</p>
                    ) : (
                      block.courses?.map((c: any) => (
                        <div key={c.id} className="text-xs text-zinc-700 flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-2" />
                          <span className="truncate">{c.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white border border-zinc-200 rounded-lg w-full max-w-md p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">Add Competency Block</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Define a standardized technical discipline framework.</p>
              </div>

              <form onSubmit={handleCreateBlock} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Block Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Deep-Sea Submersible Engineering"
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Scientific Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Description</label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe specific technical competencies, instruments, or operational protocols..."
                    className="w-full px-3 py-2 rounded-md bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-1.5 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Create Block"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
