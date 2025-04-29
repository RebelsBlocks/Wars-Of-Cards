import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { AppController } from '@/components/AppController';

const HomePage: NextPage = () => {
  const wallet = useNearWallet();
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Add global styles to ensure dark theme is consistent
  useEffect(() => {
    // Apply theme to entire document
    document.documentElement.style.backgroundColor = 'rgb(var(--felt-green))';
    document.body.style.backgroundColor = 'rgb(var(--felt-green))';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.color = 'rgb(var(--cream-text))';
    document.body.style.overflow = 'hidden'; // Prevent scrollbars
    document.body.style.width = '100vw'; // Ensure full viewport width
    document.body.style.height = '100vh'; // Ensure full viewport height
    
    // Apply styles to all potential container elements
    const styleFullWidth = `
      html, body, #__next, .container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        background-color: rgb(var(--felt-green)) !important;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    // Create and append a style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styleFullWidth;
    document.head.appendChild(styleElement);
    
    return () => {
      // Cleanup function to reset styles if component unmounts
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.color = '';
      document.body.style.overflow = '';
      document.body.style.width = '';
      document.body.style.height = '';
      
      // Remove the appended style element
      document.head.removeChild(styleElement);
    };
  }, []);
  
  useEffect(() => {
    // Short delay to ensure wallet state is properly initialized
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (!isInitialized) {
    return (
      <div style={{ 
        backgroundColor: 'rgb(var(--felt-green))',
        backgroundImage: `
          var(--table-texture),
          linear-gradient(
            to bottom,
            rgb(var(--background-start-rgb)),
            rgb(var(--background-end-rgb))
          )
        `,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden' // Prevent scrolling
      }}>
        <img 
          src="/logo_load.png" 
          alt="Loading..."
          style={{
            width: 'min(500px, 85vw)', // Responsive sizing
            height: 'auto',
            maxHeight: '60vh', // Prevent logo from being too large
            objectFit: 'contain' // Maintain aspect ratio
          }}
        />
      </div>
    );
  }

  if (wallet.error) {
    // Check if it's a popup window error - if so, try to render the app anyway
    if (wallet.error.message?.toLowerCase().includes('popup window') || 
        wallet.error.message?.toLowerCase().includes('failed to initialize')) {
      console.warn('Non-critical wallet error encountered:', wallet.error.message);
      return (
        <div style={{ 
          backgroundColor: 'rgb(var(--felt-green))',
          backgroundImage: `
            var(--table-texture),
            linear-gradient(
              to bottom,
              rgb(var(--background-start-rgb)),
              rgb(var(--background-end-rgb))
            )
          `,
          minHeight: '100vh',
          width: '100vw',
          margin: 0,
          padding: 0,
          color: 'rgb(var(--cream-text))',
          border: 'none',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <AppController />
        </div>
      );
    }
    
    // For other critical errors, show the error page
    return (
      <div style={{ 
        backgroundColor: 'rgb(var(--felt-green))',
        backgroundImage: `
          var(--table-texture),
          linear-gradient(
            to bottom,
            rgb(var(--background-start-rgb)),
            rgb(var(--background-end-rgb))
          )
        `,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <p style={{
          color: 'rgb(var(--error-accent))',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          Failed to initialize: {wallet.error.message}
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'rgb(var(--felt-green))',
      backgroundImage: `
        var(--table-texture),
        linear-gradient(
          to bottom,
          rgb(var(--background-start-rgb)),
          rgb(var(--background-end-rgb))
        )
      `,
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      color: 'rgb(var(--cream-text))',
      border: 'none',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      <AppController />
    </div>
  );
};

export default HomePage; 
