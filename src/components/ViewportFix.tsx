import { useEffect } from 'react';

/**
 * ViewportFix component to handle browser-specific viewport issues
 * Fixes issues with mobile browsers, especially Chrome and Brave
 * that handle safe areas and viewport differently
 */
export const ViewportFix = () => {
  useEffect(() => {
    // Fix for mobile viewport height issues (iOS Safari, Chrome, Brave)
    const fixViewportHeight = () => {
      // Get real viewport height
      const vh = window.innerHeight * 0.01;
      // Set CSS variable for vh units
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      // Fix for mobile address bar appearance/disappearance
      document.documentElement.style.setProperty(
        '--real-viewport-height', 
        `${window.innerHeight}px`
      );
      
      // Ensure safe-area-inset-bottom is applied correctly
      const safeAreaInsetBottom = 
        parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--safe-area-inset-bottom')) || 0;
      
      // For browsers that don't support env(), set a fallback
      if (safeAreaInsetBottom === 0) {
        // Apply sane defaults based on device detection
        const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const defaultSafeArea = isMobileDevice ? '27px' : '0px';
        document.documentElement.style.setProperty('--safe-area-padding-bottom', defaultSafeArea);
      }
    };

    // Run on initial load
    fixViewportHeight();
    
    // Add event listener for resize and orientation changes
    window.addEventListener('resize', fixViewportHeight);
    window.addEventListener('orientationchange', fixViewportHeight);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', fixViewportHeight);
      window.removeEventListener('orientationchange', fixViewportHeight);
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default ViewportFix; 