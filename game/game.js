(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const startHighScoreEl = document.getElementById('startHighScore');
  const endHighScoreEl = document.getElementById('endHighScore');
  const finalScoreEl = document.getElementById('finalScore');
  const iceCreamCountEl = document.getElementById('iceCreamCount');

  const GROUND_Y = H - 60;
  const GRAVITY = 0.6;
  const JUMP_FORCE = -13;

  const HOT_SEARCH_TAGS = [
    '#张雪峰吃雪糕跑马拉松#',
    '#考研名师的夏日挑战#',
    '#雪糕刺客退退退#',
    '#马拉松还能这么玩#',
    '#夏日解暑神器#',
    '#报志愿不如吃雪糕#',
    '#这波操作666#',
    '#是谁的青春回来了#',
    '#雪糕自由#',
    '#奔跑吧老师#',
  ];

  let gameState = 'start';
  let score = 0;
  let iceCreams = 0;
  let highScore = parseInt(localStorage.getItem('zhangxf_highscore')) || 0;
  let gameSpeed = 5;
  let frameCount = 0;

  startHighScoreEl.textContent = highScore;

  const player = {
    x: 80,
    y: GROUND_Y - 60,
    width: 45,
    height: 60,
    velocityY: 0,
    isJumping: false,
    runFrame: 0,
    frameTimer: 0,
  };

  let obstacles = [];
  let iceCreamItems = [];
  let hotSearchTexts = [];
  let clouds = [];
  let groundOffset = 0;

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 30 + Math.random() * 100,
        width: 60 + Math.random() * 40,
        speed: 0.3 + Math.random() * 0.5,
      });
    }
  }

  function initHotSearch() {
    hotSearchTexts = [];
    for (let i = 0; i < 4; i++) {
      hotSearchTexts.push({
        text: HOT_SEARCH_TAGS[Math.floor(Math.random() * HOT_SEARCH_TAGS.length)],
        x: W + Math.random() * 400,
        y: 40 + Math.random() * 120,
        speed: 1 + Math.random() * 1.5,
        opacity: 0.15 + Math.random() * 0.2,
        size: 14 + Math.random() * 10,
      });
    }
  }

  function resetGame() {
    gameState = 'playing';
    score = 0;
    iceCreams = 0;
    gameSpeed = 5;
    frameCount = 0;
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.isJumping = false;
    player.runFrame = 0;
    player.frameTimer = 0;
    obstacles = [];
    iceCreamItems = [];
    initClouds();
    initHotSearch();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
  }

  function jump() {
    if (gameState !== 'playing') return;
    if (!player.isJumping) {
      player.velocityY = JUMP_FORCE;
      player.isJumping = true;
    }
  }

  function spawnObstacle() {
    const types = ['book', 'microphone', 'scoreline'];
    const type = types[Math.floor(Math.random() * types.length)];
    let width, height;

    switch (type) {
      case 'book':
        width = 40;
        height = 50;
        break;
      case 'microphone':
        width = 30;
        height = 55;
        break;
      case 'scoreline':
        width = 50;
        height = 35;
        break;
      default:
        width = 40;
        height = 45;
    }

    obstacles.push({
      x: W + 20,
      y: GROUND_Y - height,
      width,
      height,
      type,
    });
  }

  function spawnIceCream() {
    const heightVariation = Math.random() > 0.5 ? 0 : 60 + Math.random() * 40;
    iceCreamItems.push({
      x: W + 20,
      y: GROUND_Y - 40 - heightVariation,
      width: 30,
      height: 40,
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
    });
  }

  function checkCollision(a, b) {
    const padding = 5;
    return (
      a.x + padding < b.x + b.width - padding &&
      a.x + a.width - padding > b.x + padding &&
      a.y + padding < b.y + b.height - padding &&
      a.y + a.height - padding > b.y + padding
    );
  }

  function update() {
    if (gameState !== 'playing') return;

    frameCount++;

    gameSpeed = 5 + Math.min(score / 500, 6);

    score += 0.1 + gameSpeed * 0.02;

    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    if (player.y >= GROUND_Y - player.height) {
      player.y = GROUND_Y - player.height;
      player.velocityY = 0;
      player.isJumping = false;
    }

    player.frameTimer++;
    if (player.frameTimer >= 6) {
      player.frameTimer = 0;
      player.runFrame = (player.runFrame + 1) % 4;
    }

    const obstacleInterval = Math.max(60, 120 - score / 10);
    if (frameCount % Math.floor(obstacleInterval) === 0) {
      if (Math.random() > 0.3) {
        spawnObstacle();
      }
    }

    if (frameCount % 150 === 0 && Math.random() > 0.4) {
      spawnIceCream();
    }

    obstacles = obstacles.filter((obs) => {
      obs.x -= gameSpeed;
      return obs.x + obs.width > -50;
    });

    iceCreamItems = iceCreamItems.filter((ic) => {
      ic.x -= gameSpeed;
      ic.glowPhase += 0.1;
      return ic.x + ic.width > -50 && !ic.collected;
    });

    for (const obs of obstacles) {
      if (checkCollision(player, obs)) {
        gameOver();
        return;
      }
    }

    for (const ic of iceCreamItems) {
      if (!ic.collected && checkCollision(player, ic)) {
        ic.collected = true;
        iceCreams++;
        score += 50;
      }
    }

    clouds.forEach((cloud) => {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.width < 0) {
        cloud.x = W + 50;
        cloud.y = 30 + Math.random() * 100;
      }
    });

    hotSearchTexts.forEach((hs) => {
      hs.x -= hs.speed;
      if (hs.x < -200) {
        hs.x = W + Math.random() * 300;
        hs.y = 40 + Math.random() * 120;
        hs.text = HOT_SEARCH_TAGS[Math.floor(Math.random() * HOT_SEARCH_TAGS.length)];
      }
    });

    groundOffset = (groundOffset + gameSpeed) % 40;
  }

  function drawCloud(x, y, width) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, width * 0.3, 0, Math.PI * 2);
    ctx.arc(x + width * 0.25, y - 8, width * 0.28, 0, Math.PI * 2);
    ctx.arc(x + width * 0.5, y, width * 0.32, 0, Math.PI * 2);
    ctx.arc(x + width * 0.25, y + 5, width * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer() {
    const px = player.x;
    const py = player.y;

    ctx.save();

    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(px + 8, py + 22, 30, 25);

    ctx.fillStyle = '#FFE0BD';
    ctx.beginPath();
    ctx.arc(px + 22, py + 12, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(px + 17, py + 10, 2.5, 0, Math.PI * 2);
    ctx.arc(px + 27, py + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px + 22, py + 14, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.ellipse(px + 22, py + 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + 10, py - 8, 24, 10);

    ctx.fillStyle = '#fff';
    ctx.fillRect(px + 18, py + 25, 10, 8);

    ctx.fillStyle = '#333';
    if (player.isJumping) {
      ctx.fillRect(px + 10, py + 47, 10, 13);
      ctx.fillRect(px + 26, py + 47, 10, 13);
    } else {
      const legOffset = [0, 4, 0, -4][player.runFrame];
      ctx.fillRect(px + 10, py + 47 + legOffset, 10, 13 - Math.abs(legOffset));
      ctx.fillRect(px + 26, py + 47 - legOffset, 10, 13 - Math.abs(legOffset));
    }

    ctx.fillStyle = '#FFE0BD';
    if (player.isJumping) {
      ctx.fillRect(px - 2, py + 24, 10, 8);
      ctx.fillRect(px + 38, py + 24, 10, 8);
    } else {
      const armOffset = [3, 0, -3, 0][player.runFrame];
      ctx.fillRect(px + 2, py + 26 + armOffset, 8, 10);
      ctx.fillRect(px + 36, py + 26 - armOffset, 8, 10);
    }

    ctx.restore();
  }

  function drawObstacle(obs) {
    const { x, y, width, height, type } = obs;

    ctx.save();

    switch (type) {
      case 'book':
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(x, y, 6, height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 10, y + 10, width - 15, 4);
        ctx.fillRect(x + 10, y + 20, width - 15, 4);
        ctx.fillRect(x + 10, y + 30, width - 20, 4);
        break;

      case 'microphone':
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + 12, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillRect(x + width / 2 - 3, y + 22, 6, 25);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + width / 2 - 6, y + 45, 12, 5);
        break;

      case 'scoreline':
        ctx.fillStyle = '#9B59B6';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('分数线', x + width / 2, y + height / 2);
        break;
    }

    ctx.restore();
  }

  function drawIceCream(ic) {
    if (ic.collected) return;

    const { x, y, width, height, glowPhase } = ic;
    const glow = 0.5 + 0.5 * Math.sin(glowPhase);

    ctx.save();

    ctx.shadowColor = '#FFD93D';
    ctx.shadowBlur = 10 + glow * 15;

    ctx.fillStyle = '#D4A574';
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 8, y + 18);
    ctx.lineTo(x + width / 2 + 8, y + 18);
    ctx.lineTo(x + width / 2, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FF6B9D';
    ctx.beginPath();
    ctx.arc(x + width / 2 - 6, y + 14, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(x + width / 2 + 6, y + 14, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFACD';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 6, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawGround() {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.fillStyle = '#7CB342';
    ctx.fillRect(0, GROUND_Y - 8, W, 12);

    ctx.fillStyle = '#8B7355';
    for (let i = -groundOffset; i < W; i += 40) {
      ctx.fillRect(i, GROUND_Y + 15, 20, 3);
      ctx.fillRect(i + 20, GROUND_Y + 30, 15, 3);
    }
  }

  function drawHotSearch() {
    hotSearchTexts.forEach((hs) => {
      ctx.save();
      ctx.globalAlpha = hs.opacity;
      ctx.fillStyle = '#FF6B35';
      ctx.font = `bold ${hs.size}px sans-serif`;
      ctx.fillText(hs.text, hs.x, hs.y);
      ctx.restore();
    });
  }

  function drawScore() {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(15, 15, 180, 70, 12);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`🏃 分数: ${Math.floor(score)}`, 25, 22);
    ctx.fillText(`🍦 雪糕: ${iceCreams}`, 25, 50);

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, GROUND_Y);

    clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.width));

    drawHotSearch();

    drawGround();

    iceCreamItems.forEach((ic) => drawIceCream(ic));

    obstacles.forEach((obs) => drawObstacle(obs));

    drawPlayer();

    drawScore();
  }

  function gameOver() {
    gameState = 'gameover';
    const finalScore = Math.floor(score);
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem('zhangxf_highscore', highScore);
    }
    finalScoreEl.textContent = finalScore;
    iceCreamCountEl.textContent = iceCreams;
    endHighScoreEl.textContent = highScore;
    startHighScoreEl.textContent = highScore;
    gameOverScreen.classList.remove('hidden');
  }

  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (gameState === 'start') {
        resetGame();
      } else if (gameState === 'playing') {
        jump();
      } else if (gameState === 'gameover') {
        resetGame();
      }
    }
  });

  canvas.addEventListener('click', () => {
    if (gameState === 'playing') {
      jump();
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
      jump();
    }
  });

  startBtn.addEventListener('click', resetGame);
  restartBtn.addEventListener('click', resetGame);

  initClouds();
  initHotSearch();
  draw();
  gameLoop();
})();
