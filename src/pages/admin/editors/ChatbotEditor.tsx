import { useEffect, useRef, useState } from "react";

import { supabase, publicAssetUrl } from "../../../lib/supabase";
import { uploadAsset } from "../../../lib/uploadAsset";
import {
  inputClass,
  labelClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./shared";

type HeroVariant = "computer" | "avatar";

type SettingsRow = {
  base_url: string;
  model: string;
  system_prompt: string;
  greeting: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
  hero_variant: HeroVariant;
  avatar_path: string | null;
  voice_enabled: boolean;
  voice_base_url: string;
  tts_model: string;
  tts_voice: string;
};

const EMPTY: SettingsRow = {
  base_url: "",
  model: "",
  system_prompt: "",
  greeting: "",
  temperature: 0.7,
  max_tokens: 400,
  enabled: false,
  hero_variant: "avatar",
  avatar_path: null,
  voice_enabled: false,
  voice_base_url: "https://openrouter.ai/api/v1",
  tts_model: "",
  tts_voice: "",
};

type CatalogModel = {
  model_id: string;
  display_name: string;
  // TTS models only -- the provider's list of voice names for this model
  // (OpenRouter's `supported_voices`). Drives the Voice name dropdown.
  voices?: string[];
};
type ModelKind = "chat" | "tts";

const MODEL_CACHE_KEY = "cms_model_catalog_cache_v1";
const TTS_MODEL_CACHE_KEY = "cms_tts_catalog_cache_v1";

function loadCache(key: string): CatalogModel[] {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

const ChatbotEditor = () => {
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [voiceApiKeyInput, setVoiceApiKeyInput] = useState("");
  const [hasVoiceKey, setHasVoiceKey] = useState(false);

  const [models, setModels] = useState<CatalogModel[]>(() => loadCache(MODEL_CACHE_KEY));
  const [ttsModels, setTtsModels] = useState<CatalogModel[]>(() => loadCache(TTS_MODEL_CACHE_KEY));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState<ModelKind | null>(null);
  const [testingVoice, setTestingVoice] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const [{ data: row }, { data: keyStatus }, { data: voiceKeyStatus }] = await Promise.all([
        supabase.from("chat_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.rpc("has_chat_api_key"),
        supabase.rpc("has_voice_api_key"),
      ]);
      // Spread over EMPTY rather than a bare cast: the voice/hero columns
      // are newer additions -- a database that hasn't had the migration
      // run yet returns rows without them, which would otherwise leave
      // several controlled inputs with an undefined value.
      if (row) setSettings({ ...EMPTY, ...(row as SettingsRow) });
      setHasKey(!!keyStatus);
      setHasVoiceKey(!!voiceKeyStatus);
      setLoading(false);
    })();
  }, []);

  const saveKey = async (field: "api_key" | "voice_api_key", value: string) => {
    if (!supabase || !value.trim()) return true;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-chat-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ api_key: value.trim(), field }),
    });
    return res.ok;
  };

  const handleSaveSettings = async () => {
    if (!supabase || !settings) return;
    setSaving(true);
    setStatus(null);

    // .select().maybeSingle() so a write silently blocked by RLS (0 rows
    // affected -- e.g. an expired session) surfaces as a real error instead
    // of a false "Saved." (a bare .update() with no .select() returns no
    // error at all when RLS filters out every row).
    const { data: updated, error } = await supabase
      .from("chat_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select()
      .maybeSingle();

    if (!error && !updated) {
      setSaving(false);
      setStatus(
        "Error: save did not persist (0 rows updated) -- try logging out and back into the CMS."
      );
      return;
    }

    if (updated) setSettings({ ...EMPTY, ...(updated as SettingsRow) });

    if (apiKeyInput.trim() && (await saveKey("api_key", apiKeyInput))) {
      setHasKey(true);
      setApiKeyInput("");
    }
    if (voiceApiKeyInput.trim() && (await saveKey("voice_api_key", voiceApiKeyInput))) {
      setHasVoiceKey(true);
      setVoiceApiKeyInput("");
    }

    setSaving(false);
    setStatus(error ? `Error: ${error.message}` : "Saved.");
    return !error;
  };

  const handleRefreshModels = async (kind: ModelKind) => {
    if (!supabase || !settings) return;
    setRefreshing(kind);
    setStatus(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const cacheKey = kind === "chat" ? MODEL_CACHE_KEY : TTS_MODEL_CACHE_KEY;
    const setList = kind === "chat" ? setModels : setTtsModels;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/models?kind=${kind}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${json.error ?? "Could not refresh models."}`);
      } else {
        setList(json.models);
        localStorage.setItem(cacheKey, JSON.stringify(json.models));
        setStatus(`Loaded ${json.models.length} models.`);
      }
    } catch {
      setStatus("Error: could not reach the models function.");
    }

    setRefreshing(null);
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setStatus(null);
    try {
      const path = await uploadAsset("avatar", file, { resize: false });
      setSettings((s) => (s ? { ...s, avatar_path: path } : s));
      setStatus("Avatar uploaded — click Save to use it, then switch Hero style to Avatar.");
    } catch (e) {
      setStatus(`Upload failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
    setUploadingAvatar(false);
  };

  // Saves current settings first (the public `speak` function reads from
  // the database, not from this draft state) then calls it with a fixed
  // sample line and plays the result -- turns "does this model actually
  // work" into a two-second check instead of guessing.
  const handleTestVoice = async () => {
    if (!supabase || !settings) return;
    setTestingVoice(true);
    setStatus("Saving settings before testing…");
    const saved = await handleSaveSettings();
    if (!saved) {
      setTestingVoice(false);
      return;
    }
    setStatus("Requesting a sample…");
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) throw new Error("Supabase is not configured.");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ text: "Hi, this is a test of the selected voice." }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const detail =
          json.detail && !String(json.error ?? "").includes(json.detail)
            ? ` (${String(json.detail).slice(0, 200)})`
            : "";
        setStatus(`Error: ${json.error ?? "Voice test failed."}${detail}`);
      } else {
        // Real MP3 (see supabase/functions/speak) -- a plain <audio>
        // element can play it directly, no container wrapping needed.
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (testAudioRef.current) {
          testAudioRef.current.src = url;
          await testAudioRef.current.play();
        }
        setStatus("Playing sample…");
      }
    } catch {
      setStatus("Error: could not reach the speak function.");
    }
    setTestingVoice(false);
  };

  if (loading || !settings) return <p className="text-secondary">Loading…</p>;

  // Voice names the currently-selected TTS model advertises (see the
  // `models` function) -- non-empty turns the Voice field into a dropdown.
  const ttsVoiceOptions =
    ttsModels.find((m) => m.model_id === settings.tts_model)?.voices ?? [];

  return (
    <div>
      <h2 className="mb-6 text-[20px] font-bold">Chatbot</h2>

      <div className={fieldClass}>
        <label className={labelClass}>
          Enabled (shows the chat in the 3D monitor / mobile panel)
        </label>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) =>
            setSettings({ ...settings, enabled: e.target.checked })
          }
          className="h-5 w-5"
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>
          Base URL (any OpenAI-compatible endpoint)
        </label>
        <input
          className={inputClass}
          placeholder="https://api.groq.com/openai/v1"
          value={settings.base_url}
          onChange={(e) =>
            setSettings({ ...settings, base_url: e.target.value })
          }
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>
          API key {hasKey ? "(currently set — leave blank to keep it)" : "(not set)"}
        </label>
        <input
          type="password"
          className={inputClass}
          placeholder={hasKey ? "••••••••••••" : "sk-…"}
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Model</label>
          <button
            type="button"
            onClick={() => handleRefreshModels("chat")}
            disabled={refreshing !== null}
            className={secondaryButtonClass}
          >
            {refreshing === "chat" ? "Refreshing…" : "Refresh models"}
          </button>
        </div>
        {models.length > 0 ? (
          <select
            className={inputClass}
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          >
            <option value="">Select a model…</option>
            {models.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={inputClass}
            placeholder="Click 'Refresh models' to load a dropdown, or type a model id"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          />
        )}
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>System prompt (behavior only)</label>
        <textarea
          rows={6}
          className={inputClass}
          placeholder="Tone, boundaries, and how to handle off-topic questions -- e.g. 'Answer as if introducing Adrian to a visitor. Keep answers brief. Decline offensive or irrelevant questions.' Facts about Adrian (skills, experience, projects, profile) are added automatically -- no need to list them here."
          value={settings.system_prompt}
          onChange={(e) =>
            setSettings({ ...settings, system_prompt: e.target.value })
          }
        />
        <p className="text-secondary mt-1 text-[12px]">
          The model always receives his skills, experience, projects, and
          profile automatically, assembled fresh from the CMS on every
          message -- this field only needs to say how to respond, not who he
          is. Edit the Profile tab's "extra context" field for facts that
          aren't already covered by those tables.
        </p>
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Greeting (first message shown)</label>
        <input
          className={inputClass}
          value={settings.greeting}
          onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
        />
      </div>

      <div className="mb-5 flex gap-4">
        <div className="flex-1">
          <label className={labelClass}>Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            className={inputClass}
            value={settings.temperature}
            onChange={(e) =>
              setSettings({ ...settings, temperature: Number(e.target.value) })
            }
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Max tokens</label>
          <input
            type="number"
            min="1"
            max="1024"
            className={inputClass}
            value={settings.max_tokens}
            onChange={(e) =>
              setSettings({ ...settings, max_tokens: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <hr className="border-black-100 my-8" />
      <h3 className="mb-4 text-[16px] font-bold">Hero</h3>

      <div className={fieldClass}>
        <label className={labelClass}>Hero style</label>
        <div className="flex gap-4">
          {(["computer", "avatar"] as const).map((variant) => (
            <label key={variant} className="text-secondary flex items-center gap-2 text-[14px]">
              <input
                type="radio"
                name="hero_variant"
                checked={settings.hero_variant === variant}
                onChange={() => setSettings({ ...settings, hero_variant: variant })}
              />
              {variant === "computer" ? "3D computer (terminal chat)" : "3D avatar (talks, gestures, voice)"}
            </label>
          ))}
        </div>
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Avatar model (.glb)</label>
        {settings.avatar_path && (
          <p className="text-secondary mb-2 text-[12px]">
            Current:{" "}
            <a
              href={publicAssetUrl(settings.avatar_path)}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              {settings.avatar_path}
            </a>
          </p>
        )}
        <input
          type="file"
          accept=".glb,.gltf,model/gltf-binary"
          disabled={uploadingAvatar}
          onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
        />
        <p className="text-secondary mt-1 text-[12px]">
          Leave unset to use the bundled default avatar. A replacement with
          its own baked animation clips (Idle/Wave/etc) will use them
          automatically; one with none falls back to procedural gestures,
          which expect Mixamo/RPM-style bone names -- see
          public/avatar/license.txt for the full story either way.
        </p>
      </div>

      <hr className="border-black-100 my-8" />
      <h3 className="mb-4 text-[16px] font-bold">Voice</h3>

      <div className={fieldClass}>
        <label className={labelClass}>
          Voice enabled (spoken replies, avatar hero only -- no microphone)
        </label>
        <input
          type="checkbox"
          checked={settings.voice_enabled}
          onChange={(e) => setSettings({ ...settings, voice_enabled: e.target.checked })}
          className="h-5 w-5"
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Voice base URL (OpenAI-compatible audio endpoints)</label>
        <input
          className={inputClass}
          placeholder="https://openrouter.ai/api/v1"
          value={settings.voice_base_url}
          onChange={(e) => setSettings({ ...settings, voice_base_url: e.target.value })}
        />
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>
          Voice API key{" "}
          {hasVoiceKey
            ? "(currently set — leave blank to keep it)"
            : "(not set — falls back to the chat API key above)"}
        </label>
        <input
          type="password"
          className={inputClass}
          placeholder={hasVoiceKey ? "••••••••••••" : "leave blank to reuse the chat key"}
          value={voiceApiKeyInput}
          onChange={(e) => setVoiceApiKeyInput(e.target.value)}
        />
      </div>

      <div className={fieldClass}>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Text-to-speech model</label>
          <button
            type="button"
            onClick={() => handleRefreshModels("tts")}
            disabled={refreshing !== null}
            className={secondaryButtonClass}
          >
            {refreshing === "tts" ? "Refreshing…" : "Refresh models"}
          </button>
        </div>
        {ttsModels.length > 0 ? (
          <select
            className={inputClass}
            value={settings.tts_model}
            onChange={(e) => setSettings({ ...settings, tts_model: e.target.value })}
          >
            <option value="">Select a model…</option>
            {ttsModels.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={inputClass}
            placeholder="e.g. deepgram/flux-tts:free"
            value={settings.tts_model}
            onChange={(e) => setSettings({ ...settings, tts_model: e.target.value })}
          />
        )}
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Voice name (provider-specific)</label>
        {ttsVoiceOptions.length > 0 ? (
          <select
            className={inputClass}
            value={settings.tts_voice}
            onChange={(e) => setSettings({ ...settings, tts_voice: e.target.value })}
          >
            <option value="">Provider default</option>
            {/* the saved value may not be in the current model's list (the
                model was just switched) -- keep it selectable regardless */}
            {settings.tts_voice && !ttsVoiceOptions.includes(settings.tts_voice) && (
              <option value={settings.tts_voice}>
                {settings.tts_voice} (not in this model&apos;s list)
              </option>
            )}
            {ttsVoiceOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={inputClass}
            placeholder="e.g. onyx"
            value={settings.tts_voice}
            onChange={(e) => setSettings({ ...settings, tts_voice: e.target.value })}
          />
        )}
        <p className="text-secondary mt-1 text-[12px]">
          {ttsVoiceOptions.length > 0
            ? `${ttsVoiceOptions.length} voices available for this model (from the provider). Pick one, then Test voice.`
            : "Most models require this. OpenAI-family (tts-1, gpt-4o-mini-tts): alloy, echo, fable, onyx (male), nova, shimmer. Hit “Refresh models” above to get a dropdown of the exact names for your model."}
        </p>
      </div>

      <div className={fieldClass}>
        <button
          type="button"
          onClick={handleTestVoice}
          disabled={testingVoice || !settings.tts_model}
          className={secondaryButtonClass}
        >
          {testingVoice ? "Testing…" : "Test voice"}
        </button>
        <audio ref={testAudioRef} className="hidden" />
        <p className="text-secondary mt-1 text-[12px]">
          Saves your current settings, then asks the model for a short
          sample and plays it — confirms the model id actually works rather
          than guessing.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          className={primaryButtonClass}
          disabled={saving}
          onClick={handleSaveSettings}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {status && <span className="text-secondary text-[13px]">{status}</span>}
      </div>
    </div>
  );
};

export default ChatbotEditor;
