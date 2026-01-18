import React, { createContext, useContext, useEffect, useState } from 'react';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import axios from 'axios';

interface UserInfo {
  id: number;
  first_name: string;
  username: string;
  public_key: string;
  balance: number;
  language: string;
}

interface AppContextType {
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  localWallet: string | null;
  refreshBalance: () => Promise<void>;
  generateLocalWallet: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function generateSolanaAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '';
  for (let i = 0; i < 44; i++) {
    addr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return addr;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localWallet, setLocalWallet] = useState<string | null>(() => {
    return localStorage.getItem('surfsol_local_wallet');
  });

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000';

  const generateLocalWallet = () => {
    const addr = generateSolanaAddress();
    localStorage.setItem('surfsol_local_wallet', addr);
    setLocalWallet(addr);
  };

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      let initDataRaw: string | undefined;
      
      try {
        const params = retrieveLaunchParams();
        initDataRaw = params.initDataRaw;
      } catch {
        console.log('Not running in Telegram context');
      }
      
      if (!initDataRaw) {
        if (!localWallet) {
          generateLocalWallet();
        }
        setUser({
          id: 0,
          first_name: 'Guest',
          username: 'guest',
          public_key: localWallet || '',
          balance: 0,
          language: 'en',
        });
        setError(null);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${apiBaseUrl}/api/user/info`, {
        headers: {
          Authorization: `Bearer ${initDataRaw}`
        }
      });

      if (response.data.public_key) {
        setUser(response.data);
        setError(null);
      } else {
        if (!localWallet) {
          generateLocalWallet();
        }
        setUser({
          ...response.data,
          public_key: localWallet || '',
        });
        setError(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch user info:", err);
      if (!localWallet) {
        generateLocalWallet();
      }
      setUser({
        id: 0,
        first_name: 'Guest',
        username: 'guest',
        public_key: localWallet || '',
        balance: 0,
        language: 'en',
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    await fetchUserInfo();
  };

  useEffect(() => {
    fetchUserInfo();
  }, [localWallet]);

  return (
    <AppContext.Provider value={{ user, loading, error, localWallet, refreshBalance, generateLocalWallet }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
