import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import styles from '../styles/WarGame.module.css';

// Typy dla komponentu Card
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'JOKER';

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
  pointsToAdd: {player: number, computer: number};
  selectPlayerCard: (card: Card, slotIndex: number) => void;
  handleChipClick: (amount: number) => void;
  handlePlaceBet: () => void;
  formatTime: (seconds: number) => string;
  setShowBetUI: (show: boolean) => void;
  setGameStatus: (status: string) => void;
  setComputerScore: (score: number | ((prev: number) => number)) => void;
  setIsGameComplete: (complete: boolean) => void;
  setIsGameStarted: (started: boolean) => void;
  pointsAnimation: {
    player: number | null;
    computer: number | null;
  };
  showExtraCardAnimation: boolean;
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
  const [pointsToAdd, setPointsToAdd] = useState<{player: number, computer: number}>({player: 0, computer: 0});
  const [isAnimatingPoints, setIsAnimatingPoints] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState<{player: number | null; computer: number | null}>({
    player: null,
    computer: null
  });
  const [showExtraCardAnimation, setShowExtraCardAnimation] = useState<boolean>(false);

  useEffect(() => {
    console.log('🎮 WarGame component mounted');
  }, []);

  useEffect(() => {
    console.log('🎮 Game State Update:');
    console.log('- Karty gracza:', playerCards.length);
    console.log('- Karty komputera:', computerCards.length);
    console.log('- Karty w talii:', deckCards.length);
    console.log('- Wojna aktywna:', isWarActive);
    console.log('- Runda aktywna:', isRoundActive);
  }, [playerCards, computerCards, deckCards, isWarActive, isRoundActive]);

  useEffect(() => {
    if (isGameStarted && timeLeft > 0 && !isGameComplete) {
      const id = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(id);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerId(id);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isGameStarted, timeLeft, isGameComplete]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUp = () => {
    if (playerCards.length > 0) {
      setGameStatus('');
      setComputerScore(prev => prev + 10);
      setIsGameComplete(true);
      setIsGameStarted(false);
    }
  };

  const initializeGame = () => {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);
    
    const playerInitialCards = shuffledDeck.slice(0, 20);
    const computerInitialCards = shuffledDeck.slice(20, 40);
    const bonusCardFromDeck = shuffledDeck[40];
    const remainingDeckCards = shuffledDeck.slice(41);

    setPlayerCards(playerInitialCards);
    setComputerCards(computerInitialCards);
    setDeckCards(remainingDeckCards);
    setBonusCard(bonusCardFromDeck);
    setIsFirstRound(true);
    setSelectedPlayerCard(null);
    setSelectedComputerCard(null);
    setWarPlayerCards([]);
    setWarComputerCards([]);
    setWarRound(0);
    setPlayerScore(0);
    setComputerScore(0);
    setPointsToAdd({player: 0, computer: 0});
    setGameStatus('');
    setIsGameStarted(true);
    setIsRoundActive(false);
    setIsWarActive(false);
    setRoundWinner(null);
    setTimeLeft(300);
    setIsGameComplete(false);
    setRoundsPlayed(0);
    setShowExtraCardAnimation(true);
    setTimeout(() => {
      setShowExtraCardAnimation(false);
    }, 2000);
  };

  const createDeck = (): Card[] => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const values: { [key in Rank]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 11, 'Q': 12, 'K': 13, 'A': 14, 'JOKER': 0
    };

    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ 
          suit, 
          rank, 
          value: values[rank],
          isJoker: false
        });
      }
    }

    for (let i = 0; i < 3; i++) {
      deck.push({ 
        suit: 'joker',
        rank: 'JOKER',
        value: values['JOKER'],
        isJoker: true
      });
    }

    return deck;
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const selectPlayerCard = (card: Card, slotIndex: number) => {
    console.log('🎮 selectPlayerCard - Gracz wybiera kartę:', card, 'z pozycji:', slotIndex);
    if (!isGameStarted || isRoundActive) {
      console.log('❌ selectPlayerCard - Nie można wybrać karty (gra nie rozpoczęta lub runda aktywna)');
      return;
    }

    setIsRoundActive(true);
    
    // Tworzymy nową tablicę kart, gdzie na wybranym indeksie wstawiamy null
    const updatedPlayerCards = [...playerCards];
    updatedPlayerCards[slotIndex] = null;
    
    // Ustawiamy karty z zachowaniem pustych miejsc
    setPlayerCards(updatedPlayerCards);
    setSelectedPlayerCard(card);
    
    // Przekazujemy do komputera tablicę bez null-i
    const cardsWithoutNulls = updatedPlayerCards.filter(card => card !== null) as Card[];
    selectComputerCardAutomatically(cardsWithoutNulls, card);
  };

  const selectComputerCardAutomatically = (updatedPlayerCards: Card[], playerCard: Card) => {
    console.log('🎮 selectComputerCardAutomatically - Komputer wybiera kartę');
    if (computerCards.length === 0) {
      console.log('❌ selectComputerCardAutomatically - Brak kart komputera');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * computerCards.length);
    const computerCard = computerCards[randomIndex];
    console.log('🎮 Wybrana karta komputera:', computerCard);
    
    const updatedComputerCards = computerCards.filter(c => c !== computerCard);
    setComputerCards(updatedComputerCards);

    setTimeout(() => {
      setSelectedComputerCard(computerCard);
      compareCards(playerCard, computerCard);
    }, 500);
  };

  const startWar = () => {
    if (deckCards.length < 2) {
      const totalPoints = calculateTotalPointsInRound();
      const pointsPerPlayer = isFirstRound ? Math.floor(totalPoints / 2) : totalPoints / 2;
      
      setPlayerScore(prev => prev + pointsPerPlayer);
      setComputerScore(prev => prev + pointsPerPlayer);
      
      setGameStatus('');
      endRound(null);
      return;
    }

    setShowWarAnimation(true);
    setTimeout(() => {
      setShowWarAnimation(false);
      setIsWarActive(true);
      setWarRound(1);
      setGameStatus('');

      const newDeckCards = [...deckCards];
      const [warCards, remainingDeck] = drawCards(newDeckCards, 2);

      setDeckCards(remainingDeck);
      setWarPlayerCards([warCards[0]]);
      setWarComputerCards([warCards[1]]);

      setTimeout(() => {
        compareWarCards(warCards[0], warCards[1], 0, remainingDeck);
      }, 1000);
    }, 2000); // Czas wyświetlania napisu WAR
  };

  const calculateTotalPointsInRound = (): number => {
    let totalPoints = 0;
    
    if (selectedPlayerCard) {
      totalPoints += isFirstRound ? 3 : 2;
    }
    if (selectedComputerCard) {
      totalPoints += isFirstRound ? 3 : 2;
    }
    
    warPlayerCards.forEach(card => {
      totalPoints += isFirstRound ? 5 : 4;
    });
    warComputerCards.forEach(card => {
      totalPoints += isFirstRound ? 5 : 4;
    });
    
    return totalPoints;
  };

  const compareCards = (playerCard: Card, computerCard: Card) => {
    if (playerCard.isJoker || computerCard.isJoker || 
        (playerCard.rank === '7' && computerCard.rank === '7') ||
        playerCard.value === computerCard.value) {
      setGameStatus('');
      setTimeout(() => {
        startWar();
      }, 1000);
      return;
    }

    let winner: 'player' | 'computer' | null = null;
    let points = isFirstRound ? 3 : 2;

    if (playerCard.rank === '7' || computerCard.rank === '7') {
      setShowTwistAnimation(true);
      setTimeout(() => {
        setShowTwistAnimation(false);
      }, 1500);
    }

    if (playerCard.rank === '7') {
      winner = computerCard.value < 7 ? 'computer' : 'player';
    } else if (computerCard.rank === '7') {
      winner = playerCard.value < 7 ? 'player' : 'computer';
    } else {
      winner = playerCard.value > computerCard.value ? 'player' : 'computer';
    }

    setRoundWinner(winner);
    setGameStatus('');

    setTimeout(() => {
      endRound(winner, points);
    }, 1500);
  };

  const compareWarCards = (
    playerWarCard: Card, 
    computerWarCard: Card, 
    accumulatedPoints: number,
    currentDeckCards: Card[] = [...deckCards]
  ) => {
    // Użyj przekazanych punktów jako bazy
    let points = accumulatedPoints;
    
    // Jeśli to pierwsza wojna (accumulatedPoints = 0), dodaj punkty bazowe
    if (accumulatedPoints === 0) {
      points = isFirstRound ? 3 : 2;
    }
    
    // Dodaj 2 punkty za aktualną wojnę
    points += 2;

    const isWarCondition = playerWarCard.isJoker || 
                          computerWarCard.isJoker || 
                          (playerWarCard.rank === '7' && computerWarCard.rank === '7') ||
                          playerWarCard.value === computerWarCard.value;

    if (isWarCondition) {
      if (currentDeckCards.length < 2 || warRound > 7) {
        const totalPoints = points / 2;
        setTimeout(() => {
          setPlayerScore(prev => prev + totalPoints);
          setComputerScore(prev => prev + totalPoints);
          setGameStatus('');
          endRound(null, 0);
        }, 1500);
        return;
      }

      setGameStatus('');
      setShowWarAnimation(true);
      
      setTimeout(() => {
        setShowWarAnimation(false);
        
        const remainingDeckCards = [...currentDeckCards];
        const [warCards, updatedDeck] = drawCards(remainingDeckCards, 2);
        
        setWarRound(prevRound => prevRound + 1);
        setWarPlayerCards(prevCards => [...prevCards, warCards[0]]);
        setWarComputerCards(prevCards => [...prevCards, warCards[1]]);
        
        setDeckCards(updatedDeck);

        setTimeout(() => {
          compareWarCards(warCards[0], warCards[1], points, updatedDeck);
        }, 1000);
      }, 1500);
      return;
    }

    let winner: 'player' | 'computer' | null = null;

    if (playerWarCard.rank === '7' || computerWarCard.rank === '7') {
      setShowTwistAnimation(true);
      setTimeout(() => {
        setShowTwistAnimation(false);
      }, 1500);
    }

    if (playerWarCard.rank === '7') {
      winner = computerWarCard.value < 7 ? 'computer' : 'player';
    } else if (computerWarCard.rank === '7') {
      winner = playerWarCard.value < 7 ? 'player' : 'computer';
    } else {
      winner = playerWarCard.value > computerWarCard.value ? 'player' : 'computer';
    }

    setRoundWinner(winner);
    setGameStatus('');
    
    setTimeout(() => {
      endRound(winner, points);
    }, 1500);
  };

  const drawCards = (deck: Card[], count: number): [Card[], Card[]] => {
    const newDeck = [...deck];
    const drawnCards = newDeck.splice(0, count);
    return [drawnCards, newDeck];
  };

  const endRound = (winner: 'player' | 'computer' | null, points: number = 0) => {
    // Pokaż animację punktów
    if (winner && points > 0) {
      setPointsAnimation({
        player: winner === 'player' ? points : null,
        computer: winner === 'computer' ? points : null
      });

      // Dodaj punkty z opóźnieniem
      setTimeout(() => {
        if (winner === 'player') {
          setPlayerScore(prev => prev + points);
        } else if (winner === 'computer') {
          setComputerScore(prev => prev + points);
        }
        // Wyczyść animację punktów
        setPointsAnimation({player: null, computer: null});
      }, 1000);
    }

    setTimeout(() => {
      setSelectedPlayerCard(null);
      setSelectedComputerCard(null);
      setWarPlayerCards([]);
      setWarComputerCards([]);
      setWarRound(0);
      setRoundWinner(null);
      setIsRoundActive(false);
      setIsWarActive(false);
      
      if (isFirstRound) {
        setBonusCard(null);
        setIsFirstRound(false);
      }

      setRoundsPlayed(prev => prev + 1);

      if (roundsPlayed + 1 >= 20) {
        setTimeout(() => {
          setIsGameComplete(true);
          if (winner === 'player') {
            setBalance(prev => prev + currentBet * 2);
          }
          setGameStatus('');
          setIsGameStarted(false);
        }, 1000);
      }
    }, 1500);
  };

  const handleChipClick = (amount: number) => {
    if (amount <= balance) {
      setCurrentBet(amount);
    }
  };

  const handlePlaceBet = () => {
    if (currentBet > 0 && currentBet <= balance) {
      setBalance(prev => prev - currentBet);
      setShowBetUI(false);
      initializeGame();
    }
  };

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
    handlePlaceBet,
    formatTime,
    setShowBetUI,
    setGameStatus,
    setComputerScore,
    setIsGameComplete,
    setIsGameStarted,
    pointsAnimation,
    showExtraCardAnimation,
  };

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

  if (!showFace) {
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

// Dodaj tymczasowy komponent SimpleBettingScreen
const SimpleBettingScreen: React.FC<{
  balance: number;
  currentBet: number;
  onChipClick: (amount: number) => void;
  onPlaceBet: () => void;
  onBack: () => void;
}> = ({
  balance,
  currentBet,
  onChipClick,
  onPlaceBet,
  onBack
}) => {
  return (
    <div className={styles.betContainer}>
      <div>Balance: {balance}</div>
      <div>Current Bet: {currentBet}</div>
      <button onClick={() => onChipClick(100)}>Bet 100</button>
      <button onClick={onPlaceBet}>Place Bet</button>
      <button onClick={onBack}>Back</button>
    </div>
  );
};

// Komponent główny gry
export const WarGame: React.FC<WarGameProps> = ({ onBack }) => {
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
    isGameStarted,
    isRoundActive,
    isWarActive,
    showWarAnimation,
    showTwistAnimation,
    roundWinner,
    timeLeft,
    isGameComplete,
    balance,
    currentBet,
    showBetUI,
    pointsToAdd,
    selectPlayerCard,
    handleChipClick,
    handlePlaceBet,
    formatTime,
    setShowBetUI,
    setGameStatus,
    setComputerScore,
    setIsGameComplete,
    setIsGameStarted,
    pointsAnimation,
    showExtraCardAnimation,
  } = useWar();

  const remainingPlayerCards = playerCards.filter(card => card !== null).length;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleFight = () => {
    if (!isRoundActive && playerCards.length > 0) {
      const availableCards = playerCards.filter(card => card !== null);
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      const selectedCard = availableCards[randomIndex];
      const originalIndex = playerCards.findIndex(card => card === selectedCard);
      selectPlayerCard(selectedCard, originalIndex);
    }
  };

  const handleGiveUp = () => {
    setGameStatus('');
    setComputerScore((prev: number) => prev + 10);
    setIsGameComplete(true);
    setIsGameStarted(false);
  };

  return (
    <div className={styles.gameContainer}>
      {showBetUI ? (
        <SimpleBettingScreen
          balance={balance}
          currentBet={currentBet}
          onChipClick={handleChipClick}
          onPlaceBet={handlePlaceBet}
          onBack={onBack}
        />
      ) : (
        <div className={styles.gameTable}>
          <div className={styles.balanceDisplay}>
            <div className={styles.gameStats}>
              <span>Bet: {currentBet}</span>
              <span>{formatTime(timeLeft)}</span>
            </div>
            <div className={styles.pointsStats}>
              <span>Dealer - {computerScore}</span> | <span>{playerScore} - Player</span>
            </div>
          </div>
          
          <div className={styles.playArea}>
            {/* Kontener dla animacji punktów */}
            <div className={styles.pointsAnimationContainer}>
              {pointsAnimation.computer && (
                <div className={`${styles.pointsAnimation} ${styles.computerPoints}`}>
                  +{pointsAnimation.computer}
                </div>
              )}
              {pointsAnimation.player && (
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
                            top: `${index * 2}px`,
                            left: `${index * 2}px`,
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
              {bonusCard && isFirstRound && !isMobile && (
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
                        top: `${(index + 1) * 30}px`,
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
                        top: `${(index + 1) * 30}px`,
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
                        showFace={false}
                        disabled={isRoundActive}
                        onClick={() => selectPlayerCard(card, cardArrayIndex)}
                        className={`${styles.playerCard} ${isRoundActive ? styles.disabled : ''}`}
                        style={{ 
                          position: 'absolute',
                          top: `${cardIndex * 30}px`
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className={styles.buttonContainer}>
              <button 
                className={`${styles.actionButton} ${styles.giveUpButton}`}
                onClick={handleGiveUp}
                disabled={isRoundActive || isGameComplete}
              >
                Give Up
              </button>
            </div>
          </div>

          {isGameComplete && (
            <div className={styles.gameEndOverlay}>
              <img 
                src={playerScore > computerScore ? '/YOU_WON_THE_WAR.png' : '/YOU_LOST_THE_WAR.png'} 
                alt={playerScore > computerScore ? 'You Won!' : 'You Lost!'} 
                className={styles.warResultImage}
              />
              <button className={styles.playAgainButton} onClick={() => setShowBetUI(true)}>
                Play Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WarGame; 