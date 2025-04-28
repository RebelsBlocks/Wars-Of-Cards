import { Card, GameState, Suit, Rank } from '../components/BlackjackGame';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface GameStateResponse {
  state: GameState;
  playerHand: Card[];
  dealerHand: Card[];
  playerBalance: number;
  currentBet: number;
  message: string;
  playerScore: number;
  dealerScore: number;
}

class BlackjackService {
  private calculateScore(hand: Card[]): number {
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
  }

  private createDeck(numDecks: number = 6): Card[] {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];
    
    for (let i = 0; i < numDecks; i++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          deck.push({ suit, rank, hidden: false });
        }
      }
    }
    
    // Shuffle using crypto
    for (let i = deck.length - 1; i > 0; i--) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const j = Math.floor(array[0] / (0xffffffff + 1) * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  }

  async createGame(playerId: string): Promise<GameStateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/game/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create game: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  async placeBet(playerId: string, amount: number): Promise<GameStateResponse> {
    const response = await fetch(`${API_BASE_URL}/game/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId, amount }),
    });

    if (!response.ok) {
      throw new Error('Failed to place bet');
    }

    return response.json();
  }

  async hit(playerId: string): Promise<GameStateResponse> {
    const response = await fetch(`${API_BASE_URL}/game/hit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to hit');
    }

    return response.json();
  }

  async stand(playerId: string): Promise<GameStateResponse> {
    const response = await fetch(`${API_BASE_URL}/game/stand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok) {
      throw new Error('Failed to stand');
    }

    return response.json();
  }

  async getGameState(playerId: string): Promise<GameStateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/game/state/${playerId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get game state: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }

  private getGameMessage(state: GameState, playerScore: number, dealerScore: number): string {
    switch (state) {
      case 'WAITING_FOR_BET':
        return 'Place your bet to start the game';
      case 'PLAYER_TURN':
        return 'Your turn! Hit or Stand?';
      case 'DEALER_TURN':
        return 'Dealer\'s turn...';
      case 'GAME_ENDED':
        if (playerScore > 21) return 'Bust! House wins!';
        if (dealerScore > 21) return 'Dealer busts! You win!';
        if (playerScore > dealerScore) return 'You win!';
        if (playerScore < dealerScore) return 'House wins!';
        return 'Push!';
      default:
        return 'Error occurred';
    }
  }
}

export const blackjackService = new BlackjackService(); 
