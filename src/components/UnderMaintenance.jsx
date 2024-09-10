import React from "react";
import { FaScrewdriverWrench } from "react-icons/fa6";

const UnderMaintanance = () => {
	return (
        <section className="bg-white dark:bg-gray-900 h-screen overflow-y-auto">
            <div className="py-8 px-4 mx-auto max-w-screen text-center lg:py-64 lg:px-12 animate-bounce">
                <FaScrewdriverWrench className="mx-auto mb-4 w-10 h-10 text-gray-400"/>
                <h1 className="mb-4 text-4xl font-bold tracking-tight leading-none text-gray-900 lg:mb-6 md:text-5xl xl:text-6xl dark:text-white">Under Maintenance</h1>
                <p className="font-light text-gray-500 md:text-lg xl:text-xl dark:text-gray-400">Still working on it...</p>
            </div>
        </section>
	);
};

export default UnderMaintanance;