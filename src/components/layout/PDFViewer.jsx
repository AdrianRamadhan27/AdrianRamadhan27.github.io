import React from 'react';
import ReactDOM from 'react-dom';
import { FaDownload } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

const file_id = import.meta.env.VITE_CV_FILE_ID;
const PDFViewer = ({ onClose }) => {

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
                        <div className="font-semibold">MyCV.pdf</div>

                        <a href={`https://drive.google.com/uc?export=download&id=${file_id}`}>
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
                <iframe src={`https://drive.google.com/file/d/${file_id}/preview`} className="w-full h-full" allow="autoplay"></iframe>                
                </div>
            </div>
        </div>,
        document.body // Render the modal to the body element
    );
};

export default PDFViewer;