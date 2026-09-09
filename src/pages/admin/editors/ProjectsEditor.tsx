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

type Tag = { name: string; color: string };
type Row = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tags: Tag[];
  image_path: string | null;
  source_code_link: string;
  live_link: string | null;
  sort_order: number;
};

const TAG_COLORS = [
  "blue-text-gradient",
  "green-text-gradient",
  "pink-text-gradient",
  "orange-text-gradient",
];

const tagsToText = (tags: Tag[]) => tags.map((t) => t.name).join(", ");
const textToTags = (text: string): Tag[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, i) => ({ name, color: TAG_COLORS[i % TAG_COLORS.length] }));

const blankRow = (sortOrder: number): Omit<Row, "id"> => ({
  name: "",
  subtitle: "",
  description: "",
  tags: [],
  image_path: null,
  source_code_link: "",
  live_link: null,
  sort_order: sortOrder,
});

const ProjectsEditor = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [tagsText, setTagsText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true });
    const list = (data as Row[]) ?? [];
    setRows(list);
    setTagsText(
      Object.fromEntries(list.map((r) => [r.id, tagsToText(r.tags ?? [])]))
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
      .from("projects")
      .insert(blankRow(nextSort))
      .select()
      .single();
    if (!error && data) {
      setRows((rs) => [...rs, data as Row]);
      setTagsText((t) => ({ ...t, [(data as Row).id]: "" }));
    }
  };

  const handleSave = async (row: Row) => {
    if (!supabase) return;
    setSavingId(row.id);
    const tags = textToTags(tagsText[row.id] ?? "");
    await supabase.from("projects").update({ ...row, tags }).eq("id", row.id);
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!confirm("Delete this project?")) return;
    await supabase.from("projects").delete().eq("id", id);
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
      supabase.from("projects").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("projects").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  const handleImageUpload = async (id: string, file: File) => {
    setStatus("Uploading image…");
    try {
      const path = await uploadAsset("projects", file);
      updateRow(id, { image_path: path });
      setStatus("Image uploaded — click Save to keep it.");
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
        <h2 className="text-[20px] font-bold">Projects</h2>
        <button className={primaryButtonClass} onClick={handleAdd}>
          + Add project
        </button>
      </div>

      {status && <p className="text-secondary mb-4 text-[13px]">{status}</p>}

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
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
            />
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>
              Subtitle (short, always shown under the name)
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Agentic AI job hunting platform"
              value={row.subtitle}
              onChange={(e) => updateRow(row.id, { subtitle: e.target.value })}
            />
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>
              Description (longer, shown on hover)
            </label>
            <textarea
              rows={3}
              className={inputClass}
              value={row.description}
              onChange={(e) =>
                updateRow(row.id, { description: e.target.value })
              }
            />
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Tags (comma-separated)</label>
            <input
              className={inputClass}
              placeholder="react, supabase, tailwind"
              value={tagsText[row.id] ?? ""}
              onChange={(e) =>
                setTagsText((t) => ({ ...t, [row.id]: e.target.value }))
              }
            />
          </div>

          <div className="mb-5 flex gap-4">
            <div className="flex-1">
              <label className={labelClass}>Source code link</label>
              <input
                className={inputClass}
                value={row.source_code_link}
                onChange={(e) =>
                  updateRow(row.id, { source_code_link: e.target.value })
                }
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Live link (optional)</label>
              <input
                className={inputClass}
                value={row.live_link ?? ""}
                onChange={(e) =>
                  updateRow(row.id, { live_link: e.target.value || null })
                }
              />
            </div>
          </div>

          <div className={fieldClass}>
            <label className={labelClass}>Screenshot</label>
            {row.image_path && (
              <img
                src={publicAssetUrl(row.image_path)}
                alt=""
                className="mb-2 h-32 w-full max-w-xs rounded-lg object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files?.[0] && handleImageUpload(row.id, e.target.files[0])
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

export default ProjectsEditor;
