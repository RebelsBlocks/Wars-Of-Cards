import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export default function useWindowSize(): WindowSize {
  // Default to desktop size initially to avoid hydration issues
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({
        width,
        height,
        isMobile: width < 480,
        isTablet: width >= 480 && width < 768,
        isDesktop: width >= 768,
      });
    }

    // Set size at the first client-side load
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
} 