import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        // this.add.image(896, 576, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(896, 576, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(896-230, 576, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets/images');

        this.load.image('player', 'player.png');
        for (let i = 1; i <= 6; i++) {
            this.load.image(`enemy${i}`, `enemy${i}.png`);
        }
        this.load.image('road', 'road.png');
        this.load.image('heart', 'heart.png');
        // this.load.image('star', 'star.png');
        // this.load.spritesheet('tilesheet', 'tilesheet.png', { frameWidth: 64, frameHeight: 64 });
        // this.load.tilemapTiledJSON('tilemap', 'tilemap.json');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
