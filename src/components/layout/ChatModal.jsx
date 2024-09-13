import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { IoClose } from 'react-icons/io5';
import { TypeAnimation } from 'react-type-animation';
import getGroqChatCompletion from '../../utils/groqChat';
const ChatModal = ({ onClose }) => {
  const [question, setQuestion] = useState(''); // Store the input
  const [answer, setAnswer] = useState("Hello! Ask anything about me and I will respond immediately"); // Store the answer
  const [loading, setLoading] = useState(false); // Loading state
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAnswer(''); // Clear previous answer

    try {
      const response = await getGroqChatCompletion(question);
      setAnswer(response); // Set the response as the answer
    } catch (error) {
      setAnswer('Sorry, there was an error getting the answer.');
      console.error('Error fetching answer:', error);
    }

    setLoading(false);
    setQuestion(''); // Clear input field
  };



  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 font-grotesk"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-black p-4 rounded-lg shadow-lg w-10/12"
        onClick={(e) => e.stopPropagation()} // Prevents closing modal when clicking inside it
      >
        <div className="w-full text-right">
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded"
            onClick={() => onClose(false)}
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-2 text-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-black dark:text-white ">
            AdrianRamadhan27.AI
          </h2>
          <p className="text-gray-600">Powered by <a href="https://huggingface.co/meta-llama/Meta-Llama-3-70B" target="_blank" className='underline underline-offset-2 hover:underline-offset-4 duration-300'>LLaMa 3-70B</a></p>
        </div>




        <form id="chat-form" onSubmit={handleSubmit}>
          <div className="flex gap-3 items-center text-xs md:text-md">
            <input
              type="text"
              name="question"
              className="w-full p-2 rounded-md bg-green-950 dark:bg-white text-white dark:text-black"
              placeholder="What is your favourite anime?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)} // Update state on input change
              required
            />
            <button type="submit" className="bg-green-700 hover:bg-green-500 hover:scale-105 duration-300 p-2 rounded-md text-white">
              Ask
            </button>
          </div>
        </form>

        <div id="answer" className="text-primary text-sm md:text-md border-2 border-primary border-dashed mt-4 bg-white dark:bg-black rounded-md p-2 overflow-clip font-mono max-h-screen">
          <div className="flex justify-center">
            <img src={import.meta.env.BASE_URL+"skullcode2.svg"} alt="" className="h-20 w-20 animate-pulse"/>
          </div>
        {loading ? (
          <div>&gt; Thinking the answer...</div>
        ) : (
            <TypeAnimation 
                sequence={[
                    '>',
                    250, 
                    "> "+answer,
                    , 
                ]}
                wrapper="span"
                cursor={true}
                repeat={0}

            
            />
        )}
        </div>

      </div>
    </div>,
    document.body // Render the modal to the body element
  );
};

export default ChatModal;
