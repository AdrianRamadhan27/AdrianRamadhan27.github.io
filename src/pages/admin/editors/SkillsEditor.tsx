import { useEffect, useState } from "react";

import { supabase, publicAssetUrl } from "../../../lib/supabase";
import { uploadAsset } from "../../../lib/uploadAsset";
import {
  inputClass,
  labelClass,
  fieldClass,
  primaryButtonClass,
  dangerButtonClass,
  cardClass,
} from "./shared";

type Row = {
  id: string;
  name: string;
  icon_path: string | null;
  category: string | null;
  sort_order: number;
};

const blankRow = (sortOrder: number): Omit<Row, "id"> => ({
  name: "",
  icon_path: null,
  category: "",
  sort_order: sortOrder,
});

const SkillsEditor = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("skills")
      .select("*")
      .order("sort_order", { ascending: true });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleAdd = async () => {
    if (!supabase) return;
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { data, error } = await supabase
      .from("skills")
      .insert(blankRow(nextSort))
      .select()
      .single();
    if (!error && data) setRows((rs) => [...rs, data as Row]);
  };

  const handleSave = async (row: Row) => {
    if (!supabase) return;
    setSavingId(row.id);
    await supabase.from("skills").update(row).eq("id", row.id);
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Delete this skill?")) return;
    await supabase.from("skills").delete().eq("id", id);
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length || !supabase) return;
    const a = rows[index];
    const b = rows[target];
    const updated = [...rows];
    updated[index] = { ...b, sort_order: a.sort_order };
    updated[target] = { ...a, sort_order: b.sort_order };
    setRows(updated.sort((x, y) => x.sort_order - y.sort_order));
    await Promise.all([
      supabase.from("skills").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("skills").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  const handleIconUpload = async (id: string, file: File) => {
    setStatus("Uploading icon…");
    try {
      const path = await uploadAsset("skills", file);
      updateRow(id, { icon_path: path });
      setStatus("Icon uploaded — click Save to keep it.");
    } catch (e) {
      setStatus(
        `Upload failed: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  };

  if (loading) return <p className="text-secondary">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[20px] font-bold">Skills</h2>
        <button className={primaryButtonClass} onClick={handleAdd}>
          + Add skill
        </button>
      </div>

      {status && <p className="text-secondary mb-4 text-[13px]">{status}</p>}

      {rows.map((row, index) => (
        <div key={row.id} className={`${cardClass} flex items-start gap-4`}>
          <div className="flex flex-col gap-1 pt-1">
            <button
              disabled={index === 0}
              onClick={() => handleMove(index, -1)}
              className="text-secondary hover:text-white disabled:opacity-30"
            >
              ↑
            </button>
            <button
              disabled={index === rows.length - 1}
              onClick={() => handleMove(index, 1)}
              className="text-secondary hover:text-white disabled:opacity-30"
            >
              ↓
            </button>
          </div>

          {row.icon_path && (
            <img
              src={publicAssetUrl(row.icon_path)}
              alt=""
              className="h-12 w-12 rounded object-contain"
            />
          )}

          <div className="flex-1">
            <div className="mb-3 flex gap-4">
              <div className="flex-1">
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={row.name}
                  onChange={(e) => updateRow(row.id, { name: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Category</label>
                <input
                  className={inputClass}
                  placeholder="Front-End, Back-End, ML…"
                  value={row.category ?? ""}
                  onChange={(e) =>
                    updateRow(row.id, { category: e.target.value })
                  }
                />
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Icon</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && handleIconUpload(row.id, e.target.files[0])
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                className={primaryButtonClass}
                disabled={savingId === row.id}
                onClick={() => handleSave(row)}
              >
                {savingId === row.id ? "Saving…" : "Save"}
              </button>
              <button
                className={dangerButtonClass}
                onClick={() => handleDelete(row.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillsEditor;
