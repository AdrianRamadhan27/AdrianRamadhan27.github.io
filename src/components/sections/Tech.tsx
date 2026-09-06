import { BallCanvas } from "../canvas";
import { SectionWrapper } from "../../hoc";
import { useContent } from "../../hooks/useContent";

const Tech = () => {
  const { technologies } = useContent();

  return (
    <>
      <div className="flex flex-row flex-wrap justify-center gap-x-10 gap-y-4">
        {technologies.map((technology, index) => (
          <div
            className="flex w-28 flex-col items-center"
            key={technology.id ?? index}
          >
            <div className="h-28 w-28">
              <BallCanvas icon={technology.icon} />
            </div>
            <p className="text-secondary mt-1 text-center text-[13px]">
              {technology.name}
            </p>
          </div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Tech, "tech");
