import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import '@/styles/globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@near-wallet-selector/modal-ui/styles.css';

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
  // Add effect to handle mobile viewport height issues
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set the value of the --vh custom property to the viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Detect if device is a mobile device based on userAgent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /iphone|ipod|android|blackberry|opera mini|iemobile|mobile/.test(userAgent);
      
      if (isMobile) {
        // Add mobile class to html element
        document.documentElement.classList.add('mobile-device');
        
        // Check if it's a notched iPhone (X or newer)
        const isNotchedIphone = /iphone/.test(userAgent) && 
          (window.screen.height >= 812 || window.screen.width >= 812);
        
        if (isNotchedIphone) {
          document.documentElement.classList.add('notched-iphone');
        }
      }
    }
    
    // Initial call
    handleResize();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
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
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no'
        })
      ),
      React.createElement(Component, pageProps)
    )
  );
}

export default App; 
