import React from "react";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";

import { services } from "../../constants";
import { SectionWrapper } from "../../hoc";
import { fadeIn } from "../../utils/motion";
import { config } from "../../constants/config";
import { Header } from "../atoms/Header";
import { useContent } from "../../hooks/useContent";

interface IServiceCard {
  index: number;
  title: string;
  icon: string;
}

const ServiceCard: React.FC<IServiceCard> = ({ index, title, icon }) => (
  <Tilt
    glareEnable
    tiltEnable
    tiltMaxAngleX={30}
    tiltMaxAngleY={30}
    glareColor="#9fbdb1"
  >
    <div className="max-w-[250px] w-full xs:w-[250px]">
      <motion.div
        variants={fadeIn("right", "spring", Math.min(index * 0.15, 1), 0.75)}
        className="green-pink-gradient shadow-card w-full rounded-[20px] p-[1px]"
      >
        <div className="bg-tertiary flex min-h-[280px] flex-col items-center justify-evenly rounded-[20px] px-12 py-5">
          <img
            src={icon}
            alt="web-development"
            className="h-16 w-16 object-contain"
          />

          <h3 className="text-center text-[20px] font-bold text-white">
            {title}
          </h3>
        </div>
      </motion.div>
    </div>
  </Tilt>
);

const About = () => {
  const { profile } = useContent();

  // The portrait that used to sit here moved to the hero, where it now
  // shares the 3D avatar's spot as a photo<->avatar flip card (see
  // FlipAvatar.tsx). About is intro copy + the service cards only now.
  return (
    <>
      <Header useMotion={true} {...config.sections.about} />

      <div className="mt-8">
        <motion.p
          variants={fadeIn("", "", 0.1, 1)}
          className="text-secondary max-w-3xl text-[17px] leading-[30px]"
        >
          {profile.aboutText}
        </motion.p>

        <div className="mt-16 flex flex-wrap gap-10 max-sm:justify-center">
          {services.map((service, index) => (
            <ServiceCard key={service.title} index={index} {...service} />
          ))}
        </div>
      </div>
    </>
  );
};

export default SectionWrapper(About, "about");
