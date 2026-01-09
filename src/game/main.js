import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 855,
    parent: 'game-container',
    backgroundColor: '#fff',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    input: {
        activePointers: 1, // Поддержка одного touch события
        smoothFactor: 0, // Отключаем сглаживание для более точного управления
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Game,
        GameOver
    ]
};

const StartGame = (parent) => {

    return new Phaser.Game({ ...config, parent });

}

export default StartGame;
