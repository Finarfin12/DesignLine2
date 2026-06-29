import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useShortcuts(onSearch?: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && e.key !== 'Escape') {
        return;
      }

      // Ctrl + K : Search (Focus on first input that is a search bar)
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onSearch) {
          onSearch();
        } else {
          const searchInput = document.querySelector('input[placeholder*="Cari"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }
      
      // Shift + N : New Project (Navigate to projects and maybe open modal)
      if (e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/projects?new=true');
      }

      // Alt + D : Go to Dashboard
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
