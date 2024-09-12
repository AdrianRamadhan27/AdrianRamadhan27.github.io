import React from "react";
import { GiSkullCrossedBones } from 'react-icons/gi';

const Loading = () => {
	return (
        <div className="h-screen overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900 ">
			
            <div 
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
            >
                <GiSkullCrossedBones className="text-gray-600 dark:text-white  text-8xl animate-spin" />
            </div>
		</div>
	);
};

export default Loading;