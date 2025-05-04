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
        <GestureAreaBuffer />
      </div>
    );
  }

  if (gameMode === 'war') {
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
      <div className={styles.gameModes}>
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
            Play
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
            Play
          </button>
        </div>
      </div>
      <GestureAreaBuffer />
    </div>
  );
} 
