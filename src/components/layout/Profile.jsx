// source: https://github.com/tailwindtoolbox/Profile-Card
import { useState } from "react";
import { FaMedium, FaGithub, FaLinkedin, FaInstagram } from "react-icons/fa6";
import { SiHuggingface } from "react-icons/si";
import { MdOutlineDocumentScanner } from "react-icons/md";
import { TypeAnimation } from 'react-type-animation';
import PDFViewer from "./PDFViewer";

export default function Profile() {
    const [shown, setShown] = useState(false);

    return (
        <div className="max-w-4xl  flex items-center h-full  flex-wrap mx-auto mt-10">
                <div id="profile" className="mt-5 lg:mt-0 transform transition duration-500 md:hover:scale-110  w-full lg:w-3/5 rounded-lg  shadow-2xl bg-white dark:bg-black bg-opacity-75 dark:bg-opacity-75 mx-6 lg:mx-0">
            

                    <div className="p-4 md:p-12 text-center lg:text-left">
                        <div className="block lg:hidden rounded-full mx-auto -mt-16 h-48 w-48 bg-cover bg-center hidden-profile-pic opacity-100"></div>
                        
                        <h1 className="dark:text-white text-3xl md:text-4xl font-bold pt-8 lg:pt-0 border-b-2 pb-3 border-green-500 border-opacity-25">Hello, I'm <span className="text-green-700">Adrian</span></h1>
                        <div className="dark:text-white pt-4 text-xl font-semibold flex my-auto justify-center lg:justify-start gap-3">
                            <div className="flex">
                                <span >I'm&nbsp;</span>
                                <TypeAnimation 
                                    sequence={[
                                        "an AI Engineer",
                                        1000, 
                                        "a Data Scientist",
                                        1000, 
                                        "a Full-Stack Developer",
                                        1000
                                    ]}
                                    wrapper="span"
                                    cursor={true}
                                    repeat={Infinity}

                                    className="text-green-700"
                                />
                            </div>
                            
                        </div>
                        <p className="dark:text-white pt-8 text-xs md:text-sm">I am a 7th-semester Computer Science student at the University of Indonesia. I have a deep passion for Artificial Intelligence
            and Data Science. I also have strong skills in front-end and back-end development, mobile development, and have dabbled in
            cybersecurity.</p>

                        <div className="pt-12 pb-8">

                                <button onClick={() => setShown(true)} className="items-center m-auto lg:m-0 bg-green-700 duration-300 hover:bg-green-900 hover:scale-105 text-white font-bold py-2 px-4 gap-2 rounded-full flex">
                                <MdOutlineDocumentScanner /> View My Resume 
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
    );
}