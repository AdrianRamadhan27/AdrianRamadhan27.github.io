import { useEffect } from "react";

import {
  About,
  Contact,
  Experience,
  Hero,
  Navbar,
  Footer,
  Tech,
  Works,
  StarsCanvas,
} from "../components";
import { useContent } from "../hooks/useContent";

const Home = () => {
  const { profile } = useContent();

  useEffect(() => {
    document.title = `${profile.fullName} — Portfolio`;
  }, [profile.fullName]);

  return (
    <div className="bg-primary relative z-0">
      {/* Previously scoped to just the Contact section's own wrapper --
          moved up here so it renders once, fixed behind the ENTIRE page,
          not just one section. Every SectionWrapper-based section (About,
          Experience, Tech, Works, Contact) paints no background of its
          own (verified directly in SectionWrapper.tsx), so this shows
          through all of them uniformly; only the hero's own gradient
          wrapper needed its base fill lightened to translucent for the
          same reason (see bg-hero-glow in globals.css). */}
      <StarsCanvas />
      <div className="bg-hero-glow bg-cover bg-center bg-no-repeat">
        <Navbar />
        <Hero />
      </div>
      <About />
      <Experience />
      <Tech />
      <Works />
      <Contact />
      <Footer />
    </div>
  );
};

export default Home;
