import React, { useState } from 'react'
import { useTheme } from '../../context/ThemeContext';
import { GoSun, GoMoon } from 'react-icons/go';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const [isChecked, setIsChecked] = useState(theme === "light")


  const handleCheckboxChange = () => {
    toggleTheme();
    setIsChecked(!isChecked)
  }

  return (
    <>
      <label className='relative inline-flex cursor-pointer select-none items-center'>
        <input
          type='checkbox'
          checked={isChecked}
          onChange={handleCheckboxChange}
          className='sr-only'
        />
        <div className='relative flex  h-[36px] w-[56px] md:h-[46px] md:w-[86px] items-center justify-between  rounded-md bg-white dark:bg-gray-800 p-1 '>
          {/* Background slider */}
          <div
            className={`absolute transition-transform duration-300 ease-in-out h-[24px] w-[24px] md:h-[38px] md:w-[38px] rounded-md bg-gradient-to-r bg-green-500 dark:bg-primary hover:bg-green-500 hover:dark:bg-primary ${
              isChecked ? 'translate-x-full' : 'translate-x-0'
            }`}
          ></div>
          <span
            className={`relative z-10 flex h-6 w-6 md:h-9 md:w-9 items-center justify-center rounded ${
              !isChecked ? 'text-white' : 'text-primary'
            }`}
          >
            <GoSun className="h-3 w-3 md:h-5 md:w-5"/>
          </span>
          <span
            className={`relative z-10 flex h-6 w-6 md:h-9 md:w-9 items-center justify-center rounded ${
              isChecked ? 'text-white' : 'text-green-500'
            }`}
          >
            <GoMoon className="h-3 w-3 md:h-5 md:w-5 md:mr-2"/>
          </span>
        </div>
      </label>
    </>
  )
}

export default ThemeToggle;
