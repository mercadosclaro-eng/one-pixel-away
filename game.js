(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    arena: $('arena'), target: $('target'), runner: $('runner'), tapHint: $('tapHint'),
    score: $('score'), best: $('best'), round: $('roundNumber'), progress: $('progress'),
    feedbackTitle: $('feedbackTitle'), feedbackDetail: $('feedbackDetail'),
    start: $('startButton'), gameCard: document.querySelector('.game-card'), result: $('resultCard'),
    finalScore: $('finalScore'), resultMessage: $('resultMessage'), resultGrid: $('resultGrid'),
    share: $('shareButton'), practice: $('practiceButton'), next: $('nextPuzzle'),
    lang: $('langButton'), sound: $('soundButton'), mode: $('modeLabel'),
    scoreLabel: $('scoreLabel'), bestLabel: $('bestLabel'), resultEyebrow: $('resultEyebrow'),
    footerText: $('footerText'), how: $('howButton'), privacy: $('privacyButton'),
    dialog: $('infoDialog'), dialogContent: $('dialogContent'), dialogClose: $('dialogClose')
  };

  const copy = {
    en: {
      daily: 'DAILY RUN', practice: 'PRACTICE', score: 'SCORE', best: 'BEST', tap: 'TAP ANYWHERE',
      intro: 'Get as close as possible.', intro2: 'Perfect hit = 1,000 points', start: 'START DAILY RUN',
      result: "TODAY'S RESULT", share: 'SHARE RESULT', again: 'PRACTICE MODE',
      footer: 'No account. No download. The same challenge for everyone today.', how: 'How to play', privacy: 'Privacy',
      ready: 'Watch the moving line.', ready2: 'Tap, click, or press Space to stop it',
      perfect: 'PIXEL PERFECT!', great: 'Almost perfect.', good: 'Good stop.', miss: 'Too far.',
      off: (n,p) => `${n}px away · +${p}`, tomorrow: (h,m) => `New daily run in ${h}h ${m}m`,
      messages: ['Room to improve.', 'Good reflexes.', 'Steady hands.', 'Precision machine.', 'Practically pixel perfect.'],
      copied: 'RESULT COPIED', shared: 'SHARED',
      howHtml: '<h2>How to play</h2><ol><li>Press start and watch the cyan line move.</li><li>Tap when it reaches the yellow target.</li><li>You get 10 rounds. The target gets smaller and the line gets faster.</li><li>Everyone receives the same daily challenge.</li></ol>',
      privacyHtml: '<h2>Privacy</h2><p>The game needs no account and collects no personal information. Your score, preferred language, sound setting, and streak are stored only in your browser. Sharing happens only when you press the share button.</p>'
    },
    es: {
      daily: 'RETO DIARIO', practice: 'PRÁCTICA', score: 'PUNTOS', best: 'RÉCORD', tap: 'TOCA EN CUALQUIER SITIO',
      intro: 'Acércate todo lo posible.', intro2: 'Acierto perfecto = 1.000 puntos', start: 'EMPEZAR RETO DIARIO',
      result: 'RESULTADO DE HOY', share: 'COMPARTIR RESULTADO', again: 'MODO PRÁCTICA',
      footer: 'Sin cuenta. Sin descarga. El mismo reto para todo el mundo hoy.', how: 'Cómo jugar', privacy: 'Privacidad',
      ready: 'Mira la línea en movimiento.', ready2: 'Toca, haz clic o pulsa Espacio para detenerla',
      perfect: '¡PÍXEL PERFECTO!', great: 'Casi perfecto.', good: 'Buen toque.', miss: 'Demasiado lejos.',
      off: (n,p) => `A ${n}px · +${p}`, tomorrow: (h,m) => `Nuevo reto en ${h}h ${m}m`,
      messages: ['Hay margen de mejora.', 'Buenos reflejos.', 'Pulso firme.', 'Máquina de precisión.', 'Prácticamente perfecto.'],
      copied: 'RESULTADO COPIADO', shared: 'COMPARTIDO',
      howHtml: '<h2>Cómo jugar</h2><ol><li>Empieza y observa la línea azul.</li><li>Toca cuando llegue al objetivo amarillo.</li><li>Hay 10 rondas. El objetivo se estrecha y la línea acelera.</li><li>Todo el mundo recibe el mismo reto diario.</li></ol>',
      privacyHtml: '<h2>Privacidad</h2><p>No necesitas cuenta y el juego no recoge datos personales. Tu puntuación, idioma, sonido y racha solo se guardan en tu navegador. Solo se comparte algo cuando pulsas el botón de compartir.</p>'
    }
  };

  let language = localStorage.getItem('opa-language') || (navigator.language.startsWith('es') ? 'es' : 'en');
  let soundOn = localStorage.getItem('opa-sound') !== 'off';
  let running = false, practice = false, round = 0, score = 0, results = [];
  let targetX = 50, runnerX = 0, direction = 1, lastTime = 0, frame = 0, speed = 28;
  let audio;

  function t() { return copy[language]; }
  function dayKey() { return new Date().toISOString().slice(0, 10); }
  function hash(text) { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function randomFor(index) { let x = hash(`${dayKey()}-${index}`); x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967295; }

  function renderLanguage() {
    const c = t();
    els.lang.textContent = language === 'en' ? 'ES' : 'EN';
    els.mode.textContent = practice ? c.practice : c.daily;
    els.scoreLabel.textContent = c.score; els.bestLabel.textContent = c.best; els.tapHint.textContent = c.tap;
    els.start.textContent = c.start; els.resultEyebrow.textContent = c.result; els.share.textContent = c.share;
    els.practice.textContent = c.again; els.footerText.textContent = c.footer;
    els.how.textContent = c.how; els.privacy.textContent = c.privacy;
    if (!running && round === 0) { els.feedbackTitle.textContent = c.intro; els.feedbackDetail.textContent = c.intro2; }
    updateCountdown();
  }

  function buildProgress() {
    els.progress.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const dot = document.createElement('span');
      if (i < results.length) dot.className = results[i].distance <= 2 ? 'perfect' : 'done';
      els.progress.appendChild(dot);
    }
  }

  function setRound() {
    const r = practice ? Math.random() : randomFor(round);
    targetX = 16 + r * 68;
    speed = 27 + round * 4.1 + (practice ? Math.random() * 6 : randomFor(round + 20) * 6);
    direction = (practice ? Math.random() : randomFor(round + 40)) > .5 ? 1 : -1;
    runnerX = direction > 0 ? 0 : 100;
    els.target.style.left = `${targetX}%`;
    els.target.style.width = `${Math.max(8, 19 - round)}px`;
    els.runner.style.left = `${runnerX}%`;
    els.round.textContent = String(round + 1);
    els.tapHint.style.opacity = '1';
    els.feedbackTitle.textContent = t().ready;
    els.feedbackDetail.textContent = t().ready2;
    buildProgress();
    running = true; lastTime = performance.now(); frame = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, .04); lastTime = now;
    runnerX += direction * speed * dt;
    if (runnerX >= 100) { runnerX = 100; direction = -1; beep(160, .025); }
    if (runnerX <= 0) { runnerX = 0; direction = 1; beep(160, .025); }
    els.runner.style.left = `${runnerX}%`;
    frame = requestAnimationFrame(loop);
  }

  function stopRound() {
    if (!running) return;
    running = false; cancelAnimationFrame(frame); els.tapHint.style.opacity = '0';
    const width = els.arena.clientWidth;
    const distance = Math.round(Math.abs(runnerX - targetX) / 100 * width);
    const points = Math.max(0, Math.round(1000 * Math.exp(-distance / 18)));
    results.push({ distance, points }); score += points; els.score.textContent = score.toLocaleString(language);
    let title = t().miss;
    if (distance <= 2) { title = t().perfect; beep(760, .14); }
    else if (distance <= 8) { title = t().great; beep(520, .1); }
    else if (distance <= 20) { title = t().good; beep(360, .08); }
    else beep(120, .09);
    els.feedbackTitle.textContent = title; els.feedbackDetail.textContent = t().off(distance, points);
    buildProgress(); round++;
    if (round >= 10) setTimeout(finish, 760); else setTimeout(setRound, 700);
  }

  function startGame(isPractice = false) {
    practice = isPractice; round = 0; score = 0; results = [];
    els.score.textContent = '0'; els.result.classList.add('hidden'); els.gameCard.classList.remove('hidden');
    els.start.classList.add('hidden'); renderLanguage(); buildProgress();
    setTimeout(setRound, 220);
  }

  function finish() {
    running = false; practice = practice;
    const bestKey = 'opa-best'; const best = Math.max(score, Number(localStorage.getItem(bestKey) || 0));
    localStorage.setItem(bestKey, String(best)); els.best.textContent = best.toLocaleString(language);
    if (!practice) localStorage.setItem(`opa-daily-${dayKey()}`, JSON.stringify({ score, results }));
    els.finalScore.textContent = score.toLocaleString(language);
    const band = score >= 9000 ? 4 : score >= 7200 ? 3 : score >= 5200 ? 2 : score >= 3000 ? 1 : 0;
    els.resultMessage.textContent = t().messages[band];
    els.resultGrid.innerHTML = results.map(r => `<span class="${r.distance <= 2 ? 'gold' : r.distance <= 8 ? 'good' : ''}">${r.distance}px</span>`).join('');
    els.gameCard.classList.add('hidden'); els.result.classList.remove('hidden'); renderLanguage();
  }

  function shareText() {
    const blocks = results.map(r => r.distance <= 2 ? '🟨' : r.distance <= 8 ? '🟩' : r.distance <= 20 ? '🟦' : '⬛').join('');
    return `Pixel Brake Zero · ${dayKey()}\n${score.toLocaleString('en-US')}/10,000\n${blocks}\n${location.href.split('?')[0]}`;
  }

  async function shareResult() {
    const text = shareText();
    try {
      if (navigator.share) { await navigator.share({ title: 'Pixel Brake Zero', text }); els.share.textContent = t().shared; }
      else { await navigator.clipboard.writeText(text); els.share.textContent = t().copied; }
    } catch (_) { return; }
    setTimeout(() => { els.share.textContent = t().share; }, 1600);
  }

  function beep(freq, duration) {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.frequency.value = freq; osc.type = 'sine'; gain.gain.setValueAtTime(.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch (_) {}
  }

  function updateCountdown() {
    const now = new Date(), next = new Date(now); next.setUTCHours(24,0,0,0);
    const diff = next - now, h = Math.floor(diff / 3600000), m = Math.floor(diff % 3600000 / 60000);
    els.next.textContent = t().tomorrow(h,m);
  }

  function openInfo(type) { els.dialogContent.innerHTML = type === 'how' ? t().howHtml : t().privacyHtml; els.dialog.showModal(); }

  for (let i = 0; i < 10; i++) els.progress.appendChild(document.createElement('span'));
  const storedBest = Number(localStorage.getItem('opa-best') || 0); if (storedBest) els.best.textContent = storedBest.toLocaleString(language);
  const completed = localStorage.getItem(`opa-daily-${dayKey()}`);
  if (completed) {
    try { const saved = JSON.parse(completed); score = saved.score; results = saved.results; round = 10; practice = false; finish(); } catch (_) {}
  }

  els.start.addEventListener('click', () => startGame(false));
  els.practice.addEventListener('click', () => startGame(true));
  els.arena.addEventListener('pointerdown', stopRound);
  els.arena.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); stopRound(); } });
  window.addEventListener('keydown', e => { if (running && e.code === 'Space') { e.preventDefault(); stopRound(); } });
  els.share.addEventListener('click', shareResult);
  els.lang.addEventListener('click', () => { language = language === 'en' ? 'es' : 'en'; localStorage.setItem('opa-language', language); renderLanguage(); });
  els.sound.addEventListener('click', () => { soundOn = !soundOn; localStorage.setItem('opa-sound', soundOn ? 'on' : 'off'); els.sound.setAttribute('aria-pressed', String(soundOn)); els.sound.textContent = soundOn ? '♪' : '×'; });
  els.how.addEventListener('click', () => openInfo('how')); els.privacy.addEventListener('click', () => openInfo('privacy'));
  els.dialogClose.addEventListener('click', () => els.dialog.close());
  renderLanguage(); setInterval(updateCountdown, 60000);
})();
