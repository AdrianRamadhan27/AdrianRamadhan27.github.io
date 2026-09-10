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
  photo_cutout: boolean;
  cv_path: string | null;
  chat_context: string;
  years_experience: number | null;
  projects_done: number | null;
  linkedin_name: string | null;
  linkedin_headline: string | null;
  linkedin_photo_path: string | null;
};

const EMPTY: ProfileRow = {
  full_name: "",
  headline: "",
  hero_lines: [],
  about_text: "",
  email: "",
  photo_path: null,
  photo_cutout: false,
  cv_path: null,
  chat_context: "",
  years_experience: null,
  projects_done: null,
  linkedin_name: null,
  linkedin_headline: null,
  linkedin_photo_path: null,
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
        // Spread over EMPTY, not just a cast: chat_context is a newer column
        // -- a database that hasn't had the migration run yet returns rows
        // without it, which would otherwise make the textarea an
        // uncontrolled-input warning (value undefined).
        setRow({ ...EMPTY, ...(data as ProfileRow) });
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

  const handleLinkedInPhotoUpload = async (file: File) => {
    setStatus("Uploading LinkedIn photo…");
    try {
      const path = await uploadAsset("photo", file);
      setRow((r) => ({ ...r, linkedin_photo_path: path }));
      setStatus("LinkedIn photo uploaded — click Save to keep it.");
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
        <label className={labelClass}>
          Extra context for the chatbot (not shown publicly)
        </label>
        <textarea
          rows={4}
          className={inputClass}
          placeholder="e.g. full legal name, location, personality type, aspirations, favorite color -- anything worth the chatbot knowing that doesn't belong in the public About text"
          value={row.chat_context}
          onChange={(e) => setRow({ ...row, chat_context: e.target.value })}
        />
        <p className="text-secondary mt-1 text-[12px]">
          Combined automatically with your skills, experience, and projects
          to give the chatbot factual context. The Chatbot tab's system
          prompt only needs to describe tone and behavior, not facts.
        </p>
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Contact email</label>
        <input
          className={inputClass}
          value={row.email}
          onChange={(e) => setRow({ ...row, email: e.target.value })}
        />
      </div>

      <div className="mb-5 flex gap-4">
        <div className="flex-1">
          <label className={labelClass}>Years of experience</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder="e.g. 3"
            value={row.years_experience ?? ""}
            onChange={(e) =>
              setRow({
                ...row,
                years_experience: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Projects done</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder="e.g. 12"
            value={row.projects_done ?? ""}
            onChange={(e) =>
              setRow({
                ...row,
                projects_done: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
      </div>
      <p className="text-secondary -mt-3 mb-5 text-[12px]">
        Shown as a stats card in the hero, below the social links (e.g. "3+
        Years Experience"). Leave both blank to hide the card -- these are
        plain numbers you set yourself, not counted automatically from your
        experience/project entries.
      </p>

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
        <label className="text-secondary mt-3 flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={row.photo_cutout}
            onChange={(e) => setRow({ ...row, photo_cutout: e.target.checked })}
          />
          This photo is a cutout (transparent PNG of you, no background)
        </label>
        <p className="text-secondary mt-1 text-[12px]">
          When checked, the hero shows it with no card frame -- the bottom
          fades out and a green glow traces your outline. Upload an actual
          background-removed PNG for this to look right.
        </p>
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

      <div className="border-white/10 mb-5 mt-2 border-t pt-5">
        <h3 className="mb-1 text-[15px] font-semibold">LinkedIn card</h3>
        <p className="text-secondary mb-4 text-[12px]">
          The hero's LinkedIn embed. LinkedIn has no public API and blocks
          scraping, so its name / photo / headline can't be pulled
          automatically -- set them here to match your real profile. Leave
          any field blank to fall back to your main name / photo / latest
          job title.
        </p>

        <div className={fieldClass}>
          <label className={labelClass}>Name on LinkedIn card</label>
          <input
            className={inputClass}
            placeholder={row.full_name || "Falls back to your full name"}
            value={row.linkedin_name ?? ""}
            onChange={(e) =>
              setRow({ ...row, linkedin_name: e.target.value || null })
            }
          />
        </div>

        <div className={fieldClass}>
          <label className={labelClass}>Headline on LinkedIn card</label>
          <input
            className={inputClass}
            placeholder="Falls back to your latest job title"
            value={row.linkedin_headline ?? ""}
            onChange={(e) =>
              setRow({ ...row, linkedin_headline: e.target.value || null })
            }
          />
        </div>

        <div className={fieldClass}>
          <label className={labelClass}>LinkedIn card photo</label>
          {row.linkedin_photo_path && (
            <img
              src={publicAssetUrl(row.linkedin_photo_path)}
              alt="Current LinkedIn card"
              className="mb-3 h-20 w-20 rounded-full object-cover"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] &&
              handleLinkedInPhotoUpload(e.target.files[0])
            }
          />
        </div>
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
