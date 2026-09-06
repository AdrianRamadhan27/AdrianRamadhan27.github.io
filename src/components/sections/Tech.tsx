import { BallCanvas } from "../canvas";
import { SectionWrapper } from "../../hoc";
import { useContent } from "../../hooks/useContent";

const Tech = () => {
  const { technologies } = useContent();

  return (
    <>
      <div className="flex flex-row flex-wrap justify-center gap-10">
        {technologies.map((technology, index) => (
          <div className="h-28 w-28" key={technology.id ?? index}>
            <BallCanvas icon={technology.icon} />
          </div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Tech, "tech");
