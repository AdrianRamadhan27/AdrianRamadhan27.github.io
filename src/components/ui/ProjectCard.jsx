import TechCard from "./TechCard";
import { formatDate } from "../../utils/formatDate";
export default function ProjectCard({ title, imageFile, start, end, techStacks }) {
  return (
    <div className="group flex flex-col justify-between rounded-lg w-full h-[280px] sm:h-[320px] md:h-[340px] bg-white shadow-lg dark:bg-black hover:scale-105 duration-300">
      {/* Ensure fixed image height with object-cover to keep aspect ratio */}
      <div className="w-full">
        <img
          src={`${import.meta.env.BASE_URL}images/projects/${imageFile}`}
          alt={title}
          className="w-full h-full object-cover rounded-t-lg group-hover:opacity-60 duration-300"
        />
      </div>
      <div className="p-2 flex flex-col">
        <h2 className="font-bold text-md text-center mb-2">{title}</h2>
        <span className="text-xs text-center mb-2">
          {formatDate(start)} - {end ? formatDate(end) : "Present"}
        </span>
        <ul className="flex gap-1 justify-center items-center p-2 text-xs overflow-x-auto">
          {techStacks.slice(0, 3).map((tech) => (
            <li className="w-20 md:w-28" key={tech}>
              <TechCard name={tech}/>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
