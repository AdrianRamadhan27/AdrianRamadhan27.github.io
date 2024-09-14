import { useNavigate, useParams } from "react-router-dom";
import projectsData from "../data/projectsData";
import ProjectDetail from "../components/layout/ProjectDetail";
import { FaArrowLeft } from "react-icons/fa";

export default function ProjectDetailPage() {
    const { projectId } = useParams();
    const project = projectsData.find((project) => project.id === parseInt(projectId));
    const navigate = useNavigate();
    return (
		<div className="h-full overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900">
            <button onClick={()=>{navigate(-1)}} className="p-3 text-green-700 dark:text-black hover:bg-slate-200 dark:hover:bg-green-400 rounded-full">
                <FaArrowLeft className="h-5 w-5"/>
            </button>
            <ProjectDetail project={project}/>
        </div>
    );
}