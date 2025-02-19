'use client'

import { useTheme } from '../lib/contexts/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5 text-amber-500" />
      ) : (
        <MoonIcon className="w-5 h-5 text-blue-500" />
      )}
    </button>
  )
} 