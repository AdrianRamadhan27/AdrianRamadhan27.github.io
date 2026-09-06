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
  title: string;
  company_name: string;
  icon_path: string | null;
  icon_bg: string;
  date_label: string;
  points: string[];
  sort_order: number;
};

const blankRow = (sortOrder: number): Omit<Row, "id"> => ({
  title: "",
  company_name: "",
  icon_path: null,
  icon_bg: "#0d1f19",
  date_label: "",
  points: [],
  sort_order: sortOrder,
});

const ExperienceEditor = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [pointsText, setPointsText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("experiences")
      .select("*")
      .order("sort_order", { ascending: true });
    const list = (data as Row[]) ?? [];
    setRows(list);
    setPointsText(
      Object.fromEntries(list.map((r) => [r.id, r.points.join("\n")]))
    );
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
      .from("experiences")
      .insert(blankRow(nextSort))
      .select()
      .single();
    if (!error && data) {
      setRows((rs) => [...rs, data as Row]);
      setPointsText((p) => ({ ...p, [(data as Row).id]: "" }));
    }
  };

  const handleSave = async (row: Row) => {
    if (!supabase) return;
    setSavingId(row.id);
    const points = (pointsText[row.id] ?? "")
      .split("\n")
      .filter((l) => l.trim() !== "");
    await supabase
      .from("experiences")
      .update({ ...row, points })
      .eq("id", row.id);
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Delete this experience entry?")) return;
    await supabase.from("experiences").delete().eq("id", id);
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
      supabase
        .from("experiences")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id),
      supabase
        .from("experiences")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id),
    ]);
  };

  const handleIconUpload = async (id: string, file: File) => {
    const path = await uploadAsset("companies", file);
    updateRow(id, { icon_path: path });
  };

  if (loading) return <p className="text-secondary">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[20px] font-bold">Experience</h2>
        <button className={primaryButtonClass} onClick={handleAdd}>
          + Add entry
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
            <span className="text-secondary ml-2 text-[12px]">
              #{index + 1}
            </span>
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Title</label>
            <input
              className={inputClass}
              value={row.title}
              onChange={(e) => updateRow(row.id, { title: e.target.value })}
            />
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Company</label>
            <input
              className={inputClass}
              value={row.company_name}
              onChange={(e) =>
                updateRow(row.id, { company_name: e.target.value })
              }
            />
          </div>

          <div className="mb-5 flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>Date range</label>
              <input
                className={inputClass}
                placeholder="Jan 2024 - Present"
                value={row.date_label}
                onChange={(e) =>
                  updateRow(row.id, { date_label: e.target.value })
                }
              />
            </div>
            <div className="w-28">
              <label className={labelClass}>Icon color</label>
              <input
                type="color"
                className="h-[46px] w-full rounded-lg"
                value={row.icon_bg}
                onChange={(e) =>
                  updateRow(row.id, { icon_bg: e.target.value })
                }
              />
            </div>
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Points (one per line)</label>
            <textarea
              rows={4}
              className={inputClass}
              value={pointsText[row.id] ?? ""}
              onChange={(e) =>
                setPointsText((p) => ({ ...p, [row.id]: e.target.value }))
              }
            />
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Company icon</label>
            {row.icon_path && (
              <img
                src={publicAssetUrl(row.icon_path)}
                alt=""
                className="mb-2 h-12 w-12 rounded object-contain"
              />
            )}
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
      ))}
    </div>
  );
};

export default ExperienceEditor;
