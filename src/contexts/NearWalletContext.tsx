import React, { type ReactNode, useEffect, useState, useCallback } from 'react';
import { providers } from 'near-api-js';
import { setupWalletSelector } from '@near-wallet-selector/core';
import type { Network, WalletSelector, Wallet, Transaction, Action, FunctionCallAction, WalletModuleFactory } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import type { WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';

// Add wallet selector styles
import '@near-wallet-selector/modal-ui/styles.css';

// Extend Network type to include our custom properties
interface ExtendedNetwork extends Network {
  cransContractId: string;
}

interface WalletContextType {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: Array<any>;
  accountId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  executeTransaction: (transaction: {
    contractId: string;
    methodName: string;
    args: any;
    gas?: string;
    deposit?: string;
  }) => Promise<any>;
  executeTransactions: (transactions: {
    contractId: string;
    methodName: string;
    args: any;
    gas?: string;
    deposit?: string;
  }[]) => Promise<any>;
  viewFunction: (params: {
    contractId: string;
    methodName: string;
    args?: any;
  }) => Promise<any>;
}

const defaultContextValue: WalletContextType = {
  selector: null,
  modal: null,
  accounts: [],
  accountId: null,
  isConnected: false,
  isLoading: true,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  executeTransaction: async () => {},
  executeTransactions: async () => {},
  viewFunction: async () => {},
};

const WalletContext = React.createContext<WalletContextType>(defaultContextValue);

interface Props {
  children: ReactNode;
}

export const NETWORK_CONFIG = {
  networkId: 'mainnet',
  nodeUrl: 'https://free.rpc.fastnear.com/',
  helperUrl: 'https://helper.mainnet.near.org',
  explorerUrl: 'https://nearblocks.io',
  indexerUrl: 'https://api.kitwallet.app',
  cransContractId: 'crans.tkn.near'
} as ExtendedNetwork;

// Helper function to check if error is user cancellation
const isUserCancellation = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('user cancelled') ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('user closed') ||
    errorMessage.includes('failed to initialize') ||
    errorMessage.includes('canceled') ||
    errorMessage.includes('cancelled the action')
  );
};

function NearWalletProviderComponent({ children }: Props) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<Array<any>>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Reset error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    const initNear = async () => {
      try {
        console.log('Initializing NEAR wallet with network:', NETWORK_CONFIG.networkId);
        
        const selector = await setupWalletSelector({
          network: NETWORK_CONFIG,
          modules: [
            setupMeteorWallet() as WalletModuleFactory
          ]
        });

        const modal = setupModal(selector, {
          contractId: 'warsofcards.near',
          theme: 'dark',
          description: 'Please select a wallet to play Wars of Cards'
        });

        const state = selector.store.getState();
        console.log('Initial wallet state:', state);
        
        const accounts = state.accounts;

        if (accounts.length > 0) {
          console.log('Found existing accounts:', accounts);
          setAccounts(accounts);
          setAccountId(accounts[0].accountId);
        } else {
          console.log('No existing accounts found');
        }

        selector.store.observable.subscribe((newState: any) => {
          console.log('Wallet state changed:', newState);
          if (newState.accounts.length > 0) {
            setAccounts(newState.accounts);
            setAccountId(newState.accounts[0].accountId);
          } else {
            setAccounts([]);
            setAccountId(null);
          }
        });

        setSelector(selector);
        setModal(modal);
        setIsLoading(false);
        clearError();
      } catch (err: any) {
        console.error('Failed to initialize NEAR connection:', err);
        if (!isUserCancellation(err)) {
          setError(err);
        }
        setIsLoading(false);
      }
    };

    initNear();
  }, [clearError]);

  const disconnect = async () => {
    if (!selector) return;
    
    try {
      const wallet = await selector.wallet();
      await wallet.signOut();
      setAccounts([]);
      setAccountId(null);
      clearError();
    } catch (err: any) {
      console.error('Failed to disconnect wallet:', err);
      if (!isUserCancellation(err)) {
        setError(err);
      }
    }
  };

  const connect = async () => {
    if (!modal) return;
    
    try {
      clearError();
      console.log('Opening wallet selector modal');
      await new Promise<void>((resolve, reject) => {
        const handleChange = (state: any) => {
          if (state.accounts.length > 0) {
            subscription?.unsubscribe();
            resolve();
          }
        };

        const handleModalHide = () => {
          subscription?.unsubscribe();
          reject(new Error('User cancelled the action'));
        };

        const subscription = selector?.store.observable.subscribe(handleChange);
        modal.show();
        modal.on('onHide', handleModalHide);
      });
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      if (!isUserCancellation(err)) {
        setError(err);
      }
    }
  };

  const executeTransaction = async (transaction: {
    contractId: string;
    methodName: string;
    args: any;
    gas?: string;
    deposit?: string;
  }) => {
    if (!selector || !accountId) throw new Error('No wallet connected');

    try {
      clearError();
      const wallet = await selector.wallet();
      
      const gas = transaction.gas || "30000000000000";
      const deposit = transaction.deposit || "0";

      const result = await wallet.signAndSendTransaction({
        receiverId: transaction.contractId,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: transaction.methodName,
              args: transaction.args,
              gas,
              deposit,
            },
          }
        ],
      });

      return result;
    } catch (error: any) {
      console.error('Transaction execution error:', error);
      if (!isUserCancellation(error)) {
        setError(error);
      }
      throw error;
    }
  };

  const executeTransactions = async (transactions: {
    contractId: string;
    methodName: string;
    args: any;
    gas?: string;
    deposit?: string;
  }[]) => {
    if (!selector || !accountId) throw new Error('No wallet connected');

    try {
      clearError();
      const wallet = await selector.wallet();
      
      const formattedTransactions: Transaction[] = transactions.map(tx => ({
        signerId: accountId,
        receiverId: tx.contractId,
        actions: [{
          type: 'FunctionCall',
          params: {
            methodName: tx.methodName,
            args: tx.args,
            gas: tx.gas || "30000000000000",
            deposit: tx.deposit || "0",
          }
        }] as Action[]
      }));

      const result = await wallet.signAndSendTransactions({
        transactions: formattedTransactions
      });
      
      return result;
    } catch (error: any) {
      console.error('Transactions execution error:', error);
      if (!isUserCancellation(error)) {
        setError(error);
      }
      throw error;
    }
  };

  const viewFunction = async (params: {
    contractId: string;
    methodName: string;
    args?: any;
  }) => {
    try {
      clearError();
      const provider = new providers.JsonRpcProvider({
        url: NETWORK_CONFIG.nodeUrl
      });
      
      const rawResult = await (provider as any).query({
        request_type: 'call_function',
        account_id: params.contractId,
        method_name: params.methodName,
        args_base64: Buffer.from(JSON.stringify(params.args || {})).toString('base64'),
        finality: 'final'
      });

      return JSON.parse(Buffer.from(rawResult.result).toString());
    } catch (error: any) {
      console.error('View function error:', error);
      if (!isUserCancellation(error)) {
        setError(error);
      }
      throw error;
    }
  };

  const contextValue = {
    selector,
    modal,
    accounts,
    accountId,
    isConnected: !!accountId,
    isLoading,
    error,
    connect,
    disconnect,
    executeTransaction,
    executeTransactions,
    viewFunction,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export const NearWalletProvider = NearWalletProviderComponent;

export const useNearWallet = () => {
  const context = React.useContext(WalletContext);
  if (!context) {
    throw new Error('useNearWallet must be used within a NearWalletProvider');
  }
  return context;
}; 