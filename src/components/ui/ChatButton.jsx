import React, { useState } from 'react';
import { FaRobot } from "react-icons/fa";
import ChatModal from '../layout/ChatModal';

const ChatButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      {/* Sticky Button */}
      <button
        onClick={openModal}
        className="group fixed bottom-4 right-4 bg-green-800 hover:bg-green-600 dark:bg-primary dark:hover:bg-primary-hover text-white p-3 rounded-full shadow-lg hover:scale-105 duration-300 transition-colors flex gap-2 items-center bg-opacity-80 dark:bg-opacity-80"
      >
        Ask My AI
        <FaRobot className="group-hover:animate-bounce duration-300"/>
      </button>

      {/* Modal Component */}
      {isModalOpen && <ChatModal onClose={closeModal} />}
    </>
  );
};

export default ChatButton;
