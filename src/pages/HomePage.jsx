// source: https://github.com/tailwindtoolbox/Profile-Card
import { useState } from "react";
import { FaBriefcase, FaMedium } from "react-icons/fa";
import { TbFileCv } from "react-icons/tb";
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa6";
import { SiHuggingface } from "react-icons/si";

import { TypeAnimation } from 'react-type-animation';
import TechStacks from "../components/layout/TechStacks";
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';
import Contact from "../components/layout/Contact";
import PDFViewer from "../components/layout/PDFViewer";


const HomePage = () => {
	const [shown, setShown] = useState(false);

	return (
        <div className="h-full overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900 ">

        
			<div className="max-w-4xl  flex items-center h-full  flex-wrap mx-auto mt-10">
					<div id="profile" className="mt-5 lg:mt-0 transform transition duration-500 lg:hover:scale-110 hover:scale-105 w-full lg:w-3/5 rounded-lg  shadow-2xl bg-white dark:bg-black bg-opacity-75 dark:bg-opacity-75 mx-6 lg:mx-0">
				

						<div className="p-4 md:p-12 text-center lg:text-left">
							<div className="block lg:hidden rounded-full mx-auto -mt-16 h-48 w-48 bg-cover bg-center hidden-profile-pic opacity-100"></div>
							
							<h1 className="dark:text-white text-2xl md:text-3xl font-bold pt-8 lg:pt-0">Raden Mohamad Adrian</h1>
							<div className="mx-auto lg:mx-0 w-4/5 pt-3 border-b-2 border-green-500 opacity-25"></div>
							<p className="dark:text-white pt-4 text-base font-bold flex my-auto justify-center lg:justify-start gap-3">
								<FaBriefcase className="my-auto h-5 text-green-700 hidden md:block" />
								<TypeAnimation 
									sequence={[
										'AI Engineer',
										1000, 
										'AI Engineer, Data Scientist',
										1000, 
										'AI Engineer, Data Scientist, Full-Stack Developer',
										5000
									]}
									wrapper="span"
									cursor={true}
									repeat={Infinity}

								
								/>
							</p>
							<p className="dark:text-white pt-8 text-xs md:text-sm">I am a 7th-semester Computer Science student at the University of Indonesia. I have a deep passion for Artificial Intelligence
				and Data Science. I also have strong skills in front-end and back-end development, mobile development, and have dabbled in
				cybersecurity.</p>

							<div className="pt-12 pb-8">

									<button onClick={() => setShown(true)} className="items-center m-auto lg:m-0 bg-green-700 duration-300 hover:bg-green-900 hover:scale-105 text-white font-bold py-2 px-4 rounded-full flex">
									View My Resume <TbFileCv className="ml-2"/>
									</button> 

								
							</div>

							<div className="mt-6 pb-10 lg:pb-0 justify-center lg:justify-start lg:w-full mx-auto flex flex-wrap items-center gap-10">
								<a className="link" href="https://www.instagram.com/adrian_voiz/" target="_blank" data-tippy-content="@instagram_handle"><FaInstagram className="h-6 w-6 md:h-8 md:w-8 fill-current text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400"/></a>
								<a className="link" href="https://www.linkedin.com/in/adrian-voiz/" target="_blank" data-tippy-content="@linkedin_handle"><FaLinkedin className="h-6 w-6 md:h-8 md:w-8 fill-current text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400"/></a>
								<a className="link" href="https://medium.com/@ramadhanadrian2710" target="_blank" data-tippy-content="@medium_handle"><FaMedium className="h-6 w-6 md:h-8 md:w-8 fill-current text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400"/></a>
								<a className="link" href="https://github.com/AdrianRamadhan27" target="_blank" data-tippy-content="@github_handle"><FaGithub className="h-6 w-6 md:h-8 md:w-8 fill-current text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400"/></a>
								<a className="link" href="https://huggingface.co/raden-mohamad11" target="_blank" data-tippy-content="@huggingface_handle"><SiHuggingface className="h-6 w-6 md:h-8 md:w-8 fill-current text-gray-600 dark:text-gray-400 hover:text-green-700 dark:hover:text-green-400"/></a>
							</div>
							

						</div>

				</div>
				
				<div id="profilepic" className="w-full lg:w-2/5">
					<img src={import.meta.env.BASE_URL+"images/profile.jpg"} className="transform transition duration-500 hover:scale-110 rounded-none lg:rounded-lg shadow-2xl hidden lg:block "/>
				</div>
				{shown && <PDFViewer onClose={setShown}/>}
				
									
			</div>
			<TechStacks />

			<Contact />
			
		</div>
	);
};

export default HomePage;