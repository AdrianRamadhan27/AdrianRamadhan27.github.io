import React from "react";
import TechStacks from "../components/layout/TechStacks";

const AboutPage = () => {
	return (
        <div className="h-screen overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900">
			<TechStacks />

		</div>
	);
};

export default AboutPage;