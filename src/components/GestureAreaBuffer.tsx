import React, { useEffect, useState } from 'react';

// Add type definitions for Brave browser
declare global {
  interface Navigator {
    brave?: {
      isBrave: () => Promise<boolean>;
    };
  }
  
  interface Window {
    chrome?: any;
  }
}

/**
 * Komponent bufora dla gesture area na urządzeniach mobilnych
 * Zapewnia dodatkową przestrzeń na dole ekranu, aby zapobiec
 * zakrywaniu zawartości przez gesture bar (iOS) lub navigation bar (Android)
 * Dodatkowe wsparcie dla przeglądarki Brave, która ma specyficzne zachowanie
 */
export const GestureAreaBuffer: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    // Sprawdź, czy jesteśmy na urządzeniu mobilnym
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Detect Brave browser
    const checkIfBrave = async () => {
      // Try using the navigator.brave API first
      if (navigator.brave) {
        try {
          const isBraveResult = await navigator.brave.isBrave();
          setIsBrave(isBraveResult);
        } catch (e) {
          // Fallback detection
          const userAgent = navigator.userAgent.toLowerCase();
          setIsBrave(
            userAgent.includes("brave") || 
            // Additional check for Brave that may not always declare itself in UA
            (userAgent.includes("chrome") && !window.chrome)
          );
        }
      } else {
        // Fallback detection
        const userAgent = navigator.userAgent.toLowerCase();
        setIsBrave(
          userAgent.includes("brave") || 
          // Additional check for Brave that may not always declare itself in UA
          (userAgent.includes("chrome") && !window.chrome)
        );
      }
    };

    // Apply browser-specific CSS variables
    const applyBrowserSpecificStyles = () => {
      // Get the current safe area value
      const safeAreaInsetBottom = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-bottom')
        .trim() || '0px';
      
      // Set a special multiplier for Brave
      if (isBrave) {
        // Use a higher multiplier for Brave browser
        document.documentElement.style.setProperty(
          '--safe-area-padding-bottom', 
          `max(34px, calc(${safeAreaInsetBottom} * 2.5))`
        );
        // Add a class to body for additional Brave-specific fixes if needed
        document.body.classList.add('brave-browser');
      } else {
        // Use default value for other browsers
        document.documentElement.style.setProperty(
          '--safe-area-padding-bottom', 
          `max(27px, ${safeAreaInsetBottom})`
        );
        document.body.classList.remove('brave-browser');
      }
    };

    // Run everything at first render
    checkIfMobile();
    checkIfBrave().then(() => {
      applyBrowserSpecificStyles();
    });

    // Add event listeners
    window.addEventListener('resize', () => {
      checkIfMobile();
      applyBrowserSpecificStyles();
    });

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [isBrave]);

  if (!isMobile) return null;

  // Calculate buffer height based on browser detection
  const bufferHeight = isBrave 
    ? "calc(var(--safe-area-padding-bottom) * 2)" 
    : "calc(var(--safe-area-padding-bottom) * 1.33)";

  return (
    <div 
      style={{
        height: bufferHeight,
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent'
      }} 
      aria-hidden="true"
      data-browser={isBrave ? 'brave' : 'other'}
    />
  );
}; 
