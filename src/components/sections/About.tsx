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
        variants={fadeIn("right", "spring", index * 0.5, 0.75)}
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

const Portrait = ({ src }: { src: string }) => (
  <Tilt
    glareEnable
    tiltEnable
    tiltMaxAngleX={12}
    tiltMaxAngleY={12}
    glareColor="#00df9a"
    className="mx-auto w-full max-w-[280px] shrink-0 md:mx-0"
  >
    <motion.div
      variants={fadeIn("left", "spring", 0.1, 0.9)}
      className="green-pink-gradient shadow-card rounded-[24px] p-[3px]"
    >
      <img
        src={src}
        alt="Portrait"
        className="aspect-[3/4] w-full rounded-[22px] object-cover"
        style={{ filter: "grayscale(0.3) contrast(1.05) saturate(1.15)" }}
      />
    </motion.div>
  </Tilt>
);

const About = () => {
  const { profile } = useContent();

  return (
    <>
      <Header useMotion={true} {...config.sections.about} />

      <div className="mt-8 flex flex-col-reverse gap-10 md:flex-row md:items-start">
        <div className="flex-1">
          <motion.p
            variants={fadeIn("", "", 0.1, 1)}
            className="text-secondary text-[17px] leading-[30px]"
          >
            {profile.aboutText}
          </motion.p>

          <div className="mt-16 flex flex-wrap gap-10 max-sm:justify-center">
            {services.map((service, index) => (
              <ServiceCard key={service.title} index={index} {...service} />
            ))}
          </div>
        </div>

        {profile.photoUrl && <Portrait src={profile.photoUrl} />}
      </div>
    </>
  );
};

export default SectionWrapper(About, "about");
