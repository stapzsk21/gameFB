import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../services/api';
import { EventBus } from '../game/EventBus';

export const WalletButton = () => {
  const { isAuthenticated, user, address, isLoading, login, logout } = useAuth();
  const [score, setScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const loadScoreTimeoutRef = useRef(null); // Ref для debounce таймера

  // Загружаем score при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      // Используем debounce для предотвращения множественных запросов
      const timeoutId = setTimeout(() => {
        loadScore();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setScore(null);
    }
  }, [isAuthenticated]);

  // Слушаем событие обновления score после игры
  useEffect(() => {
    const handleScoreUpdate = () => {
      if (isAuthenticated) {
        // Очищаем предыдущий таймер, если он есть
        if (loadScoreTimeoutRef.current) {
          clearTimeout(loadScoreTimeoutRef.current);
        }
        // Добавляем задержку для debounce
        loadScoreTimeoutRef.current = setTimeout(() => {
          loadScore();
        }, 1000); // Увеличиваем задержку до 1 секунды
      }
    };

    EventBus.on('score-updated', handleScoreUpdate);

    return () => {
      EventBus.off('score-updated', handleScoreUpdate);
      if (loadScoreTimeoutRef.current) {
        clearTimeout(loadScoreTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  const loadScore = async () => {
    // Предотвращаем параллельные запросы
    if (scoreLoading) {
      return;
    }

    try {
      setScoreLoading(true);
      const profile = await profileAPI.getProfile();
      setScore(profile.score);
    } catch (error) {
      // Игнорируем 429 ошибки (rate limiting) - просто не обновляем score
      if (error.response?.status !== 429) {
        console.error('Failed to load score:', error);
      }
    } finally {
      setScoreLoading(false);
    }
  };

  const handleClick = async () => {
    if (isAuthenticated) {
      await logout();
    } else {
      try {
        await login();
      } catch (error) {
        // Используем сообщение из интерцептора или стандартное
        const message = error.userMessage || error.message || 'Ошибка подключения кошелька';
        alert(message);
      }
    }
  };

  if (isLoading) {
    return (
      <button className="button" disabled>
        Загрузка...
      </button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 10, color: '#00ff00', fontSize: '14px' }}>
          Подключено: {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
        </div>
        {scoreLoading ? (
          <div style={{ marginBottom: 10, color: '#ffffff', fontSize: '14px' }}>
            Загрузка score...
          </div>
        ) : score !== null ? (
          <div style={{ marginBottom: 10, color: '#000', fontSize: '16px', fontWeight: 'bold' }}>
            Твой score: {score}
          </div>
        ) : null}
        <button 
          style={{
            width: '140px',
            padding: '10px',
            backgroundColor: '#000000',
            color: 'rgba(255, 255, 255, 0.87)',
            border: '1px solid rgba(255, 255, 255, 0.87)',
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
          onClick={handleClick}
          onMouseEnter={(e) => {
            e.target.style.border = '1px solid #0ec3c9';
            e.target.style.color = '#0ec3c9';
          }}
          onMouseLeave={(e) => {
            e.target.style.border = '1px solid rgba(255, 255, 255, 0.87)';
            e.target.style.color = 'rgba(255, 255, 255, 0.87)';
          }}
        >
          Отключить кошелёк
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button 
        style={{
          width: '140px',
          padding: '10px',
          backgroundColor: '#000000',
          color: 'rgba(255, 255, 255, 0.87)',
          border: '1px solid rgba(255, 255, 255, 0.87)',
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.target.style.border = '1px solid #0ec3c9';
          e.target.style.color = '#0ec3c9';
        }}
        onMouseLeave={(e) => {
          e.target.style.border = '1px solid rgba(255, 255, 255, 0.87)';
          e.target.style.color = 'rgba(255, 255, 255, 0.87)';
        }}
      >
        Подключить кошелёк
      </button>
    </div>
  );
};

