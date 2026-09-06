import { useEffect, useState } from "react";

import { supabase } from "../../../lib/supabase";
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
  label: string;
  url: string;
  icon_key: string;
  sort_order: number;
};

const ICON_KEYS = ["github", "linkedin", "instagram", "medium", "huggingface", "website"];

const blankRow = (sortOrder: number): Omit<Row, "id"> => ({
  label: "",
  url: "",
  icon_key: "website",
  sort_order: sortOrder,
});

const SocialsEditor = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("socials")
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
      .from("socials")
      .insert(blankRow(nextSort))
      .select()
      .single();
    if (!error && data) setRows((rs) => [...rs, data as Row]);
  };

  const handleSave = async (row: Row) => {
    if (!supabase) return;
    setSavingId(row.id);
    await supabase.from("socials").update(row).eq("id", row.id);
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Delete this social link?")) return;
    await supabase.from("socials").delete().eq("id", id);
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
      supabase.from("socials").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("socials").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  if (loading) return <p className="text-secondary">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[20px] font-bold">Social links</h2>
        <button className={primaryButtonClass} onClick={handleAdd}>
          + Add link
        </button>
      </div>

      {rows.map((row, index) => (
        <div key={row.id} className={cardClass}>
          <div className="mb-3 flex items-center gap-2">
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

          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex-1">
              <label className={labelClass}>Label</label>
              <input
                className={inputClass}
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
              />
            </div>
            <div className="w-40">
              <label className={labelClass}>Icon</label>
              <select
                className={inputClass}
                value={row.icon_key}
                onChange={(e) =>
                  updateRow(row.id, { icon_key: e.target.value })
                }
              >
                {ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>URL</label>
            <input
              className={inputClass}
              value={row.url}
              onChange={(e) => updateRow(row.id, { url: e.target.value })}
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
      ))}
    </div>
  );
};

export default SocialsEditor;
