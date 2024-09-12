import { techStacks } from "../../utils/techStack";
import { useState, useEffect } from "react";

export default function TechCard({name}) {
    const [Icon, setIcon] = useState(null);
    useEffect(() => {
        // Randomly select a color from the list
        const techIcon = techStacks[name];
        setIcon(() => techIcon);
      }, []);



    return (
        <button className="cursor-pointer rounded-lg p-2 flex gap-2 items-center hover:shadow-xl overflow-clip bg-green-400 dark:bg-green-600 w-full text-white font-bold hover:scale-105 hover:bg-gradient-to-t hover:from-green-300 hover:via-green-400 hover:to-green-500 dark:hover:from-green-500 dark:hover:via-green-700 dark:hover:to-green-900 transition-all duration-300 ease-in-out">
            {Icon && <Icon />}
            <p>{name}</p>
        </button>
    );
}