import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import styles from '../styles/WarGame.module.css';
import { 
  warService, 
  GameState as ServiceGameState, 
  ServerStateUpdate as ServiceServerStateUpdate, 
  Card as ServiceCard 
} from '../services/war';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { NETWORK_CONFIG } from '@/contexts/NearWalletContext';
import { Network } from '@near-wallet-selector/core';
import BN from 'bn.js';
import { GestureAreaBuffer } from './GestureAreaBuffer';
import { providers } from 'near-api-js';

// Token contract addresses
const TOKENS = {
  NEAR: 'wrap.near',
  CRANS: (NETWORK_CONFIG as ExtendedNetwork).cransContractId
};

// Extend the Network type to include cransContractId
interface ExtendedNetwork extends Network {
  cransContractId: string;
}

// Constants for betting
const ENTRY_FEE = 420; // 420 CRANS
const ENTRY_FEE_YOCTO = "420000000000000000000000000"; // 420 with 24 decimals

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

// Typy dla komponentu Card
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker' | 'hidden';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'JOKER' | 'hidden';

interface CardProps {
  suit: Suit;
  rank: Rank;
  value: number;
  isSelected?: boolean;
  isWinner?: boolean;
  disabled?: boolean;
  isJoker?: boolean;
  onClick?: () => void;
  showFace?: boolean;
  className?: string;
  warRound?: number;
  key?: string;
  style?: { [key: string]: string | number };
}

interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  isJoker?: boolean;
}

// Interfejsy dla komunikacji WebSocket
interface ServerStateUpdate {
  type: string;
  data: Partial<GameState>;
}

interface GameState {
  playerCards: (Card | null)[];
  computerCards: Card[];
  deckCards: Card[];
  selectedPlayerCard: Card | null;
  selectedComputerCard: Card | null;
  warPlayerCards: Card[];
  warComputerCards: Card[];
  warRound: number;
  bonusCard: Card | null;
  isFirstRound: boolean;
  playerScore: number;
  computerScore: number;
  gameStatus: string;
  isGameStarted: boolean;
  isRoundActive: boolean;
  isWarActive: boolean;
  showWarAnimation: boolean;
  showTwistAnimation: boolean;
  roundWinner: 'player' | 'computer' | null;
  timeLeft: number;
  isGameComplete: boolean;
  roundsPlayed: number;
  balance: number;
  currentBet: number;
  showBetUI: boolean;
  pointsToAdd: {player: number | null, computer: number | null};
  lastActionTime?: number;
  lastUpdateTime?: number;
  shouldClearCards?: boolean;
  pointsAnimation?: {
    player: number | null;
    computer: number | null;
  };
  showExtraCardAnimation?: boolean;
  rewardSent?: boolean;
  rewardError?: string;
  finalWinner?: 'player' | 'computer' | 'draw';
  gameEndReason?: 'win' | 'loss' | 'giveUp' | 'timeUp';
  isComputerTurn?: boolean;
}

interface WarContextType {
  playerCards: (Card | null)[];
  computerCards: Card[];
  deckCards: Card[];
  selectedPlayerCard: Card | null;
  selectedComputerCard: Card | null;
  warPlayerCards: Card[];
  warComputerCards: Card[];
  warRound: number;
  bonusCard: Card | null;
  isFirstRound: boolean;
  playerScore: number;
  computerScore: number;
  gameStatus: string;
  isGameStarted: boolean;
  isRoundActive: boolean;
  isWarActive: boolean;
  showWarAnimation: boolean;
  showTwistAnimation: boolean;
  roundWinner: 'player' | 'computer' | null;
  timeLeft: number;
  isGameComplete: boolean;
  roundsPlayed: number;
  balance: number;
  currentBet: number;
  showBetUI: boolean;
  pointsToAdd: {player: number | null, computer: number | null};
  selectPlayerCard: (cardIndex: number) => void;
  handleChipClick: (amount: number) => void;
  formatTime: (seconds: number) => string;
  setShowBetUI: (show: boolean) => void;
  setGameStatus: (status: string) => void;
  setIsGameComplete: (complete: boolean) => void;
  setIsGameStarted: (started: boolean) => void;
  pointsAnimation: {
    player: number | null;
    computer: number | null;
  };
  showExtraCardAnimation: boolean;
  playerId: string;
  isConnected: boolean;
  connectionError: string | null;
  handlePlayAgain: () => void;
  gameEndReason?: 'win' | 'loss' | 'giveUp' | 'timeUp';
  placeBet: (amount: number) => void;
  isComputerTurn?: boolean;
  triggerComputerFirstSelect: () => void;
  showGameEndOverlay: boolean;
}

const WarContext = createContext<WarContextType | undefined>(undefined);

export const useWar = () => {
  const context = useContext(WarContext);
  if (context === undefined) {
    throw new Error('useWar must be used within a WarProvider');
  }
  return context;
};

interface WarProviderProps {
  children: ReactNode;
  initialBalance?: number;
}

export const WarProvider: React.FC<WarProviderProps> = ({ 
  children, 
  initialBalance = 1000 
}) => {
  const [playerCards, setPlayerCards] = useState<(Card | null)[]>([]);
  const [computerCards, setComputerCards] = useState<Card[]>([]);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [selectedPlayerCard, setSelectedPlayerCard] = useState<Card | null>(null);
  const [selectedComputerCard, setSelectedComputerCard] = useState<Card | null>(null);
  const [warPlayerCards, setWarPlayerCards] = useState<Card[]>([]);
  const [warComputerCards, setWarComputerCards] = useState<Card[]>([]);
  const [warRound, setWarRound] = useState<number>(0);
  const [bonusCard, setBonusCard] = useState<Card | null>(null);
  const [isFirstRound, setIsFirstRound] = useState<boolean>(true);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [computerScore, setComputerScore] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isRoundActive, setIsRoundActive] = useState<boolean>(false);
  const [isWarActive, setIsWarActive] = useState<boolean>(false);
  const [showWarAnimation, setShowWarAnimation] = useState<boolean>(false);
  const [showTwistAnimation, setShowTwistAnimation] = useState<boolean>(false);
  const [roundWinner, setRoundWinner] = useState<'player' | 'computer' | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [isGameComplete, setIsGameComplete] = useState<boolean>(false);
  const [roundsPlayed, setRoundsPlayed] = useState<number>(0);
  const [balance, setBalance] = useState<number>(initialBalance);
  const [currentBet, setCurrentBet] = useState<number>(100);
  const [showBetUI, setShowBetUI] = useState<boolean>(true);
  const [pointsToAdd, setPointsToAdd] = useState<{player: number | null, computer: number | null}>({player: null, computer: null});
  const [isAnimatingPoints, setIsAnimatingPoints] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState<{player: number | null; computer: number | null}>({
    player: null,
    computer: null
  });
  const [showExtraCardAnimation, setShowExtraCardAnimation] = useState<boolean>(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [gameEndReason, setGameEndReason] = useState<'win' | 'loss' | 'giveUp' | 'timeUp' | undefined>(undefined);
  const [isComputerTurn, setIsComputerTurn] = useState<boolean>(false);
  const [showGameEndOverlay, setShowGameEndOverlay] = useState<boolean>(false);

  const wallet = useNearWallet();

  // Inicjalizacja połączenia przez serwis war.ts
  useEffect(() => {
    // Definiujemy callbacki, które będą obsługiwać zdarzenia z serwisu
    const callbacks = {
      onConnect: () => {
        setIsConnected(true);
        setConnectionError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onError: (error: Error) => {
        setConnectionError(`Connection error: ${error.message}`);
        setIsConnected(false);
      },
      onGameState: (gameState: ServiceGameState) => {
        updateGameState(gameState);
      },
      onStateUpdate: (update: ServiceServerStateUpdate) => {
        handleStateUpdate(update);
      }
    };

    // Inicjalizacja połączenia z serwerem tylko jeśli mamy NEAR accountId
    if (wallet.accountId) {
      warService.connect(callbacks, wallet.accountId);
      setPlayerId(wallet.accountId);
    }
    
    // Cleanup przy odmontowaniu komponentu
    return () => {
      warService.disconnect();
    };
  }, [wallet.accountId]);
  
  // Funkcja do aktualizacji całego stanu gry
  const updateGameState = (gameState: ServiceGameState) => {
    // Szybka ścieżka dla stanu zakończenia gry
    if (gameState.isGameComplete) {
      
      // Ustaw tylko te stany, które są krytyczne dla końca gry
      setIsGameComplete(gameState.isGameComplete);
      setIsGameStarted(gameState.isGameStarted);
      if (gameState.gameEndReason !== undefined) {
        setGameEndReason(gameState.gameEndReason);
      }
      if (gameState.finalWinner !== undefined) {
        // Zachowaj obecną logikę dla finalWinner jeśli jest
      }
      
      // Zaktualizuj wyniki końcowe
      setPlayerScore(gameState.playerScore);
      setComputerScore(gameState.computerScore);

      // Nie pokazujemy od razu ekranu końcowego
      setShowGameEndOverlay(false);
      
      return; // Wczesny return, aby uniknąć niepotrzebnych aktualizacji
    }
    
    // Normalna aktualizacja stanu dla pozostałych przypadków
    setPlayerCards(gameState.playerCards);
    setComputerCards(gameState.computerCards);
    setDeckCards(gameState.deckCards);
    setSelectedPlayerCard(gameState.selectedPlayerCard);
    setSelectedComputerCard(gameState.selectedComputerCard);
    setWarPlayerCards(gameState.warPlayerCards);
    setWarComputerCards(gameState.warComputerCards);
    setWarRound(gameState.warRound);
    setBonusCard(gameState.bonusCard);
    setIsFirstRound(gameState.isFirstRound);
    setPlayerScore(gameState.playerScore);
    setComputerScore(gameState.computerScore);
    setGameStatus(gameState.gameStatus);
    setIsGameStarted(gameState.isGameStarted);
    setIsRoundActive(gameState.isRoundActive);
    setIsWarActive(gameState.isWarActive);
    setShowWarAnimation(gameState.showWarAnimation);
    setShowTwistAnimation(gameState.showTwistAnimation);
    setRoundWinner(gameState.roundWinner);
    setTimeLeft(gameState.timeLeft);
    setIsGameComplete(gameState.isGameComplete);
    setRoundsPlayed(gameState.roundsPlayed);
    setBalance(gameState.balance);
    setCurrentBet(gameState.currentBet);
    setShowBetUI(gameState.showBetUI);
    setPointsToAdd(gameState.pointsToAdd);
    
    if (gameState.pointsAnimation) {
      setPointsAnimation(gameState.pointsAnimation);
    }
    
    if (gameState.showExtraCardAnimation !== undefined) {
      setShowExtraCardAnimation(gameState.showExtraCardAnimation);
    }
    
    // Dodajemy obsługę isComputerTurn
    if (gameState.isComputerTurn !== undefined) {
      setIsComputerTurn(gameState.isComputerTurn);
    }
    
    // gameEndReason jest już obsługiwany w ścieżce isGameComplete=true powyżej

    // Obsługa flagi czyszczenia kart ze stołu
    if (gameState.shouldClearCards) {
      // Krótkie opóźnienie dla animacji punktów
      setTimeout(() => {
        setSelectedPlayerCard(null);
        setSelectedComputerCard(null);
        setWarPlayerCards([]);
        setWarComputerCards([]);
      }, 800);
    }
  };
  
  // Obsługa aktualizacji stanu
  const handleStateUpdate = (update: ServiceServerStateUpdate) => {
    const { type, data } = update;
    
    // Priorytetyzuj przypadek GAME_COMPLETE dla natychmiastowej aktualizacji UI
    if (type === 'GAME_COMPLETE') {
      // Natychmiastowa aktualizacja stanu zakończenia gry
      if (data.isGameComplete !== undefined) setIsGameComplete(data.isGameComplete);
      if (data.isGameStarted !== undefined) setIsGameStarted(data.isGameStarted);
      if (data.gameEndReason !== undefined) setGameEndReason(data.gameEndReason);
      if (data.finalWinner !== undefined) { 
        // Nie używamy pola rewardSent - zakładamy, że nagroda jest wysyłana asynchronicznie w tle
        // gdy finalWinner === 'player'
      }
      
      // Wczesny return aby uniknąć dalszego przetwarzania aktualizacji
      return;
    }
    
    switch (type) {
      case 'PLAYER_CARD_SELECTED':
        if (data.playerCards) setPlayerCards(data.playerCards);
        if (data.selectedPlayerCard) setSelectedPlayerCard(data.selectedPlayerCard);
        break;
        
      case 'COMPUTER_CARD_SELECTED':
        if (data.computerCards) setComputerCards(data.computerCards);
        if (data.selectedComputerCard) setSelectedComputerCard(data.selectedComputerCard);
        setIsComputerTurn(false);
        break;
        
      case 'GAME_STARTED':
        if (data.isGameStarted !== undefined) {
          setIsGameStarted(data.isGameStarted);
        }
        if (data.playerCards) setPlayerCards(data.playerCards);
        if (data.computerCards) setComputerCards(data.computerCards);
        if (data.deckCards) setDeckCards(data.deckCards);
        if (data.bonusCard) setBonusCard(data.bonusCard);
        if (data.showBetUI !== undefined) setShowBetUI(data.showBetUI);
        if (data.isComputerTurn !== undefined) setIsComputerTurn(data.isComputerTurn);
        break;
        
      case 'WAR_START':
        if (data.isWarActive !== undefined) setIsWarActive(data.isWarActive);
        if (data.showWarAnimation !== undefined) setShowWarAnimation(data.showWarAnimation);
        break;
        
      case 'WAR_ANIMATION_END':
        if (data.showWarAnimation !== undefined) setShowWarAnimation(data.showWarAnimation);
        break;
        
      case 'WAR_CARDS_UPDATED':
        if (data.warPlayerCards) setWarPlayerCards(data.warPlayerCards);
        if (data.warComputerCards) setWarComputerCards(data.warComputerCards);
        if (data.deckCards) setDeckCards(data.deckCards);
        if (data.warRound !== undefined) setWarRound(data.warRound);
        break;
        
      case 'TWIST_ANIMATION':
        if (data.showTwistAnimation !== undefined) setShowTwistAnimation(data.showTwistAnimation);
        break;
        
      case 'TWIST_ANIMATION_END':
        if (data.showTwistAnimation !== undefined) setShowTwistAnimation(data.showTwistAnimation);
        break;
        
      case 'ROUND_END':
        if (data.roundWinner !== undefined) setRoundWinner(data.roundWinner);
        if (data.playerScore !== undefined) setPlayerScore(data.playerScore);
        if (data.computerScore !== undefined) setComputerScore(data.computerScore);
        break;
        
      case 'POINTS_ANIMATION':
        // Obsługa animacji punktów
        if (data.pointsAnimation) {
          setPointsAnimation(data.pointsAnimation);
        }
        break;
        
      case 'CLEAR_ANIMATIONS':
        if (data.pointsAnimation) setPointsAnimation(data.pointsAnimation);
        // Aktualizacja punktów po zakończeniu animacji
        if (data.playerScore !== undefined) setPlayerScore(data.playerScore);
        if (data.computerScore !== undefined) setComputerScore(data.computerScore);
        break;
        
      case 'CLEAR_EXTRA_CARD_ANIMATION':
        if (data.showExtraCardAnimation !== undefined) setShowExtraCardAnimation(data.showExtraCardAnimation);
        break;
        
      case 'CLEAR_CARDS':
        // Czyścimy karty ze stołu i resetujemy stan rundy
        setSelectedPlayerCard(null);
        setSelectedComputerCard(null);
        setWarPlayerCards([]);
        setWarComputerCards([]);
        setIsRoundActive(false);
        setIsWarActive(false);
        setShowWarAnimation(false);
        setShowTwistAnimation(false);
        setRoundWinner(null);
        if (data.isGameStarted !== undefined) setIsGameStarted(data.isGameStarted);
        if (data.bonusCard !== undefined) setBonusCard(data.bonusCard);
        if (data.isFirstRound !== undefined) setIsFirstRound(data.isFirstRound);
        if (data.isComputerTurn !== undefined) setIsComputerTurn(data.isComputerTurn);
        setShowBetUI(false); // Upewnij się, że showBetUI pozostaje false podczas gry
        break;
        
      case 'TIME_SYNC':
        // Nie aktualizuj czasu jeśli gra jest już zakończona
        if (isGameComplete) {
          break;
        }
        
        // Obsługa synchronizacji czasu - aktualizuj tylko jeśli różnica jest duża
        if (data.timeLeft !== undefined) {
          setTimeLeft(prevTime => {
            // Jeśli różnica czasu jest większa niż 3 sekundy, aktualizuj
            if (Math.abs(prevTime - data.timeLeft!) > 3) {
              return data.timeLeft!;
            }
            // W przeciwnym razie zachowaj lokalny czas
            return prevTime;
          });
        }
        break;
        
      default:
        // Przetwarzamy pola, które występują w danych aktualizacji
        if (data.playerCards !== undefined) setPlayerCards(data.playerCards);
        if (data.computerCards !== undefined) setComputerCards(data.computerCards);
        if (data.deckCards !== undefined) setDeckCards(data.deckCards);
        if (data.selectedPlayerCard !== undefined) setSelectedPlayerCard(data.selectedPlayerCard);
        if (data.selectedComputerCard !== undefined) setSelectedComputerCard(data.selectedComputerCard);
        if (data.warPlayerCards !== undefined) setWarPlayerCards(data.warPlayerCards);
        if (data.warComputerCards !== undefined) setWarComputerCards(data.warComputerCards);
        if (data.warRound !== undefined) setWarRound(data.warRound);
        if (data.bonusCard !== undefined) setBonusCard(data.bonusCard);
        if (data.isFirstRound !== undefined) setIsFirstRound(data.isFirstRound);
        if (data.playerScore !== undefined) setPlayerScore(data.playerScore);
        if (data.computerScore !== undefined) setComputerScore(data.computerScore);
        if (data.gameStatus !== undefined) setGameStatus(data.gameStatus);
        if (data.isGameStarted !== undefined) setIsGameStarted(data.isGameStarted);
        if (data.isRoundActive !== undefined) setIsRoundActive(data.isRoundActive);
        if (data.isWarActive !== undefined) setIsWarActive(data.isWarActive);
        if (data.showWarAnimation !== undefined) setShowWarAnimation(data.showWarAnimation);
        if (data.showTwistAnimation !== undefined) setShowTwistAnimation(data.showTwistAnimation);
        if (data.roundWinner !== undefined) setRoundWinner(data.roundWinner);
        // Nie aktualizujemy timeLeft bezpośrednio, zamiast tego synchronizujemy tylko na
        // istotnych zmianach w stanie gry, jak początek i koniec gry
        if (data.isGameComplete !== undefined) {
          setIsGameComplete(data.isGameComplete);
          // Aktualizuj timeLeft tylko gdy gra się kończy
          if (data.isGameComplete && data.timeLeft !== undefined) {
            setTimeLeft(data.timeLeft);
          }
        }
        if (data.roundsPlayed !== undefined) setRoundsPlayed(data.roundsPlayed);
        if (data.balance !== undefined) setBalance(data.balance);
        if (data.currentBet !== undefined) setCurrentBet(data.currentBet);
        if (data.showBetUI !== undefined) setShowBetUI(data.showBetUI);
        if (data.pointsToAdd !== undefined) setPointsToAdd(data.pointsToAdd);
        if (data.pointsAnimation !== undefined) setPointsAnimation(data.pointsAnimation);
        if (data.showExtraCardAnimation !== undefined) setShowExtraCardAnimation(data.showExtraCardAnimation);
        if (data.isComputerTurn !== undefined) setIsComputerTurn(data.isComputerTurn);
    }
  };

  useEffect(() => {
    if (isGameStarted && timeLeft > 0 && !isGameComplete) {
      const id = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerId(id);
      
      // Synchronizuj czas z serwerem co 30 sekund, aby uniknąć dryfu
      const syncId = setInterval(() => {
        // Nie synchronizuj czasu jeśli gra jest już zakończona
        if (!isGameComplete) {
          warService.syncTime();
        }
      }, 30000);
      
      return () => {
        if (timerId) clearInterval(timerId);
        clearInterval(syncId);
      };
    } else if (!isGameStarted || isGameComplete) {
      // Wyczyść timer gdy gra się zatrzymuje
      if (timerId) {
        clearInterval(timerId);
        setTimerId(null);
      }
    }
  }, [isGameStarted, isGameComplete]);

  // Dodaj osobny efekt dla synchronizacji czasu przy istotnych zmianach stanu gry
  useEffect(() => {
    // Synchronizuj czas przy rozpoczęciu gry
    if (isGameStarted && !isGameComplete) {
      warService.syncTime();
    }
  }, [isGameStarted, isGameComplete]);

  // Efekt dla dostosowania wysokości viewportu na urządzeniach mobilnych
  useEffect(() => {
    const handleResize = () => {
      // Dostosowanie wysokości do rzeczywistej wysokości viewportu
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Wykrywanie urządzeń Xiaomi/Redmi/MIUI poprzez sprawdzanie user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMIUI = userAgent.includes('miui') || 
                    userAgent.includes('xiaomi') || 
                    userAgent.includes('redmi') || 
                    userAgent.includes('poco');
      
      if (isMIUI) {
        // Dodanie specjalnej klasy dla urządzeń Xiaomi
        document.documentElement.classList.add('miui-device');
        
        // Dodatkowy padding dla górnego paska na urządzeniach Xiaomi
        const extraPadding = window.innerWidth <= 393 ? 40 : 30;
        document.documentElement.style.setProperty('--miui-padding-top', `${extraPadding}px`);
      } else {
        document.documentElement.classList.remove('miui-device');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    return warService.formatTime(seconds);
  };

  // Handler for play again button
  const handlePlayAgain = () => {
    // Reset local game state
    setShowBetUI(true);
    setIsGameComplete(false);
    setIsGameStarted(false);
    setPlayerScore(0);
    setComputerScore(0);
    setRoundsPlayed(0);
    setSelectedPlayerCard(null);
    setSelectedComputerCard(null);
    setWarPlayerCards([]);
    setWarComputerCards([]);
    setBonusCard(null);
    setIsFirstRound(true);
    setPointsAnimation({player: null, computer: null});
    setPointsToAdd({player: null, computer: null});
    setGameEndReason(undefined);
    // Reset the game end overlay flag
    setShowGameEndOverlay(false);
    // Reset isRoundActive flag to ensure we're not in an active round
    setIsRoundActive(false);
    // Reset war-related flags
    setIsWarActive(false);
    setShowWarAnimation(false);
    setShowTwistAnimation(false);
    setRoundWinner(null);
    
    // Explicitly request server to reset the game
    warService.resetGame();
  };

  const handleChipClick = (amount: number) => {
    // Funkcja pozostawiona dla zachowania interfejsu, ale kwota jest stała
  };

  // Simple function to call the warService placeBet
  const placeBet = (amount: number) => {
    warService.placeBet(amount);
    setShowBetUI(false);
  };

  const selectPlayerCard = (cardIndex: number) => {
    // Jeśli jest kolej komputera, gracz nie może wybrać karty
    if (isComputerTurn) {
      return;
    }
    
    if (!isGameStarted || isRoundActive) {
      return;
    }
    
    const card = playerCards[cardIndex];
    if (!card) {
      return;
    }
    
    // Emit to server via service
    warService.selectPlayerCard(cardIndex);
    
    // Local state update for UI responsiveness
    setIsRoundActive(true);
    setShowBetUI(false); // Upewnij się, że ekran zakładów jest ukryty podczas gry
  };

  // Modyfikuję funkcję wyboru karty przez gracza, aby sprawdzała czas i czyja jest kolej
  const handleCardSelection = (cardIndex: number) => {
    // Sprawdź czy to nie jest kolej komputera
    if (isComputerTurn) {
      return;
    }
    
    // Sprawdź czy czas się nie skończył
    if (timeLeft <= 0) {
      return;
    }
    
    // Wywołaj oryginalną funkcję wyboru karty
    selectPlayerCard(cardIndex);
  };

  // W WarProvider przed contextValue dodaję metodę triggerComputerFirstSelect
  const triggerComputerFirstSelect = () => {
    if (isComputerTurn && isRoundActive === false && isGameStarted) {
      warService.computerSelectFirstCard();
    }
  };
  
  // Użyjemy useEffect, aby automatycznie wywoływać tę metodę, gdy jest kolej komputera
  useEffect(() => {
    if (isGameStarted && isComputerTurn && !isRoundActive && !isGameComplete) {
      // Dodaj małe opóźnienie dla lepszego wrażenia gry
      const timer = setTimeout(() => {
        triggerComputerFirstSelect();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isGameStarted, isComputerTurn, isRoundActive, isGameComplete]);
  
  const contextValue: WarContextType = {
    playerCards,
    computerCards,
    deckCards,
    selectedPlayerCard,
    selectedComputerCard,
    warPlayerCards,
    warComputerCards,
    warRound,
    bonusCard,
    isFirstRound,
    playerScore,
    computerScore,
    gameStatus,
    isGameStarted,
    isRoundActive,
    isWarActive,
    showWarAnimation,
    showTwistAnimation,
    roundWinner,
    timeLeft,
    isGameComplete,
    roundsPlayed,
    balance,
    currentBet,
    showBetUI,
    pointsToAdd,
    selectPlayerCard,
    handleChipClick,
    formatTime,
    setShowBetUI,
    setGameStatus,
    setIsGameComplete,
    setIsGameStarted,
    pointsAnimation,
    showExtraCardAnimation,
    playerId,
    isConnected,
    connectionError,
    handlePlayAgain,
    gameEndReason,
    placeBet,
    isComputerTurn,
    triggerComputerFirstSelect,
    showGameEndOverlay
  };

  // Dodajemy efekt, który będzie kontrolował pokazywanie ekranu końcowego
  useEffect(() => {
    if (isGameComplete && !showGameEndOverlay && !showBetUI &&
        !selectedPlayerCard && !selectedComputerCard && 
        !showWarAnimation && !showTwistAnimation && 
        warPlayerCards.length === 0 && warComputerCards.length === 0 &&
        !pointsAnimation.player && !pointsAnimation.computer) {
      // Opóźnij pokazanie ekranu końcowego o 1.5 sekundy po zniknięciu kart i zakończeniu wszystkich animacji
      const timer = setTimeout(() => {
        setShowGameEndOverlay(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isGameComplete, selectedPlayerCard, selectedComputerCard, showGameEndOverlay, 
      showWarAnimation, showTwistAnimation, warPlayerCards, warComputerCards, 
      pointsAnimation.player, pointsAnimation.computer, showBetUI]);

  return (
    <WarContext.Provider value={{
      ...contextValue,
      showTwistAnimation
    }}>
      {children}
    </WarContext.Provider>
  );
};

interface WarGameProps {
  onBack: () => void;
}

// Komponent Card
const Card: React.FC<CardProps> = ({ 
  suit, 
  rank, 
  isSelected, 
  isWinner,
  disabled,
  isJoker,
  onClick,
  showFace = false,
  className = '',
  warRound = 1,
  style
}) => {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      case 'joker': return '🃏';
      default: return '';
    }
  };

  const isRed = suit === 'hearts' || suit === 'diamonds';
  const colorClass = isRed ? styles.red : styles.black;

  // Pokazujemy rewers karty, jeśli:
  // - showFace=false (explicite żądanie rewersu) LUB
  // - suit='hidden' (karta jest ukryta na poziomie backendu)
  if (!showFace || suit === 'hidden') {
    return (
      <div 
        className={`${styles.cardWrapper} ${disabled ? styles.disabled : ''}`}
        onClick={!disabled ? onClick : undefined}
        style={style}
      >
        <div className={styles.cardBack} />
      </div>
    );
  }

  return (
    <div 
      className={`${styles.cardWrapper} ${disabled ? styles.disabled : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={style}
    >
      <div className={`${styles.cardFace} ${isJoker ? styles.cardFaceJoker : ''}`}>
        {!isJoker && (
          <>
            <div className={`${styles.cardValue} ${colorClass}`}>{rank}</div>
            <div className={`${styles.cardSuit} ${colorClass}`}>{getSuitSymbol(suit)}</div>
            <div className={`${styles.cardValue} ${colorClass}`} style={{ alignSelf: 'flex-end' }}>{rank}</div>
          </>
        )}
      </div>
    </div>
  );
};

// Komponent główny gry
export const WarGame: React.FC<WarGameProps> = ({ onBack }) => {
  const wallet = useNearWallet();
  const warContext = useWar();
  const { 
    playerCards, 
    computerCards, 
    deckCards,
    selectedPlayerCard,
    selectedComputerCard, 
    warPlayerCards,
    warComputerCards,
    warRound,
    bonusCard,
    isFirstRound,
    playerScore,
    computerScore,
    gameStatus,
    isGameStarted,
    isRoundActive,
    isWarActive,
    showWarAnimation,
    showTwistAnimation,
    roundWinner,
    timeLeft,
    isGameComplete,
    roundsPlayed,
    balance,
    currentBet,
    showBetUI,
    pointsToAdd,
    selectPlayerCard,
    handleChipClick,
    formatTime,
    setShowBetUI,
    setGameStatus,
    setIsGameComplete,
    setIsGameStarted,
    pointsAnimation,
    showExtraCardAnimation,
    playerId,
    isConnected,
    connectionError,
    handlePlayAgain,
    gameEndReason,
    placeBet,
    isComputerTurn,
    triggerComputerFirstSelect,
    showGameEndOverlay
  } = warContext;

  const [nearBalance, setNearBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogoScreen, setShowLogoScreen] = useState<boolean>(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [nearAmount, setNearAmount] = useState<string>("0");

  // Show logo for 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogoScreen(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch CRANS balance
  async function fetchCRANSBalance(accountId: string) {
    try {
      if (!wallet.selector) return "0";
      
      const result = await wallet.viewFunction({
        contractId: (NETWORK_CONFIG as ExtendedNetwork).cransContractId,
        methodName: "ft_balance_of",
        args: { account_id: accountId }
      });

      return result;
    } catch (error) {
      return "0";
    }
  }

  // Add function to fetch NEAR balance
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
      return "0";
    }
  }

  // Add storage balance checking functions
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

  // Add function to get swap return amount
  async function getSwapReturn(amountIn: string, isNearToCrans: boolean): Promise<string> {
    try {
      const poolId = 5423; // CRANS/NEAR pool - correct pool ID
      const tokenIn = isNearToCrans ? TOKENS.NEAR : TOKENS.CRANS;
      const tokenOut = isNearToCrans ? TOKENS.CRANS : TOKENS.NEAR;
      
      const provider = new providers.JsonRpcProvider({ url: 'https://free.rpc.fastnear.com' }) as any;
      const args = {
        pool_id: poolId,
        token_in: tokenIn,
        token_out: tokenOut,
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
      console.error("Error getting swap return:", error);
      return "0";
    }
  }

  // Add function to prepare swap message
  function prepareSwapMsg(amountIn: string, isNearToCrans: boolean, minimumAmountOut: string): string {
    const formattedReturn = new BN(minimumAmountOut).mul(new BN(95)).div(new BN(100)).toString();
    
    return JSON.stringify({
      force: 0,
      actions: [{
        pool_id: 5423, // CRANS/NEAR pool - correct pool ID
        token_in: isNearToCrans ? TOKENS.NEAR : TOKENS.CRANS,
        token_out: isNearToCrans ? TOKENS.CRANS : TOKENS.NEAR,
        amount_in: amountIn,
        min_amount_out: formattedReturn
      }]
    });
  }

  // Add function to handle buying CRANS
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
      
      // Calculate how many CRANS are missing
      const cransBalance = await fetchCRANSBalance(wallet.accountId);
      const currentCransBN = new BN(cransBalance);
      const entryFeeBN = new BN(ENTRY_FEE_YOCTO);
      
      // If current balance is enough, don't need to swap
      if (currentCransBN.gte(entryFeeBN)) {
        setSwapLoading(false);
        return;
      }
      
      // Calculate missing CRANS
      const missingCransBN = entryFeeBN.sub(currentCransBN);
      
      // Get exchange rate - how many CRANS per 1 NEAR
      const nearAmountInYocto = new BN("1000000000000000000000000"); // 1 NEAR in yocto
      const exchangeResult = await getSwapReturn(nearAmountInYocto.toString(), true);
      
      // Calculate NEAR needed with 10% slippage
      let nearNeededWithSlippage;
      
      if (exchangeResult && exchangeResult !== "0") {
        const cransPerNear = new BN(exchangeResult);
        
        // NEAR needed = (missing CRANS * 1.10) / (CRANS per 1 NEAR)
        nearNeededWithSlippage = missingCransBN
          .mul(new BN(110))
          .div(new BN(100))
          .mul(new BN(nearAmountInYocto))
          .div(cransPerNear);
      } else {
        // Fallback to minimum amount if exchange rate not available
        nearNeededWithSlippage = new BN("10000000000000000000000"); // 0.01 NEAR
      }
      
      // Ensure minimum amount (0.01 NEAR) for very small transactions
      const minAmount = new BN("10000000000000000000000"); // 0.01 NEAR
      
      // Use the larger of calculated amount or min amount
      const finalAmount = nearNeededWithSlippage.lt(minAmount) ? minAmount : nearNeededWithSlippage;
      
      // Add wrap near transaction
      transactions.push({
        contractId: TOKENS.NEAR,
        methodName: 'near_deposit',
        args: {},
        gas: '50000000000000',
        deposit: finalAmount.toString()
      });
      
      // Add token swap transaction
      transactions.push({
        contractId: TOKENS.NEAR,
        methodName: 'ft_transfer_call',
        args: {
          receiver_id: 'v2.ref-finance.near',
          amount: finalAmount.toString(),
          msg: prepareSwapMsg(finalAmount.toString(), true, missingCransBN.toString())
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

  // Fetch CRANS and NEAR balances
  async function fetchBalances(accountId: string) {
    if (!wallet.selector) return;
    
    try {
      const cransBalance = await fetchCRANSBalance(accountId);
      setNearBalance(formatTokenAmount(cransBalance));
      
      // Calculate how much CRANS is needed
      const currentCransBN = new BN(cransBalance);
      const entryFeeBN = new BN(ENTRY_FEE_YOCTO);
      
      // If current balance is enough, don't need to calculate
      if (currentCransBN.gte(entryFeeBN)) {
        setNearAmount("0");
        return;
      }
      
      // Calculate how many CRANS are missing
      const missingCransBN = entryFeeBN.sub(currentCransBN);
      
      // Get exchange rate - how many CRANS per 1 NEAR
      const nearAmountInYocto = new BN("1000000000000000000000000"); // 1 NEAR in yocto
      const exchangeResult = await getSwapReturn(nearAmountInYocto.toString(), true);
      
      // Tylko jeśli exchangeResult jest niepuste
      if (exchangeResult && exchangeResult !== "0") {
        // Calculate how many NEAR needed for missing CRANS (with 10% slippage)
        const cransPerNear = new BN(exchangeResult);
        
        // NEAR needed = (missing CRANS * 1.10) / (CRANS per 1 NEAR)
        const nearNeededWithSlippage = missingCransBN
          .mul(new BN(110))
          .div(new BN(100))
          .mul(new BN(nearAmountInYocto))
          .div(cransPerNear);
        
        // Ensure minimum amount (0.01 NEAR) for very small transactions
        const minAmount = new BN("10000000000000000000000"); // 0.01 NEAR
        
        // Use the larger of calculated amount or min amount
        const finalAmount = nearNeededWithSlippage.lt(minAmount) ? minAmount : nearNeededWithSlippage;
        
        setNearAmount(formatTokenAmount(finalAmount.toString()));
      } else {
        // Ustaw minimalną wartość, jeśli nie udało się pobrać kursu wymiany
        setNearAmount("0.01");
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      // Ustaw minimalną wartość w przypadku błędu
      setNearAmount("0.01");
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
        contractId: (NETWORK_CONFIG as ExtendedNetwork).cransContractId,
        methodName: "ft_transfer",
        args: {
          receiver_id: "house.warsofcards.near",
          amount: ENTRY_FEE_YOCTO,
          memo: "War game entry fee"
        },
        gas: "300000000000000", // 300 TGas
        deposit: "1" // 1 yoctoNEAR required for ft_transfer
      });

      if (result) {
        // After successful transfer, create game and start playing
        try {
          // Emit to server via service for game initialization
          placeBet(ENTRY_FEE);
          
          // Fetch updated balance in background
          fetchBalances(wallet.accountId);
        } catch (error) {
          setError('Failed to start game. Please try again.');
          setShowBetUI(true);
        }
      }
    } catch (error) {
      setError("Failed to transfer CRANS. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasEnoughBalance = parseFloat(nearBalance) >= ENTRY_FEE;
  const hasSurplusBalance = parseFloat(nearBalance) > ENTRY_FEE * 2; // Jeśli ma więcej niż podwójną kwotę wejściową

  // Efekt dla dostosowania wysokości viewportu na urządzeniach mobilnych
  useEffect(() => {
    const handleResize = () => {
      // Dostosowanie wysokości do rzeczywistej wysokości viewportu
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Wykrywanie urządzeń Xiaomi/Redmi/MIUI poprzez sprawdzanie user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMIUI = userAgent.includes('miui') || 
                     userAgent.includes('xiaomi') || 
                     userAgent.includes('redmi') || 
                     userAgent.includes('poco');
      
      if (isMIUI) {
        document.documentElement.classList.add('miui-device');
        
        // Dodatkowy padding dla górnego paska na urządzeniach Xiaomi
        const extraPadding = window.innerWidth <= 393 ? 40 : 30;
        document.documentElement.style.setProperty('--miui-padding-top', `${extraPadding}px`);
      } else {
        document.documentElement.classList.remove('miui-device');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Dodatkowe wywołanie po krótkim czasie, aby upewnić się, że viewporty są prawidłowo obliczone
    setTimeout(handleResize, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Automatyczne kończenie gry, gdy czas się skończy
  useEffect(() => {
    if (timeLeft === 0 && isGameStarted && !isGameComplete) {
      setIsGameComplete(true);
      setIsGameStarted(false);
    }
  }, [timeLeft, isGameStarted, isGameComplete]);

  const remainingPlayerCards = playerCards.filter(card => card !== null).length;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleFight = () => {
    if (!isRoundActive && playerCards.length > 0) {
      const availableCards = playerCards.filter(card => card !== null);
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const selectedCard = availableCards[randomIndex];
      const originalIndex = playerCards.findIndex(card => card === selectedCard);
      selectPlayerCard(originalIndex);
    }
  };

  // Modyfikuję funkcję wyboru karty przez gracza, aby sprawdzała czas
  const handleCardSelection = (cardIndex: number) => {
    // Sprawdź czy czas się nie skończył
    if (timeLeft <= 0) {
      return;
    }
    
    // Wywołaj oryginalną funkcję wyboru karty
    selectPlayerCard(cardIndex);
  };

  return (
    <div className={styles.gameContainer}>
      {showLogoScreen ? (
        <div className={styles.logoScreen}>
          <img 
            src="/newwarorder.png" 
            alt="New War Order" 
            className={styles.logoImage}
          />
        </div>
      ) : isConnected ? (
        showBetUI ? (
          <div className={styles.houseGate}>
            {wallet.accountId ? (
              <>
                <div className={styles.balanceDisplay}>
                  <span>Balance: {nearBalance}</span>
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
                      You need {ENTRY_FEE} CRANS to play! (Missing {(parseFloat(ENTRY_FEE.toString()) - parseFloat(nearBalance) > 0) ? (parseFloat(ENTRY_FEE.toString()) - parseFloat(nearBalance)).toFixed(2) : 0} CRANS)
                    </div>
                    <button
                      className={styles.buyCransButton}
                      onClick={handleBuyCrans}
                      disabled={swapLoading}
                    >
                      {swapLoading ? 'Processing...' : `Buy missing CRANS for ~${nearAmount}Ⓝ`}
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
              ← BACK TO GAMES
            </button>
          </div>
        ) : (
          <div className={styles.gameTable}>
            <div className={styles.ingameInfo}>
              <span className={styles.timerInfo}>{formatTime(timeLeft)}</span>
              <div className={styles.pointsStats}>
                <span>Dealer - {computerScore}</span>
                <span>|</span>
                <span>{playerScore} - {playerId ? (playerId.length > 21 ? 
                  `${playerId.split('.')[0].substring(0, 3)}...${playerId.split('.')[0].substring(playerId.split('.')[0].length - 3)}.near` 
                  : playerId) : 'Player'}</span>
              </div>
              
            </div>
            
            <div className={styles.playArea}>
              {/* Kontener dla animacji punktów */}
              <div className={styles.pointsAnimationContainer}>
                {pointsAnimation.computer !== null && pointsAnimation.computer > 0 && (
                  <div className={`${styles.pointsAnimation} ${styles.computerPoints}`}>
                    +{pointsAnimation.computer}
                  </div>
                )}
                {pointsAnimation.player !== null && pointsAnimation.player > 0 && (
                  <div className={`${styles.pointsAnimation} ${styles.playerPoints}`}>
                    +{pointsAnimation.player}
                  </div>
                )}
              </div>

              <div className={styles.selectedCardArea}>
                {/* Dodanie talii kart wojennych */}
                <div className={styles.warDeckContainer}>
                  {deckCards.length > 0 ? (
                    <>
                      <div className={styles.warDeck}>
                        {[...Array(Math.min(5, deckCards.length))].map((_, index) => (
                          <Card
                            key={`deck-card-${index}`}
                            suit="spades"
                            rank="2"
                            value={2}
                            showFace={false}
                            className={styles.cardWrapper}
                            style={{
                              position: 'absolute',
                              top: `min(${index * 2}px, ${index * 0.5}vw)`,
                              left: `min(${index * 2}px, ${index * 0.5}vw)`,
                              zIndex: index
                            }}
                          />
                        ))}
                      </div>
                      <div className={styles.warDeckCounter}>
                        {deckCards.length} cards
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`${styles.warDeck} ${styles.emptyDeck}`}>
                        <div className={styles.emptyDeckPlaceholder} />
                      </div>
                      <div className={styles.warDeckCounter}>
                        No cards left
                      </div>
                    </>
                  )}
                </div>
                {bonusCard && isFirstRound && (
                  <div className={styles.bonusCardContainer}>
                    <Card 
                      suit={bonusCard.suit}
                      rank={bonusCard.rank}
                      value={bonusCard.value}
                      isJoker={bonusCard.isJoker}
                      showFace={false}
                      className={styles.cardWrapper}
                    />
                    {showExtraCardAnimation && (
                      <div className={styles.extraCardStatus}>
                        EXTRA CARD!
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.selectedCards}>
                  <div className={styles.computerCards}>
                    {selectedComputerCard && (
                      <div className={styles.cardLabel}>Dealer</div>
                    )}
                    {selectedComputerCard && (
                      <Card
                        suit={selectedComputerCard.suit}
                        rank={selectedComputerCard.rank}
                        value={selectedComputerCard.value}
                        isJoker={selectedComputerCard.isJoker}
                        isSelected={true}
                        isWinner={roundWinner === 'computer'}
                        showFace={true}
                        className={styles.cardWrapper}
                        style={{ zIndex: 1 }}
                      />
                    )}
                    {warComputerCards.map((card, index) => (
                      <Card 
                        key={`war-computer-${index}`}
                        suit={card.suit}
                        rank={card.rank}
                        value={card.value}
                        isJoker={card.isJoker}
                        isSelected={true}
                        isWinner={roundWinner === 'computer'}
                        showFace={true}
                        className={styles.cardWrapper}
                        style={{ 
                          position: 'absolute',
                          top: `min(${(index + 1) * 30}px, ${(index + 1) * 5}vw)`,
                          zIndex: 2
                        }}
                      />
                    ))}
                  </div>
                  <div className={styles.playerCards}>
                    {selectedPlayerCard && (
                      <div className={styles.cardLabel}>Player</div>
                    )}
                    {selectedPlayerCard && (
                      <Card
                        suit={selectedPlayerCard.suit}
                        rank={selectedPlayerCard.rank}
                        value={selectedPlayerCard.value}
                        isJoker={selectedPlayerCard.isJoker}
                        isSelected={true}
                        isWinner={roundWinner === 'player'}
                        showFace={true}
                        className={styles.cardWrapper}
                        style={{ zIndex: 1 }}
                      />
                    )}
                    {warPlayerCards.map((card, index) => (
                      <Card 
                        key={`war-player-${index}`}
                        suit={card.suit}
                        rank={card.rank}
                        value={card.value}
                        isJoker={card.isJoker}
                        isSelected={true}
                        isWinner={roundWinner === 'player'}
                        showFace={true}
                        className={styles.cardWrapper}
                        style={{ 
                          position: 'absolute',
                          top: `min(${(index + 1) * 30}px, ${(index + 1) * 5}vw)`,
                          zIndex: 2
                        }}
                      />
                    ))}
                  </div>
                </div>
                {showWarAnimation && (
                  <div className={styles.warStatus}>
                    WAR!
                  </div>
                )}
                {showTwistAnimation && (
                  <div className={styles.twistStatus}>
                    TWIST!
                  </div>
                )}
              </div>

              <div className={styles.playerCardsArea}>
                {[5, 5, 4, 3, 2, 1].map((columnCards, columnIndex) => (
                  <div 
                    key={`column-${columnIndex}`} 
                    className={styles.cardColumn}
                    data-cards={columnCards}
                  >
                    {Array.from({ length: columnCards }).map((_, cardIndex) => {
                      const cardArrayIndex = columnIndex === 0 
                        ? cardIndex 
                        : [5, 5, 4, 3, 2, 1].slice(0, columnIndex).reduce((sum, count) => sum + count, 0) + cardIndex;
                      const card = playerCards[cardArrayIndex];
                      
                      return card && (
                        <Card
                          key={`player-card-${cardArrayIndex}`}
                          suit={card.suit}
                          rank={card.rank}
                          value={card.value}
                          isJoker={card.isJoker}
                          showFace={card.suit !== 'hidden'}
                          disabled={isRoundActive || timeLeft <= 0 || isGameComplete || isComputerTurn}
                          onClick={() => handleCardSelection(cardArrayIndex)}
                          className={`${styles.playerCard} ${(isRoundActive || timeLeft <= 0 || isGameComplete || isComputerTurn) ? styles.disabled : ''}`}
                          style={{ 
                            position: 'absolute',
                            top: `min(${cardIndex * 30}px, ${cardIndex * 5}vw)`
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {isGameComplete && showGameEndOverlay && (
              <div className={styles.gameEndOverlay}>
                {/* Przy końcu czasu zawsze pokazuj obrazek YOU_LOST_THE_WAR */}
                {timeLeft === 0 || playerScore <= computerScore ? (
                  <img 
                    src="/YOU_LOST_THE_WAR.png" 
                    alt="You Lost!" 
                    className={styles.warResultImage}
                  />
                ) : (
                  <img 
                    src="/YOU_WON_THE_WAR.png" 
                    alt="You Won!" 
                    className={styles.warResultImage}
                  />
                )}
                <button className={styles.playAgainButton} onClick={handlePlayAgain}>
                  Play Again
                </button>
                {playerScore > computerScore && timeLeft > 0 && (
                  <div className={styles.rewardMessage}>
                    Reward has been paid to your wallet
                  </div>
                )}
              </div>
            )}
            
            {/* Dodanie komponentu GestureAreaBuffer */}
            <GestureAreaBuffer />
          </div>
        )
      ) : (
        <div className={styles.connectWalletMessage}>
          Please wait, connecting to game server...
        </div>
      )}
      {/* Dodanie GestureAreaBuffer na poziomie głównego kontenera */}
      <GestureAreaBuffer />
    </div>
  );
};

export default WarGame; 
