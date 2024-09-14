import projectsData from "../../data/projectsData";
import ProjectCard from "../ui/ProjectCard";
import { BsThreeDots } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

export default function AllProjects({ size, text }) {
  const navigate = useNavigate();

  // If 'size' is provided, slice the projectsData array to limit the number of projects shown
  const displayedProjects = size ? projectsData.slice(0, size) : projectsData;
  

  return (
    <div className="bg-opacity-75 dark:bg-opacity-75 rounded-md shadow-lg flex flex-col bg-white dark:bg-black text-black dark:text-white gap-3 m-10 md:m-16 h-fit text-center p-3 md:p-5 md:hover:scale-105 duration-300">
      <h1 className="text-2xl font-bold">{text}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center p-2">
        {displayedProjects.map((project) => (
          <button onClick={()=>{navigate(`/projects/${project.id}`)}}>
          <ProjectCard
            key={project.id}
            title={project.title}
            imageFile={project.imageFile}
            start={project.dateStart}
            end={project.dateEnd}
            techStacks={project.techStacks}
          />
          </button>  

        ))}
      </div>

      {size && (
        <button
          onClick={() => navigate("/projects")}
          className="m-auto flex items-center gap-2 border-2 hover:border-green-700 hover:text-green-700 border-primary p-2 text-primary rounded-md duration-300 w-fit"
        >
        <BsThreeDots />
        View more
        </button>
      )}


    </div>
  );
}
