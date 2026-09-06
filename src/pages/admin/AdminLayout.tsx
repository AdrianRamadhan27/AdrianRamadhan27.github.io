import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import ProfileEditor from "./editors/ProfileEditor";
import ExperienceEditor from "./editors/ExperienceEditor";
import ProjectsEditor from "./editors/ProjectsEditor";
import SkillsEditor from "./editors/SkillsEditor";
import SocialsEditor from "./editors/SocialsEditor";
import ChatbotEditor from "./editors/ChatbotEditor";

const TABS = [
  { key: "profile", label: "Profile", Component: ProfileEditor },
  { key: "experience", label: "Experience", Component: ExperienceEditor },
  { key: "projects", label: "Projects", Component: ProjectsEditor },
  { key: "skills", label: "Skills", Component: SkillsEditor },
  { key: "socials", label: "Socials", Component: SocialsEditor },
  { key: "chatbot", label: "Chatbot", Component: ChatbotEditor },
] as const;

const AdminLayout = () => {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>(
    "profile"
  );
  const navigate = useNavigate();
  const ActiveComponent = TABS.find((t) => t.key === active)!.Component;

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    navigate("/");
  };

  return (
    <div className="bg-primary min-h-screen text-white">
      <header className="border-black-100 flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-[18px] font-bold">Portfolio CMS</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-secondary hover:text-accent text-[14px]"
          >
            View site
          </button>
          <button
            onClick={handleSignOut}
            className="border-secondary hover:border-accent hover:text-accent rounded-lg border px-4 py-2 text-[13px]"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row">
        <nav className="flex shrink-0 gap-2 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-3 text-left text-[14px] font-medium transition-colors ${
                active === tab.key
                  ? "bg-accent text-black"
                  : "bg-tertiary text-secondary hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
