import { useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

const LoginForm = ({
  onSignedIn,
}: {
  onSignedIn: (session: Session) => void;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError || !data.session) {
      setError("Invalid email or password.");
      return;
    }

    onSignedIn(data.session);
  };

  return (
    <div className="bg-primary flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-tertiary w-full max-w-sm rounded-2xl p-8"
      >
        <h1 className="mb-6 text-[22px] font-bold text-white">CMS Login</h1>

        <label className="mb-4 flex flex-col">
          <span className="mb-2 text-[14px] text-white">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black-100 placeholder:text-secondary rounded-lg border-none px-4 py-3 text-white outline-none"
          />
        </label>

        <label className="mb-6 flex flex-col">
          <span className="mb-2 text-[14px] text-white">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black-100 placeholder:text-secondary rounded-lg border-none px-4 py-3 text-white outline-none"
          />
        </label>

        {error && <p className="mb-4 text-[13px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent w-full rounded-lg py-3 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
