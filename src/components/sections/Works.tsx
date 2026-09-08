import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import { FiExternalLink } from "react-icons/fi";

import { github } from "../../assets";
import { SectionWrapper } from "../../hoc";
import { fadeIn } from "../../utils/motion";
import { config } from "../../constants/config";
import { Header } from "../atoms/Header";
import { TProject } from "../../types";
import { useContent } from "../../hooks/useContent";

const ProjectCard: React.FC<{ index: number } & TProject> = ({
  index,
  name,
  description,
  tags,
  image,
  sourceCodeLink,
  liveLink,
}) => {
  // index * 0.5 as a per-card delay was fine for the template's original 3
  // dummy projects (max 1s) -- with a real project list it scales unbounded
  // (9 projects = a 4s delay before the last card even starts appearing),
  // which reads as cards randomly "not showing up" if you don't wait the
  // several seconds out. Capped so the stagger stays snappy regardless of
  // how many projects exist.
  return (
    <motion.div variants={fadeIn("up", "spring", Math.min(index * 0.15, 1), 0.75)}>
      <Tilt
        glareEnable
        tiltEnable
        tiltMaxAngleX={30}
        tiltMaxAngleY={30}
        glareColor="#9fbdb1"
      >
        <div className="bg-tertiary w-full rounded-2xl p-5 sm:w-[380px]">
          {/* aspect-[3/2] (not a fixed height): a landscape box close to
              these projects' own screenshot ratios (~1.2-1.4:1, checked
              directly against the source images) so object-contain -- full
              image always visible, never cropped, unlike object-cover --
              only letterboxes a little rather than shrinking the image
              down inside a much-too-tall box. */}
          <div className="relative aspect-[3/2] w-full">
            <img
              src={image}
              alt={name}
              className="h-full w-full rounded-2xl object-contain"
            />
            <div className="absolute inset-0 m-3 flex justify-end gap-2 opacity-0 transition-opacity duration-300 hover:opacity-100">
              {liveLink && (
                <div
                  onClick={() => window.open(liveLink, "_blank")}
                  title="Live demo"
                  className="black-gradient flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
                >
                  <FiExternalLink className="h-1/2 w-1/2 text-white" />
                </div>
              )}
              <div
                onClick={() => window.open(sourceCodeLink, "_blank")}
                title="Source code"
                className="black-gradient flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
              >
                <img
                  src={github}
                  alt="github"
                  className="h-1/2 w-1/2 object-contain"
                />
              </div>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-[24px] font-bold text-white">{name}</h3>
            <p className="text-secondary mt-2 text-[14px]">{description}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <p key={tag.name} className={`text-[14px] ${tag.color}`}>
                #{tag.name}
              </p>
            ))}
          </div>
        </div>
      </Tilt>
    </motion.div>
  );
};

const Works = () => {
  const { projects } = useContent();

  return (
    <>
      <Header useMotion={true} {...config.sections.works} />

      <div className="flex w-full">
        <motion.p
          variants={fadeIn("", "", 0.1, 1)}
          className="text-secondary mt-3 max-w-3xl text-[17px] leading-[30px]"
        >
          {config.sections.works.content}
        </motion.p>
      </div>

      <div className="mt-20 flex flex-wrap justify-center gap-7">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id ?? `project-${index}`}
            index={index}
            {...project}
          />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Works, "work");
