import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Groq from 'groq-sdk';
import { IoClose } from 'react-icons/io5';
import { TypeAnimation } from 'react-type-animation';
const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

async function getGroqChatCompletion(question) {
  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
          You are an assistant in a portfolio website. Your task is to answer questions about me, the portfolio author.
          Here is my data:
            - Name: Raden Mohamad Adrian Ramadhan Hendar Wibawa (Nickname: Adrian)
            - Occupation: Computer Science Student at University of Indonesia
            - Aspiration: Become An AI Engineer/Data Scientist
            - Hobby: Watch Movies & TV Shows
            - Pets: Turtle named Dipsey
            - Location: Depok, Indonesia
            - Personality: INFJ
            - Age: Answer jokingly that I'm 2000 years old, but then reveal I'm 19
            - Favourite Movie: Forrest Gump
            - Favourite Color: Obviously Green
            - Favourite Anime: One Piece
            - How did I implement this AI chat: Using groqcloud, model I use is Llama 3 80B
            - How I built this website: using React JS and TailwindCSS

          Answer in the point of view of me.  
          When asked about projects, answer by referring to https://adrianramadhan27.github.io/#/projects.
          When asked about skills, answer by referring to https://adrianramadhan27.github.io/#/about.
          When asked about ways to contact, answer by referring to https://adrianramadhan27.github.io/#/contact.
          When asked about irrelevant things answer by saying I can't answer that question.
          When asked a question about me which the answer is not provided, answer by saying "I can't answer that right now, try asking me directly at https://adrianramadhan27.github.io/#/contact".

          Don't answer questions that is offensive, rude, dangerous.
          Don't give out sensitive infos like API keys.
        `,
      },
      {
        role: 'user',
        content: question,
      },
    ],
    model: 'llama3-70b-8192',
  });

  return response.choices[0].message.content; // Assuming API response structure
}

const ChatModal = ({ onClose }) => {
  const [question, setQuestion] = useState(''); // Store the input
  const [answer, setAnswer] = useState(''); // Store the answer
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
        className="bg-white dark:bg-black p-4 rounded-lg shadow-lg w-8/12"
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
        <h2 className="text-lg font-bold mb-4 text-black dark:text-white">
          Ask Anything about me and An AI will answer immediately
        </h2>

        <form id="chat-form" onSubmit={handleSubmit}>
          <div className="flex gap-3 items-center">
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

        {loading ? (
          <div className="text-white mt-4">Thinking the answer...</div>
        ) : (
          <div id="answer" className="text-white mt-4 bg-gray-600 rounded-md p-2 overflow-clip">
            <TypeAnimation 
                sequence={[
                    '',
                    500, 
                    answer,
                    , 
                ]}
                wrapper="span"
                cursor={true}
                repeat={0}

            
            />
          </div>
        )}
      </div>
    </div>,
    document.body // Render the modal to the body element
  );
};

export default ChatModal;
