import { Moon, Sun } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

// Add this in your sidebar-footer or topbar
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme} 
      className="btn-icon theme-toggle"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
