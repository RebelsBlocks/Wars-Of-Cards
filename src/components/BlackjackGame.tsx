import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import styles from '../styles/Blackjack.module.css';
import { blackjackService } from '../services/blackjack';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { NETWORK_CONFIG } from '@/contexts/NearWalletContext';
import BN from 'bn.js';
import { GestureAreaBuffer } from './GestureAreaBuffer';
import { providers } from 'near-api-js';

// Constants for betting
const ENTRY_FEE = 210; // 210 CRANS
const ENTRY_FEE_YOCTO = "210000000000000000000000000"; // 210 with 24 decimals

// Add swap-related constants (similar to Brief.tsx)
const POOLS = {
  CRANS_NEAR: 5423,      // CRANS/NEAR pool
};

const TOKENS = {
  CRANS: NETWORK_CONFIG.cransContractId,
  NEAR: "wrap.near",
};

const TOKEN_DECIMALS = {
  [TOKENS.CRANS]: 24,    // CRANS has 24 decimals
  [TOKENS.NEAR]: 24,     // NEAR has 24 decimals
};

// Helper function to format token amounts
function formatTokenAmount(amount: string): string {
  const yoctoToToken = new BN("1000000000000000000000000");
  const amountBN = new BN(amount);
  const wholePart = amountBN.div(yoctoToToken);
  const fractionalPart = amountBN.mod(yoctoToToken);
  const fractionalStr = fractionalPart.toString().padStart(24, '0');
  const decimalPlaces = fractionalStr.slice(0, 2);
  return `${wholePart}.${decimalPlaces}`;
}

// Types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface NearTransaction {
  id: string;
  type: 'BET' | 'WIN' | 'LOSS';
  amount: number;
  from: string;
  to: string;
  timestamp: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface Card {
  suit: Suit;
  rank: Rank;
  hidden: boolean;
}

export type GameState = 'WAITING_FOR_BET' | 'PLAYER_TURN' | 'DEALER_TURN' | 'GAME_ENDED' | 'ERROR' | 'BETTING';

export interface VaultState {
  balance: number;
  transactions: NearTransaction[];
}

export interface PlayerState {
  balance: number;
  currentBet: number;
}

export interface GameContextType {
  playerHand: Card[];
  dealerHand: Card[];
  gameState: GameState;
  message: string;
  playerScore: number;
  dealerScore: number;
  canHit: boolean;
  canStand: boolean;
  hit: () => Promise<void>;
  stand: () => Promise<void>;
  resetGame: () => Promise<void>;
  startGame: () => Promise<void>;
  updateGameState: () => Promise<void>;
  setGameState: (state: GameState) => void;
}

// Create context with default values
const BlackjackContext = createContext<GameContextType | undefined>(undefined);

// Custom hook to use the context
export const useBlackjack = () => {
  const context = useContext(BlackjackContext);
  if (context === undefined) {
    throw new Error('useBlackjack must be used within a BlackjackProvider');
  }
  return context;
};

interface BlackjackProviderProps {
  children: ReactNode;
}

// Add new interface for game log
interface GameLog {
  gameId: number;
  timestamp: number;
  initialState: {
    playerBalance: number;
    vaultBalance: number;
  };
  bet: number;
  playerCards: Card[];
  dealerCards: Card[];
  scores: {
    player: number;
    dealer: number;
  };
  result: {
    winner: 'player' | 'casino';
    amount: number;
  };
  finalState: {
    playerBalance: number;
    vaultBalance: number;
  };
}

// Update logging function
const logGameToFile = async (log: Omit<GameLog, 'gameId'>) => {
  try {
    const response = await fetch('/api/game-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      throw new Error('Failed to log game');
    }

    const data = await response.json();
    return data.gameId;
  } catch (error) {
    console.error('Failed to log game:', error);
    return null;
  }
};

export const BlackjackProvider: React.FC<BlackjackProviderProps> = ({ children }) => {
  const wallet = useNearWallet();
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameState>('WAITING_FOR_BET');
  const [message, setMessage] = useState<string>('Place your bet to start the game');
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [dealerScore, setDealerScore] = useState<number>(0);

  // Calculate scores
  const calculateScore = (hand: Card[]): number => {
    let score = 0;
    let aces = 0;
    
    for (const card of hand) {
      if (card.hidden) continue;
      
      if (card.rank === 'A') {
        aces += 1;
        score += 11;
      } else if (['K', 'Q', 'J'].includes(card.rank)) {
        score += 10;
      } else {
        score += parseInt(card.rank, 10);
      }
    }
    
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    
    return score;
  };

  // Update game state
  const updateGameState = async () => {
    if (!wallet.accountId) return;

    try {
      const state = await blackjackService.getGameState(wallet.accountId);
      setPlayerHand(state.playerHand);
      setDealerHand(state.dealerHand);
      setGameState(state.state);
      setMessage(state.message);
      setPlayerScore(state.playerScore);
      setDealerScore(state.dealerScore);
    } catch (error) {
      console.error('Failed to update game state:', error);
      setMessage('Error updating game state');
      setGameState('ERROR');
    }
  };

  // Start game (create new game and set initial state)
  const startGame = async () => {
    if (!wallet.accountId) {
      setMessage('Please connect your wallet');
      return;
    }

    try {
      await blackjackService.createGame(wallet.accountId);
      setGameState('PLAYER_TURN');
      await updateGameState();
    } catch (error) {
      console.error('Failed to start game:', error);
      setMessage('Error starting game');
      setGameState('WAITING_FOR_BET');
    }
  };

  // Hit
  const hit = async () => {
    if (!wallet.accountId || gameState !== 'PLAYER_TURN') return;

    try {
      // Zamiast natychmiast zmieniać stan, ustawiamy flagę ładowania
      setMessage("Drawing card...");
      
      const result = await blackjackService.hit(wallet.accountId);
      
      // Najpierw aktualizujemy rękę gracza i pokazujemy nową kartę
      setPlayerHand(result.playerHand);
      
      // Dłuższa pauza aby karta była w pełni widoczna przed aktualizacją wyniku
      // Card animation takes ~300ms + transition time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPlayerScore(result.playerScore);
      
      // Usuwamy dodatkową pauzę przed sprawdzeniem wyniku gdy gracz ma 21
      if (result.playerScore === 21) {
        // Natychmiast aktualizujemy stan gry bez dodatkowej pauzy
        setDealerHand(result.dealerHand);
        setDealerScore(result.dealerScore);
        setGameState('GAME_ENDED');
        setMessage(''); // Usuwamy komunikat tekstowy
      } else if (result.playerScore > 21) {
        // Usuwamy komunikat tekstowy Bust!
        
        // Pauza aby gracz mógł zobaczyć zmiany
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setDealerHand(result.dealerHand);
        setDealerScore(result.dealerScore);
        setGameState('GAME_ENDED');
        setMessage(''); // Usuwamy komunikat tekstowy
      } else {
        setGameState('PLAYER_TURN');
        setMessage('Your turn! Hit or Stand?');
      }
    } catch (error) {
      console.error('Failed to hit:', error);
      setMessage('Error hitting');
      setGameState('PLAYER_TURN');
    }
  };

  // Stand
  const stand = async () => {
    if (!wallet.accountId || gameState !== 'PLAYER_TURN') return;

    try {
      setGameState('DEALER_TURN');
      setMessage("Dealer's move!");
      const result = await blackjackService.stand(wallet.accountId);
      
      // Najpierw odkrywamy ukrytą kartę dealera
      const visibleDealerCards = result.dealerHand.map((card, index) => 
        index === 1 ? { ...card, hidden: false } : card
      ).slice(0, 2); // Bierzemy tylko pierwsze dwie karty na start
      
      setDealerHand(visibleDealerCards);
      
      // Dłuższa pauza dla pełnej animacji odkrycia karty
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Aktualizujemy wynik dealera po odkryciu karty
      setDealerScore(calculateScore(visibleDealerCards));
      
      // Pauza aby pokazać wynik po odkryciu karty
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Jeśli dealer ma więcej kart niż początkowe dwie, pokazujemy je sekwencyjnie
      if (result.dealerHand.length > 2) {
        let currentCards = [...visibleDealerCards];
        
        for (let i = 2; i < result.dealerHand.length; i++) {
          // Dodajemy nową kartę do kopii tablicy
          currentCards = [...currentCards, result.dealerHand[i]];
          
          // Ustawiamy zaktualizowaną tablicę kart
          setDealerHand([...currentCards]);
          
          // Dłuższa pauza po dodaniu każdej karty, aby animacja mogła się zakończyć
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Aktualizujemy wynik po zakończeniu animacji karty
          setDealerScore(calculateScore(currentCards));
          
          // Sprawdzamy czy dealer przekroczył 21, ale nie pokazujemy komunikatu
          if (calculateScore(currentCards) > 21) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }
      
      // Na koniec upewniamy się, że pokazujemy wszystkie karty
      setDealerHand([...result.dealerHand]);
      setDealerScore(result.dealerScore);
      
      // Pauza przed pokazaniem wyniku
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Aktualizujemy stan gry i pokazujemy wynik
      setGameState(result.state);
      setPlayerHand(result.playerHand);
      setPlayerScore(result.playerScore);
      setMessage(''); // Usuwamy komunikat tekstowy na końcu gry
    } catch (error) {
      console.error('Failed to stand:', error);
      setMessage('Error standing');
    }
  };

  // Reset game
  const resetGame = async () => {
    if (!wallet.accountId) return;

    try {
      setGameState('WAITING_FOR_BET');
      setPlayerHand([]);
      setDealerHand([]);
      setMessage('Place your bet to start the game');
    } catch (error) {
      console.error('Failed to reset game:', error);
      setMessage('Error resetting game');
    }
  };

  const contextValue: GameContextType = {
    playerHand,
    dealerHand,
    gameState,
    message,
    playerScore,
    dealerScore,
    canHit: gameState === 'PLAYER_TURN',
    canStand: gameState === 'PLAYER_TURN',
    hit,
    stand,
    resetGame,
    startGame,
    updateGameState,
    setGameState
  };

  return (
    <BlackjackContext.Provider value={contextValue}>
      {children}
    </BlackjackContext.Provider>
  );
};

// Helper function to get card suit symbol
const getSuitSymbol = (suit: Suit): string => {
  switch(suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};

// Card Component
interface CardProps {
  card: Card;
  key?: string;
  animationDelay?: number;
}

const Card: React.FC<CardProps> = ({ card, animationDelay = 0 }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Efekt dla animacji wejścia karty
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay);
    
    return () => clearTimeout(timer);
  }, [animationDelay]);
  
  // Efekt dla animacji odkrywania ukrytej karty
  useEffect(() => {
    if (card.hidden === false) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 500); // Czas trwania animacji
      
      return () => clearTimeout(timer);
    }
  }, [card.hidden]);
  
  const cardClasses = [
    styles.cardWrapper,
    isVisible ? styles.cardVisible : styles.cardHidden,
    isFlipping ? styles.flipping : ''
  ].filter(Boolean).join(' ');
  
  if (card.hidden) {
    return (
      <div className={cardClasses} style={{ transitionDelay: `${animationDelay}ms` }}>
        <div className={styles.cardFaceHidden}>
          <div></div>
        </div>
      </div>
    );
  }
  
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? styles.red : styles.black;
  
  return (
    <div className={cardClasses} style={{ transitionDelay: `${animationDelay}ms` }}>
      <div className={styles.cardFace}>
        <div className={`${styles.cardValue} ${colorClass}`}>{card.rank}</div>
        <div className={`${styles.cardSuit} ${colorClass}`}>{getSuitSymbol(card.suit)}</div>
        <div className={`${styles.cardValue} ${colorClass}`} style={{ alignSelf: 'flex-end' }}>{card.rank}</div>
      </div>
    </div>
  );
};

// Game Controls Component
const GameControls: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { 
    hit, 
    stand, 
    resetGame, 
    gameState, 
    canHit, 
    canStand
  } = useBlackjack();
  
  if (gameState === 'GAME_ENDED') {
    return null;
  }
  
  if (gameState === 'PLAYER_TURN') {
    return (
      <div className={styles.buttonContainer}>
        <button 
          className={styles.actionButton}
          onClick={hit} 
          disabled={!canHit}
        >
          Hit
        </button>
        
        <button 
          className={styles.actionButton}
          onClick={stand} 
          disabled={!canStand}
        >
          Stand
        </button>
      </div>
    );
  }

  return null;
};

// VaultDisplay Component
const VaultDisplay: React.FC<{ vaultState: VaultState }> = ({ vaultState }) => {
  const { balance, transactions } = vaultState;
  const lastTransaction = transactions[transactions.length - 1];
  
  return (
    <div className={styles.vaultDisplay}>
      <div className={styles.vaultBalance}>
        Vault Balance: {balance} CRANS
      </div>
      <div className={styles.vaultStats}>
        {lastTransaction && (
          <div className={styles.lastTransaction}>
            Last: {lastTransaction.type} {lastTransaction.amount} CRANS
          </div>
        )}
      </div>
    </div>
  );
};

interface BlackjackGameProps {
  onBack: () => void;
}

// Function to get token exchange rate (from Brief.tsx)
async function getSwapReturn(amountIn: string, isNearToCrans: boolean): Promise<string> {
  try {
    const provider = new providers.JsonRpcProvider({ url: 'https://free.rpc.fastnear.com' }) as any;
    const args = {
      pool_id: POOLS.CRANS_NEAR,
      token_in: isNearToCrans ? TOKENS.NEAR : TOKENS.CRANS,
      token_out: isNearToCrans ? TOKENS.CRANS : TOKENS.NEAR,
      amount_in: amountIn
    };
    
    const args_base64 = Buffer.from(JSON.stringify(args)).toString('base64');
    
    const response: any = await provider.query({
      request_type: 'call_function',
      account_id: 'v2.ref-finance.near',
      method_name: 'get_return',
      args_base64,
      finality: 'final'
    });
    
    if (response && response.result) {
      const resultBytes = Buffer.from(response.result);
      const resultText = new TextDecoder().decode(resultBytes);
      return JSON.parse(resultText);
    }
    
    return "0";
  } catch (error) {
    console.error('Error in getSwapReturn:', error);
    return "0";
  }
}

// Function to prepare swap transaction message (from Brief.tsx)
function prepareSwapMsg(amount: string, isNearToCrans: boolean, expectedReturn: string) {
  const formattedReturn = new BN(expectedReturn).mul(new BN(95)).div(new BN(100)).toString();
    
  return JSON.stringify({
    force: 0,
    actions: [{
      pool_id: POOLS.CRANS_NEAR,
      token_in: isNearToCrans ? TOKENS.NEAR : TOKENS.CRANS,
      token_out: isNearToCrans ? TOKENS.CRANS : TOKENS.NEAR,
      amount_in: amount,
      min_amount_out: formattedReturn
    }]
  });
}

// Add storage balance checking functions (from Brief.tsx)
async function checkWrapNearStorageBalance(accountId: string, wallet: any): Promise<boolean> {
  try {
    if (!wallet.selector) return false;
    
    const result = await wallet.viewFunction({
      contractId: TOKENS.NEAR,
      methodName: "storage_balance_of",
      args: { account_id: accountId }
    });

    return result && result.total === "1250000000000000000000";
  } catch (error) {
    console.error("Error checking wrap.near storage balance:", error);
    return false;
  }
}

async function checkCransStorageBalance(accountId: string, wallet: any): Promise<boolean> {
  try {
    if (!wallet.selector) return false;
    
    const result = await wallet.viewFunction({
      contractId: TOKENS.CRANS,
      methodName: "storage_balance_of",
      args: { account_id: accountId }
    });

    return result && result.total === "1250000000000000000000";
  } catch (error) {
    console.error("Error checking CRANS storage balance:", error);
    return false;
  }
}

async function fetchNearBalance(accountId: string, wallet: any): Promise<string> {
  try {
    if (!wallet.selector) return "0";
    
    const provider = new providers.JsonRpcProvider({ url: NETWORK_CONFIG.nodeUrl }) as any;
    const account = await provider.query({
      request_type: 'view_account',
      account_id: accountId,
      finality: 'final'
    });

    if (account.amount) {
      return account.amount;
    }
    return "0";
  } catch (error) {
    console.error("Error fetching NEAR balance:", error);
    return "0";
  }
}

// Blackjack Game Component (Main Component)
export const BlackjackGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const wallet = useNearWallet();
  const { 
    playerHand, 
    dealerHand, 
    gameState, 
    playerScore, 
    dealerScore,
    message,
    resetGame,
    startGame,
    setGameState,
    updateGameState
  } = useBlackjack();

  const [balance, setBalance] = useState<string>("0");
  const [nearBalance, setNearBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogoScreen, setShowLogoScreen] = useState<boolean>(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [nearAmount, setNearAmount] = useState<string>("0");

  // Show logo for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogoScreen(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Add CSS variable for safe area inset
  useEffect(() => {
    function updateSafeAreaInsets() {
      const safeAreaInsetBottom = window.getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0px';
      document.documentElement.style.setProperty('--safe-area-inset-bottom', safeAreaInsetBottom);
    }
    
    updateSafeAreaInsets();
    window.addEventListener('resize', updateSafeAreaInsets);
    return () => window.removeEventListener('resize', updateSafeAreaInsets);
  }, []);

  // Fetch CRANS and NEAR balances
  async function fetchBalances(accountId: string) {
    if (!wallet.selector) return;
    
    try {
      const [cransBalance, rawNearBalance] = await Promise.all([
        fetchCRANSBalance(accountId),
        fetchNearBalance(accountId, wallet)
      ]);
      
      setBalance(formatTokenAmount(cransBalance));
      setNearBalance(formatTokenAmount(rawNearBalance));
      
      // Calculate how much NEAR is needed for 210 CRANS
      const nearAmountInYocto = new BN("1000000000000000000000000"); // 1 NEAR in yocto
      const exchangeResult = await getSwapReturn(nearAmountInYocto.toString(), true);
      
      // Calculate how many NEAR needed for 210 CRANS (with 10% slippage)
      const cransPerNear = new BN(exchangeResult);
      const cransNeeded = new BN("210000000000000000000000000");
      
      // NEAR needed = (210 CRANS * 1.10) / (CRANS per 1 NEAR)
      const nearNeededWithSlippage = cransNeeded.mul(new BN(110)).div(new BN(100)).mul(new BN(nearAmountInYocto)).div(cransPerNear);
      
      setNearAmount(formatTokenAmount(nearNeededWithSlippage.toString()));
      
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }

  // Fetch CRANS balance
  async function fetchCRANSBalance(accountId: string) {
    try {
      if (!wallet.selector) return "0";
      
      const result = await wallet.viewFunction({
        contractId: NETWORK_CONFIG.cransContractId,
        methodName: "ft_balance_of",
        args: { account_id: accountId }
      });

      return result;
    } catch (error) {
      console.error("Error fetching CRANS balance:", error);
      return "0";
    }
  }

  useEffect(() => {
    if (wallet.accountId) {
      fetchBalances(wallet.accountId);
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
        deposit: "1", // 1 yoctoNEAR required for ft_transfer
        callbackUrl: window.location.href
      });

      if (result) {
        // After successful transfer, create game and start playing
        try {
          await startGame(); // This will handle state changes and game creation
          // Fetch updated balance in background
          fetchCRANSBalance(wallet.accountId).then(result => setBalance(formatTokenAmount(result)));
        } catch (error) {
          console.error('Failed to start game:', error);
          setError('Failed to start game. Please try again.');
          setGameState('WAITING_FOR_BET');
        }
      }
    } catch (error) {
      console.error("Failed to transfer CRANS:", error);
      setError("Failed to transfer CRANS. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle buying CRANS
  const handleBuyCrans = async () => {
    if (!wallet.accountId || swapLoading) return;
    
    setSwapLoading(true);
    setError(null);
    
    try {
      // Check storage needs
      const hasWrapStorage = await checkWrapNearStorageBalance(wallet.accountId, wallet);
      const hasCransStorage = await checkCransStorageBalance(wallet.accountId, wallet);
      
      // Prepare transactions based on storage needs
      const transactions = [];
      
      // Add storage deposit transactions if needed
      if (!hasWrapStorage) {
        transactions.push({
          contractId: TOKENS.NEAR,
          methodName: 'storage_deposit',
          args: {},
          gas: '30000000000000',
          deposit: '1250000000000000000000'
        });
      }
      
      if (!hasCransStorage) {
        transactions.push({
          contractId: TOKENS.CRANS,
          methodName: 'storage_deposit',
          args: {},
          gas: '30000000000000',
          deposit: '1250000000000000000000'
        });
      }
      
      // Calculate how much NEAR to wrap
      const nearAmountInYocto = new BN("1000000000000000000000000"); // 1 NEAR in yocto
      const exchangeResult = await getSwapReturn(nearAmountInYocto.toString(), true);
      
      // Calculate how many NEAR needed for 210 CRANS (with 10% slippage)
      const cransPerNear = new BN(exchangeResult);
      const cransNeeded = new BN("210000000000000000000000000");
      
      // NEAR needed = (210 CRANS * 1.10) / (CRANS per 1 NEAR)
      const nearNeededWithSlippage = cransNeeded.mul(new BN(110)).div(new BN(100)).mul(new BN(nearAmountInYocto)).div(cransPerNear);
      
      // Add wrap near transaction
      transactions.push({
        contractId: TOKENS.NEAR,
        methodName: 'near_deposit',
        args: {},
        gas: '50000000000000',
        deposit: nearNeededWithSlippage.toString()
      });
      
      // Add token swap transaction
      transactions.push({
        contractId: TOKENS.NEAR,
        methodName: 'ft_transfer_call',
        args: {
          receiver_id: 'v2.ref-finance.near',
          amount: nearNeededWithSlippage.toString(),
          msg: prepareSwapMsg(nearNeededWithSlippage.toString(), true, cransNeeded.toString())
        },
        gas: '180000000000000',
        deposit: '1'
      });
      
      // Execute all transactions
      const result = await wallet.executeTransactions(transactions, {
        callbackUrl: window.location.href
      });
      
      // After successful swap, update balances
      if (result) {
        await fetchBalances(wallet.accountId);
        
        // Dodatkowe odświeżenie salda po 1 sekundzie dla pewności
        setTimeout(() => {
          if (wallet.accountId) {
            fetchBalances(wallet.accountId);
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to buy CRANS:", error);
      setError("Failed to buy CRANS. Please try again.");
    } finally {
      setSwapLoading(false);
    }
  };

  // Dodajemy też aktualizację balansu po zakończeniu gry
  useEffect(() => {
    if (gameState === 'GAME_ENDED' && wallet.accountId) {
      // Aktualizujemy balans w tle po zakończeniu gry
      fetchCRANSBalance(wallet.accountId).then(result => setBalance(formatTokenAmount(result)));
    }
  }, [gameState, wallet.accountId]);

  const hasEnoughBalance = parseFloat(balance) >= ENTRY_FEE;
  const hasSurplusBalance = parseFloat(balance) > ENTRY_FEE * 2; // Jeśli ma więcej niż podwójną kwotę wejściową
  const hasPlayerWon = gameState === 'GAME_ENDED' && (
    (dealerScore > 21 && playerScore <= 21) || // Dealer busts
    (playerScore <= 21 && dealerScore <= 21 && playerScore > dealerScore) || // Player has higher score
    (playerScore === 21 && dealerScore !== 21) // Player has blackjack
  );

  return (
    <div className={styles.gameContainer}>
      {showLogoScreen ? (
        <div className={styles.logoScreen}>
          <img 
            src="/blackjack.png" 
            alt="Blackjack" 
            className={styles.logoImage}
          />
        </div>
      ) : gameState === 'WAITING_FOR_BET' ? (
        <div className={styles.betContainer}>
          {wallet.accountId ? (
            <>
              <div className={styles.balanceDisplay}>
                <span>Balance: {balance}</span>
                <button 
                  className={styles.refreshButton}
                  onClick={() => wallet.accountId && fetchBalances(wallet.accountId)}
                  title="Refresh balance"
                >
                  <svg 
                    className={styles.refreshIcon}
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
              </div>
              <div className={styles.betDisplay}>
                {ENTRY_FEE} CRANS
              </div>
              <button
                className={styles.placeBetButton}
                onClick={handlePlaceBet}
                disabled={!hasEnoughBalance || isLoading}
              >
                {isLoading ? 'Processing...' : 'Enter Game'}
              </button>
              {!hasEnoughBalance && (
                <>
                  <div className={styles.errorMessage}>
                    Buy {ENTRY_FEE} CRANS to play!
                  </div>
                  <button
                    className={styles.buyCransButton}
                    onClick={handleBuyCrans}
                    disabled={swapLoading}
                  >
                    {swapLoading ? 'Processing...' : `Buy ${ENTRY_FEE} CRANS for ~${nearAmount}Ⓝ`}
                  </button>
                </>
              )}
              {hasEnoughBalance && hasSurplusBalance && (
                <div className={styles.infoMessage}>
                  Chat with Vanessa to sell CRANS.
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
          <GestureAreaBuffer />
        </div>
      ) : (
        <div className={styles.gameTable}>
          <div className={styles.dealerArea}>
            <div className={styles.scoreDisplay}>
              Dealer Score: {dealerHand.filter(card => !card.hidden).length > 0 ? dealerScore : '0'}
            </div>
            <div className={styles.cardsContainer}>
              {dealerHand.map((card, index) => (
                <Card key={`dealer-${index}`} card={card} animationDelay={index * 100} />
              ))}
            </div>
          </div>
          
          {/* Pokazujemy message tylko gdy gra nie jest zakończona */}
          {gameState !== 'GAME_ENDED' && (
            <div className={styles.messageDisplay}>
              {message}
            </div>
          )}
          
          <div className={styles.playerSection}>
            <div className={styles.cardsContainer}>
              {playerHand.map((card, index) => (
                <Card key={`player-${index}`} card={card} animationDelay={index * 100} />
              ))}
            </div>
            <div className={styles.scoreDisplay}>
              Your Score: {playerHand.length > 0 ? playerScore : '0'}
            </div>
          </div>

          <GameControls onBack={onBack} />

          {gameState === 'GAME_ENDED' && (
            <div className={`${styles.gameEndOverlay} ${hasPlayerWon ? styles.win : styles.lose}`}>
              <div className={styles.gameEndContent}>
                <img 
                  src={hasPlayerWon ? '/YOU_WON_THE_WAR.png' : '/YOU_LOST_THE_WAR.png'} 
                  alt={hasPlayerWon ? 'You Won!' : 'You Lost!'} 
                  className={styles.warResultImage}
                />
                <div className={styles.gameEndActions}>
                  <button className={styles.playAgainButton} onClick={resetGame}>
                    Play Again
                  </button>
                  {hasPlayerWon && (
                    <div className={styles.rewardMessage}>
                      Reward has been paid to your wallet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <GestureAreaBuffer />
    </div>
  );
}; 
