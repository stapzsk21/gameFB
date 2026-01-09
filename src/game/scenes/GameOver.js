import { EventBus } from '../EventBus';
import Phaser, { Scene } from 'phaser';

export class GameOver extends Scene
{
    constructor ()
    {
        super('GameOver');
        this.finalScore = 0;
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(530000);

        this.add.image(896, 576, 'background').setAlpha(0.5);

        this.add.text(896, 400, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Отображаем score
        this.scoreText = this.add.text(896, 500, `Score: ${this.finalScore}`, {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffff00',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Слушаем событие game-over для получения score
        EventBus.on('game-over', this.handleGameOver, this);
        
        // Очищаем слушатель при уничтожении сцены
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('game-over', this.handleGameOver, this);
        });

        EventBus.emit('current-scene-ready', this);
    }

    handleGameOver(data) {
        if (data && data.score !== undefined) {
            this.finalScore = data.score;
            // Обновляем текст score
            if (this.scoreText) {
                this.scoreText.setText(`Score: ${this.finalScore}`);
            }
        }
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
