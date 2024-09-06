import React, { useState } from 'react';
import { AiOutlineClose, AiOutlineMenu } from 'react-icons/ai';
import { Link, useLocation } from "react-router-dom";
import { useTheme } from '../context/ThemeContext';
import { GiSkullCrossedBones } from "react-icons/gi";

const Navbar = () => {
  // State to manage the navbar's visibility
  const [nav, setNav] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Toggle function to handle the navbar's display
  const handleNav = () => {
    setNav(!nav);
  };

  // Array containing navigation items
  const navItems = [
    { id: 1, text: 'About', path: '/about'},
    { id: 2, text: 'Projects', path: '/projects'},
    { id: 3, text: 'Contact', path: '/contact' },
  ];

  return (
    <div className='bg-green-600 dark:bg-black flex justify-between items-center h-24 mx-auto px-4 text-black dark:text-white '>
      {/* Logo */}
      <Link to="/">
      <h1 className='w-full text-3xl font-bold text-white dark:text-[#00df9a] flex gap-3'><GiSkullCrossedBones />Raden Mohamad Adrian</h1>
      </Link>

      {/* Desktop Navigation */}
      <div className="flex items-center">
        <ul className='hidden md:flex'>
          {navItems.map(item => (
              <Link to={item.path}>
              <li
                  key={item.id}
                  className={`p-4 hover:bg-black dark:hover:bg-[#00df9a] rounded-xl m-2 cursor-pointer duration-300 hover:text-white dark:hover:text-black 
                    ${location.pathname === item.path && 'bg-black dark:bg-[#00df9a] text-white dark:text-black'}
                  `}
              >
                  {item.text}
              </li>
              </Link>
            
          ))}

        </ul>
        <button
          onClick={toggleTheme}
          className="h-fit p-2 bg-green-400 hover:bg-green-700 dark:bg-gray-900 dark:hover:bg-green-950 text-black dark:text-white rounded"
        >
          {theme === "light" ? "☀️" : "🌙"}
        </button>
        {/* Mobile Navigation Icon */}
        <div onClick={handleNav} className='block md:hidden ml-3'>
          {nav ? <AiOutlineClose size={20} /> : <AiOutlineMenu size={20} />}
        </div>
      </div>






      {/* Mobile Navigation Menu */}
      <ul
        className={
          nav
            ? 'fixed md:hidden left-0 top-0 w-[60%] h-full border-r dark:border-r-gray-900 bg-green-500 dark:bg-[#000300] ease-in-out duration-500 z-50'
            : 'ease-in-out w-[60%] duration-500 fixed top-0 bottom-0 left-[-100%]'
        }
      >
        {/* Mobile Logo */}
        <Link to="/">
        <h1 className='w-full text-3xl font-bold dark:text-[#00df9a] text-white m-4 flex gap-3'><GiSkullCrossedBones />Raden Mohamad Adrian</h1>
        </Link>
        {/* Mobile Navigation Items */}
        {navItems.map(item => (
          <Link to={item.path}>
          <li
            key={item.id}
            className={`p-4 border-b rounded-xl hover:bg-black dark:hover:bg-[#00df9a] duration-300 hover:text-white dark:hover:text-black cursor-pointer border-gray-600
              ${location.pathname === item.path && 'bg-black dark:bg-[#00df9a] text-white dark:text-black'}
            `}
          >
            {item.text}
          </li>
          </Link>
        ))}
      </ul>
    </div>
  );
};

export default Navbar;