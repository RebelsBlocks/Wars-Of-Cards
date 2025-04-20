import React, { useEffect, useState } from 'react';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { WalletButton } from './WalletButton';
import Image from 'next/image';
import styles from '../styles/Profile.module.css';
import { NETWORK_CONFIG } from '@/contexts/NearWalletContext';
import BN from 'bn.js';
import { providers } from 'near-api-js';

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

// Helper function to format terra points in a more readable way
function formatTerraPoints(terraAmount: string): string {
  try {
    const amount = new BN(terraAmount);
    if (amount.isZero()) return "0";

    // No need to divide by 10^20 anymore as we're dealing with raw bytes
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } catch (error) {
    return "0";
  }
}

// Helper function to calculate NEAR from terra points with 4 decimal places
function calculateNearAmount(terraAmount: string): string {
  try {
    // Each byte costs 0.00001 NEAR
    const bytesToNear = new BN("10000000000000000000"); // 0.00001 in yoctoNEAR
    const amountBN = new BN(terraAmount);
    const nearAmount = amountBN.mul(bytesToNear);
    
    const yoctoToNear = new BN("1000000000000000000000000");
    const wholePart = nearAmount.div(yoctoToNear);
    const fractionalPart = nearAmount.mod(yoctoToNear);
    
    // Convert fractional part to 4 decimal places
    const fractionalStr = fractionalPart.toString().padStart(24, '0');
    const decimalPlaces = fractionalStr.slice(0, 4);
    
    return `${wholePart}.${decimalPlaces}`;
  } catch (error) {
    return "0";
  }
}

// Helper function to convert bytes to yoctoNEAR
function bytesToYoctoNEAR(bytes: string): string {
  try {
    const bytesToNear = new BN("10000000000000000000"); // 0.00001 NEAR in yoctoNEAR
    const bytesAmount = new BN(bytes);
    return bytesAmount.mul(bytesToNear).toString();
  } catch (error) {
    return "0";
  }
}

// Add new helper function for wallet name truncation
function truncateWalletName(accountId: string): string {
  if (!accountId.endsWith('.near')) return accountId;
  const name = accountId.slice(0, -5); // remove .near
  if (name.length <= 12) return accountId;
  return `${name.slice(0, 4)}...${name.slice(-4)}.near`;
}

export function Profile() {
  const wallet = useNearWallet();
  const { accountId, selector } = wallet;
  const [balances, setBalances] = useState({ near: "0", crans: "0" });
  const [socialStorage, setSocialStorage] = useState<string | null>(null);
  const [isClaimingPoints, setIsClaimingPoints] = useState(false);
  const [isBrave, setIsBrave] = useState(false); // Detect Brave browser

  // Check if running in Brave browser
  useEffect(() => {
    const detectBrave = async () => {
      // Check if the body already has the brave-browser class
      if (document.body.classList.contains('brave-browser')) {
        setIsBrave(true);
        return;
      }
      
      // Otherwise do our own detection
      try {
        // Try using the navigator.brave API first
        if ((navigator as any).brave) {
          try {
            const isBraveResult = await (navigator as any).brave.isBrave();
            setIsBrave(isBraveResult);
            return;
          } catch (e) {
            // Fall through to backup detection
          }
        }
        
        // Fallback detection through user agent
        const userAgent = navigator.userAgent.toLowerCase();
        const isBraveByUA = userAgent.includes("brave") || 
                           (userAgent.includes("chrome") && !(window as any).chrome);
        setIsBrave(isBraveByUA);
      } catch (e) {
        console.error("Error detecting browser:", e);
      }
    };
    
    detectBrave();
  }, []);

  // Update CSS variable for safe area inset
  useEffect(() => {
    const updateSafeAreaInsets = () => {
      // Get the safe area inset bottom value
      const safeAreaInsetBottom = getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-area-inset-bottom').trim() || '0px';
      
      // Use isBrave state instead of checking classList
      const safeAreaMultiplier = isBrave ? 2.5 : 1.33;
      
      // For mobile devices, ensure there's a minimum padding even if safe-area-inset-bottom is 0
      let adjustedSafeAreaValue;
      if (safeAreaInsetBottom === '0px' && window.innerWidth <= 768) {
        adjustedSafeAreaValue = isBrave ? '34px' : '27px';
      } else {
        adjustedSafeAreaValue = `calc(${safeAreaInsetBottom} * ${safeAreaMultiplier})`;
      }
      
      // Apply the adjusted value to CSS variables used in the component
      document.documentElement.style.setProperty('--profile-safe-area-bottom', adjustedSafeAreaValue);
    };
    
    updateSafeAreaInsets();
    window.addEventListener('resize', updateSafeAreaInsets);
    return () => window.removeEventListener('resize', updateSafeAreaInsets);
  }, [isBrave]);

  const fetchBalances = async () => {
    console.log("Fetching balances for account:", accountId);
    const [nearBalance, cransBalance, socialStorageBalance] = await Promise.all([
      fetchAccountDetails(accountId!),
      fetchCRANSBalance(accountId!),
      fetchSocialStorageBalance(accountId!)
    ]);
    console.log("Fetched social storage balance:", socialStorageBalance);
    setBalances({ near: nearBalance, crans: cransBalance });
    setSocialStorage(socialStorageBalance);
  };

  async function fetchSocialStorageBalance(accountId: string) {
    try {
      if (!selector) return null;
      
      const result = await wallet.viewFunction({
        contractId: 'social.near',
        methodName: 'get_account_storage',
        args: { account_id: accountId }
      });

      console.log("Social storage data:", result);

      if (result) {
        // We focus on available_bytes as these are the points that can be withdrawn
        const availableBytes = result.available_bytes || 0;
        console.log("Available bytes:", availableBytes);
        return availableBytes.toString();
      }
      return "0";
    } catch (error) {
      console.error("Error fetching social storage data:", error);
      return null;
    }
  }

  async function handleClaimPoints() {
    if (!accountId || !socialStorage || isClaimingPoints) return;
    
    setIsClaimingPoints(true);
    try {
      // Get current available bytes before withdrawal
      const currentStorage = await fetchSocialStorageBalance(accountId);
      if (!currentStorage) {
        throw new Error("Could not fetch current storage balance");
      }

      // Convert bytes to yoctoNEAR for withdrawal
      const withdrawAmount = bytesToYoctoNEAR(currentStorage);
      console.log("Withdrawing amount in yoctoNEAR:", withdrawAmount);

      await wallet.executeTransaction({
        contractId: 'social.near',
        methodName: 'storage_withdraw',
        args: { amount: withdrawAmount },
        gas: '30000000000000',
        deposit: '1',
        callbackUrl: window.location.href
      });

      // Perform 3 refresh attempts with 2-second intervals
      for (let i = 1; i <= 3; i++) {
        setTimeout(async () => {
          console.log(`Refresh attempt ${i}/3`);
          const newSocialBalance = await fetchSocialStorageBalance(accountId);
          setSocialStorage(newSocialBalance);
          
          const newNearBalance = await fetchAccountDetails(accountId);
          setBalances(prev => ({ ...prev, near: newNearBalance }));
        }, i * 2000); // 2000ms = 2 seconds
      }

    } catch (error) {
      console.error("Error claiming points:", error);
    } finally {
      setIsClaimingPoints(false);
    }
  }

  async function fetchCRANSBalance(accountId: string) {
    try {
      if (!selector) return "0";
      
      const result = await wallet.viewFunction({
        contractId: NETWORK_CONFIG.cransContractId,
        methodName: "ft_balance_of",
        args: { account_id: accountId }
      });

      console.log("Raw CRANS token data:", result);

      if (result) {
        return formatTokenAmount(result);
      }
      return "0";
    } catch (error) {
      console.error("Error fetching CRANS balance:", error);
      return "N/A";
    }
  }

  async function fetchAccountDetails(accountId: string) {
    try {
      if (!selector) return "0";
      
      const provider = new providers.JsonRpcProvider({ url: NETWORK_CONFIG.nodeUrl }) as any;
      const account = await provider.query({
        request_type: 'view_account',
        account_id: accountId,
        finality: 'final'
      });

      console.log("Raw account data:", account);
      
      if (account.amount) {
        return formatTokenAmount(account.amount);
      }
      return "0";
    } catch (error) {
      console.error("Error fetching account details:", error);
      return "Error";
    }
  }

  useEffect(() => {
    if (accountId && selector) {
      fetchBalances();
    }
  }, [accountId, selector]);

  return (
    <div className={styles.container}>
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>{accountId ? truncateWalletName(accountId) : ''}</h2>
            <div className={styles.headerActions}>
              <button 
                onClick={() => {
                  if (accountId && selector) {
                    setIsClaimingPoints(true);
                    fetchBalances().finally(() => setIsClaimingPoints(false));
                  }
                }}
                disabled={isClaimingPoints}
                className={styles.refreshButton}
                title="Refresh balances"
              >
                <svg 
                  className={`${styles.refreshIcon} ${isClaimingPoints ? styles.spinning : ''}`}
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                </svg>
              </button>
              {accountId && <WalletButton showDisconnect={true} />}
            </div>
          </div>
          <div className={styles.accountInfo}>
            {accountId ? (
              <>
                <div className={styles.balances}>
                  <div className={styles.balanceItem}>
                    <span className={styles.label}>Profile Picture</span>
                    <div className={styles.value}>
                      <img 
                        src={`https://i.near.social/magic/thumbnail/https://near.social/magic/img/account/${accountId}`}
                        alt={accountId}
                        className={styles.profilePicture}
                      />
                    </div>
                    <a 
                      href={`https://near.social/mob.near/widget/ProfilePage?accountId=${accountId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.buyButton}
                    >
                      View Profile
                    </a>
                  </div>
                  <div className={styles.balanceItem}>
                    <span className={styles.label}>NEAR Balance</span>
                    <span className={styles.value}>{balances.near} Ⓝ</span>
                  </div>
                  <div className={`${styles.balanceItem} ${styles.pointsItem}`}>
                    <span className={styles.label}>Points</span>
                    <span className={styles.value}>
                      {socialStorage ? formatTerraPoints(socialStorage) : "0"}
                    </span>
                    <span className={styles.pointsRatio}>
                      ≈ {calculateNearAmount(socialStorage || "0")} Ⓝ
                    </span>
                    <button 
                      onClick={handleClaimPoints}
                      disabled={isClaimingPoints || !socialStorage || socialStorage === "0"}
                      className={styles.claimButton}
                    >
                      {isClaimingPoints ? 'Converting...' : 'Convert to NEAR'}
                    </button>
                  </div>
                  <div className={styles.balanceItem}>
                    <span className={styles.label}>CRANS Balance</span>
                    <span className={styles.value}>{balances.crans} CRANS</span>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.notConnected}>
                <WalletButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
