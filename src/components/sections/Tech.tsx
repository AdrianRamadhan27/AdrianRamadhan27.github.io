import { TechBallsCanvas } from "../canvas";
import { SectionWrapper } from "../../hoc";
import { useContent } from "../../hooks/useContent";
import { Header } from "../atoms/Header";
import { config } from "../../constants/config";

const Tech = () => {
  const { technologies } = useContent();

  return (
    <>
      <Header useMotion={true} {...config.sections.skills} />

      <div className="mt-16">
        <TechBallsCanvas technologies={technologies} />
      </div>
    </>
  );
};

export default SectionWrapper(Tech, "tech");
