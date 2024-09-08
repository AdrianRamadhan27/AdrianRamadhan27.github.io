// source: https://github.com/tailwindtoolbox/Profile-Card
import React from "react";
import { FaFileDownload, FaBriefcase } from "react-icons/fa";

const Home = () => {
	return (
        <div className="bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900 ">

        
        <div className="max-w-4xl flex items-center h-screen  flex-wrap mx-auto lg:my-0">
    	<div id="profile" className="mt-5 lg:mt-0 transform transition duration-500 lg:hover:scale-125 hover:scale-105 w-full lg:w-3/5 rounded-lg  shadow-2xl bg-white dark:bg-black opacity-75 mx-6 lg:mx-0">
	

		<div className="p-4 md:p-12 text-center lg:text-left">
			<div className="block lg:hidden rounded-full mx-auto -mt-16 h-48 w-48 bg-cover bg-center hidden-profile-pic opacity-100"></div>
			
			<h1 className="dark:text-white text-3xl font-bold pt-8 lg:pt-0">Raden Mohamad Adrian</h1>
			<div className="mx-auto lg:mx-0 w-4/5 pt-3 border-b-2 border-green-500 opacity-25"></div>
			<p className="dark:text-white pt-4 text-base font-bold flex my-auto justify-center lg:justify-start"><FaBriefcase className="my-auto h-5 text-green-700 mr-3" />AI Engineer, Data Scientist, Full-Stack Developer</p>
			<p className="dark:text-white pt-8 text-sm">I am a 7th-semester Computer Science student at the University of Indonesia. I have a deep passion for Artificial Intelligence
and Data Science. I also have strong skills in front-end and back-end development, mobile development, and have dabbled in
cybersecurity.</p>

			<div className="pt-12 pb-8">
				<a href="files/MyCV.pdf" download>
					<button className="items-center m-auto lg:m-0 bg-green-700 hover:bg-green-900 text-white font-bold py-2 px-4 rounded-full flex">
					Download CV <FaFileDownload className="ml-2"/>
					</button> 
				</a>
				
			</div>

			<div className="mt-6 pb-16 lg:pb-0 justify-center lg:justify-start lg:w-full mx-auto flex flex-wrap items-center gap-10">
				<a className="link" href="https://github.com/AdrianRamadhan27" target="_blank" data-tippy-content="@github_handle"><svg className="h-6 fill-current text-gray-600 hover:text-green-700" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a>
				<a className="link" href="https://www.linkedin.com/in/adrian-voiz/" target="_blank" data-tippy-content="@github_handle"><svg className="h-6 fill-current text-gray-600 hover:text-green-700" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LinkedIn</title><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>
            </div>
			

		</div>

	</div>
	
	<div className="w-full lg:w-2/5">
		<img src={import.meta.env.BASE_URL+"images/profile.jpg"} className="transform transition duration-500 hover:scale-125 rounded-none lg:rounded-lg shadow-2xl hidden lg:block "/>
	</div>
	

</div>
</div>
	);
};

export default Home;