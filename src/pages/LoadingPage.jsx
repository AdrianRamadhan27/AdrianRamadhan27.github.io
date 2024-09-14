import React from "react";
import { GiSkullCrossedBones } from 'react-icons/gi';

const LoadingPage = () => {
	return (
        <div className="h-screen ">
			
            <div 
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
            >
                <GiSkullCrossedBones className="text-gray-600 dark:text-white  text-8xl animate-spin" />
            </div>
		</div>
	);
};

export default LoadingPage;