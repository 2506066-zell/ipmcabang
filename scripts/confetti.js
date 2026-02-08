window.Confetti = (() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';

    let pieces = [];
    const numberOfPieces = 150;
    const colors = ['#2D7A4A', '#4a7c5d', '#F4D03F', '#E8F5E9', '#ffffff'];

    function updateCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Piece {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height - canvas.height;
            this.rotation = Math.random() * 360;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.diameter = Math.random() * 10 + 5;
            this.speed = Math.random() * 3 + 2;
            this.rotationSpeed = Math.random() * 10;
        }

        update() {
            this.y += this.speed;
            this.rotation += this.rotationSpeed;
            if (this.y > canvas.height) {
                this.y = -20;
                this.x = Math.random() * canvas.width;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.diameter / 2, -this.diameter / 2, this.diameter, this.diameter);
            ctx.restore();
        }
    }

    let animationId = null;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.update();
            p.draw();
        });
        animationId = requestAnimationFrame(animate);
    }

    function fire(duration = 3000) {
        if (!document.body.contains(canvas)) {
            document.body.appendChild(canvas);
            updateCanvasSize();
            pieces = [];
            for (let i = 0; i < numberOfPieces; i++) {
                pieces.push(new Piece());
            }
        }

        updateCanvasSize();
        if (!animationId) animate();

        setTimeout(() => {
            stop();
        }, duration);
    }

    function stop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (document.body.contains(canvas)) {
            document.body.removeChild(canvas);
        }
    }

    window.addEventListener('resize', updateCanvasSize);

    return { fire, stop };
})();
