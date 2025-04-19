import { useState } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import styles from '../styles/Play.module.css';
import { BlackjackProvider, BlackjackGame } from './BlackjackGame';
import { WarProvider, WarGame } from './WarGame';

interface PlayProps {
  gameMode: string | null;
  setGameMode: (mode: string | null) => void;
}

export function Play({ gameMode, setGameMode }: PlayProps) {
  const wallet = useNearWallet();

  const handleStartWar = () => {
    setGameMode('war');
  };

  const handleStartBlackjack = () => {
    setGameMode('blackjack');
  };

  const handleBack = () => {
    setGameMode(null);
  };

  if (gameMode === 'blackjack') {
    return (
      <div className={styles.gameWrapper}>
        <BlackjackProvider>
          <BlackjackGame onBack={handleBack} />
        </BlackjackProvider>
      </div>
    );
  }

  if (gameMode === 'war') {
    return (
      <div className={styles.gameWrapper}>
        <WarProvider>
          <WarGame onBack={handleBack} />
        </WarProvider>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameModes}>
        <div className={styles.gameMode}>
          <h2>BLACKJACK</h2>
          <button 
            className={styles.playButton}
            onClick={handleStartBlackjack}
          >
            Play
          </button>
        </div>

        <div className={styles.gameMode}>
          <h2>NEW WAR ORDER</h2>
          <button 
            className={styles.playButton}
            onClick={handleStartWar}
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
} 