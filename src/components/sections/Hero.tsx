import React, { useState } from "react";
import { motion } from "framer-motion";

import { styles } from "../../constants/styles";
import { ComputersCanvas } from "../canvas";
import { useContent } from "../../hooks/useContent";
import { scrollToSection } from "../../utils/scrollToSection";
import CvModal from "../ui/CvModal";

const Hero = () => {
  const { profile } = useContent();
  const [cvOpen, setCvOpen] = useState(false);

  return (
    <section className={`relative mx-auto h-screen w-full`}>
      {/* This box spans the full hero height (inset-0), but only its top
          slice actually has content -- pointer-events-none lets clicks
          everywhere else fall through to the Canvas below for OrbitControls
          dragging. The CV button opts back in with pointer-events-auto so
          it alone stays clickable (z-10 keeps it visually on top too). */}
      <div
        className={`pointer-events-none absolute inset-0 top-[120px] z-10 mx-auto max-w-7xl ${styles.paddingX} flex flex-row items-start gap-5`}
      >
        <div className="mt-5 flex flex-col items-center justify-center">
          <div className="bg-accent h-5 w-5 rounded-full" />
          <div className="accent-gradient h-40 w-1 sm:h-80" />
        </div>

        <div>
          <h1 className={`${styles.heroHeadText} text-white`}>
            Hi, I'm <span className="text-accent">{profile.fullName}</span>
          </h1>
          <p className={`${styles.heroSubText} text-white-100 mt-2`}>
            {profile.heroLines.map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < profile.heroLines.length - 1 && (
                  <br className="hidden sm:block" />
                )}
              </React.Fragment>
            ))}
          </p>

          {profile.cvUrl && (
            <button
              onClick={() => setCvOpen(true)}
              className="bg-accent hover:bg-accent-dim pointer-events-auto mt-6 inline-block rounded-full px-6 py-3 text-[14px] font-bold text-black transition-colors"
            >
              View CV
            </button>
          )}
        </div>
      </div>

      <ComputersCanvas />

      <div className="xs:bottom-10 absolute bottom-32 flex w-full items-center justify-center">
        <a
          href="#about"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection("about");
          }}
        >
          <div className="border-secondary flex h-[64px] w-[35px] items-start justify-center rounded-3xl border-4 p-2">
            <motion.div
              animate={{
                y: [0, 24, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              className="bg-secondary mb-1 h-3 w-3 rounded-full"
            />
          </div>
        </a>
      </div>
      {cvOpen && profile.cvUrl && (
        <CvModal url={profile.cvUrl} onClose={() => setCvOpen(false)} />
      )}
    </section>
  );
};

export default Hero;
