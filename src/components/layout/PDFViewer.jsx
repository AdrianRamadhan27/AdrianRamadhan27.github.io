import React from 'react';
import ReactDOM from 'react-dom';
import { Worker } from "@react-pdf-viewer/core";
import { Viewer } from "@react-pdf-viewer/core";
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';
import { FaDownload } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

const PDFViewer = ({ onClose }) => {
    const toolbarPluginInstance = toolbarPlugin();
    const { Toolbar } = toolbarPluginInstance;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60 font-grotesk"
            onClick={onClose}
        >
            {/* Modal content */}
            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-4xl h-full max-h-[80vh] flex flex-col shadow-lg rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between dark:bg-black dark:text-white bg-white text-green-800 p-2">
                    <div className="flex gap-2 items-center">
                        <div className="font-semibold">Updated: 13-08-24</div>

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
                        onClick={() => onClose(false)}
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
        </div>,
        document.body // Render the modal to the body element
    );
};

export default PDFViewer;