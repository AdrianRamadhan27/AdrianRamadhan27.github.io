// source: https://github.com/tailwindtoolbox/Profile-Card
import {useState} from "react";
import { FaDownload, FaBriefcase, FaMedium } from "react-icons/fa";
import { TbFileCv } from "react-icons/tb";
import { IoClose } from "react-icons/io5";
import { FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa6";
import { SiHuggingface } from "react-icons/si";

import { TypeAnimation } from 'react-type-animation';

import ReactDOM from 'react-dom';

import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';


const Home = () => {
	const [shown, setShown] = useState(false);
	const toolbarPluginInstance = toolbarPlugin();
	const { Toolbar } = toolbarPluginInstance;
	const pdfViewer = () => (
		<div
			className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 font-grotesk"
		>
			{/* Modal content */}
			<div className="bg-white w-full max-w-4xl h-full max-h-[80vh] flex flex-col shadow-lg rounded-lg overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between dark:bg-black dark:text-white bg-white text-green-800 p-2">
					<div className="flex gap-2 items-center">
						<div className="font-semibold">MyCV.pdf</div>

						<a href="files/MyCV.pdf" download>
							<button
									className="bg-green-600 hover:bg-green-700 text-white px-2 rounded flex items-center gap-2"
								>
									Download <FaDownload className="h-3 w-3"/>
							</button>
						</a>

	
					</div>
					<button
						className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded"
						onClick={() => setShown(false)}
					>
						<IoClose className="h-5 w-5"/>
					</button>

				</div>
	
				{/* PDF viewer */}
				<div className="flex-grow overflow-auto">
					<Toolbar />
					<Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
						<Viewer fileUrl="files/MyCV.pdf" plugins={[toolbarPluginInstance]}/>
					</Worker>
				</div>
			</div>
		</div>
	);

	return (
        <div className="h-screen overflow-y-auto bg-gradient-to-r from-white via-green-200 to-green-400 dark:bg-gradient-to-r dark:from-green-300 dark:via-green-600 dark:to-green-900 ">

        
			<div className="max-w-4xl flex items-center h-full  flex-wrap mx-auto lg:my-0">
					<div id="profile" className="mt-5 lg:mt-0 transform transition duration-500 lg:hover:scale-125 hover:scale-105 w-full lg:w-3/5 rounded-lg  shadow-2xl bg-white dark:bg-black bg-opacity-75 dark:bg-opacity-75 mx-6 lg:mx-0">
				

						<div className="p-4 md:p-12 text-center lg:text-left">
							<div className="block lg:hidden rounded-full mx-auto -mt-16 h-48 w-48 bg-cover bg-center hidden-profile-pic opacity-100"></div>
							
							<h1 className="dark:text-white text-3xl font-bold pt-8 lg:pt-0">Raden Mohamad Adrian</h1>
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
							<p className="dark:text-white pt-8 text-sm">I am a 7th-semester Computer Science student at the University of Indonesia. I have a deep passion for Artificial Intelligence
				and Data Science. I also have strong skills in front-end and back-end development, mobile development, and have dabbled in
				cybersecurity.</p>

							<div className="pt-12 pb-8">

									<button onClick={() => setShown(true)} className="items-center m-auto lg:m-0 bg-green-700 duration-300 hover:bg-green-900 hover:scale-105 text-white font-bold py-2 px-4 rounded-full flex">
									View My Resume <TbFileCv className="ml-2"/>
									</button> 

								
							</div>

							<div className="mt-6 pb-16 lg:pb-0 justify-center lg:justify-start lg:w-full mx-auto flex flex-wrap items-center gap-10">
								<a className="link" href="https://www.instagram.com/adrian_voiz/" target="_blank" data-tippy-content="@instagram_handle"><FaInstagram className="h-8 w-8 fill-current text-gray-600 hover:text-green-700"/></a>
								<a className="link" href="https://www.linkedin.com/in/adrian-voiz/" target="_blank" data-tippy-content="@linkedin_handle"><FaLinkedin className="h-8 w-8 fill-current text-gray-600 hover:text-green-700"/></a>
								<a className="link" href="https://medium.com/@ramadhanadrian2710" target="_blank" data-tippy-content="@medium_handle"><FaMedium className="h-8 w-8 fill-current text-gray-600 hover:text-green-700"/></a>
								<a className="link" href="https://github.com/AdrianRamadhan27" target="_blank" data-tippy-content="@github_handle"><FaGithub className="h-8 w-8 fill-current text-gray-600 hover:text-green-700"/></a>
								<a className="link" href="https://huggingface.co/raden-mohamad11" target="_blank" data-tippy-content="@huggingface_handle"><SiHuggingface className="h-8 w-8 fill-current text-gray-600 hover:text-green-700"/></a>
							</div>
							

						</div>

				</div>
				
				<div id="profilepic" className="w-full lg:w-2/5">
					<img src={import.meta.env.BASE_URL+"images/profile.jpg"} className="transform transition duration-500 hover:scale-125 rounded-none lg:rounded-lg shadow-2xl hidden lg:block "/>
				</div>
				{shown && ReactDOM.createPortal(pdfViewer(), document.body)}
				

			</div>
		</div>
	);
};

export default Home;