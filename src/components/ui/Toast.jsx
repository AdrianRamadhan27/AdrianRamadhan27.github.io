import ReactDOM from 'react-dom';
import { IoClose } from 'react-icons/io5';
import { useEffect, useState } from 'react';
export default function Toast({ message, onClose }) {
    const [progress, setProgress] = useState(0);
    const duration = 5000;

    useEffect(() => {
        const interval = 100; // Update the progress every 100ms
        const increment = 100 / (duration / interval); // Calculate the increment for the progress bar

        const timer = setInterval(() => {
        setProgress((prev) => {
            const newProgress = prev + increment;
            if (newProgress >= 100) {
            clearInterval(timer);
            onClose();
            }
            return newProgress;
        });
        }, interval);

        return () => clearInterval(timer); // Cleanup the timer
    }, [duration, onClose]);

    return ReactDOM.createPortal(
        <div className="fixed font-grotesk bottom-5 left-5 bg-green-900 dark:bg-green-500 bg-opacity-80 dark:bg-opacity-80 text-white shadow-lg animate-fade-in-out z-50 flex items-center">
            <div className="p-2">
                {message}
            </div>
            <button onClick={onClose} className="p-2 ">
                <IoClose />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-green-900 dark:bg-green-500 w-full">
                <div
                style={{ width: `${progress}%` }}
                className="h-full bg-white transition-all duration-100"
                ></div>
            </div>
        </div>
    , document.body);
};