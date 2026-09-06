import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import LoginForm from "./LoginForm";
import AdminLayout from "./AdminLayout";

const AdminApp = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="bg-primary flex min-h-screen items-center justify-center px-6 text-center text-white">
        <p className="max-w-md">
          Supabase isn't configured for this build (missing
          VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), so the CMS can't
          connect. Set those env vars and rebuild.
        </p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="bg-primary flex min-h-screen items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <LoginForm onSignedIn={setSession} />;
  }

  return <AdminLayout />;
};

export default AdminApp;
