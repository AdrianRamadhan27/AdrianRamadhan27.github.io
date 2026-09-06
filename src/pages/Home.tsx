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
      <div className="bg-hero-glow bg-cover bg-center bg-no-repeat">
        <Navbar />
        <Hero />
      </div>
      <About />
      <Experience />
      <Tech />
      <Works />
      <div className="relative z-0">
        <Contact />
        <StarsCanvas />
      </div>
      <Footer />
    </div>
  );
};

export default Home;
