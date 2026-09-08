import { useNavigate } from "react-router-dom";
import { useRef } from "react";

import { useContent } from "../../hooks/useContent";
import SocialLinks from "../atoms/SocialLinks";

// Five clicks on the year opens the CMS. It is deliberately not a visible
// "Admin" link — discoverable to the owner, invisible to everyone else.
const HIDDEN_TRIGGER_CLICKS = 5;
const HIDDEN_TRIGGER_WINDOW_MS = 2000;

const Footer = () => {
  const { profile } = useContent();
  const navigate = useNavigate();
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleYearClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, HIDDEN_TRIGGER_WINDOW_MS);

    if (clickCount.current >= HIDDEN_TRIGGER_CLICKS) {
      clickCount.current = 0;
      navigate("/admin");
    }
  };

  return (
    <footer className="bg-black-100 relative z-0 w-full px-6 py-10 sm:px-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <SocialLinks />

        {profile.cvUrl && (
          <a
            href={`${profile.cvUrl}?download`}
            download
            className="border-accent text-accent hover:bg-accent rounded-lg border px-5 py-2 text-[14px] font-semibold transition-colors hover:text-black"
          >
            Download CV
          </a>
        )}

        <p
          onClick={handleYearClick}
          className="text-secondary cursor-default select-none text-[13px]"
        >
          © {new Date().getFullYear()} {profile.fullName}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
