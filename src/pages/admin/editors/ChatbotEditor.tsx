import { useEffect, useState } from "react";

import { supabase } from "../../../lib/supabase";
import {
  inputClass,
  labelClass,
  fieldClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./shared";

type SettingsRow = {
  base_url: string;
  model: string;
  system_prompt: string;
  greeting: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
};

type CatalogModel = { model_id: string; display_name: string };

const MODEL_CACHE_KEY = "cms_model_catalog_cache_v1";

const ChatbotEditor = () => {
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [models, setModels] = useState<CatalogModel[]>(() => {
    try {
      const cached = localStorage.getItem(MODEL_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const [{ data: row }, { data: keyStatus }] = await Promise.all([
        supabase.from("chat_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.rpc("has_chat_api_key"),
      ]);
      if (row) setSettings(row as SettingsRow);
      setHasKey(!!keyStatus);
      setLoading(false);
    })();
  }, []);

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

    if (updated) setSettings(updated as SettingsRow);

    if (apiKeyInput.trim()) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-chat-key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ api_key: apiKeyInput.trim() }),
        }
      );
      if (res.ok) {
        setHasKey(true);
        setApiKeyInput("");
      }
    }

    setSaving(false);
    setStatus(error ? `Error: ${error.message}` : "Saved.");
  };

  const handleRefreshModels = async () => {
    if (!supabase || !settings) return;
    setRefreshing(true);
    setStatus(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/models`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${json.error ?? "Could not refresh models."}`);
      } else {
        setModels(json.models);
        localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(json.models));
        setStatus(`Loaded ${json.models.length} models.`);
      }
    } catch {
      setStatus("Error: could not reach the models function.");
    }

    setRefreshing(false);
  };

  if (loading || !settings) return <p className="text-secondary">Loading…</p>;

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
            onClick={handleRefreshModels}
            disabled={refreshing}
            className={secondaryButtonClass}
          >
            {refreshing ? "Refreshing…" : "Refresh models"}
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
        <label className={labelClass}>System prompt</label>
        <textarea
          rows={6}
          className={inputClass}
          value={settings.system_prompt}
          onChange={(e) =>
            setSettings({ ...settings, system_prompt: e.target.value })
          }
        />
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
