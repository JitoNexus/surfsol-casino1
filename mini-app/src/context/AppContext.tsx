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
  refreshBalance: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8000';

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const { initDataRaw } = retrieveLaunchParams();
      
      if (!initDataRaw) {
        throw new Error("Mini App must be opened from Telegram");
      }

      const response = await axios.get(`${apiBaseUrl}/api/user/info`, {
        headers: {
          Authorization: `Bearer ${initDataRaw}`
        }
      });

      setUser(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch user info:", err);
      setError(err.response?.data?.detail || err.message || "Failed to connect to SurfSol API");
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!user) return;
    await fetchUserInfo();
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  return (
    <AppContext.Provider value={{ user, loading, error, refreshBalance }}>
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
