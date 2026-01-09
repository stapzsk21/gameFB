import { useRef, useState, useCallback, useEffect } from 'react';

import Phaser from 'phaser';
import { PhaserGame } from './PhaserGame';
import { WalletButton } from './components/WalletButton';
import { EventBus } from './game/EventBus';
import { profileAPI } from './services/api';
import { useAuth } from './contexts/AuthContext';

function App ()
{
    const phaserRef = useRef();
    const [showStart, setShowStart] = useState(true);
    const [showMainMenuButton, setShowMainMenuButton] = useState(false);
    const { isAuthenticated } = useAuth();

    const onCurrentScene = useCallback((scene) => {
        const key = scene?.scene?.key;
        setShowStart(key === 'MainMenu');
        setShowMainMenuButton(key === 'GameOver');
        
        // Если пользователь отключил кошелёк во время игры, возвращаем в меню
        if (key === 'Game' && !isAuthenticated) {
            const gameScene = phaserRef.current?.scene;
            if (gameScene && gameScene.scene.key === 'Game') {
                gameScene.scene.start('MainMenu');
            }
        }
    }, [isAuthenticated]);

    // Обработчик сохранения score при game over
    useEffect(() => {
        const handleGameOver = async (data) => {
            if (isAuthenticated && data?.score !== undefined) {
                try {
                    await profileAPI.updateScore(data.score);
                    console.log('Score saved:', data.score);
                    // Отправляем событие обновления score для обновления UI
                    EventBus.emit('score-updated');
                } catch (error) {
                    // Показываем ошибку только если это не 401 (не авторизован)
                    if (error.response?.status !== 401) {
                        const message = error.userMessage || 'Не удалось сохранить счёт. Попробуйте позже.';
                        console.error('Failed to save score:', message);
                        // Можно добавить toast-уведомление вместо console.error
                    }
                }
            }
        };

        EventBus.on('game-over', handleGameOver);

        return () => {
            EventBus.off('game-over', handleGameOver);
        };
    }, [isAuthenticated]);

    // Если пользователь отключил кошелёк, возвращаем в меню
    useEffect(() => {
        if (!isAuthenticated) {
            const scene = phaserRef.current?.scene;
            if (scene && scene.scene.key === 'Game') {
                scene.scene.start('MainMenu');
            }
        }
    }, [isAuthenticated]);

    const startGame = () => {
        // Проверяем, что пользователь авторизован
        if (!isAuthenticated) {
            alert('Пожалуйста, подключите кошелёк для игры');
            return;
        }
        
        const scene = phaserRef.current.scene;
        if (scene && scene.scene.key === 'MainMenu') {
            scene.scene.start('Game');
            // Отправляем событие старта игры после небольшой задержки,
            // чтобы сцена Game успела инициализироваться
            setTimeout(() => {
                EventBus.emit('game-started');
            }, 100);
        }
        setShowStart(false);
    }

    const gotoMainMenu = () => {
        const scene = phaserRef.current.scene;
        if (scene && scene.scene.key === 'GameOver') {
            scene.scene.start('MainMenu');
        }
        setShowMainMenuButton(false);
    }

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={onCurrentScene} />
            {showStart && (
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    alignItems: 'center',
                    pointerEvents: 'auto'
                }}>
                    {isAuthenticated && (
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
                            onClick={startGame}
                            onMouseEnter={(e) => {
                                e.target.style.border = '1px solid #0ec3c9';
                                e.target.style.color = '#0ec3c9';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.border = '1px solid rgba(255, 255, 255, 0.87)';
                                e.target.style.color = 'rgba(255, 255, 255, 0.87)';
                            }}
                        >
                            Старт
                        </button>
                    )}
                    <WalletButton />
                </div>
            )}
            {showMainMenuButton && (
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    pointerEvents: 'auto'
                }}>
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
                        onClick={gotoMainMenu}
                        onMouseEnter={(e) => {
                            e.target.style.border = '1px solid #0ec3c9';
                            e.target.style.color = '#0ec3c9';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.border = '1px solid rgba(255, 255, 255, 0.87)';
                            e.target.style.color = 'rgba(255, 255, 255, 0.87)';
                        }}
                    >
                        В меню
                    </button>
                </div>
            )}
        </div>
    )
}

export default App
