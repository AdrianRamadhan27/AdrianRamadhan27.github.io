import TechCard from "./TechCard";

export default function ProjectCard({ title, imageFile, start, end, techStacks }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "short" }; // "short" for 3-letter month
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className="flex flex-col justify-between rounded-lg w-full h-[300px] md:h-[350px] bg-white shadow-lg dark:bg-black hover:scale-105 duration-300">
      {/* Ensure fixed image height with object-cover to keep aspect ratio */}
      <div className="w-full">
        <img
          src={`${import.meta.env.BASE_URL}images/projects/${imageFile}`}
          alt={title}
          className="w-full h-full object-cover rounded-t-lg"
        />
      </div>
      <div className="p-2 flex flex-col">
        <h2 className="font-bold text-md text-center mb-2">{title}</h2>
        <span className="text-xs text-center mb-2">
          {formatDate(start)} - {end ? formatDate(end) : "Present"}
        </span>
        <ul className="flex gap-1 justify-center items-center p-2 text-xs overflow-x-auto custom-scrollbar">
          {techStacks.map((tech) => (
            <li className="w-28" key={tech}>
              <TechCard name={tech}/>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
