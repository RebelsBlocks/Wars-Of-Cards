import React, { useEffect, useState } from 'react';
import styles from '../styles/BettingScreen.module.css';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { NETWORK_CONFIG } from '@/contexts/NearWalletContext';
import BN from 'bn.js';

interface BettingScreenProps {
  onPlaceBet: () => void;
  onBack: () => void;
}

// Helper function to format token amounts with 2 decimal places
function formatTokenAmount(amount: string): string {
  const yoctoToToken = new BN("1000000000000000000000000");
  const amountBN = new BN(amount);
  const wholePart = amountBN.div(yoctoToToken);
  const fractionalPart = amountBN.mod(yoctoToToken);
  
  // Convert fractional part to 2 decimal places
  const fractionalStr = fractionalPart.toString().padStart(24, '0');
  const decimalPlaces = fractionalStr.slice(0, 2);
  
  return `${wholePart}.${decimalPlaces}`;
}

const ENTRY_FEE = 4; // 4 CRANS
const ENTRY_FEE_YOCTO = "4000000000000000000000000"; // 4 with 24 decimals

const BettingScreen: React.FC<BettingScreenProps> = ({
  onPlaceBet,
  onBack
}) => {
  const wallet = useNearWallet();
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch CRANS balance
  async function fetchCRANSBalance(accountId: string) {
    try {
      if (!wallet.selector) return "0";
      
      const result = await wallet.viewFunction({
        contractId: NETWORK_CONFIG.cransContractId,
        methodName: "ft_balance_of",
        args: { account_id: accountId }
      });

      return formatTokenAmount(result);
    } catch (error) {
      console.error("Error fetching CRANS balance:", error);
      return "0";
    }
  }

  useEffect(() => {
    if (wallet.accountId) {
      fetchCRANSBalance(wallet.accountId).then(setBalance);
    }
  }, [wallet.accountId]);

  const handlePlaceBet = async () => {
    if (!wallet.accountId || isLoading) return;
    
    setIsLoading(true);
    try {
      // Call ft_transfer on CRANS contract
      const result = await wallet.executeTransaction({
        contractId: NETWORK_CONFIG.cransContractId,
        methodName: "ft_transfer",
        args: {
          receiver_id: "house.warsofcards.near",
          amount: ENTRY_FEE_YOCTO,
          memo: "Blackjack entry fee"
        },
        gas: "300000000000000", // 300 TGas
        deposit: "1" // 1 yoctoNEAR required for ft_transfer
      });

      if (result) {
        // If transaction was successful, proceed with starting the game
        await onPlaceBet();
      }
    } catch (error) {
      console.error("Failed to transfer CRANS:", error);
      setError("Failed to transfer CRANS. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasEnoughBalance = parseFloat(balance) >= ENTRY_FEE;

  return (
    <div className={styles.betContainer}>
      {wallet.accountId ? (
        <>
          <div className={styles.balanceDisplay}>
            <span>Your CRANS Balance: {balance}</span>
          </div>
          <div className={styles.betDisplay}>
            Entry Fee: {ENTRY_FEE} CRANS
          </div>
          <button
            className={styles.placeBetButton}
            onClick={handlePlaceBet}
            disabled={!hasEnoughBalance || isLoading}
          >
            {isLoading ? 'Processing...' : 'Enter Game'}
          </button>
          {!hasEnoughBalance && (
            <div className={styles.errorMessage}>
              Insufficient CRANS balance. You need at least {ENTRY_FEE} CRANS to play.
            </div>
          )}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </>
      ) : (
        <div className={styles.connectWalletMessage}>
          Please connect your NEAR wallet to play
        </div>
      )}
      <button className={styles.backToGamesButton} onClick={onBack}>
        ← Back to Games
      </button>
    </div>
  );
};

export default BettingScreen; 