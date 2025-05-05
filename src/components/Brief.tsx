import React from 'react';
import styles from '../styles/Brief.module.css';
import { useNearWallet } from '@/contexts/NearWalletContext';
import { providers } from 'near-api-js';
import { NETWORK_CONFIG } from '@/contexts/NearWalletContext';
import { useTokenPrices } from './TokenPrices';
import { BN } from 'bn.js';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { Big } from 'big.js';
import { TypewriterText } from '../effects/TypewriterText';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Add predefined topics and responses
const predefinedResponses: Record<string, string> = {
  'hello': 'I\'m Vanessa, your Wars of Cards guide. I can help with platform navigation and blockchain transactions. What aspect of our games interests you?',
  
  'what_to_do': 'Play card games including:\n- Blackjack (entry: 210 CRANS, potential win: 378 CRANS)\n- New War Order, a strategic card game (entry: 420 CRANS, potential win: 756 CRANS)\n\nCurrency operations:\n- Check balances of NEAR and CRANS tokens\n- Swap between NEAR tokens and CRANS tokens with commands like "5 near to crans"\n\nCommunity interaction:\n- Connect with other players through a Messages hub\n- Earn Points through participation that can be converted to NEAR tokens\n- Access exclusive token airdrops and special perks',
  
  'games': 'If you want to play, you need to get CRANS tokens by exchanging your NEAR tokens - type \'swap\' and follow the commands.\n\nBLACKJACK: This classic card game pits you against the dealer where you aim for 21 without busting, with an instant win if you hit 21 exactly. You win by beating the dealer\'s hand while our advanced shuffle system prevents card counting, offering a 180% return on your 210 CRANS entry with potential winnings of 378 CRANS.\n\nNEW WAR ORDER: This strategic card game challenges you to win the most battles within a tense 3-minute timeframe using a unique 55-card deck that includes 3 Jokers. The game features special rules like "TWIST" with the number 7 and exciting "WAR" moments triggered by matching cards or Jokers, all while competing for a potential 756 CRANS prize from your 420 CRANS entry, offering an impressive 180% return.',
  
  'messages': 'Our Messages hub is the central network of the Wars of Cards community.\n\nKey features:\n- Connect directly with other players through comments\n- Support content with your NEAR account\n- Accumulate Points through active participation\n- Convert Points to NEAR tokens\n\nCommunity benefits:\n- Access exclusive token airdrops\n- Unlock special perks as an active member\n- Gain recognition for your contributions\n\nThe connections you make here have real value. Join in, engage regularly, and experience the advantages of being part of our Wars of Cards network.',
  
  'near': 'NEAR: The Premium Blockchain Behind Wars of Cards\n\nKey Advantages:\n- High-speed transaction processing\n- Minimal fees for all operations\n- Confirmation times in seconds\n- Intuitive interface design\n\nFor First-time Blockchain Users:\n- Think of NEAR as your digital wallet and identity in one\n- Significantly faster and cheaper than traditional systems\n\nYour NEAR Account:\n- Single login serves as both username and secure wallet\n- Seamless, protected gameplay integration\n- Full control and ownership of your digital assets\n\nOur platform leverages NEAR\'s capabilities to deliver an exceptional gaming experience with maximum security and efficiency.',
  
  'crans': 'Official Site: https://money.crans.xyz/\n\nAcquiring CRANS:\n- Use "swap" to convert your NEAR tokens instantly\n- Win additional tokens through gameplay\n- Earn through community participation and events\n\nToken Usage:\n- Blackjack: 210 CRANS entry with 378 CRANS potential win\n- New War Order: 420 CRANS entry with 756 CRANS potential win\n- All wins pay 180% of your original stake\n\nReady for tokens? Select "SWAP" and I\'ll walk you through the process.',
  
  'help': 'Allow pop-ups in your browser and for the smoothest gameplay, use Chrome browser. Also, make sure to turn off VPN to avoid any issues.\n\nFor First-time Blockchain Users: \nThink of NEAR as your digital wallet and identity in one that\'s significantly faster and cheaper than traditional systems, powering the Wars of Cards gaming experience with high-speed transactions, minimal fees, and full ownership of your digital assets.\n\nEssential Requirements:\n- NEAR account - Connect or create instantly through Meteor Wallet\n- NEAR tokens - Available on Binance, Coinbase, and major exchanges\n- CRANS tokens - Exchange your NEAR tokens with me directly\n\nAcquiring CRANS:\n- Use "Swap" and follow the commands to convert your NEAR tokens instantly\n- Win additional tokens through our games\n- Earn through community participation and events\n\nToken Usage:\n- Blackjack: 210 CRANS entry with 378 CRANS potential win\n- New War Order: 420 CRANS entry with 756 CRANS potential win\n- All wins pay 180% of your original stake\n- Sell your earned tokens with me directly or hold them!',
  
  'swap': 'Your current holdings:\nNEAR: {near_balance} Ⓝ\nCRANS: {crans_balance} CRANS\n\nSwap commands:\n- "5 near to crans" - Purchase CRANS using 5 NEAR\n- "0.5 crans to near" - Convert 0.5 CRANS back to NEAR\n\nIMPORTANT: You must allow popups for successful transactions.\nFirst-time transactions may fail if popups are blocked.\nEnable popups when prompted for seamless exchanges.',
  
  'balance': '💰 Here are your current balances:\n\nNEAR Balance: {near_balance} Ⓝ\nCRANS Balance: {crans_balance} CRANS',
  
  // Small talk responses
  'small_talk_positive': 'Thanks for the kind words! Is there something specific I can help you with regarding Wars of Cards?',
  'small_talk_neutral': 'I\'m here to help with any questions about Wars of Cards. Would you like to know about the games or how to use CRANS tokens?',
  'small_talk_compliment': 'That\'s very nice of you to say! I\'m designed to make your Wars of Cards experience exceptional. What would you like to explore today?',
  'small_talk_how_are_you': 'I\'m doing great, thanks for asking! I\'m always ready to help with Wars of Cards. How about you? Ready to explore our gaming platform?',
  
  // Responses to negative or inappropriate messages
  'negative_feedback': 'I understand. I\'m here to help improve your experience. Could you tell me how I can better assist you with Wars of Cards?',
  'inappropriate': 'I\'m focused on helping with Wars of Cards gaming platform. Let\'s keep our conversation professional. How can I assist you with games, tokens, or platform features?',
  
  // Identity and purpose response
  'identity': 'I\'m Vanessa, your digital assistant for the Wars of Cards platform. I help players navigate the platform, swap tokens, learn game rules, and more. I was created to make your gaming experience smoother by providing instant help and information. How can I assist you today?'
};

// Define main topics for clickable buttons - more compact
const mainTopics = [
  { id: 'what_to_do', label: 'What to do here?' },
  { id: 'games', label: 'How to play?' },
  { id: 'swap', label: 'Swap' },
  { id: 'help', label: 'Help' }
];

// Add helper function for wallet name truncation
function truncateWalletName(accountId: string | null): string {
  if (!accountId) return 'Stranger';
  if (!accountId.endsWith('.near')) return accountId;
  const name = accountId.slice(0, -5); // remove .near
  if (name.length <= 12) return accountId;
  return `${name.slice(0, 4)}...${name.slice(-4)}.near`;
}

// Add helper function for token amounts
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

// Add balance fetching functions
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
      return formatTokenAmount(account.amount);
    }
    return "0";
  } catch (error) {
    console.error("Error fetching NEAR balance:", error);
    return "0";
  }
}

async function fetchCransBalance(accountId: string, wallet: any): Promise<string> {
  try {
    if (!wallet.selector) return "0";
    
    const result = await wallet.viewFunction({
      contractId: NETWORK_CONFIG.cransContractId,
      methodName: "ft_balance_of",
      args: { account_id: accountId }
    });

    if (result) {
      return formatTokenAmount(result);
    }
    return "0";
  } catch (error) {
    console.error("Error fetching CRANS balance:", error);
    return "0";
  }
}

// Add swap-related constants
const POOLS = {
  CRANS_NEAR: 5423,      // CRANS/NEAR pool
};

const TOKENS = {
  CRANS: "crans.tkn.near",
  NEAR: "wrap.near",
};

const TOKEN_DECIMALS = {
  [TOKENS.CRANS]: 24,    // CRANS has 24 decimals
  [TOKENS.NEAR]: 24,     // NEAR has 24 decimals
};

// Function to get token exchange rate
async function getSwapReturn(amountIn: string, isNearToCrans: boolean): Promise<string> {
  try {
    const provider = new JsonRpcProvider({ url: 'https://free.rpc.fastnear.com' });
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

// Function to prepare swap transaction message
function prepareSwapMsg(amount: string, isNearToCrans: boolean, expectedReturn: string) {
  // Make sure we have a full integer representation without scientific notation
  const formattedReturn = new Big(expectedReturn).toFixed(0);
    
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

// Add storage balance checking function
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

// Add storage balance checking function
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

// Define steps for NEAR to CRANS swap process
type NearCransStep = 'check storage' | 'wrap near' | 'buy crans' | 'done';

// Define steps for CRANS to NEAR swap process
type CransNearStep = 'buy near' | 'unwrap near' | 'done';

// State interface for swap processes
interface SwapState {
  currentStep: NearCransStep | CransNearStep;
  amount: string;           // amount in yoctoNEAR or yoctoCRANS
  displayAmount: string;    // amount to display
  expectedReturn: string;   // expected return amount
  minAmountOut: string;    // minimum amount out
  isProcessing: boolean;    // whether a transaction is processing
  hasStorageBalance: boolean; // whether user has CRANS storage
  lastTxHash?: string;     // last transaction hash
  isSwapInitiated: boolean; // whether swap process has been initiated by user
  isSwapConfirmed: boolean; // whether user has confirmed the swap
  swapDirection: 'near_to_crans' | 'crans_to_near'; // direction of the swap
}

// Dodaj funkcję formatującą datę
const formatMessageTime = (timestamp: Date) => {
  return timestamp.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export function Brief() {
  // Add hooks
  const wallet = useNearWallet();
  const { cransPerNear } = useTokenPrices();
  
  // Using React.useState
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [forceUpdate, setForceUpdate] = React.useState(0); // Add this state for forcing re-render
  const [usedTopics, setUsedTopics] = React.useState<string[]>([]); // Track used topics
  
  // Store container ID for direct DOM access
  const messagesContainerId = 'messages-container';
  const inputId = 'chat-input';

  // Add new state for NEAR to CRANS swap process
  const [swapState, setSwapState] = React.useState<SwapState>({
    currentStep: 'check storage',
    amount: '0',
    displayAmount: '0',
    expectedReturn: '0',
    minAmountOut: '0',
    isProcessing: false,
    hasStorageBalance: false,
    isSwapInitiated: false,
    isSwapConfirmed: false,
    swapDirection: 'near_to_crans'
  });

  // Add more comprehensive error handling
  const isWalletInteractionError = React.useCallback((error: any): boolean => {
    if (!error?.message) return false;
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('user cancelled') || 
      errorMessage.includes('user closed') || 
      errorMessage.includes('popup window') || 
      errorMessage.includes('failed to initialize') ||
      errorMessage.includes('couldn\'t open') ||
      errorMessage.includes('canceled') ||
      errorMessage.includes('cancelled the action')
    );
  }, []);

  // Handle wallet interaction errors consistently
  const handleWalletError = React.useCallback((error: any) => {
    console.warn('Wallet interaction error:', error.message);
    
    // Only update UI for cancelation/popup errors
    if (isWalletInteractionError(error)) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "The wallet operation couldn't be completed. Would you like to try again or explore other topics?",
        timestamp: new Date()
      }]);
      
      // Reset swap state if applicable
      if (swapState.isSwapInitiated) {
        setSwapState({
          currentStep: 'check storage',
          amount: '0',
          displayAmount: '0',
          expectedReturn: '0',
          minAmountOut: '0',
          isProcessing: false,
          hasStorageBalance: false,
          isSwapInitiated: false,
          isSwapConfirmed: false,
          swapDirection: 'near_to_crans'
        });
      }
      return true;
    }
    return false;
  }, [isWalletInteractionError, swapState.isSwapInitiated]);

  // Add reset state function
  const resetState = React.useCallback(() => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);
    setUsedTopics([]); // Reset used topics
    setSwapState({
      currentStep: 'check storage',
      amount: '0',
      displayAmount: '0',
      expectedReturn: '0',
      minAmountOut: '0',
      isProcessing: false,
      hasStorageBalance: false,
      isSwapInitiated: false,
      isSwapConfirmed: false,
      swapDirection: 'near_to_crans'
    });
  }, []);

  // Add effect to handle wallet connection changes
  React.useEffect(() => {
    resetState();
    const initializeChat = async () => {
      if (wallet.accountId) {
        console.log('Wallet connected, accountId:', wallet.accountId);
        // Add small delay to ensure wallet is fully connected
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userName = truncateWalletName(wallet.accountId);
        const personalizedMessages = [
          `${userName}, welcome back. Wars Of Cards is ready for you. How can I assist today?`,
          `${userName}, perfect timing. What area of the platform would you like to explore?`,
          `${userName}, good to see you. What would you like to focus on first?` 
        ];
        
        const welcomeMessage = personalizedMessages[Math.floor(Math.random() * personalizedMessages.length)];
        
        // Force a clean state with only the welcome message
        setMessages([{
          id: '1',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        }]);
      } else {
        console.log('No wallet connected, using guest mode');
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "I'm Vanessa, your dedicated platform guide. I'm here to help you maximize your experience. \n\nAllow pop-ups in your browser and for the smoothest gameplay, use Chrome browser. Also, make sure to turn off VPN to avoid any issues. \n\nReady to log in and get started?",
          timestamp: new Date()
        }]);
      }
    };

    initializeChat();
  }, [wallet.accountId, resetState]); // Add resetState to dependencies

  // Helper to update swap state
  const updateSwapState = React.useCallback((updates: Partial<SwapState>) => {
    setSwapState(currentState => ({
      ...currentState,
      ...updates
    }));
  }, []);

  // Add new handler for CRANS to NEAR swap
  const handleCransNearStep = React.useCallback(async () => {
    if (!wallet.accountId || swapState.isProcessing || swapState.swapDirection !== 'crans_to_near') return;

    try {
      switch (swapState.currentStep as CransNearStep) {
        case 'buy near': {
          updateSwapState({ isProcessing: true });
          
          try {
            // Use executeTransactions to handle both steps in one approval
            const transactions = [
              {
                contractId: TOKENS.CRANS,
                methodName: 'ft_transfer_call',
                args: {
                  receiver_id: 'v2.ref-finance.near',
                  amount: swapState.amount,
                  msg: prepareSwapMsg(swapState.amount, false, swapState.minAmountOut)
                },
                gas: '180000000000000',
                deposit: '1'
              },
              {
                contractId: TOKENS.NEAR,
                methodName: 'near_withdraw',
                args: {
                  amount: swapState.expectedReturn
                },
                gas: '50000000000000',
                deposit: '1'
              }
            ];

            // Better explain what's happening to the user
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "I'll execute both actions at once - selling your CRANS tokens and unwrapping your NEAR. You'll just need to approve once in your wallet.",
              timestamp: new Date()
            }]);
            
            const result = await wallet.executeTransactions(transactions, {
              callbackUrl: window.location.href
            });

            // After both transactions, we're done
            updateSwapState({
              currentStep: 'done',
              isProcessing: false,
              isSwapConfirmed: false
            });
            
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "Sold! The transactions are complete. Your CRANS have been swapped back to NEAR.\n\nIs there anything else you'd like to know?",
              timestamp: new Date()
            }]);
            
          } catch (error: any) {
            if (handleWalletError(error)) {
              updateSwapState({ isProcessing: false });
              return;
            }
            throw error;
          } finally {
            updateSwapState({ isProcessing: false });
          }
          break;
        }

        case 'done': {
          setSwapState({
            currentStep: 'check storage',
            amount: '0',
            displayAmount: '0',
            expectedReturn: '0',
            minAmountOut: '0',
            isProcessing: false,
            hasStorageBalance: false,
            isSwapInitiated: false,
            isSwapConfirmed: false,
            swapDirection: 'near_to_crans'
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error in CRANS to NEAR swap step:', error);
      handleWalletError(error);
    }
  }, [swapState, wallet, handleWalletError, updateSwapState, setMessages]);

  // Handle NEAR to CRANS swap steps
  const handleNearCransStep = React.useCallback(async () => {
    if (!wallet.accountId || swapState.isProcessing || swapState.swapDirection !== 'near_to_crans') return;

    try {
      switch (swapState.currentStep as NearCransStep) {
        case 'check storage': {
          updateSwapState({ isProcessing: true });
          
          // First check storage needs - wykonujemy to bez komunikatów
          const hasWrapStorage = await checkWrapNearStorageBalance(wallet.accountId, wallet);
          const hasCransStorage = await checkCransStorageBalance(wallet.accountId, wallet);
          
          // Prepare transactions based on storage needs
          const transactions = [];
          let transactionDescription = [];
          
          // Add storage deposit transactions if needed
          if (!hasWrapStorage) {
            transactions.push({
              contractId: TOKENS.NEAR,
              methodName: 'storage_deposit',
              args: {},
              gas: '30000000000000',
              deposit: '1250000000000000000000'
            });
            
            transactionDescription.push("initialize wrapped NEAR storage");
          }
          
          if (!hasCransStorage) {
            transactions.push({
              contractId: TOKENS.CRANS,
              methodName: 'storage_deposit',
              args: {},
              gas: '30000000000000',
              deposit: '1250000000000000000000'
            });
            
            transactionDescription.push("initialize CRANS token storage");
          }
          
          // Add wrap near and token swap transactions
          transactions.push({
            contractId: TOKENS.NEAR,
            methodName: 'near_deposit',
            args: {},
            gas: '50000000000000',
            deposit: swapState.amount
          });
          
          transactionDescription.push("wrap your NEAR tokens");
          
          transactions.push({
            contractId: TOKENS.NEAR,
            methodName: 'ft_transfer_call',
            args: {
              receiver_id: 'v2.ref-finance.near',
              amount: swapState.amount,
              msg: prepareSwapMsg(swapState.amount, true, swapState.minAmountOut)
            },
            gas: '180000000000000',
            deposit: '1'
          });
          
          transactionDescription.push("exchange for CRANS tokens");
          
          try {
            // Create a nice human-readable explanation
            const transactionDescriptionText = transactionDescription.length > 1 
              ? transactionDescription.slice(0, -1).join(", ") + ", and " + transactionDescription.slice(-1)
              : transactionDescription[0];
            
            // Tylko jeden komunikat wyjaśniający wszystkie operacje
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Perfect! With one click, I'll ${transactionDescriptionText}. You'll only need to approve once in your wallet.`,
              timestamp: new Date()
            }]);
            
            // Execute all transactions
            const result = await wallet.executeTransactions(transactions, {
              callbackUrl: window.location.href
            });
            
            // After all transactions are done
            updateSwapState({
              currentStep: 'done',
              isProcessing: false,
              isSwapConfirmed: false
            });
            
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "Transaction complete! You now have CRANS tokens and can play Wars of Cards.\n\nIs there anything else you'd like to know?",
              timestamp: new Date()
            }]);
            
          } catch (error: any) {
            if (handleWalletError(error)) {
              updateSwapState({ isProcessing: false });
              return;
            }
            throw error;
          } finally {
            updateSwapState({ isProcessing: false });
          }
          break;
        }

        case 'done': {
          // Reset state after completion
          setSwapState({
            currentStep: 'check storage',
            amount: '0',
            displayAmount: '0',
            expectedReturn: '0',
            minAmountOut: '0',
            isProcessing: false,
            hasStorageBalance: false,
            isSwapInitiated: false,
            isSwapConfirmed: false,
            swapDirection: 'near_to_crans'
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error in NEAR to CRANS swap step:', error);
      handleWalletError(error);
    }
  }, [swapState, wallet, handleWalletError, updateSwapState, setMessages]);

  // Effect to monitor and execute swap steps
  React.useEffect(() => {
    if (!wallet.accountId || swapState.isProcessing || !swapState.isSwapInitiated || !swapState.isSwapConfirmed) return;

    // Add a small delay to ensure previous transaction is fully processed
    const timeoutId = setTimeout(() => {
      if (swapState.swapDirection === 'near_to_crans') {
        handleNearCransStep();
      } else {
        handleCransNearStep();
      }
    }, 500); // Reduced delay since we're handling all at once

    return () => clearTimeout(timeoutId);
  }, [wallet.accountId, swapState.isSwapInitiated, swapState.isSwapConfirmed, swapState.swapDirection, handleNearCransStep, handleCransNearStep]);

  // Scroll to bottom after messages change
  React.useEffect(() => {
    const container = document.getElementById(messagesContainerId);
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Focus input when component mounts
  React.useEffect(() => {
    const input = document.getElementById(inputId) as HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  }, []);
  
  const handleTextareaChange = (e: any) => {
    if (!wallet.accountId) {
      e.preventDefault();
      wallet.connect();
      return;
    }
    setInputValue(e.target.value);
    if (e.target) {
      e.target.style.height = 'inherit';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e: any) => {
    if (!wallet.accountId) {
      e.preventDefault();
      wallet.connect();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleTopicClick = async (topicId: string) => {
    // Handle login topic separately
    if (topicId === 'login') {
      try {
        await wallet.connect();
        return;
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        return;
      }
    }

    // Add topicId to used topics list (except for 'help' which should always be available)
    if (topicId !== 'help') {
      setUsedTopics(prev => [...prev, topicId]);
    }

    // Create a user message for the clicked topic
    const topicLabel = mainTopics.find(topic => topic.id === topicId)?.label || topicId;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: topicLabel,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Process the response with typing animation
    try {
      // Delay before showing typing indicator
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(true);
      
      // Add typing indicator with animation and delay before response
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate typing time
      
      // Get response content
      const responseContent = await findBestResponse(topicId, wallet.accountId, wallet);
      
      // Add bot response
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing topic:', error);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!wallet.accountId) {
      wallet.connect();
      return;
    }
    if (!inputValue.trim()) return;
    
    // Store message content and clear input immediately
    const messageContent = inputValue.trim();
    setInputValue('');
    
    // Reset textarea height
    const input = document.getElementById(inputId) as HTMLTextAreaElement;
    if (input) {
      input.style.height = 'inherit';
    }
    
    // Add user message to chat immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      // Delay before showing typing indicator
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(true);
      
      // Add typing indicator with animation and delay before response
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate typing time
      
      // Check if message is related to any topic
      const lowercaseMessage = messageContent.toLowerCase();
      
      // Check if message matches any main topic
      const matchedTopic = mainTopics.find(topic => 
        topic.label.toLowerCase() === lowercaseMessage || 
        topic.id.toLowerCase() === lowercaseMessage ||
        lowercaseMessage.includes(topic.label.toLowerCase()) ||
        lowercaseMessage.includes(topic.id.toLowerCase())
      );
      
      // Add to used topics if a match was found (except for 'help')
      if (matchedTopic && matchedTopic.id !== 'help') {
        setUsedTopics(prev => [...prev, matchedTopic.id]);
      }
      
      // Find appropriate response from predefined answers
      const botResponse = await findBestResponse(messageContent, wallet.accountId, wallet);
      
      // Add bot response with animation
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add fallback error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Modify findBestResponse to use new state management
  async function findBestResponse(input: string, accountId: string | null, wallet: any): Promise<string> {
    input = input.toLowerCase();
    
    // Helper function to check if input matches small talk patterns
    const checkSmallTalk = (input: string): string | null => {
      // Positive phrases
      const positivePatterns = [
        'nice', 'good', 'great', 'awesome', 'amazing', 'excellent', 'cool', 'wow', 
        'thanks', 'thank you', 'thx', 'ty', 'ok', 'okay', 'k', 'sounds good', 
        'perfect', 'sure', 'absolutely', 'indeed', 'right'
      ];
      
      // Compliments
      const complimentPatterns = [
        'like you', 'love you', 'you are great', 'you are good', 'you are nice', 
        'you are amazing', 'you are awesome', 'you are helpful', 'you are cool',
        'you\'re great', 'you\'re good', 'you\'re nice', 'you\'re amazing',
        'you\'re awesome', 'you\'re helpful', 'you\'re cool', 'you rock'
      ];
      
      // How are you patterns
      const howAreYouPatterns = [
        'how are you', 'how you doing', 'how\'s it going', 'how is it going',
        'how are things', 'how have you been', 'how\'s your day', 'how is your day',
        'are you ok', 'are you okay', 'are you well', 'are you good',
        'what\'s up', 'whats up', 'sup', 'hows it going', 'how are u'
      ];
      
      // Check "how are you" type questions
      for (const pattern of howAreYouPatterns) {
        if (input.includes(pattern)) {
          return predefinedResponses['small_talk_how_are_you'];
        }
      }
      
      // Check positive phrases - more strict matching to avoid false positives
      for (const pattern of positivePatterns) {
        // Check for exact match or word boundaries
        if (input === pattern || 
            input.match(new RegExp(`\\b${pattern}\\b`)) ||
            input === `that's ${pattern}` || 
            input === `thats ${pattern}` ||
            input === `that is ${pattern}`) {
          return predefinedResponses['small_talk_positive'];
        }
      }
      
      // Check compliments - more specific matching
      for (const pattern of complimentPatterns) {
        if (input.includes(pattern) && !input.includes('don\'t') && !input.includes('dont') && !input.includes('not')) {
          return predefinedResponses['small_talk_compliment'];
        }
      }
      
      return null;
    };
    
    // Helper function to check if input contains inappropriate content
    const checkInappropriate = (input: string): string | null => {
      const negativePatterns = [
        'bad', 'terrible', 'awful', 'worst', 'hate', 'dislike', 'annoying',
        'useless', 'stupid', 'dumb', 'not good', 'not helpful', 'not working',
        'doesn\'t work', 'doesn\'t help', 'don\'t like', 'don\'t want'
      ];
      
      const inappropriatePatterns = [
        'fuck', 'shit', 'damn', 'bitch', 'crap', 'ass', 'asshole', 'idiot',
        'screw you', 'fuck you', 'go to hell', 'stupid bot', 'dumb bot', 
        'shut up', 'shut down', 'stfu'
      ];
      
      // Check for inappropriate messages first - higher priority
      for (const pattern of inappropriatePatterns) {
        if (input.includes(pattern)) {
          return predefinedResponses['inappropriate'];
        }
      }
      
      // Check for general negative feedback
      for (const pattern of negativePatterns) {
        // More precise matching for negative patterns
        if (input === pattern || 
            input.match(new RegExp(`\\b${pattern}\\b`)) ||
            input === `that's ${pattern}` || 
            input === `thats ${pattern}` ||
            input === `that is ${pattern}` ||
            input.includes(`really ${pattern}`)) {
          return predefinedResponses['negative_feedback'];
        }
      }
      
      return null;
    };
    
    // Check for inappropriate content FIRST
    const inappropriateResponse = checkInappropriate(input);
    if (inappropriateResponse) {
      return inappropriateResponse;
    }
    
    // Check for small talk AFTER checking for inappropriate content
    const smallTalkResponse = checkSmallTalk(input);
    if (smallTalkResponse) {
      return smallTalkResponse;
    }
    
    // Handle greetings
    const greetings = ['hey', 'hi', 'hello', 'sup', 'howdy'];
    if (greetings.includes(input)) {
      return predefinedResponses['hello'];
    }
    
    // Handle login command
    if (input === 'login' || input === 'log in') {
      try {
        await wallet.connect();
        return "Connecting your wallet...";
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        return "There was an error connecting your wallet. Please try again.";
      }
    }
    
    // Define keywords to detect in user messages
    const keywordHandlers: Record<string, () => Promise<string>> = {
      'balance': async () => {
        if (!accountId) {
          return "🔒 Please connect your wallet first to check your balances.\n\nYou can do this by clicking the 'Log In' button above.";
        }
        
        try {
          const [nearBalance, cransBalance] = await Promise.all([
            fetchNearBalance(accountId, wallet),
            fetchCransBalance(accountId, wallet)
          ]);
          
          return `💰 Here are your current balances:\n\nNEAR Balance: ${nearBalance} Ⓝ\nCRANS Balance: ${cransBalance} CRANS`;
        } catch (error) {
          console.error('Error fetching balances:', error);
          return "⚠️ I encountered an error fetching your balances.\n\nPlease try again in a moment or check your connection.";
        }
      },
      'swap': async () => {
        if (!accountId) {
          return "🔒 Please connect your wallet first to use the swap feature.\n\nYou can do this by clicking the 'Log In' button above.";
        }
        
        try {
          const [nearBalance, cransBalance] = await Promise.all([
            fetchNearBalance(accountId, wallet),
            fetchCransBalance(accountId, wallet)
          ]);
          
          return `Your current holdings:
NEAR: ${nearBalance} Ⓝ
CRANS: ${cransBalance} CRANS

Swap commands:
- "5 near to crans" - Purchase CRANS using 5 NEAR
- "0.5 crans to near" - Convert 0.5 CRANS back to NEAR

IMPORTANT: You must allow popups for successful transactions. First-time transactions will fail if pop-ups are blocked.`;
        } catch (error) {
          console.error('Error fetching balances:', error);
          return "⚠️ I encountered an error fetching your balances.\n\nPlease try again in a moment or check your connection.";
        }
      },
      'topics': () => Promise.resolve(`📋 Here are the main topics I can help you with:\n\n${mainTopics.map(topic => `• ${topic.label}`).join('\n')}\n\nWhich topic would you like to explore?`)
    };

    // Helper function to detect intention based on context patterns
    const detectIntention = (input: string): string | null => {
      // Intention mapping with context patterns
      const intentionPatterns: Record<string, string[]> = {
        'what_to_do': [
          'what can i do', 'what can i do here', 'what should i do', 'what to do',
          'what you offer', 'what you offering', 'what are you offering', 'you are offering',
          'what do you offer', 'what does this offer', 'what can you offer',
          'what is this for', 'what is this about', 'what is this place',
          'how to use', 'how to start', 'getting started', 'where to start',
          'show me options', 'available options', 'what are my options', 
          'what is possible', 'what can be done', 'what is available'
        ],
        
        'games': [
          'how to play', 'how do i play', 'game rules', 'rules of the game',
          'tell me about games', 'explain the games', 'how games work',
          'blackjack rules', 'war order rules', 'card games rules',
          'tell me the rules', 'what are the rules', 'how does game work',
          'game instructions', 'how to win', 'how do i win',
          
          // Dodane wzorce związane z konkretnymi grami
          'blackjack', 'what is blackjack', 'whats blackjack', 'what\'s blackjack',
          'tell me about blackjack', 'explain blackjack', 'blackjack game',
          'new war order', 'what is new war order', 'whats new war order', 'what\'s new war order',
          'tell me about new war order', 'explain new war order', 'war order game',
          'nwo', 'what is nwo', 'whats nwo', 'what\'s nwo'
        ],
        
        'swap': [
          // Original swap related phrases
          'swap tokens', 'exchange tokens', 'trade tokens', 'convert tokens',
          'how to swap', 'how to exchange', 'how to convert',
          'change near to crans', 'change crans to near',
          'let\'s swap', 'want to swap', 'need to swap', 'need tokens',
          'get crans', 'buy crans', 'sell crans', 'exchange near',
          
          // New buying/selling related phrases
          'buy tokens', 'purchase tokens', 'sell tokens', 'buy some tokens',
          'purchase some tokens', 'want to buy', 'want to sell', 'want to purchase',
          'how to buy', 'how to sell', 'how to purchase',
          'let\'s buy', 'need to buy', 'need to sell', 'i want to buy',
          'i want to sell', 'buy near', 'sell near', 'buy some near',
          'buy some crans', 'sell some near', 'sell some crans',
          'trade near', 'trade crans', 'convert near', 'convert crans',
          'get some tokens', 'get tokens', 'get some crans', 'get some near',
          
          // Dodane wzorce związane z "coins"
          'buy coins', 'sell coins', 'buy some coins', 'sell some coins',
          'purchase coins', 'purchase some coins', 'get coins', 'get some coins',
          'trade coins', 'convert coins', 'exchange coins', 'want to buy coins',
          'want to sell coins', 'need coins', 'need some coins', 'let\'s buy coins',
          'how to buy coins', 'how to sell coins'
        ],
        
        'help': [
          'need help', 'can you help', 'help me', 'how does this work',
          'having trouble', 'not working', 'having a problem', 'got a problem',
          'how to use', 'instructions', 'guide me', 'show me how',
          'explain how'
        ],
        
        'identity': [
          'who are you', 'what are you', 'tell me about yourself', 'about you',
          'your name', 'who is vanessa', 'what is vanessa', 'who made you',
          'what do you do', 'your purpose', 'your function', 'your role',
          'how do you work', 'are you a bot', 'are you ai', 'are you human',
          'are you real', 'are you a person', 'introduce yourself',
          'tell me who you are', 'what is your name', 'who am i talking to'
        ]
      };
      
      // Add variations with common typos and partial matches
      const normalizeInput = (text: string): string => {
        return text
          .replace(/'/g, '') // Remove apostrophes
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
      };
      
      const normalizedInput = normalizeInput(input);
      
      // Debug log to console
      console.log('Normalized input:', normalizedInput);
      
      // Check each intention pattern
      for (const [intention, patterns] of Object.entries(intentionPatterns)) {
        for (const pattern of patterns) {
          const normalizedPattern = normalizeInput(pattern);
          
          // Check for exact matches, word boundary matches, or substring matches
          if (normalizedInput === normalizedPattern || 
              normalizedInput.includes(normalizedPattern) ||
              // Special case for "what you are offering" and variations
              (intention === 'what_to_do' && 
               (normalizedInput.includes('offer') || 
                normalizedInput.includes('what you') ||
                /what.*offering/.test(normalizedInput))) ||
              // Special case for identity questions
              (intention === 'identity' && 
               (/who.*you/.test(normalizedInput) || 
                /what.*you/.test(normalizedInput) ||
                /your.*name/.test(normalizedInput) ||
                /about.*you/.test(normalizedInput))) ||
              // Special case for game questions
              (intention === 'games' && 
               (/what.*blackjack/.test(normalizedInput) ||
                /tell.*blackjack/.test(normalizedInput) ||
                /what.*war.*order/.test(normalizedInput) ||
                /tell.*war.*order/.test(normalizedInput) ||
                /explain.*blackjack/.test(normalizedInput) ||
                /explain.*war.*order/.test(normalizedInput) ||
                /about.*blackjack/.test(normalizedInput) ||
                /about.*war.*order/.test(normalizedInput))) ||
              // Special case for token buying and selling
              (intention === 'swap' && 
               (/buy.*token/.test(normalizedInput) || 
                /sell.*token/.test(normalizedInput) ||
                /buy.*crans/.test(normalizedInput) ||
                /sell.*near/.test(normalizedInput) ||
                /purchase.*token/.test(normalizedInput) ||
                /get.*token/.test(normalizedInput) ||
                /want.*buy/.test(normalizedInput) ||
                /want.*sell/.test(normalizedInput) ||
                /buy.*coins/.test(normalizedInput) ||
                /sell.*coins/.test(normalizedInput) ||
                /purchase.*coins/.test(normalizedInput) ||
                /get.*coins/.test(normalizedInput)))) {
            console.log('Matched intention:', intention, 'with pattern:', pattern);
            return intention;
          }
        }
      }
      
      return null;
    };
    
    // Check for content-based intentions
    const intention = detectIntention(input);
    if (intention) {
      // For swap and balance intencje, use handlers instead of predefined responses
      // to properly fill in placeholders with actual values
      if (intention === 'swap' && keywordHandlers['swap']) {
        return await keywordHandlers['swap']();
      } else if (intention === 'balance' && keywordHandlers['balance']) {
        return await keywordHandlers['balance']();
      }
      return predefinedResponses[intention];
    }

    // Check if input contains any of the defined keywords
    for (const [keyword, handler] of Object.entries(keywordHandlers)) {
      if (input.includes(keyword)) {
        return await handler();
      }
    }
    
    // Handle topic names in lowercase
    const lowercaseInput = input.toLowerCase();
    const matchedTopic = mainTopics.find(topic => 
      topic.label.toLowerCase() === lowercaseInput || 
      topic.id.toLowerCase() === lowercaseInput
    );
    
    if (matchedTopic) {
      return predefinedResponses[matchedTopic.id] || `💫 Let me tell you about ${matchedTopic.label}...`;
    }

    // Handle swap commands (e.g., "5 near to crans")
    const swapMatch = input.match(/^(\d+\.?\d*)\s+(near|crans)\s+to\s+(near|crans)$/i);
    if (swapMatch) {
      if (!accountId) {
        return "Please connect your wallet first to use the swap feature.";
      }

      const [_, amountStr, fromToken, toToken] = swapMatch;
      const amount = parseFloat(amountStr);
      const isNearToCrans = fromToken.toLowerCase() === 'near';

      if (fromToken.toLowerCase() === toToken.toLowerCase()) {
        return "You can't swap a token for itself. Please use a different token pair.";
      }

      if (isNearToCrans) {
        try {
          // Convert amount to yoctoNEAR (24 decimals)
          const amountInYocto = new Big(amount).mul(new Big(10).pow(24)).toFixed(0);
          
          // Get expected return amount
          const expectedReturn = await getSwapReturn(amountInYocto, true);
          const formattedReturn = new Big(expectedReturn).div(new Big(10).pow(24)).toFixed(2);

          // Check user's balance
          const balance = await fetchNearBalance(accountId, wallet);

          if (new Big(balance).lt(amount)) {
            return `Insufficient NEAR balance. You have ${balance} NEAR, but tried to swap ${amount} NEAR.`;
          }

          // Initialize swap state
          setSwapState({
            currentStep: 'check storage',
            amount: amountInYocto,
            displayAmount: amount.toString(),
            expectedReturn,
            minAmountOut: new Big(expectedReturn).mul(0.99).round(0, Big.roundDown).toString(),
            isProcessing: false,
            hasStorageBalance: false,
            isSwapInitiated: true,
            isSwapConfirmed: false,
            swapDirection: 'near_to_crans'
          });

          return `You will receive approximately ${formattedReturn} CRANS for ${amount} NEAR. Would you like to proceed with the swap? Type 'yes' to confirm.`;
        } catch (error) {
          console.error('Error preparing swap:', error);
          return "I encountered an error preparing your swap. Please try again in a moment.";
        }
      } else {
        // Handle CRANS to NEAR swap
        try {
          // Convert amount to yoctoCRANS (24 decimals)
          const amountInYocto = new Big(amount).mul(new Big(10).pow(24)).toFixed(0);
          
          // Get expected return amount
          const expectedReturn = await getSwapReturn(amountInYocto, false);
          const formattedReturn = new Big(expectedReturn).div(new Big(10).pow(24)).toFixed(2);

          // Check user's balance
          const cransBalance = await fetchCransBalance(accountId, wallet);

          if (new Big(cransBalance).lt(amount)) {
            return `Insufficient CRANS balance. You have ${cransBalance} CRANS, but tried to swap ${amount} CRANS.`;
          }

          // Initialize swap state for CRANS to NEAR
          setSwapState({
            currentStep: 'buy near',  // New step for CRANS to NEAR flow
            amount: amountInYocto,
            displayAmount: amount.toString(),
            expectedReturn,
            minAmountOut: new Big(expectedReturn).mul(0.99).round(0, Big.roundDown).toString(),
            isProcessing: false,
            hasStorageBalance: true,  // We don't need to check storage for CRANS to NEAR
            isSwapInitiated: true,
            isSwapConfirmed: false,
            swapDirection: 'crans_to_near'
          });

          return `You will receive approximately ${formattedReturn} NEAR for ${amount} CRANS. Would you like to proceed with the swap? Type 'yes' to confirm.`;
        } catch (error) {
          console.error('Error preparing swap:', error);
          return "I encountered an error preparing your swap. Please try again in a moment.";
        }
      }
    }

    // Handle swap confirmation
    if (input === 'yes' && swapState.currentStep !== 'done' && swapState.isSwapInitiated && !swapState.isSwapConfirmed) {
      updateSwapState({ isSwapConfirmed: true });
      
      // Array of flirty Vanessa messages
      const flirtyMessages = [
         "Ready when you are. Let's proceed with your trade.",
         "Excellent choice. Processing your swap now...",
         "Transaction initiated. Preparing your exchange..."
      ];
      
      // Trigger the swap process immediately
      setTimeout(() => {
        if (swapState.swapDirection === 'near_to_crans') {
          handleNearCransStep();
        } else {
          handleCransNearStep();
        }
      }, 100);
      
      // Select a random message
      return flirtyMessages[Math.floor(Math.random() * flirtyMessages.length)];
    }

    // Check for exact matches in regular responses
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (input === key) return response;
    }
    
    // Check for partial matches
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (input.includes(key)) return response;
    }
    
    // Default response if no match found
    return "I didn't catch that. I can assist with:\n\n- Game access and rules\n- NEAR/CRANS exchanges\n- Community features\n- Blockchain information\n\nWhat specific help do you need?";
  }

  return (
    <div className={styles.container}>
      <div className={styles.chatContainer}>
        <div id={messagesContainerId} className={styles.messagesContainer}>
          <div className={styles.messagesWrapper}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
              >
                <div className={styles.messageBox}>
                  <div className={styles.messageHeader}>
                    <div className={styles.messageHeaderLeft}>
                      <img 
                        src={`https://i.near.social/magic/thumbnail/https://near.social/magic/img/account/${msg.role === 'user' ? wallet.accountId : 'warsofcards.near'}`}
                        alt={msg.role === 'user' ? truncateWalletName(wallet.accountId) : 'Vanessa'}
                        className={`${styles.authorAvatar} ${msg.role === 'user' && !wallet.accountId ? styles.authorAvatarBlurred : ''}`}
                      />
                      <span className={styles.messageSender}>
                        {msg.role === 'user' ? truncateWalletName(wallet.accountId) : 'Vanessa'}
                      </span>
                    </div>
                    <span className={styles.messageTimestamp}>
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    {msg.role === 'user' ? (
                      msg.content.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </span>
                      ))
                    ) : (
                      <TypewriterText 
                        text={msg.content} 
                        speed={5}
                      />
                    )}
                    
                    {/* Add topic buttons at the end of Vanessa's last message */}
                    {msg.role === 'assistant' && 
                     msg.id === messages.filter(m => m.role === 'assistant').slice(-1)[0]?.id && 
                     !isLoading && 
                     (!wallet.accountId || !swapState.isSwapInitiated || swapState.currentStep === 'done') && (
                      <div className={styles.topicsContainer}>
                        {!wallet.accountId ? (
                          <>
                            <button
                              key="login"
                              className={`${styles.topicButton} ${styles.loginButton}`}
                              onClick={() => handleTopicClick('login')}
                            >
                              Log In
                            </button>
                            <button
                              key="help"
                              className={styles.topicButton}
                              onClick={() => handleTopicClick('help')}
                            >
                              Help
                            </button>
                          </>
                        ) : (
                          mainTopics
                            .filter(topic => !usedTopics.includes(topic.id)) // Filter out used topics
                            .map((topic) => (
                            <button
                              key={topic.id}
                              className={styles.topicButton}
                              onClick={() => handleTopicClick(topic.id)}
                            >
                              {topic.label}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className={`${styles.messageWrapper} ${styles.assistantMessage}`}>
                <div className={styles.messageBox}>
                  <div className={styles.messageHeader}>
                    <img 
                      src="https://i.near.social/magic/thumbnail/https://near.social/magic/img/account/warsofcards.near"
                      alt="Vanessa"
                      className={styles.authorAvatar}
                    />
                    <span className={styles.messageSender}>Vanessa</span>
                  </div>
                  <div className={`${styles.messageContent} ${styles.matrixText}`}>
                    <TypewriterText text="..." speed={500} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.inputContainer}>
          <textarea
            id={inputId}
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={wallet.accountId ? "Type command here..." : "Log in to perform actions..."}
            className={styles.chatInput}
            rows={1}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()} 
            className={styles.sendButton}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 
