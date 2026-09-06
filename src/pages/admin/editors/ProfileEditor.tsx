import { useEffect, useState } from "react";

import { supabase, publicAssetUrl } from "../../../lib/supabase";
import { uploadAsset } from "../../../lib/uploadAsset";
import {
  inputClass,
  labelClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./shared";

type ProfileRow = {
  full_name: string;
  headline: string;
  hero_lines: string[];
  about_text: string;
  email: string;
  photo_path: string | null;
  cv_path: string | null;
};

const EMPTY: ProfileRow = {
  full_name: "",
  headline: "",
  hero_lines: [],
  about_text: "",
  email: "",
  photo_path: null,
  cv_path: null,
};

const ProfileEditor = () => {
  const [row, setRow] = useState<ProfileRow>(EMPTY);
  const [heroLinesText, setHeroLinesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.from("profile").select("*").maybeSingle();
      if (data) {
        setRow(data as ProfileRow);
        setHeroLinesText(((data as ProfileRow).hero_lines ?? []).join("\n"));
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setStatus(null);

    const payload = {
      ...row,
      hero_lines: heroLinesText.split("\n").filter((l) => l.trim() !== ""),
      updated_at: new Date().toISOString(),
    };

    // .select().maybeSingle() so an RLS-blocked write (0 rows, e.g. an
    // expired session) surfaces as a real error instead of a false "Saved."
    const { data: updated, error } = await supabase
      .from("profile")
      .upsert({ id: 1, ...payload }, { onConflict: "id" })
      .select()
      .maybeSingle();

    setSaving(false);

    if (!error && !updated) {
      setStatus(
        "Error: save did not persist (0 rows updated) -- try logging out and back into the CMS."
      );
      return;
    }

    if (updated) {
      setRow(updated as ProfileRow);
      setHeroLinesText(((updated as ProfileRow).hero_lines ?? []).join("\n"));
    }

    setStatus(error ? `Error: ${error.message}` : "Saved.");
  };

  const handlePhotoUpload = async (file: File) => {
    setStatus("Uploading photo…");
    try {
      const path = await uploadAsset("photo", file);
      setRow((r) => ({ ...r, photo_path: path }));
      setStatus("Photo uploaded — click Save to keep it.");
    } catch (e) {
      setStatus(
        `Upload failed: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  };

  const handleCvUpload = async (file: File) => {
    setStatus("Uploading CV…");
    try {
      const path = await uploadAsset("cv", file, { resize: false });
      setRow((r) => ({ ...r, cv_path: path }));
      setStatus("CV uploaded — click Save to keep it.");
    } catch (e) {
      setStatus(
        `Upload failed: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  };

  if (loading) return <p className="text-secondary">Loading…</p>;

  return (
    <div>
      <h2 className="mb-6 text-[20px] font-bold">Profile</h2>

      <div className={fieldClass}>
        <label className={labelClass}>Full name</label>
        <input
          className={inputClass}
          value={row.full_name}
          onChange={(e) => setRow({ ...row, full_name: e.target.value })}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Headline</label>
        <input
          className={inputClass}
          value={row.headline}
          onChange={(e) => setRow({ ...row, headline: e.target.value })}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>
          Hero lines (one per line, rendered stacked in the hero)
        </label>
        <textarea
          rows={3}
          className={inputClass}
          value={heroLinesText}
          onChange={(e) => setHeroLinesText(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>About text</label>
        <textarea
          rows={6}
          className={inputClass}
          value={row.about_text}
          onChange={(e) => setRow({ ...row, about_text: e.target.value })}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Contact email</label>
        <input
          className={inputClass}
          value={row.email}
          onChange={(e) => setRow({ ...row, email: e.target.value })}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Photo</label>
        {row.photo_path && (
          <img
            src={publicAssetUrl(row.photo_path)}
            alt="Current"
            className="mb-3 h-32 w-32 rounded-lg object-cover"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>CV (PDF)</label>
        {row.cv_path && (
          <a
            href={publicAssetUrl(row.cv_path)}
            target="_blank"
            rel="noreferrer"
            className="text-accent mb-3 block text-[14px] underline"
          >
            Current CV
          </a>
        )}
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => e.target.files?.[0] && handleCvUpload(e.target.files[0])}
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          className={primaryButtonClass}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {status && <span className="text-secondary text-[13px]">{status}</span>}
      </div>

      <p className="text-secondary mt-6 text-[12px]">
        Uploads save immediately to storage; click Save to persist the
        profile row itself.
      </p>

      <button
        className={`${secondaryButtonClass} mt-2`}
        onClick={() => window.location.reload()}
      >
        Discard changes
      </button>
    </div>
  );
};

export default ProfileEditor;
