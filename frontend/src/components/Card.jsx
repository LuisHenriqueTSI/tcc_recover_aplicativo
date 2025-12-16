// Card reutilizável do Design System Recover
import { useTheme } from '../contexts/ThemeContext';

export default function Card({ children, className = '' }) {
  const { darkMode } = useTheme();
  return (
    <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg shadow p-4 ${className}`}>
      {children}
    </div>
  );
}
