import Phaser from 'phaser';

export class Enemy {
    constructor(scene, x, y, texture = 'enemy1') {
        this.scene = scene;
        // Создаём физический спрайт врага
        this.sprite = scene.physics.add.sprite(x, y, texture); // Спрайт вражеской машины
        this.sprite.setScale(0.8); // Приводим размер к масштабу игрока
        this.sprite.setDepth(1); // Слой ниже игрока
        this.sprite.setData('instance', this); // Сохраняем ссылку на экземпляр для обработчиков
        this.sprite.update = () => this.update(); // Регистрируем update для runChildUpdate

        const body = this.sprite.body;
        body.setAllowGravity(false); // Враг не падает вниз, движется по плоскости
        body.setCollideWorldBounds(false); // Враг может покидать границы, удаляется вручную
        body.setImmovable(false); // Враг реагирует на импульсы
        body.setDrag(300, 0); // Горизонтальное сопротивление, чтобы снижать заносы
        body.setMaxVelocity(450, 450); // Ограничиваем максимальную скорость
        body.setBounce(0.01); // Небольшой отскок при столкновении
        body.setMass(1.4); // Масса для расчёта импульсов

        this.speed = Phaser.Math.Between(220, 350); // Случайная скорость движения вниз

        this.recoveryTimer = null;
    }

    update() {
        // Удаляем врага, когда он выходит за нижнюю границу экрана
        if (this.sprite.y - this.sprite.height * this.sprite.scaleY / 2 > this.scene.scale.height) {
            this.destroy();
        }
    }

    applyCollisionImpulse(vec, duration = 250) {
        if (!this.sprite?.active) return;

        this.sprite.body.setVelocity(vec.x, vec.y);

        if (this.recoveryTimer) {
            this.recoveryTimer.remove(false);
        }

        this.recoveryTimer = this.scene.time.delayedCall(duration, () => {
            if (!this.sprite?.active) return;
            this.sprite.body.setVelocity(0, this.speed);
            this.recoveryTimer = null;
        });
    }

    destroy() {
        if (!this.sprite?.active) return;
        if (this.recoveryTimer) {
            this.recoveryTimer.remove(false);
            this.recoveryTimer = null;
        }
        this.sprite.destroy();
    }

    startMovement() {
        if (!this.sprite?.active) return;
        this.sprite.body.setVelocityY(this.speed);
    }
}


