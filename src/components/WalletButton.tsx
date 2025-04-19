import React, { useState } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import styles from '@/styles/MainLayout.module.css';

interface WalletButtonProps {
  showDisconnect?: boolean;
}

export function WalletButton({ showDisconnect = false }: WalletButtonProps) {
  const { accountId, connect, disconnect, isLoading } = useNearWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConnect = async () => {
    try {
      setIsProcessing(true);
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsProcessing(true);
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <li className={styles.menuItem} style={{ cursor: 'not-allowed', opacity: 0.7, justifyContent: 'center' }}>
        <i className="bi bi-wallet2" style={{ marginRight: '8px' }} />Loading...
      </li>
    );
  }

  if (!accountId) {
    return (
      <li 
        className={styles.menuItem}
        onClick={handleConnect}
        style={{ 
          backgroundImage: "url('/Profile_back.png')",
          justifyContent: 'center',
          opacity: isProcessing ? 0.7 : 1,
          cursor: isProcessing ? 'not-allowed' : 'pointer'
        }}
      >
        <i className="bi bi-wallet2" style={{ marginRight: '8px' }} />Log In 
      </li>
    );
  }

  // Show disconnect button if showDisconnect is true
  if (showDisconnect) {
    return (
      <li 
        className={styles.menuItem}
        onClick={isProcessing ? undefined : handleDisconnect}
        style={{ 
          justifyContent: 'center',
          opacity: isProcessing ? 0.7 : 1,
          cursor: isProcessing ? 'not-allowed' : 'pointer'
        }}
        data-header-action="true"
      >
        <i className="bi bi-box-arrow-right" />
      </li>
    );
  }

  // If logged in and not showing disconnect, don't show anything
  return null;
} 