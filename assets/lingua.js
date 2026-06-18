/* global LinguaData */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // =========================================================
  // 状态
  // =========================================================
  const STORE_KEY = 'lingua-lab-store-v1';
  const defaultStore = () => ({
    currentLang: 'en',
    selfLevel: 'A1',
    dailyMin: 30,
    currentUser: null, // { username, createdAt }
    users: {}, // username -> { passwordHash, profile: {...}, createdAt }
    // 学习状态（按语言独立）
    lang: {
      en: { words: {}, doneLessons: [], grammarDone: [], speakCount: 0, listenCount: 0 },
      ja: { words: {}, doneLessons: [], grammarDone: [], speakCount: 0, listenCount: 0 },
      ko: { words: {}, doneLessons: [], grammarDone: [], speakCount: 0, listenCount: 0 }
    },
    posts: [],
    likes: {}, // postId -> true
    streak: 0,
    lastActiveDate: null,
    xp: 0,
    loggedInAt: [],
    activity: [], // { ts, module, lang, note, xp }
    perDayMinutes: {}, // 'YYYY-MM-DD' -> minutes
    sessionStart: null
  });

  let store = loadStore();

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultStore();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultStore(), parsed);
    } catch (e) {
      return defaultStore();
    }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore */ }
  }
  function simpleHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return 'h' + h.toString(36);
  }

  // =========================================================
  // 工具函数
  // =========================================================
  const fmt = {
    date(d) {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    time(d) {
      const dt = new Date(d);
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    },
    relTime(ts) {
      const diff = (Date.now() - ts) / 1000;
      if (diff < 60) return '刚刚';
      if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
      if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
      return Math.floor(diff / 86400) + ' 天前';
    }
  };

  function toast(msg, type = 'info') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast'; }, 2600);
  }

  function currentLangState() {
    return store.lang[store.currentLang];
  }

  function addXp(amount, module, note) {
    store.xp += amount;
    const rec = {
      ts: Date.now(),
      module,
      lang: store.currentLang,
      note: note || '',
      xp: amount
    };
    store.activity.unshift(rec);
    if (store.activity.length > 500) store.activity.length = 500;
    markActivityMinutes();
    updateStreak();
    checkBadges();
    saveStore();
    renderStatsBar();
  }

  function markActivityMinutes() {
    const today = fmt.date(Date.now());
    const start = store.sessionStart || Date.now();
    const addMin = 1;
    store.perDayMinutes[today] = (store.perDayMinutes[today] || 0) + addMin;
  }

  function updateStreak() {
    const today = fmt.date(Date.now());
    if (store.lastActiveDate === today) return;
    const yesterday = fmt.date(Date.now() - 86400000);
    if (store.lastActiveDate === yesterday) store.streak += 1;
    else if (store.lastActiveDate !== today) store.streak = 1;
    store.lastActiveDate = today;
  }

  function countMasteredWords() {
    let n = 0;
    Object.keys(store.lang).forEach(lang => {
      Object.values(store.lang[lang].words || {}).forEach(w => {
        if ((w.recall || 0) >= 2) n += 1;
      });
    });
    return n;
  }

  function totalDoneLessons() {
    return Object.values(store.lang).reduce((acc, l) => acc + (l.doneLessons || []).length, 0);
  }

  function totalMinutes() {
    return Object.values(store.perDayMinutes).reduce((a, b) => a + b, 0);
  }

  function getMyPostsCount() {
    if (!store.currentUser) return 0;
    return (store.posts || []).filter(p => p.user === store.currentUser.username).length;
  }

  function checkBadges() {
    const state = {
      xp: store.xp,
      streak: store.streak,
      loggedInAt: store.loggedInAt,
      masteredWords: countMasteredWords(),
      doneLessons: totalDoneLessons(),
      speakCount: Object.values(store.lang).reduce((a, l) => a + (l.speakCount || 0), 0),
      listenCount: Object.values(store.lang).reduce((a, l) => a + (l.listenCount || 0), 0),
      myPosts: getMyPostsCount()
    };
    LinguaData.badgeDefs.forEach(b => {
      if (!store[`badge_${b.id}`] && b.check(state)) {
        store[`badge_${b.id}`] = Date.now();
        toast(`🎉 解锁成就：${b.title}`, 'good');
      }
    });
  }

  function unlockedBadgeCount() {
    return LinguaData.badgeDefs.reduce((n, b) => n + (store[`badge_${b.id}`] ? 1 : 0), 0);
  }

  // =========================================================
  // 视图切换
  // =========================================================
  function switchView(name) {
    $$('section.view').forEach(s => {
      s.classList.toggle('hidden', s.dataset.view !== name);
    });
    $$('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.view === name);
    });
    // 刷新各视图数据
    if (name === 'home') renderHome();
    if (name === 'courses') renderCourses();
    if (name === 'vocabulary') renderVocabulary();
    if (name === 'grammar') renderGrammar();
    if (name === 'speaking') renderSpeaking();
    if (name === 'listening') renderListening();
    if (name === 'recommend') renderRecommend();
    if (name === 'community') renderCommunity();
    if (name === 'achievements') renderAchievements();
    if (name === 'profile') renderProfile();
    window.location.hash = name;
  }

  // =========================================================
  // 用户认证
  // =========================================================
  function openAuthDialog(mode) {
    const dlg = $('#authDialog');
    dlg.returnValue = '';
    dlg.dataset.mode = mode || 'login';
    $('#authTitle').textContent = mode === 'register' ? '注册账号' : '登录账号';
    $('#authToggleBtn').textContent = mode === 'register' ? '去登录' : '去注册';
    $('#authError').textContent = '';
    $('#authUser').value = '';
    $('#authPass').value = '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', 'open');
  }

  function handleAuthConfirm(username, password, mode) {
    username = (username || '').trim();
    password = (password || '');
    if (!username || !password) {
      $('#authError').textContent = '请填写用户名和密码';
      return false;
    }
    if (mode === 'register') {
      if (store.users[username]) {
        $('#authError').textContent = '用户名已存在';
        return false;
      }
      store.users[username] = {
        passwordHash: simpleHash(password),
        profile: { lang: store.currentLang, selfLevel: 'A1', dailyMin: 30 },
        createdAt: Date.now()
      };
      store.currentUser = { username };
      store.loggedInAt.push(Date.now());
      saveStore();
      toast(`欢迎 ${username}，注册成功！`);
      updateUserUI();
      return true;
    } else {
      const u = store.users[username];
      if (!u) { $('#authError').textContent = '用户不存在，先注册？'; return false; }
      if (u.passwordHash !== simpleHash(password)) { $('#authError').textContent = '密码错误'; return false; }
      store.currentUser = { username };
      store.loggedInAt.push(Date.now());
      saveStore();
      toast(`欢迎回来，${username}`);
      updateUserUI();
      return true;
    }
  }

  function logout() {
    store.currentUser = null;
    saveStore();
    updateUserUI();
    toast('已退出登录');
  }

  function updateUserUI() {
    const userBox = $('#userBox');
    const btn = $('#openAuthBtn');
    if (store.currentUser) {
      userBox.hidden = false;
      btn.hidden = true;
      $('#userName').textContent = store.currentUser.username;
    } else {
      userBox.hidden = true;
      btn.hidden = false;
    }
    renderStatsBar();
  }

  function renderStatsBar() {
    $('#streakNum').textContent = store.streak || 0;
    $('#xpNum').textContent = store.xp || 0;
    checkBadges();
  }

  // =========================================================
  // 首页
  // =========================================================
  function renderHome() {
    // 今日一句
    const lang = LinguaData.languages[store.currentLang];
    const lvl = store.selfLevel;
    const pool = (lang.speak || []).filter(s => s.level === lvl);
    const qotd = pool.length ? pool[0] : (lang.speak[0] || { sentence: '', translation: '' });
    $('#dailyQuoteTarget').textContent = qotd.sentence || '—';
    // 会话预览
    const preview = $('#chatPreview');
    preview.innerHTML = '';
    const lines = [
      { who: 'her', text: '👋 ' + (store.currentLang === 'zh' ? '你好' : 'A: Hi there!') },
      { who: 'me', text: 'B: ' + (qotd.sentence ? qotd.sentence.slice(0, 60) : 'Hello!') },
      { who: 'her', text: 'A: 🎯 试着把 B 的句子跟读一下吧！' }
    ];
    lines.forEach(l => {
      const d = document.createElement('div');
      d.className = 'chat-line ' + l.who;
      d.textContent = l.text;
      preview.appendChild(d);
    });
    $('#dailyTranslation').textContent = qotd.translation || '';
    // 统计
    $('#metricWords').textContent = countMasteredWords();
    $('#metricLesson').textContent = totalDoneLessons();
    $('#metricMin').textContent = totalMinutes();
    $('#metricBadge').textContent = unlockedBadgeCount();
    // 推荐的 3 个课程卡片
    const quick = $('#quickCourses');
    quick.innerHTML = '';
    let recommended = lang.lessons.filter(l => l.level === lvl).slice(0, 4);
    if (!recommended.length) recommended = lang.lessons.slice(0, 4);
    recommended.forEach(lesson => {
      const c = document.createElement('a');
      c.className = 'card lesson-card';
      c.href = '#courses';
      c.innerHTML = `
        <span class="tag">${lesson.level} · ${lesson.minutes} min</span>
        <h3>${lesson.title}</h3>
        <p>类型：${lesson.type}</p>
      `;
      c.addEventListener('click', (e) => { e.preventDefault(); switchView('courses'); });
      quick.appendChild(c);
    });
    if (!recommended.length) {
      quick.innerHTML = '<p style="color:#64748b;text-align:center;grid-column:1/-1;">暂无课程推荐</p>';
    }
    // 推荐路径卡片
    const rec = $('#recommendTiles');
    rec.innerHTML = '';
    const recTiles = [
      { title: '单词记忆', desc: `基于你的 ${lvl} 水平，复习 8 个单词。`, view: 'vocabulary', color: 'blue' },
      { title: '语法练习', desc: '来 5 题语法题，强化你的薄弱点。', view: 'grammar', color: 'purple' },
      { title: '口语跟读', desc: '今日例句 × 3 句，跟读打分。', view: 'speaking', color: 'pink' }
    ];
    recTiles.forEach(t => {
      const c = document.createElement('a');
      c.className = 'card rec-card ' + t.color;
      c.href = '#' + t.view;
      c.innerHTML = `<h3>${t.title}</h3><p>${t.desc}</p><span class="go">开始 →</span>`;
      c.addEventListener('click', (e) => { e.preventDefault(); switchView(t.view); });
      rec.appendChild(c);
    });
    // 社区预览
    const cp = $('#communityPreview');
    cp.innerHTML = '';
    const posts = (store.posts || []).slice(0, 3);
    const all = posts.concat(LinguaData.samplePosts.slice(0, 3)).slice(0, 3);
    if (!all.length) {
      cp.innerHTML = '<p style="color:#64748b;text-align:center;grid-column:1/-1;">暂无社区动态</p>';
    } else {
      all.forEach(p => {
        const c = document.createElement('a');
        c.className = 'card post-card';
        c.href = '#community';
        c.innerHTML = `<span class="tag small">${LinguaData.languages[p.lang] ? LinguaData.languages[p.lang].name : (p.lang || 'EN')}</span>
          <h3>${p.title}</h3><p>${(p.body || '').slice(0, 80)}</p><small>@${p.user} · ${fmt.relTime(p.ts)}</small>`;
        c.addEventListener('click', (e) => { e.preventDefault(); switchView('community'); });
        cp.appendChild(c);
      });
    }
  }

  // =========================================================
  // 分级课程
  // =========================================================
  let courseFilterLevel = 'all';
  function renderCourses() {
    const lang = LinguaData.languages[store.currentLang];
    $('#courseLangLabel').textContent = lang.name;
    // 级别条
    const rail = $('#levelRail');
    rail.innerHTML = '';
    LinguaData.LEVELS.forEach((lv, idx) => {
      const count = lang.lessons.filter(l => l.level === lv).length;
      const btn = document.createElement('button');
      btn.className = 'level-chip' + (lv === store.selfLevel ? ' active' : '');
      btn.innerHTML = `<strong>${lv}</strong><span>${count} 课</span>`;
      btn.addEventListener('click', () => {
        courseFilterLevel = lv;
        $('#courseLevelSelect').value = lv;
        renderCourses();
      });
      rail.appendChild(btn);
    });
    // 课程列表
    const list = $('#courseList');
    list.innerHTML = '';
    const filtered = lang.lessons.filter(l => courseFilterLevel === 'all' || l.level === courseFilterLevel);
    filtered.forEach(l => {
      const card = document.createElement('article');
      card.className = 'lesson-card course-item';
      const done = currentLangState().doneLessons.includes(l.id);
      card.innerHTML = `
        <span class="tag ${done ? 'green' : ''}">${l.level}</span>
        <h3>${l.title}</h3>
        <p>时长：${l.minutes} 分钟 · 类型：${l.type}</p>
        <div class="lesson-actions">
          <button class="btn ghost mark-btn" data-id="${l.id}" type="button">${done ? '✓ 已完成' : '标记完成 (+10 XP)'}</button>
        </div>
      `;
      list.appendChild(card);
    });
    $$('.mark-btn').forEach(b => b.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const st = currentLangState();
      if (!st.doneLessons.includes(id)) {
        st.doneLessons.push(id);
        saveStore();
        addXp(10, 'courses', '完成课时 ' + id);
        renderCourses();
        toast('已完成本节课！+10 XP');
      } else {
        toast('这节课已完成，去挑战别的吧～');
      }
    }));
  }

  // =========================================================
  // 单词闪卡
  // =========================================================
  let deckIndex = 0;
  let currentDeck = [];
  function rebuildDeck() {
    const lang = LinguaData.languages[store.currentLang];
    const self = store.selfLevel;
    const base = lang.words.filter(w => w.level === self);
    const extras = lang.words.filter(w => w.level !== self).slice(0, 4);
    const all = base.concat(extras);
    // 合并本地单词
    const local = Object.values(currentLangState().words).map(w => w.word);
    lang.words.filter(w => !all.find(a => a.word === w.word) && local.includes(w.word)).forEach(w => all.push(w));
    currentDeck = shuffle(all.slice(0, 16));
    deckIndex = 0;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function renderFlashcard() {
    const total = currentDeck.length;
    if (!total) {
      $('#cardWord').textContent = '请先添加一些单词或切换到有素材的语言';
      $('#cardLevel').textContent = store.selfLevel;
      $('#cardMeaning').textContent = '—';
      $('#cardExample').textContent = '';
      return;
    }
    const card = currentDeck[deckIndex % total];
    $('#cardLevel').textContent = card.level;
    $('#cardWord').textContent = card.word;
    $('#cardPhonetic').textContent = card.phonetic || '';
    $('#cardMeaning').textContent = card.meaning;
    $('#cardExample').textContent = card.example || '';
    $('#deckProgress').innerHTML = `<span>${deckIndex + 1}</span>/<span>${total}</span>`;
    const flash = $('#flashcard');
    flash.classList.remove('flipped');
    flash.dataset.word = card.word;
  }
  function markWordRecall(recall) {
    if (!currentDeck.length) return;
    const word = currentDeck[deckIndex % currentDeck.length];
    const st = currentLangState();
    const entry = st.words[word.word] || { id: word.id, word: word.word, meaning: word.meaning, level: word.level, example: word.example, phonetic: word.phonetic, recall: 0, lastAt: null, nextAt: null, seen: 0 };
    entry.seen = (entry.seen || 0) + 1;
    if (recall === 'known') entry.recall = Math.min(3, (entry.recall || 0) + 1);
    else if (recall === 'hard') entry.recall = Math.max(1, (entry.recall || 0));
    else entry.recall = 0;
    entry.lastAt = Date.now();
    const days = recall === 'known' ? 3 : recall === 'hard' ? 1 : 0;
    entry.nextAt = Date.now() + days * 86400000;
    st.words[word.word] = entry;
    saveStore();
    deckIndex = (deckIndex + 1) % currentDeck.length;
    addXp(recall === 'known' ? 3 : 1, 'vocabulary', `复习 ${word.word}`);
    renderFlashcard();
    renderWordbook();
  }
  function renderWordbook() {
    const st = currentLangState();
    const words = Object.values(st.words);
    const mastered = words.filter(w => (w.recall || 0) >= 2).length;
    const learning = words.filter(w => (w.recall || 0) < 2 && (w.seen || 0) > 0).length;
    $('#wordbookStats').innerHTML = `
      <div class="mini-stat"><strong>${words.length}</strong><span>收藏</span></div>
      <div class="mini-stat"><strong>${learning}</strong><span>学习中</span></div>
      <div class="mini-stat green"><strong>${mastered}</strong><span>已掌握</span></div>
    `;
    const tbody = $('#wordbook tbody');
    tbody.innerHTML = '';
    words.slice().sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0)).slice(0, 30).forEach(w => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${w.word}</td>
        <td>${w.meaning || ''}</td>
        <td>${w.level}</td>
        <td>${'⭐'.repeat(Math.min(3, w.recall || 0))}${'☆'.repeat(3 - Math.min(3, w.recall || 0))}</td>
        <td>${w.nextAt ? fmt.date(w.nextAt) : '—'}</td>
        <td><button class="btn ghost del-word" data-word="${w.word}" type="button">删除</button></td>
      `;
      tbody.appendChild(tr);
    });
    $$('.del-word').forEach(b => b.addEventListener('click', (e) => {
      const w = e.currentTarget.dataset.word;
      delete currentLangState().words[w];
      saveStore();
      renderVocabulary();
      toast('已删除单词');
    }));
  }
  function renderVocabulary() {
    rebuildDeck();
    renderFlashcard();
    renderWordbook();
  }

  // =========================================================
  // 语法
  // =========================================================
  let grammarIndex = 0;
  function renderGrammar() {
    const lang = LinguaData.languages[store.currentLang];
    const pool = lang.grammar.filter(g => g.level === store.selfLevel);
    const quiz = pool.length ? pool : lang.grammar;
    if (!quiz.length) { $('#grammarBody').innerHTML = '<p>当前语言暂无语法题</p>'; return; }
    const q = quiz[grammarIndex % quiz.length];
    $('#grammarLevel').textContent = q.level;
    $('#grammarProgress').textContent = `${(grammarIndex % quiz.length) + 1} / ${quiz.length}`;
    const body = $('#grammarBody');
    body.innerHTML = `<h3>${q.q}</h3><div class="options" id="grammarOpts"></div><div class="quiz-feedback" id="grammarFeedback"></div>`;
    const opts = $('#grammarOpts');
    q.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option-btn';
      b.type = 'button';
      b.textContent = `${String.fromCharCode(65 + i)}. ${opt}`;
      b.addEventListener('click', () => {
        if (b.dataset.picked) return;
        $$('#grammarOpts .option-btn').forEach(x => x.dataset.picked = 'yes');
        if (i === q.answer) {
          b.classList.add('correct');
          $('#grammarFeedback').textContent = '✅ 正确！+5 XP';
          const st = currentLangState();
          (st.grammarDone || (st.grammarDone = [])).push({ q: q.q, ts: Date.now() });
          saveStore();
          addXp(5, 'grammar', q.q);
        } else {
          b.classList.add('wrong');
          const correct = $$('#grammarOpts .option-btn')[q.answer];
          if (correct) correct.classList.add('correct');
          $('#grammarFeedback').textContent = '❌ 错误。正确答案是：' + q.options[q.answer];
          addXp(1, 'grammar', q.q + '(错误)');
        }
      });
      opts.appendChild(b);
    });
    $('#grammarActions').innerHTML = `
      <button class="btn ghost" id="grammarPrevBtn" type="button">上一题</button>
      <button class="btn primary" id="grammarNextBtn" type="button">下一题 →</button>
    `;
    $('#grammarNextBtn').addEventListener('click', () => { grammarIndex += 1; renderGrammar(); });
    $('#grammarPrevBtn').addEventListener('click', () => { grammarIndex = Math.max(0, grammarIndex - 1); renderGrammar(); });
  }

  // =========================================================
  // 口语
  // =========================================================
  let speakIndex = 0;
  function renderSpeaking() {
    const lang = LinguaData.languages[store.currentLang];
    const pool = lang.speak;
    if (!pool.length) { $('#speakSentence').textContent = '—'; return; }
    speakIndex = speakIndex % pool.length;
    const item = pool[speakIndex];
    $('#speakLevel').textContent = item.level;
    $('#speakSentence').textContent = item.sentence;
    $('#speakTranslation').textContent = item.translation;
    $('#speakRecognized').textContent = '点击 "开始跟读" 录音…';
    $('#speakScore').hidden = true;
  }
  function speakTTS() {
    const lang = LinguaData.languages[store.currentLang];
    const text = $('#speakSentence').textContent;
    if (!('speechSynthesis' in window)) { toast('当前浏览器不支持朗读'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang.ttsCode;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
  function speakRecord() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      $('#speakHint').textContent = '当前浏览器不支持语音识别，您可以手动输入文本。';
      const text = prompt('请手动输入你自己跟读的内容：', '');
      if (text) evaluateSpeak(text);
      return;
    }
    const rec = new SR();
    rec.lang = LinguaData.languages[store.currentLang].ttsCode;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      $('#speakRecognized').textContent = '识别结果：' + t;
      evaluateSpeak(t);
    };
    rec.onerror = (e) => {
      $('#speakHint').textContent = '录音失败：' + (e.error || '未知');
    };
    $('#speakHint').textContent = '正在录音，请开口朗读…（浏览器可能需要麦克风权限）';
    try { rec.start(); } catch (e) { $('#speakHint').textContent = '无法启动识别：' + e.message; }
  }
  function evaluateSpeak(spoken) {
    const target = $('#speakSentence').textContent.trim();
    const a = tokenize(target), b = tokenize(spoken);
    const common = a.filter(x => b.includes(x)).length;
    const sim = Math.round((common * 2 / (a.length + b.length)) * 100) || 0;
    $('#speakSim').textContent = sim + '%';
    $('#speakRate').textContent = spoken.length > 0 ? '正常' : '未识别';
    $('#speakWords').textContent = b.length;
    $('#speakScore').hidden = false;
    const st = currentLangState();
    st.speakCount = (st.speakCount || 0) + 1;
    saveStore();
    addXp(Math.max(2, Math.round(sim / 10)), 'speaking', `跟读：${target.slice(0, 20)}`);
  }
  function tokenize(s) {
    if (!s) return [];
    // 英文/韩文按空格，中文/日文按字符
    const t = s.toLowerCase();
    if (/[\u4e00-\u9fff\u3040-\u30ff]/.test(t)) return t.replace(/\s+/g, '').split('');
    return t.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean);
  }

  // =========================================================
  // 听力
  // =========================================================
  let listenIndex = 0;
  function renderListening() {
    const lang = LinguaData.languages[store.currentLang];
    const pool = lang.listen;
    if (!pool.length) { $('#listenBody').innerHTML = '<p>暂无题目</p>'; return; }
    listenIndex = listenIndex % pool.length;
    const q = pool[listenIndex];
    $('#listenLevel').textContent = q.level;
    $('#listenProgress').textContent = `${listenIndex + 1} / ${pool.length}`;
    $('#listenScript').textContent = '📖 原文：' + q.script;
    $('#listenScript').hidden = true; // 初始隐藏，需要主动显示
    const body = $('#listenBody');
    body.innerHTML = `<h3>${q.question}</h3><div class="options" id="listenOpts"></div><div class="quiz-feedback" id="listenFeedback"></div>`;
    q.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option-btn';
      b.type = 'button';
      b.textContent = `${String.fromCharCode(65 + i)}. ${opt}`;
      b.addEventListener('click', () => {
        if (b.dataset.picked) return;
        $$('#listenOpts .option-btn').forEach(x => x.dataset.picked = 'yes');
        if (i === q.answer) {
          b.classList.add('correct');
          $('#listenFeedback').textContent = '✅ 答对了！+5 XP';
          const st = currentLangState();
          st.listenCount = (st.listenCount || 0) + 1;
          saveStore();
          addXp(5, 'listening', q.question);
        } else {
          b.classList.add('wrong');
          const correct = $$('#listenOpts .option-btn')[q.answer];
          if (correct) correct.classList.add('correct');
          $('#listenFeedback').textContent = '❌ 错了，再听一次看看。';
          addXp(1, 'listening', q.question + '(错误)');
        }
      });
      body.firstChild.nextSibling.appendChild(b);
    });
  }
  function listenPlay(rate = 1) {
    const lang = LinguaData.languages[store.currentLang];
    const pool = lang.listen;
    if (!pool.length) return;
    if (!('speechSynthesis' in window)) { toast('浏览器不支持朗读'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(pool[listenIndex % pool.length].script);
    u.lang = lang.ttsCode;
    u.rate = rate;
    window.speechSynthesis.speak(u);
  }

  // =========================================================
  // 推荐与每日任务
  // =========================================================
  function renderRecommend() {
    const summary = $('#recommendSummary');
    const weak = analyzeWeakness();
    summary.innerHTML = `
      <div class="summary-panel">
        <h3>学习画像</h3>
        <p>主学语言：<strong>${LinguaData.languages[store.currentLang].name}</strong>（自评 <strong>${store.selfLevel}</strong>）。
        每日目标：<strong>${store.dailyMin}</strong> 分钟。</p>
        <p>薄弱模块：<strong>${weak.label}</strong>（${weak.reason}）。建议优先从下方开始。</p>
      </div>
    `;
    const list = $('#recommendList');
    list.innerHTML = '';
    const tiles = [
      { title: '重点：' + weak.label, desc: weak.tip, view: weak.view, color: 'blue' },
      { title: '分级课程：' + store.selfLevel, desc: '继续推进你的课程大纲，稳步积累。', view: 'courses', color: 'green' },
      { title: '沉浸式综合训练', desc: '单词 → 语法 → 口语 → 听力，一次全流程。', view: 'vocabulary', color: 'purple' }
    ];
    tiles.forEach(t => {
      const c = document.createElement('a');
      c.className = 'card rec-card ' + t.color;
      c.innerHTML = `<h3>${t.title}</h3><p>${t.desc}</p><span class="go">开始 →</span>`;
      c.href = '#' + t.view;
      c.addEventListener('click', (e) => { e.preventDefault(); switchView(t.view); });
      list.appendChild(c);
    });
    // 每日任务
    const tasks = [
      { id: 'vocab5', label: '复习 5 个单词', check: () => countSessionVocabSeen() >= 5, target: 'vocabulary' },
      { id: 'grammar3', label: '答对 3 题语法', check: () => countSessionGrammarCorrect() >= 3, target: 'grammar' },
      { id: 'speak1', label: '完成 1 次口语跟读', check: () => (currentLangState().speakCount || 0) >= 1, target: 'speaking' },
      { id: 'listen1', label: '完成 1 次听力练习', check: () => (currentLangState().listenCount || 0) >= 1, target: 'listening' },
      { id: 'min10', label: `累计学习 ${store.dailyMin} 分钟`, check: () => totalMinutes() >= store.dailyMin, target: null }
    ];
    const box = $('#dailyTasks');
    box.innerHTML = '';
    tasks.forEach(t => {
      const done = t.check();
      const item = document.createElement('div');
      item.className = 'task-item' + (done ? ' done' : '');
      item.innerHTML = `<span>${done ? '✅' : '⬜'}</span><p>${t.label}</p>${t.target ? `<a class="task-go" href="#${t.target}">去完成 →</a>` : ''}`;
      if (t.target) item.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); switchView(t.target); });
      box.appendChild(item);
    });
  }
  function analyzeWeakness() {
    const st = currentLangState();
    const wordsSeen = Object.values(st.words || {}).length;
    const grammar = st.grammarDone.length;
    const speak = st.speakCount || 0;
    const listen = st.listenCount || 0;
    const metrics = [
      { key: 'vocabulary', val: wordsSeen, label: '单词记忆', tip: '打开单词闪卡，每天 8 个新词与复习词。', view: 'vocabulary' },
      { key: 'grammar', val: grammar, label: '语法练习', tip: '回到基础语法题，做错的题目可反复练习。', view: 'grammar' },
      { key: 'speaking', val: speak, label: '口语跟读', tip: '大声开口 3 分钟，比看 30 分钟视频更有效。', view: 'speaking' },
      { key: 'listening', val: listen, label: '听力训练', tip: '先慢速听一遍，再按正常速度听并作答。', view: 'listening' }
    ];
    metrics.sort((a, b) => a.val - b.val);
    const weak = metrics[0];
    return { label: weak.label, tip: weak.tip, view: weak.view, reason: `已完成次数最少（${weak.val} 次）` };
  }
  function countSessionVocabSeen() {
    let n = 0;
    Object.values(currentLangState().words).forEach(w => n += (w.seen || 0));
    return n;
  }
  function countSessionGrammarCorrect() {
    return (currentLangState().grammarDone || []).length;
  }

  // =========================================================
  // 社区
  // =========================================================
  let communityFilter = 'all';
  function renderCommunity() {
    const list = $('#postList');
    list.innerHTML = '';
    // 合并示例帖与用户帖
    const all = (store.posts || []).concat(LinguaData.samplePosts.map(p => ({ ...p, sample: true })));
    all.sort((a, b) => b.ts - a.ts);
    let shown = all;
    if (communityFilter === 'mine') {
      if (!store.currentUser) { shown = []; }
      else shown = all.filter(p => !p.sample && p.user === store.currentUser.username);
    } else if (communityFilter !== 'all') {
      shown = all.filter(p => p.lang === communityFilter);
    }
    if (!shown.length) {
      list.innerHTML = '<p style="text-align:center;color:#64748b;">这里还很安静，发布第一条帖子吧～</p>';
      return;
    }
    shown.forEach(p => {
      const el = document.createElement('article');
      el.className = 'post-item';
      const liked = store.likes[p.id || p.ts];
      el.innerHTML = `
        <header>
          <strong>@${p.user}</strong>
          <span class="tag small">${LinguaData.languages[p.lang] ? LinguaData.languages[p.lang].name : (p.lang || 'EN')}</span>
          <small>${fmt.relTime(p.ts)}</small>
        </header>
        <h3>${p.title}</h3>
        <p>${p.body}</p>
        <footer><button class="btn ghost like-btn" data-id="${p.ts}" type="button">👍 ${(p.likes || 0) + (liked ? 1 : 0)}</button></footer>
      `;
      list.appendChild(el);
    });
    $$('.like-btn').forEach(b => b.addEventListener('click', (e) => {
      if (!store.currentUser) { toast('请先登录再点赞～'); openAuthDialog('login'); return; }
      const id = e.currentTarget.dataset.id;
      store.likes[id] = !store.likes[id] ? true : false;
      saveStore();
      renderCommunity();
    }));
  }

  function submitPost(title, body, lang) {
    if (!store.currentUser) { openAuthDialog('login'); return false; }
    if (!title || !body) { toast('请填写标题和内容'); return false; }
    const id = Date.now();
    (store.posts || (store.posts = [])).unshift({
      id, user: store.currentUser.username, title, body, lang, likes: 0, ts: Date.now()
    });
    saveStore();
    addXp(3, 'community', `发帖：${title.slice(0, 20)}`);
    toast('发布成功！+3 XP');
    return true;
  }

  // =========================================================
  // 成就
  // =========================================================
  function renderAchievements() {
    const grid = $('#badgeGrid');
    grid.innerHTML = '';
    LinguaData.badgeDefs.forEach(b => {
      const unlocked = store[`badge_${b.id}`];
      const c = document.createElement('div');
      c.className = 'badge-card' + (unlocked ? ' unlocked' : '');
      c.innerHTML = `
        <div class="badge-icon">${b.icon}</div>
        <h3>${b.title}</h3>
        <p>${b.desc}</p>
        <small>${unlocked ? '已解锁 ' + fmt.date(unlocked) : '未解锁'}</small>
      `;
      grid.appendChild(c);
    });
    // 排行榜（仅本地）
    const lb = $('#leaderboard');
    lb.innerHTML = '';
    const userNames = Object.keys(store.users || {});
    const items = userNames.map(u => ({
      name: u,
      xp: (store.users[u].profile && store.users[u].profile._xp) || mockXp(u)
    }));
    // 把自己的 XP 也算进去
    if (store.currentUser) items.push({ name: store.currentUser.username, xp: store.xp, me: true });
    // 去重
    const dedup = {};
    items.forEach(i => {
      if (dedup[i.name]) {
        if (i.me || i.xp > dedup[i.name].xp) dedup[i.name] = i;
      } else dedup[i.name] = i;
    });
    const sorted = Object.values(dedup).sort((a, b) => b.xp - a.xp);
    if (!sorted.length) {
      lb.innerHTML = '<li style="color:#64748b;">暂无数据 — 快去学习，让自己登上榜首。</li>';
      return;
    }
    sorted.slice(0, 10).forEach((r, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="rank">${i + 1}</span><span class="name">${r.name}${r.me ? ' (我)' : ''}</span><span class="xp">⭐ ${r.xp} XP</span>`;
      lb.appendChild(li);
    });
  }
  function mockXp(u) {
    let h = 0;
    for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
    return Math.abs(h % 500) + 50;
  }

  // =========================================================
  // 我的
  // =========================================================
  function renderProfile() {
    $('#profileName').textContent = store.currentUser ? store.currentUser.username : '游客';
    $('#profileLang').textContent = LinguaData.languages[store.currentLang].name;
    $('#profileLevel').textContent = store.selfLevel;
    const stats = $('#profileStats');
    stats.innerHTML = `
      <div class="mini-stat"><strong>${countMasteredWords()}</strong><span>已掌握单词</span></div>
      <div class="mini-stat green"><strong>${totalDoneLessons()}</strong><span>完成课时</span></div>
      <div class="mini-stat blue"><strong>${totalMinutes()}</strong><span>累计分钟</span></div>
      <div class="mini-stat purple"><strong>${store.xp || 0}</strong><span>XP</span></div>
      <div class="mini-stat pink"><strong>${store.streak || 0}</strong><span>天连续</span></div>
      <div class="mini-stat"><strong>${unlockedBadgeCount()}</strong><span>成就</span></div>
    `;
    const form = $('#selfLevelForm');
    form.lang.value = store.currentLang;
    form.level.value = store.selfLevel;
    form.dailyMin.value = store.dailyMin;
    // 热力图（最近 84 天）
    const heat = $('#heatmap');
    heat.innerHTML = '';
    const totalDays = 84;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = fmt.date(d);
      const min = store.perDayMinutes[key] || 0;
      const cell = document.createElement('div');
      cell.className = 'heat-cell';
      let lvl = 0;
      if (min > 0 && min < 10) lvl = 1;
      else if (min < 30) lvl = 2;
      else if (min < 60) lvl = 3;
      else if (min > 0) lvl = 4;
      cell.dataset.level = lvl;
      cell.title = `${key} · ${min} 分钟`;
      heat.appendChild(cell);
    }
    // 活动表
    const tbody = $('#activityTable tbody');
    tbody.innerHTML = '';
    (store.activity || []).slice(0, 50).forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${fmt.date(a.ts)} ${fmt.time(a.ts)}</td>
        <td>${a.module}</td>
        <td>${LinguaData.languages[a.lang] ? LinguaData.languages[a.lang].name : (a.lang || '')}</td>
        <td>${(a.note || '').slice(0, 40)}</td>
        <td>+${a.xp}</td>`;
      tbody.appendChild(tr);
    });
  }

  // =========================================================
  // 初始化 & 事件
  // =========================================================
  function initEvents() {
    // 导航
    $$('.nav-link').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(a.dataset.view);
    }));
    // 语种切换
    $$('#langSwitch button').forEach(b => b.addEventListener('click', () => {
      store.currentLang = b.dataset.lang;
      saveStore();
      $$('#langSwitch button').forEach(x => x.classList.toggle('active', x === b));
      const active = $$('.nav-link.active')[0];
      switchView((active && active.dataset.view) || 'home');
      toast('已切换到 ' + LinguaData.languages[store.currentLang].name);
    }));
    // 认证
    $('#openAuthBtn').addEventListener('click', () => openAuthDialog('login'));
    $('#logoutBtn').addEventListener('click', logout);
    $('#authToggleBtn').addEventListener('click', (e) => {
      const dlg = $('#authDialog');
      const newMode = dlg.dataset.mode === 'register' ? 'login' : 'register';
      dlg.dataset.mode = newMode;
      $('#authTitle').textContent = newMode === 'register' ? '注册账号' : '登录账号';
      $('#authToggleBtn').textContent = newMode === 'register' ? '去登录' : '去注册';
      $('#authError').textContent = '';
    });
    $('#authForm').addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuthConfirm($('#authUser').value, $('#authPass').value, $('#authDialog').dataset.mode);
      if (store.currentUser) {
        const dlg = $('#authDialog');
        if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
      }
    });
    // 首页
    $('#dailySpeakBtn').addEventListener('click', () => {
      const text = $('#dailyQuoteTarget').textContent;
      if (!('speechSynthesis' in window)) { toast('浏览器不支持朗读'); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LinguaData.languages[store.currentLang].ttsCode;
      window.speechSynthesis.speak(u);
    });
    $('#dailyFlipBtn').addEventListener('click', () => {
      $('#dailyTranslation').hidden = !$('#dailyTranslation').hidden;
    });
    // 课程筛选
    $('#courseLevelSelect').addEventListener('change', (e) => {
      courseFilterLevel = e.target.value;
      renderCourses();
    });
    // 闪卡
    $('#flashcard').addEventListener('click', () => { $('#flashcard').classList.toggle('flipped'); });
    $('#cardSpeakBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const text = $('#cardWord').textContent;
      if (!('speechSynthesis' in window)) return toast('浏览器不支持朗读');
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LinguaData.languages[store.currentLang].ttsCode;
      window.speechSynthesis.speak(u);
    });
    $$('[data-recall]').forEach(b => b.addEventListener('click', () => markWordRecall(b.dataset.recall)));
    $('#shuffleDeckBtn').addEventListener('click', () => { currentDeck = shuffle(currentDeck); deckIndex = 0; renderFlashcard(); toast('已洗牌'); });
    // 添加单词
    $('#addWordBtn').addEventListener('click', () => {
      const dlg = $('#wordDialog');
      dlg.returnValue = '';
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', 'open');
    });
    $('#wordDialog form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const word = form.word.value.trim();
      const meaning = form.meaning.value.trim();
      if (!word || !meaning) { toast('请填写单词和释义'); return; }
      const st = currentLangState();
      st.words[word] = {
        id: 'local-' + Date.now(), word, meaning, level: form.level.value, example: form.example.value,
        phonetic: '', recall: 0, seen: 1, lastAt: Date.now()
      };
      saveStore();
      renderVocabulary();
      form.reset();
      const dlg = $('#wordDialog');
      if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
      toast('单词已添加 +1 XP');
      addXp(1, 'vocabulary', '添加单词 ' + word);
    });
    // 语法
    $('#grammarResetBtn').addEventListener('click', () => { grammarIndex = 0; renderGrammar(); toast('已重置'); });
    // 口语
    $('#speakTtsBtn').addEventListener('click', speakTTS);
    $('#speakRecordBtn').addEventListener('click', speakRecord);
    $('#speakNextBtn').addEventListener('click', () => { speakIndex += 1; renderSpeaking(); });
    // 听力
    $('#listenPlayBtn').addEventListener('click', () => listenPlay(1));
    $('#listenNormalBtn').addEventListener('click', () => listenPlay(1));
    $('#listenSlowBtn').addEventListener('click', () => listenPlay(0.75));
    $('#listenFastBtn').addEventListener('click', () => listenPlay(1.25));
    $('#listenToggleTextBtn').addEventListener('click', () => {
      const el = $('#listenScript');
      el.hidden = !el.hidden;
    });
    $('#listenNextBtn').addEventListener('click', () => { listenIndex += 1; renderListening(); });
    // 社区
    $('#postForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = submitPost($('#postTitle').value.trim(), $('#postBody').value.trim(), $('#postLang').value);
      if (ok) { $('#postTitle').value = ''; $('#postBody').value = ''; renderCommunity(); }
    });
    $$('#community .filter-btn').forEach(b => b.addEventListener('click', () => {
      communityFilter = b.dataset.filter;
      $$('#community .filter-btn').forEach(x => x.classList.toggle('active', x === b));
      renderCommunity();
    }));
    // 我的
    $('#selfLevelForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      store.currentLang = f.lang.value;
      store.selfLevel = f.level.value;
      store.dailyMin = parseInt(f.dailyMin.value, 10) || 30;
      if (store.currentUser && store.users[store.currentUser.username]) {
        store.users[store.currentUser.username].profile = { lang: store.currentLang, selfLevel: store.selfLevel, dailyMin: store.dailyMin };
      }
      saveStore();
      // 同步 lang 按钮高亮
      $$('#langSwitch button').forEach(x => x.classList.toggle('active', x.dataset.lang === store.currentLang));
      renderProfile();
      toast('学习档案已更新');
    });
    // 键盘快捷键：空格翻面
    document.addEventListener('keydown', (e) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) return;
      if ($('section.view[data-view="vocabulary"]').classList.contains('hidden')) return;
      if (e.code === 'Space') { e.preventDefault(); $('#flashcard').classList.toggle('flipped'); }
      if (e.key === '1') markWordRecall('forgot');
      if (e.key === '2') markWordRecall('hard');
      if (e.key === '3') markWordRecall('known');
    });
  }

  function initRouting() {
    const hash = (window.location.hash || '').replace('#', '');
    const supported = ['home', 'courses', 'vocabulary', 'grammar', 'speaking', 'listening', 'recommend', 'community', 'achievements', 'profile'];
    const view = supported.includes(hash) ? hash : 'home';
    switchView(view);
  }

  function init() {
    // 示例社区帖子 —— 仅在首次访问时放入本地，方便用户看到示例动态
    if (!store._seeded) {
      (store.posts || (store.posts = [])).unshift(...LinguaData.samplePosts.slice(0, 2).map(p => ({ ...p, sample: true })));
      store._seeded = true;
      saveStore();
    }
    initEvents();
    updateUserUI();
    initRouting();
    // 会话开始时间，用于估算时长
    store.sessionStart = Date.now();
    // 初始活跃度标记（仅一次）
    if (!store.lastActiveDate) {
      store.lastActiveDate = fmt.date(Date.now());
      store.streak = 1;
      saveStore();
    }
    // 欢迎
    if (!store.currentUser) {
      // 不打扰
    } else {
      toast(`欢迎回来，${store.currentUser.username} · 连续 ${store.streak} 天`);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
