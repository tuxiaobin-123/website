/* ==========================================================================
   PIXEL MECHA BATTLE - 像素机甲对战
   纯 Canvas 渲染，不依赖外部素材，所有像素图案由代码生成
   ========================================================================== */

(() => {
  'use strict';

  // =============== 基础配置 ===============
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // 像素风关键设置

  const W = canvas.width;   // 640
  const H = canvas.height;  // 360
  const GROUND_Y = 300;     // 地面高度

  const GRAVITY = 0.55;
  const JUMP_POWER = -11;
  const MOVE_SPEED = 2.6;

  // 战斗常量
  const MAX_HP = 100;
  const ATTACK_DAMAGE = 10;
  const BLOCK_DAMAGE = 2;
  const ATTACK_COOLDOWN = 22;  // 帧数
  const ATTACK_ACTIVE_FRAMES = 8; // 攻击判定帧长度
  const ATTACK_RANGE = 44;
  const HIT_STUN_FRAMES = 14;

  // =============== 调色板 ===============
  // 每个机甲有自己的主色与强调色
  const PALETTE = {
    bg:      '#0b0720',
    sky:     '#1a0f40',
    ground:  '#2d1a4c',
    ground2: '#3e2466',
    ground3: '#1a0d30',
    star:    '#ffffff',
    neon:    '#ff3399',
    neon2:   '#33ddff',

    p1_body:  '#2255aa',
    p1_light: '#66ccff',
    p1_dark:  '#112255',
    p1_eye:   '#ffdd33',
    p1_accent:'#ffffff',

    p2_body:  '#aa2233',
    p2_light: '#ff8877',
    p2_dark:  '#551122',
    p2_eye:   '#00ffff',
    p2_accent:'#ffeeaa',
  };

  // =============== 输入系统 ===============
  const keys = {};
  const keysPressed = {}; // 本帧按下（边缘触发）

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!keys[k]) keysPressed[k] = true;
    keys[k] = true;
    if (['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)) {
      e.preventDefault();
    }
    if (k === 'r') restart();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  document.getElementById('restart').addEventListener('click', restart);

  // =============== 玩家 ===============
  class Mecha {
    constructor(opts) {
      this.x = opts.x;
      this.y = GROUND_Y;
      this.vx = 0;
      this.vy = 0;
      this.w = 40;
      this.h = 56;
      this.facing = opts.facing; // 1 右，-1 左
      this.color = opts.color;
      this.name = opts.name;

      this.hp = MAX_HP;
      this.onGround = true;

      // 状态
      this.attacking = false;
      this.attackTimer = 0;
      this.cooldown = 0;
      this.blocking = false;
      this.hitStun = 0;
      this.hitFlash = 0;
      this.animTick = 0;

      // 操作映射
      this.ctrl = opts.ctrl;
      this.alive = true;
    }

    get cx() { return this.x + this.w / 2; }

    update(opponent) {
      if (!this.alive) return;
      this.animTick++;

      // 眩晕状态
      if (this.hitStun > 0) { this.hitStun--; this.vx *= 0.7; }
      else this.handleInput();

      // 物理
      this.x += this.vx;
      this.vy += GRAVITY;
      this.y += this.vy;

      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }

      // 边界
      if (this.x < 10) this.x = 10;
      if (this.x + this.w > W - 10) this.x = W - 10 - this.w;

      // 面朝对手
      if (!this.attacking && this.hitStun === 0) {
        this.facing = opponent.x > this.x ? 1 : -1;
      }

      // 攻击计时
      if (this.attacking) {
        this.attackTimer--;
        if (this.attackTimer <= 0) {
          this.attacking = false;
        }
      }
      if (this.cooldown > 0) this.cooldown--;
      if (this.hitFlash > 0) this.hitFlash--;
    }

    handleInput() {
      const c = this.ctrl;
      this.blocking = !!keys[c.block];
      if (this.attacking || this.blocking) {
        this.vx *= 0.5;
      } else {
        this.vx = 0;
        if (keys[c.left])  this.vx = -MOVE_SPEED;
        if (keys[c.right]) this.vx =  MOVE_SPEED;
      }

      if (keysPressed[c.jump] && this.onGround && !this.attacking) {
        this.vy = JUMP_POWER;
        this.onGround = false;
      }

      if (keysPressed[c.attack] && !this.attacking && this.cooldown === 0) {
        this.attacking = true;
        this.attackTimer = ATTACK_ACTIVE_FRAMES + 6;
        this.cooldown = ATTACK_COOLDOWN;
        this.blocking = false;
      }
    }

    // 是否处于攻击判定帧（前几帧命中）
    isAttackHitFrame() {
      return this.attacking && this.attackTimer > 4 && this.attackTimer <= ATTACK_ACTIVE_FRAMES + 4;
    }

    // 攻击判定盒（前方区域）
    getAttackBox() {
      if (!this.isAttackHitFrame()) return null;
      const h = 28;
      const w = ATTACK_RANGE;
      const x = this.facing === 1 ? this.x + this.w - 4 : this.x - w + 4;
      const y = this.y - this.h + 18;
      return { x, y, w, h };
    }

    getHitBox() {
      return { x: this.x + 6, y: this.y - this.h + 6, w: this.w - 12, h: this.h - 8 };
    }

    takeHit(attackerFacing) {
      if (this.hitFlash > 0) return; // 已被击中，短暂无敌
      const dmg = this.blocking ? BLOCK_DAMAGE : ATTACK_DAMAGE;
      this.hp -= dmg;
      if (this.hp <= 0) { this.hp = 0; this.alive = false; }
      this.hitStun = HIT_STUN_FRAMES;
      this.hitFlash = 10;
      // 击退
      this.vx = attackerFacing * 4.5;
      this.vy = -3.5;
    }

    draw(ctx) {
      drawMecha(ctx, this);
    }
  }

  // =============== 碰撞检测 ===============
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // =============== 像素绘制工具 ===============
  function px(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }

  // 绘制一个由 ASCII 像素矩阵组成的图像，支持翻转
  // matrix: 二维数组，值为调色板的 key（单字符）或 null（透明）
  function drawMatrix(matrix, ox, oy, psize, palette, flip) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = matrix[r][c];
        if (!v) continue;
        const color = palette[v];
        if (!color) continue;
        const x = flip ? (cols - 1 - c) : c;
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(ox + x * psize), Math.floor(oy + r * psize), psize, psize);
      }
    }
  }

  // =============== 机甲像素图（由字符矩阵定义） ===============
  // 字符调色板：. 透明；其他字母对应下面的颜色
  // 静止姿势 14列 x 18行，每像素 4px（=> 56px 高，接近角色）
  // 我们用 3 种状态：idle / walk（只在脚部变化） / attack / block

  // 通用调色板映射（颜色由实例的 this.color 决定）
  // 键：B=body主色, L=light亮色, D=dark暗色, E=eye, A=accent, K=黑色, W=白色
  function mechPalette(m) {
    return {
      B: m.color.body,
      L: m.color.light,
      D: m.color.dark,
      E: m.color.eye,
      A: m.color.accent,
      K: '#000000',
      W: '#eeeeee',
      G: '#444455',
      Y: '#ffcc22',
      R: '#ff5555',
    };
  }

  // ========= 机甲主体（站立） =========
  // 12 宽 x 16 高，每格 4px → 48x64
  const MECHA_IDLE = [
    '....KKKK....',
    '...KEBBEK...',
    '...KBBBBK...',
    '...KBBBBK...',
    '..KLBBBBLK..',
    '.KKBBBBBBKK.',
    '.KBBBLLBBBK.',
    '.KBBBLLBBBK.',
    '.KBDBBBBDBK.',
    '.KKBBBBBBKK.',
    '..KBBAAABBK.',
    '..KKBBBBKK..',
    '...KK..KK...',
    '...KK..KK...',
    '..KGG..GGK..',
    '..KKK..KKK..',
  ];

  // 行走（脚部分开）
  const MECHA_WALK = [
    '....KKKK....',
    '...KEBBEK...',
    '...KBBBBK...',
    '...KBBBBK...',
    '..KLBBBBLK..',
    '.KKBBBBBBKK.',
    '.KBBBLLBBBK.',
    '.KBBBLLBBBK.',
    '.KBDBBBBDBK.',
    '.KKBBBBBBKK.',
    '..KBBAAABBK.',
    '..KKBBBBKK..',
    '..KK....KK..',
    '.KK......KK.',
    'KGG......GGK',
    'KKK......KKK',
  ];

  // 攻击（右臂前伸 + 能量光）
  const MECHA_ATTACK = [
    '....KKKK.......',
    '...KEBBEK......',
    '...KBBBBK......',
    '...KBBBBKY.....',
    '..KLBBBBKYY....',
    '.KKBBBBBBKYY...',
    '.KBBBLLBBKYYYY.',
    '.KBBBLLBBBYYYYY',
    '.KBDBBBBDBKYY..',
    '.KKBBBBBBKK....',
    '..KBBAAABBK....',
    '..KKBBBBKK.....',
    '...KK..KK......',
    '...KK..KK......',
    '..KGG..GGK.....',
    '..KKK..KKK.....',
  ];

  // 防御（双臂交叉 + 护盾）
  const MECHA_BLOCK = [
    '....KKKK....',
    '...KEBBEK...',
    '...KBBBBK...',
    '..KLBBBBLK..',
    '.KKBBBBBBKK.',
    '.KBBBLLBBBK.',
    '.KBBBLLBBBK.',
    '.KBDBBBBDBK.',
    '.KKBBBBBBKK.',
    '.KLLBBBBLLK.',
    '.KLLLLLLLLK.',
    '.KKLLLLLLKK.',
    '...KK..KK...',
    '...KK..KK...',
    '..KGG..GGK..',
    '..KKK..KKK..',
  ];

  // =============== 绘制机甲 ===============
  const PIXEL_SIZE = 3; // 每个矩阵像素的实际绘制大小

  function drawMecha(ctx, m) {
    // 选择姿态
    let pattern = MECHA_IDLE;
    let hasFlash = m.hitFlash > 0 && Math.floor(m.hitFlash / 2) % 2 === 0;

    if (!m.onGround) {
      pattern = MECHA_IDLE;
    } else if (m.attacking) {
      pattern = MECHA_ATTACK;
    } else if (m.blocking) {
      pattern = MECHA_BLOCK;
    } else if (Math.abs(m.vx) > 0.2) {
      // 行走抖动：走路动画 2 帧
      pattern = Math.floor(m.animTick / 8) % 2 === 0 ? MECHA_IDLE : MECHA_WALK;
    }

    // 命中闪白：覆盖调色板
    let pal = mechPalette(m);
    if (hasFlash) {
      pal = { ...pal, B: '#ffffff', L: '#ffffff', D: '#cccccc', A: '#ffffff' };
    }

    // 绘制位置（以角色脚下为基准）
    const cols = pattern[0].length;
    const rows = pattern.length;
    const totalW = cols * PIXEL_SIZE;
    const totalH = rows * PIXEL_SIZE;

    // 居中：角色 x 是左上角；先计算 anchor 脚位置
    const ox = m.x + (m.w - totalW) / 2;
    const oy = m.y - totalH + 4;
    const flip = m.facing === -1;

    // 脚下阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(Math.floor(ox + 4), Math.floor(m.y - 2), totalW - 8, 3);

    // 防御盾光效
    if (m.blocking) {
      const shieldX = flip ? ox - 6 : ox + totalW - 2;
      ctx.fillStyle = 'rgba(120,220,255,0.55)';
      ctx.fillRect(shieldX - 2, oy + 12, 6, totalH - 24);
      ctx.fillStyle = 'rgba(200,240,255,0.9)';
      ctx.fillRect(shieldX, oy + 16, 2, totalH - 32);
    }

    // 攻击能量尾迹
    if (m.attacking && m.attackTimer > 2) {
      const bx = flip ? ox - 20 : ox + totalW;
      ctx.fillStyle = 'rgba(255,220,80,0.85)';
      ctx.fillRect(bx, oy + 22, 18, 5);
      ctx.fillStyle = 'rgba(255,120,80,0.7)';
      ctx.fillRect(bx + (flip ? -4 : 14), oy + 24, 4, 3);
    }

    // 将字符串转成矩阵（每个字符是一个像素）
    const matrix = pattern.map(row => row.split('').map(ch => ch === '.' ? null : ch));
    drawMatrix(matrix, ox, oy, PIXEL_SIZE, pal, flip);

    // 受击闪烁覆盖
    if (hasFlash) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(Math.floor(ox), Math.floor(oy), totalW, totalH);
    }
  }

  // =============== 场景背景（赛博朋克城市） ===============
  let starField = [];
  function initStars() {
    starField = [];
    for (let i = 0; i < 60; i++) {
      starField.push({
        x: Math.random() * W,
        y: Math.random() * 180,
        s: Math.random() < 0.8 ? 1 : 2,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBackground(tick) {
    // 夜空渐变
    const grd = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grd.addColorStop(0, '#1a0a40');
    grd.addColorStop(0.5, '#2a0f55');
    grd.addColorStop(1, '#3a1540');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // 星星
    for (const s of starField) {
      const brightness = 0.5 + 0.5 * Math.sin(tick * 0.05 + s.tw);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + brightness * 0.6})`;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }

    // 远景月亮
    ctx.fillStyle = '#ffeeaa';
    ctx.beginPath();
    ctx.arc(520, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,150,0.3)';
    ctx.beginPath();
    ctx.arc(520, 70, 30, 0, Math.PI * 2);
    ctx.fill();

    // 远处建筑剪影（简单矩形）
    drawSkyline(tick);

    // 地面
    drawGround(tick);
  }

  // 远景建筑（像素化）
  const SKYLINE = [
    { x: 0,   w: 40, h: 120, c: '#1a0a33' },
    { x: 35,  w: 28, h: 150, c: '#220a44' },
    { x: 60,  w: 50, h: 90,  c: '#18082a' },
    { x: 105, w: 36, h: 170, c: '#2a1055' },
    { x: 140, w: 44, h: 110, c: '#1d0a40' },
    { x: 180, w: 60, h: 140, c: '#241050' },
    { x: 235, w: 30, h: 100, c: '#1a0a35' },
    { x: 260, w: 46, h: 160, c: '#281050' },
    { x: 305, w: 34, h: 120, c: '#1b0a3a' },
    { x: 340, w: 50, h: 90,  c: '#1a0a33' },
    { x: 390, w: 40, h: 150, c: '#220a44' },
    { x: 430, w: 38, h: 170, c: '#2a1055' },
    { x: 470, w: 50, h: 110, c: '#18082a' },
    { x: 520, w: 40, h: 140, c: '#220a44' },
    { x: 560, w: 80, h: 100, c: '#1a0a33' },
  ];

  function drawSkyline(tick) {
    for (const b of SKYLINE) {
      const top = GROUND_Y - b.h;
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, top, b.w, b.h);

      // 窗户（发光）
      const winYStart = top + 14;
      for (let y = winYStart; y < GROUND_Y - 10; y += 8) {
        for (let x = b.x + 4; x < b.x + b.w - 4; x += 7) {
          // 伪随机亮灯
          const seed = (x * 31 + y * 17 + Math.floor(tick / 30)) % 100;
          if (seed < 40) {
            const on = (seed + Math.floor(tick / 60)) % 5 !== 0;
            ctx.fillStyle = on ? '#ffdd88' : '#553377';
            ctx.fillRect(x, y, 3, 3);
          }
        }
      }

      // 顶部天线
      if (b.w > 35 && b.h > 120) {
        ctx.fillStyle = '#ff3399';
        ctx.fillRect(b.x + b.w / 2 - 1, top - 6, 2, 6);
        // 闪烁灯
        if (Math.floor(tick / 30) % 2 === 0) {
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(b.x + b.w / 2 - 1, top - 8, 2, 2);
        }
      }
    }
  }

  function drawGround(tick) {
    // 地面主色
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // 地面条纹（横向）
    ctx.fillStyle = PALETTE.ground2;
    for (let y = GROUND_Y + 8; y < H; y += 16) {
      ctx.fillRect(0, y, W, 2);
    }

    // 地面方格（滚动感）
    ctx.fillStyle = PALETTE.ground3;
    const offset = (tick * 0.6) % 32;
    for (let x = -offset; x < W; x += 32) {
      ctx.fillRect(x, GROUND_Y + 2, 16, 2);
    }

    // 霓虹线
    ctx.fillStyle = PALETTE.neon;
    ctx.fillRect(0, GROUND_Y, W, 2);
    ctx.fillStyle = PALETTE.neon2;
    ctx.fillRect(0, GROUND_Y + 4, W, 1);

    // 地面装饰点
    for (let i = 0; i < 40; i++) {
      const x = (i * 37 + 11) % W;
      const y = GROUND_Y + 20 + ((i * 13) % 30);
      ctx.fillStyle = i % 3 === 0 ? '#553377' : '#331a55';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // =============== 攻击闪光 / 命中特效 ===============
  const effects = [];

  function spawnHit(x, y) {
    for (let i = 0; i < 6; i++) {
      effects.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 1,
        life: 18,
        size: 3 + Math.random() * 2,
        color: Math.random() < 0.5 ? '#ffee88' : '#ff8844',
      });
    }
    effects.push({ x, y, life: 8, flash: true, size: 20 });
  }

  function updateEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life--;
      if (e.vx !== undefined) {
        e.x += e.vx;
        e.y += e.vy;
        e.vy += 0.4;
      }
      if (e.life <= 0) effects.splice(i, 1);
    }
  }

  function drawEffects() {
    for (const e of effects) {
      if (e.flash) {
        ctx.fillStyle = `rgba(255,255,200,${e.life / 8})`;
        ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
      } else {
        ctx.fillStyle = e.color;
        ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.size, e.size);
      }
    }
  }

  // =============== 游戏状态 ===============
  let p1, p2;
  let roundState = 'ready'; // ready / fight / over
  let roundTimer = 0;
  let gameStartTime = 0;
  let winner = null;
  let tick = 0;

  function restart() {
    p1 = new Mecha({
      x: 180,
      color: { body: PALETTE.p1_body, light: PALETTE.p1_light, dark: PALETTE.p1_dark, eye: PALETTE.p1_eye, accent: PALETTE.p1_accent },
      facing: 1,
      name: 'P1',
      ctrl: { left: 'a', right: 'd', jump: 'w', attack: 'j', block: 'k' },
    });
    p2 = new Mecha({
      x: 420,
      color: { body: PALETTE.p2_body, light: PALETTE.p2_light, dark: PALETTE.p2_dark, eye: PALETTE.p2_eye, accent: PALETTE.p2_accent },
      facing: -1,
      name: 'P2',
      ctrl: { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: '4', block: '5' },
    });
    roundState = 'ready';
    roundTimer = 90; // 1.5 秒准备时间
    winner = null;
    effects.length = 0;
    gameStartTime = performance.now();
    document.getElementById('round-tag').textContent = 'READY';
    document.getElementById('round-tag').style.color = '#ffdd33';
  }

  // =============== 主循环 ===============
  function update() {
    tick++;

    if (roundState === 'ready') {
      roundTimer--;
      if (roundTimer <= 0) {
        roundState = 'fight';
        document.getElementById('round-tag').textContent = 'FIGHT!';
        document.getElementById('round-tag').style.color = '#ff3399';
      }
    } else if (roundState === 'fight') {
      // 更新玩家
      p1.update(p2);
      p2.update(p1);

      // 攻击判定
      checkAttackHit(p1, p2);
      checkAttackHit(p2, p1);

      // 胜负
      if (!p1.alive || !p2.alive) {
        roundState = 'over';
        winner = p1.alive ? 'P1' : 'P2';
        document.getElementById('round-tag').textContent = `VICTORY: ${winner}`;
        document.getElementById('round-tag').style.color = winner === 'P1' ? '#66ccff' : '#ff6677';
      }
    }

    updateEffects();

    // 清空本帧按键（仅在 update 结束时清一次）
    for (const k in keysPressed) delete keysPressed[k];
  }

  function checkAttackHit(attacker, defender) {
    const atkBox = attacker.getAttackBox();
    if (!atkBox) return;
    const defBox = defender.getHitBox();
    if (aabb(atkBox, defBox)) {
      if (defender.hitFlash === 0) {
        defender.takeHit(attacker.facing);
        const hx = defender.x + defender.w / 2;
        const hy = defender.y - defender.h / 2;
        spawnHit(hx, hy);
      }
    }
  }

  // =============== 渲染 ===============
  function render() {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, W, H);

    drawBackground(tick);

    if (p1 && p2) {
      // 按 y 排序绘制（近大远小感），简单按 x
      p1.draw(ctx);
      p2.draw(ctx);
    }

    drawEffects();

    // 大字幕
    if (roundState === 'ready' || roundState === 'over') {
      drawBigOverlay();
    }

    // 更新 HUD
    if (p1) {
      const hp1El = document.getElementById('hp1');
      hp1El.style.width = (p1.hp / MAX_HP * 100) + '%';
      if (p1.hp < 30) hp1El.style.background = 'linear-gradient(90deg, #ff2244, #ff8866)';
      else hp1El.style.background = '';
    }
    if (p2) {
      const hp2El = document.getElementById('hp2');
      hp2El.style.width = (p2.hp / MAX_HP * 100) + '%';
      if (p2.hp < 30) hp2El.style.background = 'linear-gradient(90deg, #ff2244, #ff8866)';
      else hp2El.style.background = '';
    }

    // 计时器
    const t = Math.floor((performance.now() - gameStartTime) / 1000);
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${mm}:${ss}`;
  }

  function drawBigOverlay() {
    ctx.fillStyle = 'rgba(10,5,30,0.6)';
    ctx.fillRect(0, H / 2 - 50, W, 100);

    let text = '';
    let color = '#ffdd33';
    if (roundState === 'ready') {
      text = 'READY';
    } else if (roundState === 'over') {
      text = `${winner} WINS!`;
      color = winner === 'P1' ? '#66ccff' : '#ff6677';
    }

    ctx.font = "bold 36px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 像素描边
    ctx.fillStyle = '#000';
    for (const dx of [-3, 0, 3]) {
      for (const dy of [-3, 0, 3]) {
        if (dx === 0 && dy === 0) continue;
        ctx.fillText(text, W / 2 + dx, H / 2 + dy);
      }
    }
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, H / 2);

    if (roundState === 'over') {
      ctx.font = "bold 14px 'Press Start 2P', monospace";
      ctx.fillStyle = '#ffffff';
      ctx.fillText('按 R 键重新开始', W / 2, H / 2 + 40);
    }
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // =============== 主循环驱动 ===============
  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  initStars();
  restart();
  loop();
})();
