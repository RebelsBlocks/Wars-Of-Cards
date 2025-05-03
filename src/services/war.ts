import { io, Socket } from 'socket.io-client';

// Typy kart
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'JOKER';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  isJoker?: boolean;
}

// Typ dla aktualizacji stanu
export interface ServerStateUpdate {
  type: string;
  data: Partial<GameState>;
}

// Typ dla stanu gry
export interface GameState {
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
  pointsAnimation?: {
    player: number | null;
    computer: number | null;
  };
  showExtraCardAnimation?: boolean;
  lastActionTime?: number;
  lastUpdateTime?: number;
  shouldClearCards?: boolean;
  gameEndReason?: 'win' | 'loss' | 'timeUp';
  rewardSent?: boolean;
  rewardError?: string;
  finalWinner?: 'player' | 'computer' | 'draw';
  isComputerTurn?: boolean;
}

// Interfejs dla callbacków stanu gry
export interface WarGameCallbacks {
  onGameState?: (gameState: GameState) => void;
  onStateUpdate?: (update: ServerStateUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

class WarService {
  private socket: Socket | null = null;
  private callbacks: WarGameCallbacks = {};
  private connected: boolean = false;
  private connectionError: string | null = null;
  private gameCompletionProcessed: boolean = false;

  // Inicjalizacja połączenia Socket.IO
  connect(callbacks: WarGameCallbacks = {}, nearAccountId?: string): void {
    // Resetuj flagę zakończenia gry przy nowym połączeniu
    this.gameCompletionProcessed = false;
    
    // Zapisz callbacki
    this.callbacks = callbacks;
    
    if (!nearAccountId) {
      return;
    }

    // Inicjalizacja połączenia Socket.IO
    const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_WARGAME_SERVER_URL || 'http://localhost:3003';
    
    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: false
    });

    // Obsługa połączenia
    this.socket.on('connect', () => {
      this.connected = true;
      this.connectionError = null;
      
      // Dołącz do gry z identyfikatorem NEAR
      if (this.socket) {
        const payload = { 
          id: nearAccountId,
          nearAccountId: nearAccountId
        };
        this.socket.emit('join_game', payload);
      }
      
      // Wywołaj callback, jeśli istnieje
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });
    
    // Obsługa rozłączenia
    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      
      // Wywołaj callback, jeśli istnieje
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });
    
    // Obsługa błędów
    this.socket.on('connect_error', (error) => {
      this.connectionError = `Connection error: ${error.message}`;
      this.connected = false;
      
      // Wywołaj callback, jeśli istnieje
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    });
    
    // Additional error handlers
    this.socket.on('error', (error) => {
      this.connectionError = `Socket error: ${error.message}`;
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      // Handle reconnection attempt silently
    });
    
    this.socket.on('reconnect_failed', () => {
      this.connectionError = 'Reconnection failed after multiple attempts';
      
      if (this.callbacks.onError) {
        this.callbacks.onError(new Error('Reconnection failed'));
      }
    });
    
    // Obsługa stanu gry
    this.socket.on('game_state', (gameState: GameState) => {
      // Sprawdź, czy to stan końcowy gry i czy został już przetworzony
      if (gameState.isGameComplete && !this.gameCompletionProcessed) {
        this.gameCompletionProcessed = true;
        
        // Wywołaj callback, jeśli istnieje
        if (this.callbacks.onGameState) {
          this.callbacks.onGameState(gameState);
        }
      } else if (!gameState.isGameComplete) {
        // Jeśli to nie jest stan końcowy, przetwarzaj normalnie
        if (this.callbacks.onGameState) {
          this.callbacks.onGameState(gameState);
        }
      }
    });
    
    // Obsługa aktualizacji stanu
    this.socket.on('state_update', (update: ServerStateUpdate) => {
      // Sprawdź, czy to aktualizacja końca gry
      if (update.type === 'GAME_COMPLETE' && !this.gameCompletionProcessed) {
        this.gameCompletionProcessed = true;
        
        // Wywołaj callback tylko raz dla zakończenia gry
        if (this.callbacks.onStateUpdate) {
          this.callbacks.onStateUpdate(update);
        }
      } else if (update.type !== 'GAME_COMPLETE') {
        if (this.callbacks.onStateUpdate) {
          this.callbacks.onStateUpdate(update);
        }
      }
    });
  }

  // Metoda do zamknięcia połączenia
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Getter statusu połączenia
  isConnected(): boolean {
    return this.connected;
  }

  // Getter błędu połączenia
  getConnectionError(): string | null {
    return this.connectionError;
  }

  // Metoda wyboru karty przez gracza
  selectPlayerCard(cardIndex: number): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit('select_card', cardIndex);
  }

  // Metoda wyboru pierwszej karty przez komputer
  computerSelectFirstCard(): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit('computer_select_first');
  }

  // Metoda postawienia zakładu
  placeBet(amount: number): void {
    if (!this.socket) {
      return;
    }
    
    this.socket.emit('place_bet', amount);
  }

  // Metoda resetowania gry (Play Again)
  resetGame(): void {
    // Zresetuj flagę zakończenia gry przy resecie
    this.gameCompletionProcessed = false;
    
    if (!this.socket) {
      return;
    }
    
    this.socket.emit('reset_game');
  }

  // Metoda synchronizacji czasu
  syncTime(): void {
    if (!this.socket) {
      return;
    }
    
    // Nie wysyłaj żądań synchronizacji czasu jeśli gra jest zakończona
    if (this.gameCompletionProcessed) {
      return;
    }
    
    this.socket.emit('sync_time');
  }

  // Pomocnicza funkcja do formatowania czasu
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Eksport instancji serwisu
export const warService = new WarService(); 
