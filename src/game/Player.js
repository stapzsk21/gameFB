export class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        // Создаём физический спрайт игрока
        this.sprite = scene.physics.add.sprite(x, y, 'player'); // Основной спрайт игрока
        this.sprite.setScale(0.8); // Масштаб машины игрока
        this.sprite.setDepth(2); // Гарантирует, что игрок будет над врагами
        this.sprite.setData('instance', this); // Сохраняем ссылку на экземпляр класса для сторонних обработчиков

        const body = this.sprite.body;
        body.setAllowGravity(false); // Не учитываем гравитацию, машины едут по плоскости
        body.setCollideWorldBounds(true); // Не даём игроку выехать за пределы экрана
        body.setDrag(350, 350); // Сопротивление по осям X/Y, чтобы гасить импульсы
        body.setMaxVelocity(400, 400); // Ограничение максимальной скорости игрока
        body.setBounce(0.01); // Лёгкий отскок при столкновении
        body.setImmovable(false); // Игрок может смещаться от импульсов
        body.setMass(1.8); // Масса, влияющая на расчёт импульсов

        this.speed = 220; // Базовая скорость движения по нажатию клавиш
        this.touchSpeedMultiplier = 1.4; // Коэффициент ускорения для touch-управления
        this.controlLockUntil = 0; // Таймер блокировки управления (во время отталкивания)
        this.knockbackTimer = null; // Отложенный вызов для снятия блокировки управления

        this.maxHealth = 5; // Максимальное количество очков здоровья
        this.health = this.maxHealth; // Текущее здоровье игрока
    }

    update(cursors, joystickInput) {
        const body = this.sprite.body;

        if (this.scene.time.now < this.controlLockUntil) {
            // Пока управление заблокировано, позволяем физике постепенно гасить скорость
            return;
        }

        const speed = this.speed;
        body.setVelocity(0);

        const joystickVector = joystickInput?.vector;
        const hasJoystickInput = joystickVector && joystickVector.lengthSq && joystickVector.lengthSq() > 0.0001;

        if (hasJoystickInput) {
            const vec = joystickVector.clone();
            if (vec.lengthSq() > 1) {
                vec.normalize();
            }
            const multiplier = joystickInput?.isTouch ? this.touchSpeedMultiplier : 1;
            body.setVelocity(vec.x * speed * multiplier, vec.y * speed * multiplier);
            return;
        }

        if (cursors.left.isDown) {
            body.setVelocityX(-speed);
        } else if (cursors.right.isDown) {
            body.setVelocityX(speed);
        }
        if (cursors.up.isDown) {
            body.setVelocityY(-speed);
        } else if (cursors.down.isDown) {
            body.setVelocityY(speed);
        }
    }

    applyCollisionImpulse(vector, duration = 250) {
        if (!this.sprite?.active) return;

        this.sprite.body.setVelocity(vector.x, vector.y);
        this.controlLockUntil = this.scene.time.now + duration;

        if (this.knockbackTimer) {
            this.knockbackTimer.remove(false);
        }

        this.knockbackTimer = this.scene.time.delayedCall(duration, () => {
            this.knockbackTimer = null;
        });
    }

    takeDamage(amount = 1) {
        this.health = Math.max(0, this.health - amount);
        return this.health;
    }

    getHealth() {
        return this.health;
    }

    get x() {
        return this.sprite.x;
    }
    get y() {
        return this.sprite.y;
    }

} 