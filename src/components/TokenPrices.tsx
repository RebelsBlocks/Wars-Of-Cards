import React, { useState, useEffect } from 'react';
import { JsonRpcProvider } from 'near-api-js/lib/providers';
import { Big } from 'big.js';

// Essential constants
const POOLS = {
  CRANS_NEAR: 5423,      // CRANS/NEAR pool
};

const TOKENS = {
  CRANS: "crans.tkn.near",
  NEAR: "wrap.near",
};

const TOKEN_DECIMALS = {
  [TOKENS.CRANS]: 24,    // CRANS has 24 decimals with 1M total supply
  [TOKENS.NEAR]: 24,
};

// USDC token and pool constants
const USDC = '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
const NEAR_USDC_POOL = 4512;
const USDC_DECIMALS = 6;

// Function to get token exchange rate
const getReturn = async (args: {
  pool_id: number;
  token_in: string;
  token_out: string;
  amount_in: string;
}): Promise<string | null> => {
  try {
    const provider = new JsonRpcProvider({ url: 'https://free.rpc.fastnear.com' });
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
    
    return null;
  } catch (error) {
    console.error('Error in getReturn:', error);
    return null;
  }
};

// Get NEAR price in USDC
const getNearPriceInUSDC = async (): Promise<Big> => {
  try {
    const provider = new JsonRpcProvider({ url: 'https://free.rpc.fastnear.com' });
    const args = {
      pool_id: NEAR_USDC_POOL,
      token_in: TOKENS.NEAR,
      token_out: USDC,
      amount_in: '1000000000000000000000000' // 1 NEAR (24 decimals)
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
      const usdcAmount = JSON.parse(resultText);
      
      return new Big(usdcAmount).div(new Big(10).pow(USDC_DECIMALS));
    }
    
    return new Big(0);
  } catch (error) {
    console.error('Error getting NEAR price:', error);
    return new Big(0);
  }
};

// Get CRANS per NEAR
const getCransPerNear = async (): Promise<Big> => {
  try {
    const cransForOneNear = await getReturn({
      pool_id: POOLS.CRANS_NEAR,
      token_in: TOKENS.NEAR,
      token_out: TOKENS.CRANS,
      amount_in: '1000000000000000000000000' // 1 NEAR (24 decimals)
    });

    if (cransForOneNear) {
      return new Big(cransForOneNear).div(new Big(10).pow(TOKEN_DECIMALS[TOKENS.CRANS]));
    }
    
    return new Big(0);
  } catch (error) {
    console.error('Error getting CRANS per NEAR:', error);
    return new Big(0);
  }
};

// Get CRANS price in USDC
const getCransPriceInUSDC = async (): Promise<Big> => {
  try {
    const nearPriceInUSDC = await getNearPriceInUSDC();
    const cransPerNear = await getCransPerNear();
    
    if (nearPriceInUSDC.gt(0) && cransPerNear.gt(0)) {
      return nearPriceInUSDC.div(cransPerNear);
    }
    
    return new Big(0);
  } catch (error) {
    console.error('Error calculating CRANS price in USDC:', error);
    return new Big(0);
  }
};

// For MainLayout display - provides simple price info
export function useTokenPrices() {
  const [nearInUsdc, setNearInUsdc] = useState<string>('0');
  const [cransPerNear, setCransPerNear] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get NEAR price in USDC
        const nearPrice = await getNearPriceInUSDC();
        setNearInUsdc(nearPrice.toFixed(2));

        // Get CRANS per NEAR
        const cransPerNearValue = await getCransPerNear();
        setCransPerNear(cransPerNearValue.toFixed(2));

      } catch (err: any) {
        console.error('Failed to fetch token prices:', err);
        setError(err.message || 'Failed to fetch prices');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh prices every 5 minutes
    const intervalId = setInterval(() => {
      fetchPrices();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return { nearInUsdc, cransPerNear, isLoading, error };
}

// Main component - simplified to only show essential price info
export function TokenPrices() {
  const [cransPriceUSDC, setCransPriceUSDC] = useState<string>('0');
  const [nearPriceUSDC, setNearPriceUSDC] = useState<string>('0');
  const [cransPerNear, setCransPerNear] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get NEAR price in USDC
        const nearPrice = await getNearPriceInUSDC();
        setNearPriceUSDC(nearPrice.toFixed(2));
        
        // Get CRANS per NEAR
        const cransPerNearValue = await getCransPerNear();
        setCransPerNear(cransPerNearValue.toFixed(2));
        
        // Calculate CRANS price in USDC
        const cransPriceValue = await getCransPriceInUSDC();
        setCransPriceUSDC(cransPriceValue.toFixed(6));

      } catch (error: any) {
        console.error('Failed to fetch prices:', error);
        setError(error.message || 'Failed to fetch prices');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
    
    // Refresh prices every 5 minutes
    const intervalId = setInterval(() => {
      fetchPrices();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#a9b1d6' }}>Loading prices...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#f7768e' }}>Error: {error}</div>;
  }

  return (
    <div style={{
      backgroundColor: '#002800',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #004d00'
    }}>
      <h3 style={{
        color: '#ffd700',
        marginBottom: '15px',
        fontSize: '18px',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        CRANS Price Information
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#004400',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #006600'
        }}>
          <div style={{ color: '#ffd700', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            CRANS/USD
          </div>
          <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold' }}>
            ${cransPriceUSDC}
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#004400',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #006600'
        }}>
          <div style={{ color: '#ffd700', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            NEAR/USD
          </div>
          <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold' }}>
            ${nearPriceUSDC}
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#004400',
          padding: '15px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #006600'
        }}>
          <div style={{ color: '#ffd700', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            CRANS per NEAR
          </div>
          <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold' }}>
            {cransPerNear}
          </div>
        </div>
      </div>
    </div>
  );
} 