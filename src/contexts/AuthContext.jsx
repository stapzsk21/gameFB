import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { connectWallet, signMessage, getCurrentAddress, checkNetwork, switchToSepolia } from '../services/wallet';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [address, setAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Проверка авторизации при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Проверяем наличие access_token в cookies перед запросом
    const hasToken = document.cookie.includes('access_token=');
    
    if (!hasToken) {
      // Если нет токена, пропускаем запрос
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authAPI.getMe();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      // Тихая обработка - если пользователь не авторизован, это нормально
      // Не выводим ошибку в консоль для 401
      if (error.response?.status !== 401) {
        console.error('Auth check error:', error);
      }
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);

      // Проверяем сеть
      const isSepolia = await checkNetwork();
      if (!isSepolia) {
        await switchToSepolia();
      }

      // Подключаем кошелёк
      const walletAddress = await connectWallet();
      setAddress(walletAddress);

      // Получаем nonce
      const nonceResponse = await authAPI.getNonce(walletAddress);
      
      // Проверяем, что ответ содержит message
      if (!nonceResponse || !nonceResponse.message) {
        throw new Error('Неверный ответ от сервера: отсутствует сообщение для подписи');
      }
      
      const { message } = nonceResponse;

      // Подписываем сообщение
      const signature = await signMessage(message);

      // Проверяем подпись на сервере
      const result = await authAPI.verifySignature(walletAddress, signature);
      
      setUser(result.user);
      setIsAuthenticated(true);
      
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setAddress(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshAuth = async () => {
    try {
      await authAPI.refreshTokens();
      await checkAuth();
    } catch (error) {
      // Если refresh не удался, пробуем заново авторизоваться
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const value = {
    user,
    address,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuth,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

