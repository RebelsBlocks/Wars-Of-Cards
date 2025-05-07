import { useState } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import styles from '../styles/Play.module.css';
import { BlackjackProvider, BlackjackGame } from './BlackjackGame';
import { WarProvider, WarGame } from './WarGame';
import { GestureAreaBuffer } from './GestureAreaBuffer';

interface PlayProps {
  gameMode: string | null;
  setGameMode: (mode: string | null) => void;
}

export function Play({ gameMode, setGameMode }: PlayProps) {
  const wallet = useNearWallet();
  const { accountId, connect } = wallet;

  const handleStartWar = () => {
    if (!accountId) {
      connect();
      return;
    }
    setGameMode('war');
  };

  const handleStartBlackjack = () => {
    if (!accountId) {
      connect();
      return;
    }
    setGameMode('blackjack');
  };

  const handleBack = () => {
    setGameMode(null);
  };

  if (gameMode === 'blackjack') {
    // Only allow playing if logged in
    if (!accountId) {
      return (
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <h2>Login Required</h2>
            <p>Please connect your NEAR wallet to play Blackjack</p>
            <button 
              className={styles.playButton}
              onClick={connect}
            >
              Connect Wallet
            </button>
            <button 
              className={`${styles.playButton} ${styles.backButton}`}
              onClick={handleBack}
            >
              Back
            </button>
          </div>
          <GestureAreaBuffer />
        </div>
      );
    }
    return (
      <div className={styles.gameWrapper}>
        <BlackjackProvider>
          <BlackjackGame onBack={handleBack} />
        </BlackjackProvider>
        <GestureAreaBuffer />
      </div>
    );
  }

  if (gameMode === 'war') {
    // Only allow playing if logged in
    if (!accountId) {
      return (
        <div className={styles.container}>
          <div className={styles.loginRequired}>
            <h2>Login Required</h2>
            <p>Please connect your NEAR wallet to play War</p>
            <button 
              className={styles.playButton}
              onClick={connect}
            >
              Connect Wallet
            </button>
            <button 
              className={`${styles.playButton} ${styles.backButton}`}
              onClick={handleBack}
            >
              Back
            </button>
          </div>
          <GestureAreaBuffer />
        </div>
      );
    }
    return (
      <div className={styles.gameWrapper}>
        <WarProvider>
          <WarGame onBack={handleBack} />
        </WarProvider>
        <GestureAreaBuffer />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.gameModes} ${styles.safeAreaBottomPadding}`}>
        <div className={styles.gameMode} onClick={handleStartBlackjack}>
          <div className={styles.blackjackImageContainer}>
            <img 
              src="/blackjack.png" 
              alt="BLACKJACK" 
              className={styles.blackjackImage}
            />
          </div>
          <button 
            className={styles.playButton}
            onClick={handleStartBlackjack}
          >
            {accountId ? 'Play' : 'Log In to Play'}
          </button>
        </div>

        <div className={styles.gameMode} onClick={handleStartWar}>
          <div className={styles.warOrderImageContainer}>
            <img 
              src="/newwarorder.png" 
              alt="NEW WAR ORDER" 
              className={styles.warOrderImage}
            />
          </div>
          <button 
            className={styles.playButton}
            onClick={handleStartWar}
          >
            {accountId ? 'Play' : 'Log In to Play'}
          </button>
        </div>
      </div>
      <GestureAreaBuffer />
    </div>
  );
} 
