<div align="center">
  <img src="https://github.com/user-attachments/assets/3fdfffb8-e826-45c1-9dcb-8fecbffb061a" alt="pfp">
</div>

# 

A blockchain gaming platform built on NEAR Protocol, featuring strategic card games with $CRANS token and Vanessa assistance.

## 🌟 Features

### 🎮 Core Games

**Snapjack (Blackjack)**
- **Entry Fee:** 210 CRANS
- **Potential Win:** 378 CRANS (180% ROI)
- Classic blackjack gameplay against dealer
- Fisher–Yates shuffle 
- Real-time blockchain integration
- Target: Reach 21 without busting
- Instant win: Hit exactly 21

**New War Order**
- **Entry Fee:** 420 CRANS  
- **Potential Win:** 756 CRANS (180% ROI)
- Standard 52-card deck + 3 Jokers = 55 cards total
- Remaining 14 cards form the war deck
- Fisher–Yates shuffle
- First round: 3 points base
- Subsequent rounds: 2 points base
- War rounds: +2 points per war pair
- Game duration: 3 minutes maximum
- **Jokers:** Always win (except vs other Jokers → WAR)
- **7s vs High Cards:** 7 beats cards valued 8-14
- **WAR Triggers:** Equal values, dual 7s, or Joker encounters
- **Strategic Elements:** Visible cards enable tactical planning

### 💰 CRANS Token Economy

- **Contract:** `crans.tkn.near` (NEAR mainnet)
- **Decimals:** 24
- **Official Site:** [money.crans.xyz](https://money.crans.xyz/)

| Game | Entry Fee | Potential Win | ROI |
|------|-----------|---------------|-----|
| Snapjack | 210 CRANS | 378 CRANS | 180% |
| New War Order | 420 CRANS | 756 CRANS | 180% |

### 🤖 Vanessa Assistant

**Vanessa** is your dedicated digital guide and trading small language model assistant:

- **Smart Token Exchange:** Execute NEAR ↔ CRANS swaps with simple commands (1% slippage + auto storage deposit handling)
- **Balance Management:** Real-time portfolio tracking
- **Game Guidance:** Rules explanation and strategy tips
- **Blockchain Support:** Transaction assistance and wallet integration
- **Natural Language Processing:** Conversational interface for all platform features

**Vanessa Commands:**
```
swap 5 near        # Convert NEAR to CRANS
buy 100 crans      # Purchase CRANS tokens
sell 50 crans      # Sell CRANS for NEAR
balance            # Check token balances
help               # Platform assistance
```
### 🌐 NEAR Social Integration

**Wars of Cards** is integrated with **NEAR Social** (`social.near` contract).

#### 📱 Messages Hub
- **Community Feed of warsofcards.near** 
- **Post**
- **Markdown Support**
- **Like System**
- **NEAR Social Profiles**
- **Storage Balance Tracking & Withdraw Feature**
  
## 🚀 Getting Started

### Prerequisites
- NEAR Protocol wallet (Meteor Wallet recommended)
- NEAR tokens for gas and CRANS acquisition
- Chrome browser (recommended for optimal performance)
- Pop-ups enabled for transaction signing

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-repo/wars-of-cards.git
cd wars-of-cards
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment:**
```bash
cp .env.example .env.local
# Configure NEAR network settings
```

4. **Start development server:**
```bash
npm run dev
```

5. **Launch backend (separate terminal):**
```bash
cd backend
npm install
npm run dev
```

### Configuration

**Environment Variables:**
```env
NEAR_NETWORK_ID=mainnet
NEAR_RPC_URL=https://free.rpc.fastnear.com
CRANS_CONTRACT_ID=crans.tkn.near
REF_FINANCE_CONTRACT=v2.ref-finance.near
SOCIAL_CONTRACT=social.near
```

## 🎮 How to Play

### Getting CRANS Tokens

1. **Connect Wallet:** Link your NEAR wallet to the platform
2. **Chat with Vanessa:** Use `swap` commands to exchange NEAR for CRANS
3. **Automatic Setup:** Storage deposits handled automatically
4. **Start Gaming:** Enter games with acquired CRANS tokens

## 🔧 Development

### Architecture Overview

```
wars-of-cards/
├── src/
│   ├── components/          # React components
│   │   ├── BlackjackGame.tsx    # Snapjack game logic
│   │   ├── WarGame.tsx          # New War Order implementation
│   │   ├── Brief.tsx            # Vanessa AI assistant
│   │   ├── Messages.tsx         # NEAR Social integration
│   │   ├── Profile.tsx          # Social points & balances
│   │   └── ...
│   ├── contexts/           # React contexts
│   ├── pages/              # Next.js pages
│   ├── styles/             # CSS modules
│   ├── utils/              # Utility functions
│   │   ├── social.ts           # NEAR Social API helpers
│   │   └── timeFormat.js       # Social timestamp formatting
│   └── config.js           # Configuration
├── backend/
│   ├── blackjack_server.js     # Snapjack game server
│   ├── wargame_server.ts        # War game server
│   └── ...
└── package.json
```

### Key Components

- **Brief.tsx:** Vanessa small language model assistant with NLP capabilities
- **WarGame.tsx:** Complete War game implementation with card visibility mechanics
- **BlackjackGame.tsx:** Snapjack with anti-cheating measures
- **Messages.tsx:** NEAR Social integration for community features
- **Profile.tsx:** Social points tracking and NEAR conversion
- **TokenPrices.tsx:** Real-time CRANS/NEAR exchange rates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/RebelsBlocks/Wars-Of-Cards/blob/main/License) file for details.
