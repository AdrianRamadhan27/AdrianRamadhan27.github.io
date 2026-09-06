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
    <section className={`relative mx-auto min-h-screen w-full`}>
      {/* Below the sm breakpoint there is no 3D canvas at all (see
          ComputersCanvas) -- just a normal-flow chat panel underneath, so
          this block is normal-flow too (pt-28 clears the fixed navbar) and
          stacks cleanly above it. At sm+ it switches to absolute+inset-0,
          overlaying the canvas -- pointer-events-none there lets clicks
          everywhere but the CV button fall through for OrbitControls
          dragging (z-10 keeps it visually on top; the button opts back in
          with pointer-events-auto). */}
      <div
        className={`relative z-10 mx-auto max-w-7xl pb-8 pt-28 sm:pointer-events-none sm:absolute sm:inset-0 sm:top-[120px] sm:pb-0 sm:pt-0 ${styles.paddingX} flex flex-row items-start gap-5`}
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

      <div className="xs:bottom-10 absolute bottom-32 hidden w-full items-center justify-center sm:flex">
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
