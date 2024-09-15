import TechCard from "../ui/TechCard";
import { formatDate } from "../../utils/formatDate";
import { FaExternalLinkAlt } from "react-icons/fa";

export default function ProjectDetail({project}) {
    return (
        <div className="bg-opacity-75 dark:bg-opacity-75 rounded-md shadow-lg p-3 md:p-5 flex flex-col gap-3 bg-white dark:bg-black text-black dark:text-white my-5 mb-10 mx-10 md:mx-12 h-fit text-center md:hover:scale-105 duration-300">
            <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="w-full md:w-3/5">
                    <img
                        src={`${import.meta.env.BASE_URL}images/projects/${project.imageFile}`}
                        alt={project.title}
                        className="w-full h-full object-cover rounded-lg group-hover:opacity-60 duration-300"
                    />
                </div>
                <div className="w-full md:w-2/5 text-center md:text-left flex flex-col gap-2 p-2">
                    <h1 className="font-bold text-3xl md:text-5xl">{project.title}</h1>
                    <p className="text-xs md:text-sm">{project.description}</p>

                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-3/5 flex flex-col gap-3 p-3">
                    <div className="flex flex-col gap-2 text-center md:text-left">
                        <h2 className="font-bold text-xl">Technologies Used</h2>
                        <ul className="flex flex-wrap gap-2 items-center text-xs justify-center md:justify-normal">
                            {project.techStacks.map((tech) => (
                                <li className="" key={tech}>
                                    <TechCard name={tech}/>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>
                <div className="w-full md:w-2/5 flex flex-col gap-2 text-left p-3">
                    <div className="flex flex-col md:flex-row gap-3 md:justify-between">
                        <div className="w-full md:w-fit flex flex-col gap-2 text-center md:text-left">
                            <h2 className="font-bold text-xl">Type</h2>
                            <span className="text-sm">{project.type} Project</span>
                        </div>
                        <div className="w-full md:w-fit flex flex-col gap-2 text-center md:text-left">
                            <h2 className="font-bold text-xl">Timeline</h2>
                            <span className="text-sm">{formatDate(project.dateStart)} - {project.dateEnd ? formatDate(project.dateEnd) : "Present"}</span>
                        </div>
                    </div>
                    
                </div>
            </div>
            <div className="justify-center flex flex-col md:flex-row gap-3">
                {
                    project.links.map((link) => (
                        <a key={link.name} href={link.url} target="_blank" className="p-2 w-fit gap-2 mx-auto md:mx-0 flex items-center rounded-md bg-green-800 text-white hover:scale-105 duration-300 hover:bg-green-600">
                            {link.name} <FaExternalLinkAlt />
                        </a>
                    ))
                }
            </div>
        </div>
    );
}