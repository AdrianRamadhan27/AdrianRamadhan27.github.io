import React from "react";
import AllProjects from "../components/layout/AllProjects";

const ProjectsPage = () => {
	return (
		<div className="h-full overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900">
			<AllProjects text="Projects I've Done"/>
		</div>

	);
};

export default ProjectsPage;