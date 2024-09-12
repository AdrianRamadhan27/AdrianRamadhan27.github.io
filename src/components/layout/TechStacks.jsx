import TechCard from "../ui/TechCard";
export function TechStacks() {
    return (
        <div className="bg-opacity-75 dark:bg-opacity-75 rounded-md shadow-lg p-3 flex flex-col bg-white dark:bg-black text-black dark:text-white gap-3 m-16 h-fit">
            <h1 className="text-2xl font-bold text-center">My Expertise</h1>
            <div className="grid grid-rows-4 md:grid-rows-1 md:grid-cols-4">
                <div className="flex flex-col gap-2 md:border-r-2 border-dashed px-2 py-2 md:py-0">
                    <h2 className="text-lg max-w-64 truncate">Programming Languages</h2>
                    <div className="grid grid-cols-2 grid-rows-2 gap-2">
                        <TechCard name="python"/>
                        <TechCard name="java"/>
                        <TechCard name="javascript"/>
                        <TechCard name="dart"/>
                    </div>
                </div>
                <div className="flex flex-col gap-2 md:border-r-2 border-dashed px-2 py-2 md:py-0">
                    <h2 className="text-lg max-w-64 truncate">Front-End</h2>
                    <div className="grid grid-cols-2 grid-rows-2 gap-2">
                        <TechCard name="vue"/>
                        <TechCard name="react"/>
                        <TechCard name="flutter"/>
                        <TechCard name="tailwind"/>
                    </div>
                </div>
                <div className="flex flex-col gap-2 md:border-r-2 border-dashed px-2 py-2 md:py-0">
                    <h2 className="text-lg max-w-64 truncate">Back-End</h2>
                    <div className="grid grid-cols-2 grid-rows-2 gap-2">
                        <TechCard name="django"/>
                        <TechCard name="fastapi"/>
                        <TechCard name="springboot"/>
                        <TechCard name="postgres"/>
                    </div>
                </div>
                <div className="flex flex-col gap-2 px-2 py-2 md:py-0">
                    <h2 className="text-lg max-w-64 truncate">Machine Learning</h2>
                    <div className="grid grid-cols-2 grid-rows-2 gap-2">
                        <TechCard name="sklearn"/>
                        <TechCard name="keras"/>
                        <TechCard name="tensorflow"/>
                        <TechCard name="pytorch"/>
                    </div>
                </div>
            </div>
        </div>
    );
}