import { useNavigate } from "react-router-dom";
import TechCard from "../ui/TechCard";
import { BsThreeDots } from "react-icons/bs";
export default function TechStacks({viewMore}) {
    const navigate = useNavigate();
    return (
        <div className="bg-opacity-75 dark:bg-opacity-75 rounded-md shadow-lg p-5 flex flex-col bg-white dark:bg-black text-black dark:text-white gap-3 m-10 md:m-16 h-fit md:hover:scale-105 duration-300">
            <h1 className="text-2xl font-bold text-center">Technologies I've Used</h1>
            <div className="md:grid md:grid-rows-1 md:grid-cols-3 gap-10 mb-5">
                <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg truncate text-center md:text-left">Programming Languages</h2>
                    <div className="text-md flex flex-wrap gap-2 justify-center md:justify-normal">
                        <TechCard name="Python"/>
                        <TechCard name="Java"/>
                        <TechCard name="JavaScript"/>
                        <TechCard name="Dart"/>
                        <TechCard name="SWI-Prolog"/>
                    </div>
                </div>
                <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg truncate text-center md:text-left">Front-End</h2>
                    <div className="text-md flex flex-wrap gap-2 justify-center md:justify-normal">
                        <TechCard name="Vue.js"/>
                        <TechCard name="React.js"/>
                        <TechCard name="Flutter"/>
                        <TechCard name="Tailwind CSS"/>
                        <TechCard name="jQuery"/>
                    </div>
                </div>
                <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg truncate text-center md:text-left">Back-End</h2>
                    <div className="text-md flex flex-wrap gap-2 justify-center md:justify-normal">
                        <TechCard name="django"/>
                        <TechCard name="fastapi"/>
                        <TechCard name="SpringBoot"/>
                        <TechCard name="Postgres"/>
                    </div>
                </div>

                {!viewMore && <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg truncate text-center md:text-left">Machine Learning</h2>
                    <div className="text-md flex flex-wrap gap-2 justify-center md:justify-normal">
                        <TechCard name="pandas"/>
                        <TechCard name="numpy"/>
                        <TechCard name="matplotlib"/>
                        <TechCard name="scikit-learn"/>
                        <TechCard name="keras"/>
                        <TechCard name="tensorflow"/>
                        <TechCard name="pytorch"/>
                    </div>
                </div> }
                {!viewMore && <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg truncate text-center md:text-left">Cloud</h2>
                    <div className="text-md flex flex-wrap gap-2 justify-center md:justify-normal">
                        <TechCard name="GCP"/>
                        <TechCard name="AWS"/>
                        <TechCard name="Github-pages"/>
                        <TechCard name="Vercel"/>
                        <TechCard name="Railway"/>
                        <TechCard name="Supabase"/>
                    </div>
                </div> }
                {!viewMore && <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg truncate text-center md:text-left">Others</h2>
                    <div className="text-md flex flex-wrap gap-2 justify-center md:justify-normal">
                        <TechCard name="Docker"/>
                        <TechCard name="GPT"/>
                        <TechCard name="LLaMa"/>
                        <TechCard name="Figma"/>
                        <TechCard name="Kali Linux"/>
                        <TechCard name="Sonarqube"/>
                        <TechCard name="Flame"/>
                    </div>
                </div> }
            </div>
            {
                viewMore &&
                <button
                    onClick={() => navigate("/skills")}
                    className="m-auto flex items-center gap-2 border-2 hover:border-green-700 hover:text-green-700 border-primary p-2 text-primary rounded-md duration-300 w-fit"
                >
                    <BsThreeDots />
                    View More
                </button>

            }
        </div>
    );
}