import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineClose, AiOutlineMenu } from 'react-icons/ai';
import { useLocation } from "react-router-dom";
import { GiSkullCrossedBones } from "react-icons/gi";
import ThemeToggle from '../ui/ThemeToggle';
const Navbar = ({onNavigate}) => {
  // State to manage the navbar's visibility
  const [nav, setNav] = useState(false);
  const location = useLocation();
  const navRef = useRef(); // Reference for sidebar

  // Toggle function to handle the navbar's display
  const handleNav = () => {
    setNav(!nav);
  };

  // Close sidebar if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setNav(false); // Close sidebar when clicking outside of it
      }
    };

    if (nav) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [nav]);

  // Array containing navigation items
  const navItems = [
    { id: 1, text: 'Home', path: '/' },
    { id: 2, text: 'About', path: '/about' },
    { id: 3, text: 'Projects', path: '/projects' },
    { id: 4, text: 'Contact', path: '/contact' },
  ];

  return (
    <div className='sticky top-0 z-40 bg-green-500 dark:bg-black flex justify-between items-center h-16 md:h-20  mx-auto px-4 text-black dark:text-white '>
      {/* Logo */}
      <button onClick={() => onNavigate('/')} className="">
        <h1 className='w-full md:text-2xl text-xl font-bold text-white dark:text-primary flex gap-3 items-center hover:scale-105 duration-500 group'>
          <GiSkullCrossedBones className="group-hover:animate-spin" />
          AdrianRamadhan27
        </h1>
      </button>

      <div className="flex items-center">


      
        {/* Desktop Navigation */}
        <ul className='items-center hidden md:flex justify-center mr-3'>
          {navItems.map(item => (
            <button onClick={() => onNavigate(item.path)} key={item.id}>
              <li className={`p-4 rounded-xl m-2 cursor-pointer underline text-white dark:text-primary underline-offset-8 duration-300 hover:underline-offset-2
                  ${location.pathname === item.path ? 'font-extrabold text-xl' : 'font-extralight text-md'}
                `}>
                {item.text}
              </li>
            </button>
          ))}
        </ul>

        {/* Theme toggle and burger icon */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Mobile Navigation Icon */}
          <div onClick={handleNav} className='block md:hidden text-white dark:text-primary'>
            {nav ? <AiOutlineClose size={20} className="cursor-pointer" /> : <AiOutlineMenu size={20} className="cursor-pointer" />}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <ul
        ref={navRef} // Reference to detect clicks outside
        className={
          nav
            ? 'fixed md:hidden left-0 top-0 w-[60%] h-full border-r dark:border-r-gray-900 bg-green-500 dark:bg-[#000300] ease-in-out duration-500 z-50 bg-opacity-75 dark:bg-opacity-75'
            : 'ease-in-out w-[60%] duration-500 fixed top-0 bottom-0 left-[-100%]'
        }
      >
        {/* Mobile Logo */}
        <button onClick={() => onNavigate('/')}>
          <h1 className='w-full text-3xl font-bold dark:text-[#00df9a] text-white m-4 flex gap-3'><GiSkullCrossedBones /></h1>
        </button>
        {/* Mobile Navigation Items */}
        {navItems.map(item => (
          <li
            key={item.id}
            onClick={() => onNavigate(item.path)}
            className={`p-4 border-b rounded-xl hover:bg-black dark:hover:bg-[#00df9a] duration-300 hover:text-white dark:hover:text-black cursor-pointer border-gray-600
              ${location.pathname === item.path && 'bg-black dark:bg-[#00df9a] text-white dark:text-black'}
            `}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Navbar;
