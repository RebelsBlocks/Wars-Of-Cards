import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import '@/styles/globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@near-wallet-selector/modal-ui/styles.css';
import ImagePreloader from '@/components/ImagePreloader';

const NearWalletProvider = dynamic(
  () => import('@/contexts/NearWalletContext').then(mod => mod.NearWalletProvider),
  { ssr: false }
);

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function App({ Component, pageProps }: AppPropsWithLayout): React.ReactElement {
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

  // Nowy useEffect dla rozwiązania problemu z paskiem nawigacyjnym na urządzeniach mobilnych
  useEffect(() => {
    // Funkcja ustawiająca rzeczywistą wysokość viewportu
    function setAppHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    }

    // Wykonaj od razu i przy każdej zmianie rozmiaru/orientacji
    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);

    // Improved function to encourage browsers to hide their address bars
    function triggerScroll() {
      if (window.innerWidth <= 960) { // Only on mobile devices
        // Try multiple techniques to hide the address bar
        
        // Technique 1: Simple scroll to 1px and back
        window.scrollTo(0, 1);
        
        // Technique 2: Delayed scroll sequence with multiple attempts
        setTimeout(() => {
          window.scrollTo(0, 1);
          
          // Sometimes browsers need a moment to react
          setTimeout(() => {
            window.scrollTo(0, 0);
            setTimeout(() => window.scrollTo(0, 1), 50);
          }, 100);
        }, 300);
        
        // Technique 3: Create temporary overflow and scroll
        const tempDiv = document.createElement('div');
        tempDiv.style.height = '101vh';
        tempDiv.style.width = '1px';
        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '0';
        tempDiv.style.left = '0';
        tempDiv.style.pointerEvents = 'none';
        tempDiv.style.opacity = '0';
        document.body.appendChild(tempDiv);
        
        // Remove the temporary element after scrolling
        setTimeout(() => {
          window.scrollTo(0, 1);
          setTimeout(() => {
            document.body.removeChild(tempDiv);
          }, 400);
        }, 200);
      }
    }

    // Wyzwól przewijanie przy starcie i przy zmianie orientacji
    triggerScroll();
    
    // Try again after a short delay to catch situations where the page isn't fully loaded
    setTimeout(triggerScroll, 1000);
    
    // Add listeners for events that might allow hiding the address bar
    window.addEventListener('orientationchange', () => {
      setTimeout(triggerScroll, 300);
    });
    
    window.addEventListener('resize', () => {
      setTimeout(triggerScroll, 100);
    });
    
    // Try once more after page is fully loaded
    window.addEventListener('load', () => {
      setTimeout(triggerScroll, 500);
    });

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
      window.removeEventListener('load', () => {});
    };
  }, []);

  return React.createElement(
    NearWalletProvider,
    null,
    React.createElement(
      'div',
      null,
      React.createElement(Head, null,
        React.createElement('link', { rel: 'icon', href: '/logo_transparent.png' }),
        React.createElement('meta', { 
          name: 'viewport', 
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no, minimal-ui'
        }),
        React.createElement('meta', {
          name: 'apple-mobile-web-app-capable',
          content: 'yes'
        }),
        React.createElement('meta', {
          name: 'mobile-web-app-capable',
          content: 'yes'
        }),
        React.createElement('meta', {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent'
        })
      ),
      React.createElement(ImagePreloader),
      React.createElement(Component, pageProps)
    )
  );
}

export default App;
