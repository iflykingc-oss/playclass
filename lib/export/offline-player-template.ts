/**
 * Self-contained offline classroom player (WP1.6 / #1470).
 * Double-click `index.html` inside an unpacked export folder — no server, no CDN.
 * Reads `manifest.json` and relative `media/` + `audio/` paths from the same folder.
 */
export function buildOfflinePlayerHtml(courseTitle: string): string {
  const safeTitle = JSON.stringify(courseTitle || 'Classroom');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(courseTitle || 'Classroom')} · 离线课堂</title>
<style>
  :root {
    --bg: #0f172a;
    --panel: #1e293b;
    --ink: #f8fafc;
    --muted: #94a3b8;
    --accent: #8b5cf6;
    --ok: #34d399;
    --warn: #fbbf24;
    --err: #f87171;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--panel);
    border-bottom: 1px solid #334155;
    flex-wrap: wrap;
  }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; flex: 1; min-width: 160px; }
  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #312e81;
    color: #c4b5fd;
  }
  main {
    flex: 1;
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 0;
  }
  @media (max-width: 800px) {
    main { grid-template-columns: 1fr; }
    nav { max-height: 160px; overflow: auto; border-right: none !important; border-bottom: 1px solid #334155; }
  }
  nav {
    background: #111827;
    border-right: 1px solid #334155;
    overflow: auto;
    padding: 8px;
  }
  nav button {
    display: block;
    width: 100%;
    text-align: left;
    margin: 4px 0;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
  }
  nav button.active {
    background: #312e81;
    color: #fff;
    border-color: #4c1d95;
  }
  section.player {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 16px;
    gap: 12px;
  }
  .card {
    background: var(--panel);
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 16px;
    min-height: 180px;
  }
  .card h2 { margin: 0 0 8px; font-size: 18px; }
  .muted { color: var(--muted); font-size: 13px; line-height: 1.6; }
  .type-chip {
    display: inline-block;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #1e3a5f;
    color: #93c5fd;
    margin-bottom: 8px;
  }
  iframe.interactive {
    width: 100%;
    height: 420px;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #fff;
  }
  .quiz option, .quiz label {
    display: block;
    margin: 6px 0;
    font-size: 14px;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--panel);
    border-top: 1px solid #334155;
    flex-wrap: wrap;
  }
  footer button {
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid #475569;
    background: #334155;
    color: var(--ink);
    cursor: pointer;
    font-size: 13px;
  }
  footer button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 600;
  }
  footer button:disabled { opacity: 0.45; cursor: not-allowed; }
  .progress {
    flex: 1;
    min-width: 120px;
    height: 6px;
    background: #334155;
    border-radius: 3px;
    overflow: hidden;
  }
  .progress > i {
    display: block;
    height: 100%;
    background: var(--accent);
    width: 0%;
    transition: width .2s;
  }
  .err {
    background: #450a0a;
    border: 1px solid var(--err);
    color: #fecaca;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    white-space: pre-wrap;
  }
  .audio-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  audio { width: min(420px, 100%); }
  .transcript {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
    white-space: pre-wrap;
    margin-top: 8px;
  }
</style>
</head>
<body>
<header>
  <h1 id="course-title">${escapeHtml(courseTitle || 'Classroom')}</h1>
  <span class="badge">离线播放</span>
  <span class="badge" style="background:#334155;color:#94a3b8">Powered by playclass</span>
  <span class="badge" id="load-status">加载中…</span>
</header>
<main>
  <nav id="scene-list" aria-label="Scenes"></nav>
  <section class="player">
    <div id="error-box" class="err" hidden></div>
    <div class="card" id="scene-card">
      <div class="type-chip" id="scene-type"></div>
      <h2 id="scene-title"></h2>
      <div class="muted" id="scene-body"></div>
      <div id="scene-interactive"></div>
      <div id="scene-quiz" class="quiz"></div>
      <div id="scene-audio"></div>
    </div>
  </section>
</main>
<footer>
  <button type="button" id="btn-prev">‹ 上一页</button>
  <div class="progress"><i id="progress-bar"></i></div>
  <span class="muted" id="page-label">—</span>
  <button type="button" id="btn-next" class="primary">下一页 ›</button>
  <button type="button" id="btn-play-audio">▶ 旁白</button>
</footer>
<script>
(function () {
  const TITLE = ${safeTitle};
  const state = { manifest: null, index: 0, audio: null };

  function el(id) { return document.getElementById(id); }
  function showError(message) {
    const box = el('error-box');
    box.hidden = false;
    box.textContent = message;
    el('load-status').textContent = '出错';
    el('load-status').style.background = '#7f1d1d';
  }

  function mediaUrl(ref) {
    const entry = state.manifest.mediaIndex && state.manifest.mediaIndex[ref];
    if (!entry) return null;
    // Prefer the path stored alongside the ZIP export naming.
    if (entry.path) return entry.path;
    return null;
  }

  function findAudioPathForAction(action) {
    if (!action || !action.audioRef) return null;
    // Export writes audioRef as the ZIP-relative path (e.g. audio/0.mp3).
    if (/\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(action.audioRef) || action.audioRef.indexOf('/') >= 0) {
      return action.audioRef;
    }
    const entry = state.manifest.mediaIndex && state.manifest.mediaIndex[action.audioRef];
    if (entry) {
      if (entry.zipPath) return entry.zipPath;
      if (entry.path) return entry.path;
    }
    return action.audioRef;
  }

  function renderNav() {
    const nav = el('scene-list');
    nav.innerHTML = '';
    state.manifest.scenes.forEach(function (scene, i) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = (i + 1) + '. ' + (scene.title || scene.type || 'Scene');
      if (i === state.index) btn.classList.add('active');
      btn.addEventListener('click', function () { go(i); });
      nav.appendChild(btn);
    });
  }

  function stopAudio() {
    if (state.audio) {
      try { state.audio.pause(); } catch (e) {}
      state.audio = null;
    }
    el('scene-audio').innerHTML = '';
  }

  function playNarration(scene) {
    const actions = scene.actions || [];
    const speech = actions.filter(function (a) { return a && a.type === 'speech'; });
    const texts = speech.map(function (a) { return a.text; }).filter(Boolean);
    const wrap = el('scene-audio');
    wrap.innerHTML = '';
    if (texts.length) {
      const t = document.createElement('div');
      t.className = 'transcript';
      t.textContent = texts.join('\\n');
      wrap.appendChild(t);
    }
    const audioPaths = speech.map(findAudioPathForAction).filter(Boolean);
    if (!audioPaths.length) return;
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';
    const sources = audioPaths;
    let idx = 0;
    function attach(i) {
      if (i >= sources.length) return;
      audio.src = sources[i];
      audio.onended = function () {
        idx += 1;
        if (idx < sources.length) {
          audio.src = sources[idx];
          audio.play().catch(function () {});
        }
      };
    }
    attach(0);
    const row = document.createElement('div');
    row.className = 'audio-row';
    row.appendChild(audio);
    wrap.appendChild(row);
    state.audio = audio;
  }

  function renderScene(i) {
    stopAudio();
    const scene = state.manifest.scenes[i];
    if (!scene) return;
    el('scene-type').textContent = scene.type || 'slide';
    el('scene-title').textContent = scene.title || '';
    el('page-label').textContent = (i + 1) + ' / ' + state.manifest.scenes.length;
    el('progress-bar').style.width = Math.round(((i + 1) / state.manifest.scenes.length) * 100) + '%';
    el('btn-prev').disabled = i <= 0;
    el('btn-next').disabled = i >= state.manifest.scenes.length - 1;

    const body = el('scene-body');
    const inter = el('scene-interactive');
    const quiz = el('scene-quiz');
    body.innerHTML = '';
    inter.innerHTML = '';
    quiz.innerHTML = '';

    const content = scene.content || {};
    if (content.type === 'interactive' && content.html) {
      const frame = document.createElement('iframe');
      frame.className = 'interactive';
      frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
      frame.srcdoc = content.html;
      inter.appendChild(frame);
    } else if (content.type === 'quiz' && (content.questions || content.question)) {
      const questions = content.questions || [content];
      questions.forEach(function (q, qi) {
        const box = document.createElement('div');
        box.style.margin = '12px 0';
        const qTitle = document.createElement('div');
        qTitle.style.fontWeight = '600';
        qTitle.style.marginBottom = '6px';
        qTitle.textContent = (q.prompt || q.question || q.title || ('Q' + (qi + 1)));
        box.appendChild(qTitle);
        const opts = q.options || q.choices || [];
        opts.forEach(function (opt) {
          const label = document.createElement('label');
          const input = document.createElement('input');
          input.type = q.multi ? 'checkbox' : 'radio';
          input.name = 'q' + qi;
          const text = typeof opt === 'string' ? opt : (opt.text || opt.label || String(opt));
          label.appendChild(input);
          label.appendChild(document.createTextNode(' ' + text));
          box.appendChild(label);
        });
        quiz.appendChild(box);
      });
    } else {
      // slide / pbl / default text body
      const text =
        content.text ||
        content.description ||
        content.summary ||
        (Array.isArray(content.bullets) ? content.bullets.join('\\n') : '') ||
        scene.title ||
        '';
      body.textContent = text;
      if (content.html && content.type !== 'interactive') {
        const holder = document.createElement('div');
        holder.innerHTML = content.html;
        body.appendChild(holder);
      }
    }
    playNarration(scene);
    renderNav();
  }

  function go(i) {
    if (!state.manifest) return;
    state.index = Math.max(0, Math.min(state.manifest.scenes.length - 1, i));
    renderScene(state.index);
  }

  async function boot() {
    try {
      const res = await fetch('manifest.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('无法读取 manifest.json（HTTP ' + res.status + '）');
      const manifest = await res.json();
      if (!manifest || !Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
        throw new Error('manifest.json 中没有 scenes');
      }
      state.manifest = manifest;
      if (manifest.stage && manifest.stage.name) {
        document.title = manifest.stage.name + ' · 离线课堂';
        el('course-title').textContent = manifest.stage.name;
      }
      el('load-status').textContent = manifest.scenes.length + ' 节';
      go(0);
    } catch (err) {
      showError(
        '离线播放器启动失败：\\n' + (err && err.message ? err.message : String(err)) +
        '\\n\\n请确认本页与 manifest.json、media/、audio/ 在同一文件夹内，并用本地文件直接打开。'
      );
    }
  }

  el('btn-prev').addEventListener('click', function () { go(state.index - 1); });
  el('btn-next').addEventListener('click', function () { go(state.index + 1); });
  el('btn-play-audio').addEventListener('click', function () {
    if (state.audio) {
      state.audio.play().catch(function () {});
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(state.index + 1);
    if (e.key === 'ArrowLeft') go(state.index - 1);
  });

  boot();
})();
</script>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const OFFLINE_PLAYER_README = `playclass 离线课堂
==================

双击 index.html 即可离线播放（无需安装、无需联网）。

目录结构：
  index.html      离线播放器
  manifest.json   课程数据
  media/          图片与生成媒体
  audio/          旁白音频

提示：
- 请保持文件夹结构完整，不要单独拷贝 index.html
- 用 Chrome / Edge / Safari 打开体验最佳
- 互动页在浏览器沙箱中运行；若无法点击，说明该页脚本有误，可回应用内重新生成
`;
