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
 * MobileCompatibility component handles various mobile browser compatibility issues
 * Consolidates functionality from GestureAreaBuffer, ViewportFix, KeyboardAwareness, and BrowserCompatibilityCss
 */
export const MobileCompatibility: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [browserType, setBrowserType] = useState<'brave' | 'chrome' | 'safari' | 'other'>('other');
  const [browserStyles, setBrowserStyles] = useState<string>('');
  const [safeAreaBottom, setSafeAreaBottom] = useState('0px');
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    // Check if we're on a mobile device
    const checkIfMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
        window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
      return isMobileDevice;
    };
    
    // Comprehensive browser detection
    const detectBrowser = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // First try using the Brave API
      if (navigator.brave) {
        try {
          const isBraveResult = await navigator.brave.isBrave();
          if (isBraveResult) {
            setBrowserType('brave');
            return;
          }
        } catch (e) {
          // Fall through to other detection methods
        }
      }
      
      // Fallback detection for browsers
      if (userAgent.includes("brave") || 
          (userAgent.includes("chrome") && !window.chrome)) {
        setBrowserType('brave');
      }
      // Safari detection
      else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
        setBrowserType('safari');
      }
      // Chrome detection
      else if (userAgent.includes("chrome")) {
        setBrowserType('chrome');
      }
      // Other browsers
      else {
        setBrowserType('other');
      }
    };
    
    // Get actual safe area inset value with fallback
    const getSafeAreaInset = () => {
      const computedSafeArea = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-bottom')
        .trim();
      
      // If no safe area is defined, use device-specific defaults
      if (!computedSafeArea || computedSafeArea === '0px') {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          setSafeAreaBottom('34px'); // Default for modern iOS devices
        } else if (browserType === 'brave') {
          setSafeAreaBottom('32px');
        } else if (browserType === 'chrome') {
          setSafeAreaBottom('28px');
        } else {
          setSafeAreaBottom('24px');
        }
      } else {
        setSafeAreaBottom(computedSafeArea);
      }
    };
    
    // Apply browser-specific CSS variables and classes
    const applyBrowserSpecificSettings = () => {
      // Remove all browser classes first
      document.body.classList.remove('brave-browser', 'safari-browser', 'chrome-browser', 'other-browser');
      
      // Default values for different browsers
      let paddingMultiplier = 1;
      let minPadding = '24px';
      let additionalPadding = '0px';
      
      // Browser-specific adjustments
      switch (browserType) {
        case 'brave':
          paddingMultiplier = 1.5;
          minPadding = '32px';
          additionalPadding = '16px';
          document.body.classList.add('brave-browser');
          break;
        case 'safari':
          paddingMultiplier = 1.2;
          minPadding = '28px';
          additionalPadding = '12px';
          document.body.classList.add('safari-browser');
          break;
        case 'chrome':
          paddingMultiplier = 1.1;
          minPadding = '28px';
          additionalPadding = '8px';
          document.body.classList.add('chrome-browser');
          break;
        default:
          document.body.classList.add('other-browser');
      }
      
      // Calculate safe area padding with multiplier and additional padding
      const calculatedPadding = `max(${minPadding}, calc((${safeAreaBottom} * ${paddingMultiplier}) + ${additionalPadding}))`;
      
      // Set global variables
      document.documentElement.style.setProperty('--safe-area-padding-bottom', calculatedPadding);
      document.documentElement.style.setProperty('--safe-area-multiplier', paddingMultiplier.toString());
      document.documentElement.style.setProperty('--safe-area-additional', additionalPadding);
      
      // Set component-specific variables
      const components = ['brief', 'messages', 'profile', 'play'];
      components.forEach(component => {
        document.documentElement.style.setProperty(
          `--${component}-safe-area-bottom`,
          calculatedPadding
        );
      });
    };
    
    // Fix for mobile viewport height issues
    const fixViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      setViewportHeight(window.innerHeight);
      
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--real-viewport-height', `${window.innerHeight}px`);
      
      // Calculate addressBarHeight
      const addressBarHeight = Math.max(0, window.outerHeight - window.innerHeight);
      document.documentElement.style.setProperty('--address-bar-height', `${addressBarHeight}px`);
      
      // Browser-specific viewport adjustments
      const viewportOffset = browserType === 'brave' ? '16px' : 
                           browserType === 'safari' ? '8px' : '0px';
      document.documentElement.style.setProperty('--viewport-offset', viewportOffset);
    };
    
    // Initialize all features
    const initMobileCompatibility = async () => {
      const isMobileDevice = checkIfMobile();
      if (!isMobileDevice) return;
      
      await detectBrowser();
      getSafeAreaInset();
      applyBrowserSpecificSettings();
      fixViewportHeight();
      
      // Set up event listeners for screen changes
      const handleScreenChange = () => {
        checkIfMobile();
        getSafeAreaInset();
        applyBrowserSpecificSettings();
        fixViewportHeight();
      };
      
      window.addEventListener('resize', handleScreenChange);
      window.addEventListener('orientationchange', handleScreenChange);
      
      // Handle visibility change for more reliable updates
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          handleScreenChange();
        }
      });
      
      return () => {
        window.removeEventListener('resize', handleScreenChange);
        window.removeEventListener('orientationchange', handleScreenChange);
        document.removeEventListener('visibilitychange', handleScreenChange);
      };
    };
    
    // Initialize everything
    initMobileCompatibility();
  }, [browserType, safeAreaBottom, viewportHeight]);
  
  // Create a buffer element at the bottom for mobile devices
  const GestureAreaBuffer = () => {
    if (!isMobile) return null;
    
    // Calculate buffer height based on browser type
    const getBufferHeight = () => {
      const baseHeight = `var(--safe-area-padding-bottom)`;
      const multiplier = browserType === 'brave' ? 1.5 :
                        browserType === 'safari' ? 1.2 : 1.1;
      
      return `calc(${baseHeight} * ${multiplier})`;
    };
    
    return (
      <div 
        style={{
          height: getBufferHeight(),
          width: '100%',
          position: 'fixed',
          bottom: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          background: 'transparent'
        }} 
        aria-hidden="true"
        data-browser={browserType}
      />
    );
  };
  
  return (
    <>
      {isMobile && browserStyles && (
        <style dangerouslySetInnerHTML={{ __html: browserStyles }} />
      )}
      {isMobile && <GestureAreaBuffer />}
    </>
  );
};

export default MobileCompatibility; 
