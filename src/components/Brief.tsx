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
  
  'what_to_do': 'Welcome to the NEAR blockchain gaming experience.\n\nOur premium features:\n- Classic Blackjack - Simple rules, strategic play\n- New War Order - Our exclusive signature game\n\nCRANS tokens power all gameplay. Your Profile shows your real-time balances with instant withdrawal options. Need tokens? I provide direct assistance with all CRANS transactions.\n\nReady to begin? Select your next move:',
  
  'games': 'BLACKJACK\n- Classic casino competition against the dealer\n- Aim for 21 without busting\n- Hit 21? Instant win\n- Beat dealer\'s hand to win, ties go to house\n- Advanced shuffle system prevents card counting\n- Entry: 210 CRANS\n- Win: 378 CRANS (180% return)\n\nPlay Steps:\n1. Place your bet\n2. Receive initial cards\n3. Hit or Stand strategically\n4. Dealer follows house rules\n5. Closest to 21 without going over wins\n\nNEW WAR ORDER\n- Strategic card battles with time pressure\n- Win the most battles within 3 minutes\n- Features 55-card deck including 3 Jokers\n- Special "TWIST" rule with number 7\n- "WAR" triggers with matching cards or Jokers\n- Entry: 420 CRANS\n- Win: 756 CRANS (180% return)\n\nPlay Steps:\n1. Place your bet\n2. Receive 20 cards in pyramid formation\n3. Select one card per round\n4. Higher card wins each point\n5. Special cards activate bonus features\n6. Win the majority of 20 battles to succeed\n\nWhich game interests you today?',
  
  'messages': 'Our Messages hub is the central network of the Wars of Cards community.\n\nKey features:\n- Connect directly with other players through comments\n- Support content with your NEAR account\n- Accumulate Points through active participation\n- Convert Points to NEAR tokens\n\nCommunity benefits:\n- Access exclusive token airdrops\n- Unlock special perks as an active member\n- Gain recognition for your contributions\n\nThe connections you make here have real value. Join in, engage regularly, and experience the advantages of being part of our Wars of Cards network.',
  
  'near': 'NEAR: The Premium Blockchain Behind Wars of Cards\n\nKey Advantages:\n- High-speed transaction processing\n- Minimal fees for all operations\n- Confirmation times in seconds\n- Intuitive interface design\n\nFor First-time Blockchain Users:\n- Think of NEAR as your digital wallet and identity in one\n- Significantly faster and cheaper than traditional systems\n\nYour NEAR Account:\n- Single login serves as both username and secure wallet\n- Seamless, protected gameplay integration\n- Full control and ownership of your digital assets\n\nOur platform leverages NEAR\'s capabilities to deliver an exceptional gaming experience with maximum security and efficiency.',
  
  'crans': 'Official Site: https://money.crans.xyz/\n\nAcquiring CRANS:\n- Use "swap" to convert your NEAR tokens instantly\n- Win additional tokens through gameplay\n- Earn through community participation and events\n\nToken Usage:\n- Blackjack: 210 CRANS entry with 378 CRANS potential win\n- New War Order: 420 CRANS entry with 756 CRANS potential win\n- All wins pay 180% of your original stake\n\nReady for tokens? Select "SWAP" and I\'ll walk you through the process.',
  
  'help': 'Essential Requirements:\n- NEAR account - Connect or create instantly through Meteor Wallet\n- NEAR tokens - Available on Binance, Coinbase, and major exchanges\n- CRANS tokens - Exchange your NEAR tokens with me directly\n\nUse Google Chrome, turn on popups and turn off VPN for the smoothest gameplay experience.\n\nHow can I assist you today?\n\nI can provide:\n- Game strategies and rules\n- Setup assistance\n- NEAR blockchain information\n- CRANS token acquisition\n- Community benefits and features\n\nWhat specific information do you need?',
  
  'swap': 'Your current holdings:\nNEAR: {near_balance} Ⓝ\nCRANS: {crans_balance} CRANS\n\nSwap commands:\n- "5 near to crans" - Purchase CRANS using 5 NEAR\n- "500 crans to near" - Convert 500 CRANS back to NEAR\n\nIMPORTANT: You must allow popups for successful transactions.\nFirst-time transactions may fail if popups are blocked.\nEnable popups when prompted for seamless exchanges.',
  
  'balance': '💰 Here are your current balances:\n\nNEAR Balance: {near_balance} Ⓝ\nCRANS Balance: {crans_balance} CRANS'
};

// Define main topics for clickable buttons - more compact
const mainTopics = [
  { id: 'what_to_do', label: 'What to do here?' },
  { id: 'games', label: 'How To Play?' },
  { id: 'messages', label: 'What can I read in Messages?' },
  { id: 'near', label: 'NEAR' },
  { id: 'crans', label: 'CRANS' },
  { id: 'swap', label: 'SWAP' },
  { id: 'balance', label: 'Balance' },
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
          content: "I'm Vanessa, your dedicated platform guide. I'm here to help you navigate our services and maximize your experience. \n\nFor optimal performance, use Google Chrome for the smoothest gameplay experience. \n\nReady to log in and get started?",
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

  // Handle swap steps
  const handleNearCransStep = React.useCallback(async () => {
    if (!wallet.accountId || swapState.isProcessing || swapState.swapDirection !== 'near_to_crans') return;

    try {
      switch (swapState.currentStep as NearCransStep) {
        case 'check storage': {
          updateSwapState({ isProcessing: true });
          
          // First check wrap.near storage
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Let's see if you have interacted with wrapped tokens before...",
            timestamp: new Date()
          }]);

          const hasWrapStorage = await checkWrapNearStorageBalance(wallet.accountId, wallet);
          
          if (!hasWrapStorage) {
            // Add message about first interaction with wrap.near
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "This is your first time interacting with wrapped tokens, you are new in the ecosystem! We need to initialize your token storage first. Please confirm the transaction to proceed.",
              timestamp: new Date()
            }]);
            
            try {
              const result = await wallet.executeTransaction({
                contractId: TOKENS.NEAR,
                methodName: 'storage_deposit',
                args: {},
                gas: '30000000000000',
                deposit: '1250000000000000000000',
                callbackUrl: window.location.href
              });

              if (!result?.transaction_outcome?.id) {
                throw new Error('Storage deposit for wrap.near failed');
              }
            } catch (error: any) {
              // Use the new error handler
              if (handleWalletError(error)) {
                updateSwapState({ isProcessing: false });
                return;
              }
              throw error;
            }
          }

          // After wrap.near is handled, check CRANS storage
          const hasCransStorage = await checkCransStorageBalance(wallet.accountId, wallet);
          
          // Always show the first message about checking CRANS
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Now let's check CRANS token...",
            timestamp: new Date()
          }]);
          
          if (!hasCransStorage) {
            // Message about first interaction with CRANS
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "I see this is your first interaction with CRANS! We need to initialize your token storage for it. Please confirm the transaction to proceed.",
              timestamp: new Date()
            }]);
            
            try {
              const result = await wallet.executeTransaction({
                contractId: TOKENS.CRANS,
                methodName: 'storage_deposit',
                args: {},
                gas: '30000000000000',
                deposit: '1250000000000000000000',
                callbackUrl: window.location.href
              });

              // Check if transaction was successful
              if (result?.transaction_outcome?.id) {
                // After storage deposit, we'll update state and move to next step
                updateSwapState({
                  hasStorageBalance: true,
                  currentStep: 'wrap near',
                  isProcessing: false
                });
                
                // Add message about proceeding to wrap NEAR
                setMessages(prev => [...prev, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: "Perfect! Now let's wrap your NEAR to proceed with the swap...",
                  timestamp: new Date()
                }]);
              }
            } catch (error: any) {
              // Use the new error handler
              if (handleWalletError(error)) {
                updateSwapState({ isProcessing: false });
                return;
              }
              throw error;
            }
          } else {
            // If both storages exist, update state and move to next step
            updateSwapState({
              hasStorageBalance: true,
              currentStep: 'wrap near',
              isProcessing: false
            });
            
            // Add message about proceeding to wrap NEAR
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: "Great! Now let's wrap your NEAR to proceed with the swap...",
              timestamp: new Date()
            }]);
          }
          break;
        }

        case 'wrap near': {
          updateSwapState({ isProcessing: true });
          
          try {
            const result = await wallet.executeTransaction({
              contractId: TOKENS.NEAR,
              methodName: 'near_deposit',
              args: {},
              gas: '50000000000000',
              deposit: swapState.amount,
              callbackUrl: window.location.href
            });

            // Check if transaction was successful by verifying the transaction outcome
            if (result?.transaction_outcome?.id) {
              // Transaction successful, update state and move to next step
              updateSwapState({
                currentStep: 'buy crans',
                isProcessing: false,
                isSwapConfirmed: true  // Reset confirmation flag to trigger next step
              });
              
              // Add success message
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Perfect! Your NEAR has been wrapped. Now let's proceed with buying CRANS...",
                timestamp: new Date()
              }]);

              // Force next step execution after a short delay
              setTimeout(() => {
                updateSwapState({
                  isSwapConfirmed: true,
                  isProcessing: false
                });
              }, 1000);
            }
          } catch (error: any) {
            // Use the new error handler
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

        case 'buy crans': {
          console.log('Executing buy CRANS step...');  // Add logging
          updateSwapState({ isProcessing: true });
          
          try {
            const result = await wallet.executeTransaction({
              contractId: TOKENS.NEAR,
              methodName: 'ft_transfer_call',
              args: {
                receiver_id: 'v2.ref-finance.near',
                amount: swapState.amount,
                msg: prepareSwapMsg(swapState.amount, true, swapState.minAmountOut)
              },
              gas: '180000000000000',
              deposit: '1',
              callbackUrl: window.location.href
            });

            // Check if transaction was successful
            if (result?.transaction_outcome?.id) {
              updateSwapState({
                currentStep: 'done',
                isProcessing: false,
                isSwapConfirmed: false  // Reset confirmation flag
              });
              
              // Add success message
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Transaction complete. Now you can play Wars of Cards!\n\nIs there anything else you'd like to know?",
                timestamp: new Date()
              }]);
            }
          } catch (error: any) {
            // Use the new error handler
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

  // Add new handler for CRANS to NEAR swap
  const handleCransNearStep = React.useCallback(async () => {
    if (!wallet.accountId || swapState.isProcessing || swapState.swapDirection !== 'crans_to_near') return;

    try {
      switch (swapState.currentStep as CransNearStep) {
        case 'buy near': {
          updateSwapState({ isProcessing: true });
          
          try {
            const result = await wallet.executeTransaction({
              contractId: TOKENS.CRANS,
              methodName: 'ft_transfer_call',
              args: {
                receiver_id: 'v2.ref-finance.near',
                amount: swapState.amount,
                msg: prepareSwapMsg(swapState.amount, false, swapState.minAmountOut)
              },
              gas: '180000000000000',
              deposit: '1',
              callbackUrl: window.location.href
            });

            if (result?.transaction_outcome?.id) {
              updateSwapState({
                currentStep: 'unwrap near',
                isProcessing: false
              });
              
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Good! Now let's unwrap your NEAR...",
                timestamp: new Date()
              }]);
            }
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

        case 'unwrap near': {
          updateSwapState({ isProcessing: true });
          
          try {
            const result = await wallet.executeTransaction({
              contractId: TOKENS.NEAR,
              methodName: 'near_withdraw',
              args: {
                amount: swapState.expectedReturn
              },
              gas: '50000000000000',
              deposit: '1',
              callbackUrl: window.location.href
            });

            if (result?.transaction_outcome?.id) {
              updateSwapState({
                currentStep: 'done',
                isProcessing: false,
                isSwapConfirmed: false
              });
              
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Sold!\n\nIs there anything else you'd like to know?",
                timestamp: new Date()
              }]);
            }
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
  }, [swapState, wallet, setMessages, handleWalletError, updateSwapState]);

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
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [wallet.accountId, swapState, handleNearCransStep, handleCransNearStep]);

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
    
    // Handle balance command
    if (input === 'balance') {
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
    }

    // Special handling for swap command
    if (input === 'swap') {
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
- "500 crans to near" - Convert 500 CRANS back to NEAR

IMPORTANT: You must allow popups for successful transactions. 
First-time transactions may fail if popups are blocked. 
Enable popups when prompted for seamless exchanges.`;
      } catch (error) {
        console.error('Error fetching balances:', error);
        return "⚠️ I encountered an error fetching your balances.\n\nPlease try again in a moment or check your connection.";
      }
    }

    // Handle topics command
    if (input === 'topics') {
      const topicsText = mainTopics.map(topic => `• ${topic.label}`).join('\n');
      return `📋 Here are the main topics I can help you with:\n\n${topicsText}\n\nWhich topic would you like to explore?`;
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
                        {!wallet.accountId && (
                          <button
                            key="login"
                            className={styles.topicButton}
                            onClick={() => handleTopicClick('login')}
                          >
                            Log In
                          </button>
                        )}
                        {mainTopics.map((topic) => (
                          <button
                            key={topic.id}
                            className={styles.topicButton}
                            onClick={() => handleTopicClick(topic.id)}
                          >
                            {topic.label}
                          </button>
                        ))}
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
