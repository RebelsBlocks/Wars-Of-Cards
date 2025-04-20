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
  
  useEffect(() => {
    // Check if we're on a mobile device
    const checkIfMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
        window.innerWidth <= 768
      );
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
    
    // Get actual safe area inset value
    const getSafeAreaInset = () => {
      const computedSafeArea = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-bottom')
        .trim();
      
      setSafeAreaBottom(computedSafeArea || '0px');
    };
    
    // Apply browser-specific CSS variables and classes
    const applyBrowserSpecificSettings = () => {
      // Remove all browser classes first
      document.body.classList.remove('brave-browser', 'safari-browser', 'chrome-browser', 'other-browser');
      
      // Default values for different browsers
      let paddingMultiplier = 1.33;
      let minPadding = '27px';
      
      // Browser-specific adjustments
      if (browserType === 'brave') {
        paddingMultiplier = 2.5;
        minPadding = '34px';
        document.body.classList.add('brave-browser');
      } else if (browserType === 'safari') {
        paddingMultiplier = 1.5;
        minPadding = '30px';
        document.body.classList.add('safari-browser');
      } else if (browserType === 'chrome') {
        paddingMultiplier = 1.33;
        minPadding = '27px';
        document.body.classList.add('chrome-browser');
      } else {
        document.body.classList.add('other-browser');
      }
      
      // Set global variable
      document.documentElement.style.setProperty(
        '--safe-area-padding-bottom', 
        `max(${minPadding}, calc(${safeAreaBottom} * ${paddingMultiplier}))`
      );
      
      // Set component-specific variables
      document.documentElement.style.setProperty(
        '--brief-safe-area-bottom', 
        `max(${minPadding}, calc(${safeAreaBottom} * ${paddingMultiplier}))`
      );
      
      document.documentElement.style.setProperty(
        '--profile-safe-area-bottom', 
        `max(${minPadding}, calc(${safeAreaBottom} * ${paddingMultiplier}))`
      );
      
      document.documentElement.style.setProperty(
        '--messages-safe-area-bottom', 
        `max(${minPadding}, calc(${safeAreaBottom} * ${paddingMultiplier}))`
      );
      
      document.documentElement.style.setProperty(
        '--play-safe-area-bottom', 
        `max(${minPadding}, calc(${safeAreaBottom} * ${paddingMultiplier}))`
      );
    };
    
    // Fix for mobile viewport height issues
    const fixViewportHeight = () => {
      // Get real viewport height (1% of viewport height)
      const vh = window.innerHeight * 0.01;
      
      // Set CSS variables for vh units
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--real-viewport-height', `${window.innerHeight}px`);
      
      // Calculate addressBarHeight for browsers that show/hide it
      const addressBarHeight = Math.max(0, window.outerHeight - window.innerHeight);
      document.documentElement.style.setProperty('--address-bar-height', `${addressBarHeight}px`);
      
      // Browser-specific viewport fixes
      if (browserType === 'brave') {
        document.documentElement.style.setProperty('--viewport-offset', '16px');
      } else if (browserType === 'safari') {
        document.documentElement.style.setProperty('--viewport-offset', '8px');
      } else {
        document.documentElement.style.setProperty('--viewport-offset', '0px');
      }
      
      // For browsers that don't support env(), set fallback values
      const safeAreaInsetBottom = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')
      ) || 0;
      
      if (safeAreaInsetBottom === 0 && isMobile) {
        if (browserType === 'brave') {
          document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px');
        } else if (browserType === 'safari') {
          document.documentElement.style.setProperty('--safe-area-inset-bottom', '30px');
        } else {
          document.documentElement.style.setProperty('--safe-area-inset-bottom', '27px');
        }
      }
    };
    
    // Set up keyboard detection for mobile devices
    const setupKeyboardDetection = () => {
      if (!isMobile) return;
      
      // Initial viewport height reference
      let initialViewportHeight = window.innerHeight;
      
      // Check if keyboard is visible by comparing viewport height
      const checkKeyboard = () => {
        const keyboardThreshold = 150; // Minimum height change to consider keyboard visible
        const currentViewportHeight = window.innerHeight;
        
        if (initialViewportHeight - currentViewportHeight > keyboardThreshold) {
          // Keyboard is likely visible
          document.body.classList.add('keyboard-visible');
          
          // Apply keyboard-specific fixes
          document.documentElement.style.setProperty('--keyboard-height', 
            `${initialViewportHeight - window.innerHeight}px`);
          
          // Platform-specific fixes
          if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            // iOS-specific keyboard fixes
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
              setTimeout(() => {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            }
          } else if (/Android/i.test(navigator.userAgent)) {
            // Android-specific keyboard fixes
            document.documentElement.style.setProperty('--android-keyboard-padding', '20px');
          }
        } else {
          // Keyboard is likely hidden
          document.body.classList.remove('keyboard-visible');
          document.documentElement.style.setProperty('--keyboard-height', '0px');
          document.documentElement.style.setProperty('--android-keyboard-padding', '0px');
          
          // Update initial height reference
          initialViewportHeight = currentViewportHeight;
        }
      };
      
      // Handle resize events for keyboard detection
      window.addEventListener('resize', checkKeyboard);
      
      // iOS specific events for better keyboard detection
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.addEventListener('focusin', () => {
          setTimeout(checkKeyboard, 100);
        });
        
        window.addEventListener('focusout', () => {
          setTimeout(() => {
            document.body.classList.remove('keyboard-visible');
            document.documentElement.style.setProperty('--keyboard-height', '0px');
          }, 100);
        });
      }
      
      return () => {
        window.removeEventListener('resize', checkKeyboard);
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.removeEventListener('focusin', checkKeyboard);
          window.removeEventListener('focusout', checkKeyboard);
        }
      };
    };
    
    // Generate browser-specific CSS
    const generateBrowserStylesheet = () => {
      let css = '';
      
      // Only generate styles for mobile
      if (!isMobile) return;
      
      switch (browserType) {
        case 'brave':
          css = `
            /* Brave-specific fixes */
            .briefContainer {
              padding-bottom: calc(var(--brief-safe-area-bottom) + 20px) !important;
            }
            
            .messagesContainer {
              max-height: calc(100% - var(--messages-safe-area-bottom) - 60px) !important;
            }
            
            .inputContainer {
              bottom: calc(var(--safe-area-padding-bottom) + 5px) !important;
            }
            
            @media screen and (max-width: 480px) {
              .container {
                padding-bottom: calc(var(--safe-area-padding-bottom) + 10px) !important;
              }
              
              .inputContainer {
                bottom: calc(var(--safe-area-padding-bottom) + 10px) !important;
                padding-bottom: 5px !important;
              }
            }
            
            /* Game screens */
            .gameContainer {
              padding-bottom: calc(var(--play-safe-area-bottom) + 10px) !important;
            }
            
            /* Profile screen */
            .profileContainer {
              padding-bottom: calc(var(--profile-safe-area-bottom) + 10px) !important;
            }
          `;
          break;
          
        case 'safari':
          css = `
            /* Safari-specific fixes */
            .briefContainer {
              padding-bottom: calc(var(--brief-safe-area-bottom) + 15px) !important;
            }
            
            .messagesContainer {
              max-height: calc(100% - var(--messages-safe-area-bottom) - 55px) !important;
            }
            
            .inputContainer {
              bottom: calc(var(--safe-area-padding-bottom) + 3px) !important;
            }
            
            /* Profile screen */
            .profileContainer {
              padding-bottom: calc(var(--profile-safe-area-bottom) + 5px) !important;
            }
            
            /* Game screens */
            .gameContainer {
              padding-bottom: calc(var(--play-safe-area-bottom) + 5px) !important;
            }
          `;
          break;
          
        case 'chrome':
          css = `
            /* Chrome-specific fixes */
            .briefContainer {
              padding-bottom: calc(var(--brief-safe-area-bottom) + 5px) !important;
            }
            
            .messagesContainer {
              max-height: calc(100% - var(--messages-safe-area-bottom) - 50px) !important;
            }
            
            .inputContainer {
              bottom: var(--safe-area-padding-bottom) !important;
            }
            
            /* Profile & game screens */
            .profileContainer, .gameContainer {
              padding-bottom: var(--safe-area-padding-bottom) !important;
            }
          `;
          break;
          
        default:
          css = `
            /* General fixes for other browsers */
            .briefContainer {
              padding-bottom: calc(var(--brief-safe-area-bottom) + 5px) !important;
            }
            
            .messagesContainer {
              max-height: calc(100% - var(--messages-safe-area-bottom) - 50px) !important;
            }
            
            .inputContainer {
              bottom: var(--safe-area-padding-bottom) !important;
            }
          `;
          break;
      }
      
      // Add keyboard visibility fixes
      css += `
        /* Keyboard visibility fixes */
        body.keyboard-visible .inputContainer {
          position: fixed;
          bottom: 0 !important;
          padding-bottom: 10px !important;
          background-color: rgba(var(--felt-green-dark), 0.95);
        }
        
        body.keyboard-visible .messagesContainer {
          max-height: calc(100vh - 120px - var(--keyboard-height)) !important;
          padding-bottom: 20px !important;
        }
        
        /* iOS-specific keyboard fixes */
        @supports (-webkit-touch-callout: none) {
          body.keyboard-visible .inputContainer {
            bottom: 0 !important;
          }
        }
        
        /* Android-specific keyboard fixes */
        @supports not (-webkit-touch-callout: none) {
          body.keyboard-visible {
            padding-bottom: var(--android-keyboard-padding) !important;
          }
        }
        
        /* Fix height-related issues on rotate */
        @media screen and (orientation: landscape) and (max-height: 500px) {
          .inputContainer {
            position: fixed;
            bottom: 0 !important;
            padding: 8px 10px !important;
            z-index: 1000;
          }
          
          .messagesContainer {
            max-height: calc(100vh - 80px) !important;
          }
        }
      `;
      
      setBrowserStyles(css);
    };
    
    // Initialize all features
    const initMobileCompatibility = async () => {
      checkIfMobile();
      await detectBrowser();
      getSafeAreaInset();
      applyBrowserSpecificSettings();
      fixViewportHeight();
      generateBrowserStylesheet();
      
      // Set up event listeners for screen changes
      const handleScreenChange = () => {
        checkIfMobile();
        getSafeAreaInset();
        applyBrowserSpecificSettings();
        fixViewportHeight();
        generateBrowserStylesheet();
      };
      
      window.addEventListener('resize', handleScreenChange);
      window.addEventListener('orientationchange', handleScreenChange);
      
      // Set up keyboard detection event listeners
      const cleanupKeyboardDetection = setupKeyboardDetection();
      
      // Cleanup event listeners
      return () => {
        window.removeEventListener('resize', handleScreenChange);
        window.removeEventListener('orientationchange', handleScreenChange);
        if (cleanupKeyboardDetection) cleanupKeyboardDetection();
      };
    };
    
    // Initialize everything
    initMobileCompatibility();
  }, [isMobile, browserType, safeAreaBottom]);
  
  // Create a buffer element at the bottom for mobile devices
  const GestureAreaBuffer = () => {
    if (!isMobile) return null;
    
    // Calculate buffer height based on browser type
    const getBufferHeight = () => {
      switch (browserType) {
        case 'brave':
          return "calc(var(--safe-area-padding-bottom) * 1.1)";
        case 'safari':
          return "calc(var(--safe-area-padding-bottom) * 1.05)";
        default:
          return "var(--safe-area-padding-bottom)";
      }
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