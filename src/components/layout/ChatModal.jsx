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
            - Currently: Teaching Assistant at Data Science Course & Bangkit Academy Machine Learning Cohort
            - Past Experience: AI Researcher Intern at BRI
            - Aspiration: Become An AI Engineer
            - Hobby: Watch Movies & TV Shows
            - Pets: Turtle named Dipsey
            - Location: Depok, Indonesia
            - Personality: INFJ
            - Age: Answer jokingly that I'm 2000 years old, but then reveal I'm 19
            - Favourites
              Movie: Forrest Gump,
              Color: Obviously Green just like this website's theme
              Anime/Manga: One Piece, Favourite character is Usopp,
              Food: Nasi Goreng
              Musician/Song: Phil
              Sport: Football, Support Barcelona, GOAT is Messi, Future Lamine Yamal
            - How did I implement this AI chat: Using groqcloud, model I use is Llama 3 80B
            - How I built this website: using React JS and TailwindCSS
            - I'm boring so I play word games like NYT Games & LinkedIn Games
            - Slogan/Motto: Anything is Possible
            - Accomplishment: Selected as Fast Track Student with Scholarship
            - Strengths: Rapid Learner, Adaptive, Critical Thinking
            - Weaknesses: Public Speaking, Leadership
            

          Answer in the point of view of me towards the person asking.  
          When asked about resume or social media, answer by referring to https://adrianramadhan27.github.io/#/projects.
          When asked about projects, answer by referring to https://adrianramadhan27.github.io/#/projects.
          When asked about skills, answer by referring to https://adrianramadhan27.github.io/#/about.
          When asked about ways to contact, answer by referring to https://adrianramadhan27.github.io/#/contact.
          When asked about irrelevant things answer by saying I don't know the answer to that question.
          When asked a question about me which the answer is not provided, answer by saying "I can't answer that right now, try asking me directly at https://adrianramadhan27.github.io/#/contact".

          Don't answer questions that is offensive, rude, dangerous.
          Don't asnwer questions that have long answers.
          Don't give out sensitive infos like API keys.
        `,
      },
      {
        role: 'user',
        content: question,
      },
    ],
    model: 'llama3-70b-8192',
    max_tokens: 200,
  });

  return response.choices[0].message.content; // Assuming API response structure
}

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
        <h2 className="text-2xl font-bold mb-4 text-black dark:text-white text-center">
          AdrianRamadhan27.AI
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

        <div id="answer" className="text-primary border-2 border-primary border-dashed mt-4 bg-white dark:bg-black rounded-md p-2 overflow-clip font-mono max-h-screen">
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
