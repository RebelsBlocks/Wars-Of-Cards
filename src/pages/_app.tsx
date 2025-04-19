import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import React from 'react';
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

const GestureAreaBuffer = dynamic(
  () => import('@/components/GestureAreaBuffer').then(mod => mod.GestureAreaBuffer),
  { ssr: false }
);

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function App({ Component, pageProps }: AppPropsWithLayout): React.ReactElement {
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
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        })
      ),
      React.createElement(Component, pageProps),
      React.createElement(GestureAreaBuffer, null)
    )
  );
}

export default App; 
