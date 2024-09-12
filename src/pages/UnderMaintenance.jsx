import React from "react";
import { FaScrewdriverWrench } from "react-icons/fa6";

const UnderMaintanance = () => {
	return (
        <section className="bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900  h-screen overflow-y-auto">
            <div className="py-8 px-4 mx-auto max-w-screen text-center lg:py-64 lg:px-12">
                <FaScrewdriverWrench className="mx-auto mb-4 w-10 h-10 text-gray-400 dark:text-white"/>
                <h1 className="mb-4 text-4xl font-bold tracking-tight leading-none text-gray-900 lg:mb-6 md:text-5xl xl:text-6xl dark:text-white">Under Maintenance</h1>
                <p className="font-light text-gray-500 dark:text-white md:text-lg xl:text-xl">Still working on it...</p>
            </div>
        </section>
	);
};

export default UnderMaintanance;