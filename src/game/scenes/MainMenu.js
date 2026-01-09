import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class MainMenu extends Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Центр нового окна 1792x1152
        this.add.image(896, 576, 'background');

        this.add.text(896, 400, 'МОЯ ИГРА', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // const startButton = this.add.text(512, 450, 'СТАРТ', {
        //     fontFamily: 'Arial Black', fontSize: 38, color: '#00ff00',
        //     stroke: '#000000', strokeThickness: 8,
        //     align: 'center', backgroundColor: '#222244'
        // })
        // .setOrigin(0.5)
        // .setInteractive({ useHandCursor: true })
        // .on('pointerdown', () => {
        //     this.scene.start('Game');
        // });

        EventBus.emit('current-scene-ready', this);
    }
}
