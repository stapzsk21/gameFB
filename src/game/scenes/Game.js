import { EventBus } from '../EventBus';
import Phaser, { Scene } from 'phaser';
import { Player } from '../Player';
import { Enemy } from '../Enemy';

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.isTouchDevice = this.sys.game.device.input.touch;
        // Фон: бесшовная дорога (тайловый спрайт на весь экран), центрируем по оси X
        this.roadScrollSpeed = this.isTouchDevice ? 6 : 1;
        this.road = this.add.tileSprite(this.scale.width / 2, 0, this.scale.width, this.scale.height, 'road').setOrigin(0.5, 0);

        // Сместим текстуру, чтобы видна была центральная часть дороги (без боковых белых краёв)
        const roadTex = this.textures.get('road').getSourceImage();
        if (roadTex && roadTex.width) {
            this.road.tilePositionX = (roadTex.width - this.scale.width) * 0.5;
        }

        // Потом создаём игрока (центр экрана по текущей конфигурации)
        this.player = new Player(this, this.scale.width / 2, this.scale.height * 0.75);
        this.isGameOver = false;

        // Система подсчёта очков (за время выживания)
        // Инициализируем, но не начинаем считать до старта игры
        this.score = 0;
        this.startTime = null; // Будет установлен при старте игры
        this.gameStarted = false;
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setDepth(10).setScrollFactor(0);
        
        // Слушаем событие старта игры
        EventBus.on('game-started', this.onGameStarted, this);
        
        // Очищаем слушатель при уничтожении сцены
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.off('game-started', this.onGameStarted, this);
        });

        this.joystickInput = {
            vector: new Phaser.Math.Vector2(),
            isTouch: false
        };
        if (this.isTouchDevice) {
        }
        
        this.createVirtualJoystick();
        this.enemyTextureKeys = Array.from({ length: 6 }, (_, index) => `enemy${index + 1}`);

        this.healthIcons = [];
        this.healthIconScale = 0.3;
        this.healthIconSpacing = 6;
        this.createHealthIcons();
        this.updateHealthDisplay();

        this.enemyGroup = this.physics.add.group({
            allowGravity: false,
            collideWorldBounds: false,
            runChildUpdate: true
        });
        this.physics.add.collider(this.player.sprite, this.enemyGroup, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.enemyGroup, this.enemyGroup, this.handleEnemyEnemyCollision, undefined, this);

        // Периодический спавн врагов: каждые 10 секунд 1 или 2 машины
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.spawnEnemy();
            }
        });

        // Клавиши управления
        this.cursors = this.input.keyboard.createCursorKeys();

        // Настройка touch-управления для мобильных устройств
        // Делаем весь экран интерактивным для обработки touch событий
        this.input.addPointer();
        this.input.on('pointerdown', () => {
            // Touch начался
        });
        this.input.on('pointerup', () => {
            // Touch закончился
        });

        // Уведомляем React об активной сцене, чтобы скрыть кнопку Старт
        EventBus.emit('current-scene-ready', this);
    }

    update ()
    {
        if (!this.player || this.isGameOver) return;
        // Прокрутка дороги вниз для иллюзии движения вперёд
        this.road.tilePositionY -= this.roadScrollSpeed;
        this.player.update(this.cursors, this.joystickInput);

        // Обновление score (1 очко за каждую секунду выживания)
        // Считаем только если игра началась
        if (this.gameStarted && this.startTime !== null) {
            const elapsedSeconds = Math.floor((this.time.now - this.startTime) / 1000);
            this.score = elapsedSeconds;
            if (this.scoreText) {
                this.scoreText.setText(`Score: ${this.score}`);
            }
        }

        // Враги обновляются автоматически через runChildUpdate
    }
    
    onGameStarted() {
        // Начинаем отсчёт времени только когда игра реально началась
        this.gameStarted = true;
        this.startTime = this.time.now;
        this.score = 0;
        if (this.scoreText) {
            this.scoreText.setText('Score: 0');
        }
    }

    handlePlayerEnemyCollision = (playerSprite, enemySprite) => {
        const now = this.time.now;
        const cooldown = 200;

        const lastPlayerHit = playerSprite.getData('lastCollisionTime') || 0;
        if (now - lastPlayerHit < cooldown) {
            return;
        }
        playerSprite.setData('lastCollisionTime', now);
        enemySprite.setData('lastCollisionTime', now);

        const direction = new Phaser.Math.Vector2(
            playerSprite.x - enemySprite.x,
            playerSprite.y - enemySprite.y
        );

        if (direction.lengthSq() === 0) {
            direction.set(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
            if (direction.lengthSq() === 0) {
                direction.set(1, 0);
            }
        }

        direction.normalize();

        const playerImpulse = direction.clone().scale(200);
        const enemyImpulse = direction.clone().scale(-150);

        const playerInstance = playerSprite.getData('instance');
        const enemyInstance = enemySprite.getData('instance');

        if (playerInstance?.applyCollisionImpulse) {
            playerInstance.applyCollisionImpulse(playerImpulse, 320);
        } else {
            playerSprite.body.setVelocity(playerImpulse.x, playerImpulse.y);
        }

        if (enemyInstance?.applyCollisionImpulse) {
            enemyInstance.applyCollisionImpulse(enemyImpulse, 320);
        } else {
            enemySprite.body.setVelocity(enemyImpulse.x, enemyImpulse.y);
        }

        if (playerInstance?.takeDamage) {
            const remainingHealth = playerInstance.takeDamage(1);
            this.updateHealthDisplay();

            if (remainingHealth <= 0 && !this.isGameOver) {
                this.handlePlayerDefeat();
            }
        }
    };

    spawnEnemy ()
    {
        // Спавним чуть выше видимой области
        const spawnY = -50;

        // Ограничим X дорожным полотном: 10% слева/справа в запас
        const margin = this.scale.width * 0.08;
        const minX = margin;
        const maxX = this.scale.width - margin;
        const x = Phaser.Math.Between(minX, maxX);

        const texture = Phaser.Utils.Array.GetRandom(this.enemyTextureKeys);
        const enemy = new Enemy(this, x, spawnY, texture);
        this.enemyGroup.add(enemy.sprite);
        enemy.startMovement();
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }

    updateHealthDisplay() {
        if (!this.player) return;

        if (this.healthIcons.length !== this.player.maxHealth) {
            this.createHealthIcons();
        }

        const currentHealth = this.player.getHealth();
        this.healthIcons.forEach((icon, index) => {
            icon.setVisible(index < currentHealth);
        });
    }

    handleEnemyEnemyCollision = (enemySpriteA, enemySpriteB) => {
        const now = this.time.now;
        const cooldown = 200;

        const lastA = enemySpriteA.getData('lastEnemyCollisionTime') || 0;
        const lastB = enemySpriteB.getData('lastEnemyCollisionTime') || 0;
        if (now - Math.max(lastA, lastB) < cooldown) {
            return;
        }
        enemySpriteA.setData('lastEnemyCollisionTime', now);
        enemySpriteB.setData('lastEnemyCollisionTime', now);

        const direction = new Phaser.Math.Vector2(
            enemySpriteA.x - enemySpriteB.x,
            enemySpriteA.y - enemySpriteB.y
        );

        if (direction.lengthSq() === 0) {
            direction.set(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
            if (direction.lengthSq() === 0) {
                direction.set(1, 0);
            }
        }

        direction.normalize();

        const impulseMagnitude = 150;
        const impulseA = direction.clone().scale(impulseMagnitude);
        const impulseB = direction.clone().scale(-impulseMagnitude);

        const enemyInstanceA = enemySpriteA.getData('instance');
        const enemyInstanceB = enemySpriteB.getData('instance');

        if (enemyInstanceA?.applyCollisionImpulse) {
            enemyInstanceA.applyCollisionImpulse(impulseA, 320);
        } else if (enemySpriteA.body) {
            enemySpriteA.body.setVelocity(impulseA.x, impulseA.y);
        }

        if (enemyInstanceB?.applyCollisionImpulse) {
            enemyInstanceB.applyCollisionImpulse(impulseB, 320);
        } else if (enemySpriteB.body) {
            enemySpriteB.body.setVelocity(impulseB.x, impulseB.y);
        }
    }

    createVirtualJoystick() {
        const radius = 75;
        const baseX = this.scale.width / 2;
        const baseY = this.scale.height * 0.7;

        const base = this.add.circle(baseX, baseY, radius, 0x000000, 0.05)
            .setStrokeStyle(1, 0xffffff, 0.15)
            .setScrollFactor(0)
            .setDepth(10);

        const thumb = this.add.circle(baseX, baseY, radius * 0.45, 0xffffff, 0.02)
            .setStrokeStyle(1, 0xffffff, 0.4)
            .setScrollFactor(0)
            .setDepth(11);

        this.joystick = {
            base,
            thumb,
            radius,
            pointerId: null,
            basePosition: new Phaser.Math.Vector2(baseX, baseY),
            vector: new Phaser.Math.Vector2()
        };

        this.input.addPointer(1);
        this.input.on('pointerdown', this.handleJoystickPointerDown, this);
        this.input.on('pointermove', this.handleJoystickPointerMove, this);
        this.input.on('pointerup', this.handleJoystickPointerUp, this);
        this.input.on('pointerupoutside', this.handleJoystickPointerUp, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.off('pointerdown', this.handleJoystickPointerDown, this);
            this.input.off('pointermove', this.handleJoystickPointerMove, this);
            this.input.off('pointerup', this.handleJoystickPointerUp, this);
            this.input.off('pointerupoutside', this.handleJoystickPointerUp, this);
        });
    }

    handleJoystickPointerDown(pointer) {
        if (this.joystick.pointerId !== null) return;
        if (!this.isPointerInJoystickZone(pointer)) return;

        this.joystick.pointerId = pointer.id;
        this.updateJoystickState(pointer);
    }

    handleJoystickPointerMove(pointer) {
        if (pointer.id !== this.joystick.pointerId) return;
        this.updateJoystickState(pointer);
    }

    handleJoystickPointerUp(pointer) {
        if (pointer.id !== this.joystick.pointerId) return;
        this.resetJoystickState();
    }

    isPointerInJoystickZone(pointer) {
        const zoneWidthStart = this.scale.width * 0.2;
        const zoneWidthEnd = this.scale.width * 0.8;
        const zoneHeightStart = this.scale.height * 0.55;
        return pointer.x >= zoneWidthStart && pointer.x <= zoneWidthEnd && pointer.y >= zoneHeightStart;
    }

    updateJoystickState(pointer) {
        const { basePosition, radius, thumb, vector } = this.joystick;
        const deltaX = pointer.x - basePosition.x;
        const deltaY = pointer.y - basePosition.y;

        vector.set(deltaX, deltaY);

        if (vector.lengthSq() > radius * radius) {
            vector.setLength(radius);
        }

        thumb.setPosition(basePosition.x + vector.x, basePosition.y + vector.y);

        this.joystickInput.vector.copy(vector).scale(1 / radius);
        this.joystickInput.isTouch = pointer.pointerType === 'touch';
    }

    resetJoystickState() {
        this.joystick.pointerId = null;
        this.joystick.vector.set(0, 0);
        this.joystick.thumb.setPosition(this.joystick.basePosition.x, this.joystick.basePosition.y);
        this.joystickInput.vector.set(0, 0);
        this.joystickInput.isTouch = false;
    }

    createHealthIcons() {
        if (!this.player) return;

        this.healthIcons?.forEach((icon) => icon.destroy());
        this.healthIcons = [];

        const textureSource = this.textures.get('heart')?.getSourceImage();
        const textureWidth = textureSource?.width || 32;
        const textureHeight = textureSource?.height || 32;
        const scaledWidth = textureWidth * this.healthIconScale;
        const scaledHeight = textureHeight * this.healthIconScale;
        const spacing = scaledWidth + this.healthIconSpacing;

        const startX = this.scale.width - 20 - scaledWidth / 2;
        const y = 60 + scaledHeight / 2;

        for (let i = 0; i < this.player.maxHealth; i++) {
            const x = startX - i * spacing;
            const icon = this.add.image(x, y, 'heart');
            icon.setOrigin(0.5, 0.5);
            icon.setScale(this.healthIconScale);
            icon.setDepth(5);
            this.healthIcons.push(icon);
        }
    }

    handlePlayerDefeat() {
        if (this.isGameOver) {
            return;
        }
        this.isGameOver = true;
        
        // Отправляем score через EventBus для сохранения
        EventBus.emit('game-over', { score: this.score });
        
        this.changeScene();
    }
}
