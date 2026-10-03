/**
 * JXR Template Explorer — the dev-only overlay UI.
 *
 * Kept in its own module (rather than inline in the server) so the large client
 * script is easy to read and review. `buildExplorerScript()` returns a
 * `<script>` document containing:
 *   • a floating gear button + ⌘K / Ctrl-K / H shortcut
 *   • a centered search field pinned top-of-panel
 *   • a horizontal carousel of EVERY official template (accent dot, name, tags
 *     and a Live/Source badge), with kind filter chips
 *   • a stage that renders a sandboxed live preview (iframe → /__jxr/preview/<id>)
 *     for web-renderable templates, or a file-tree + source view for the rest
 *   • Apply routed through POST /__jxr/apply-template (backup + confirmation)
 *
 * CRITICAL: the returned string is inlined by JXRServerManager.generateHTML()
 * into a JS template literal, so the emitted code MUST NOT contain backticks or
 * the two-character sequence "dollar-brace". Use single-quoted strings and
 * string concatenation only.
 */
export function buildExplorerScript(): string {
  return `
<script>
(function () {
  if (window.__JXR_OVERLAY__) return;
  window.__JXR_OVERLAY__ = true;

  var CONFIRM =
    'Are you sure you want to choose this template? This action is permanent and you will need to run jxr init to start a fresh project if you decide to change templates later.';

  var host = document.createElement('div');
  host.setAttribute('data-jxr-overlay', '');
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent =
    ':host{all:initial}' +
    '.wrap{font-family:Inter,system-ui,-apple-system,sans-serif}' +
    '.wrap *{box-sizing:border-box}' +
    '.gear{position:fixed;right:20px;bottom:20px;width:46px;height:46px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(145deg,#1b1b22,#0c0c11);color:#f5f3ff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px rgba(0,0,0,.45);transition:transform .18s ease,box-shadow .18s ease;z-index:2147483001}' +
    '.gear:hover{transform:translateY(-1px) rotate(28deg);box-shadow:0 16px 38px rgba(0,0,0,.55)}' +
    '.gear svg{width:22px;height:22px}' +
    '.scrim{position:fixed;inset:0;background:rgba(6,6,10,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:2147483000}' +
    '.scrim.open{display:flex}' +
    '.panel{width:min(1120px,94vw);height:min(88vh,860px);display:flex;flex-direction:column;border-radius:20px;border:1px solid rgba(255,255,255,.12);background:#0d0d12;color:#e7e7ee;box-shadow:0 40px 100px rgba(0,0,0,.65);overflow:hidden}' +
    '.top{padding:18px 18px 10px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.search{display:flex;align-items:center;gap:10px;max-width:640px;margin:0 auto;background:#15151c;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px}' +
    '.search input{flex:1;background:transparent;border:0;outline:0;color:#fff;font-size:15px}' +
    '.search svg{width:18px;height:18px;color:#8b8b99;flex:none}' +
    '.kbd{font:11px/1.4 ui-monospace,JetBrains Mono,monospace;color:#9ca3af;border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:2px 6px}' +
    '.chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 8px}' +
    '.chip{font-size:12px;color:#c7c7d1;background:transparent;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:4px 12px;cursor:pointer}' +
    '.chip.on{background:rgba(168,85,247,.18);border-color:rgba(168,85,247,.5);color:#fff}' +
    '.strip{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 8px}' +
    '.card{flex:none;min-width:190px;text-align:left;display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:#12121a;color:inherit;cursor:pointer;transition:border-color .15s ease,transform .15s ease}' +
    '.card:hover{transform:translateY(-1px)}' +
    '.card.on{border-color:rgba(168,85,247,.65);box-shadow:0 0 0 1px rgba(168,85,247,.35)}' +
    '.r1{display:flex;align-items:center;gap:8px}' +
    '.cdot{width:9px;height:9px;border-radius:999px;flex:none}' +
    '.cname{font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.cmeta{font:11px/1.4 ui-monospace,monospace;color:#8b8b99;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.badge{font:10px/1 ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;padding:3px 6px;border-radius:6px;border:1px solid rgba(255,255,255,.14);color:#c7c7d1}' +
    '.badge.live{color:#34d399;border-color:rgba(52,211,153,.4)}' +
    '.badge.src{color:#fbbf24;border-color:rgba(251,191,36,.4)}' +
    '.stage{flex:1;display:flex;flex-direction:column;min-height:0}' +
    '.stagehead{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.07)}' +
    '.stagehead .txt{flex:1;min-width:0}' +
    '.stagehead h3{margin:0 0 4px;font-size:16px;color:#fff}' +
    '.stagehead p{margin:0;color:#9ca3af;font-size:12.5px;line-height:1.5}' +
    '.stagehead .tags{display:block;margin-top:6px;color:#6b7280;font:11px/1.4 ui-monospace,monospace}' +
    '.acts{display:flex;gap:8px;align-items:center;flex:none}' +
    '.btn{border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e7e7ee;white-space:nowrap}' +
    '.btn.primary{background:linear-gradient(145deg,#7c3aed,#a855f7);border-color:transparent;color:#fff}' +
    '.btn.ghost:hover{background:rgba(255,255,255,.06)}' +
    '.note{margin:12px 18px;padding:10px 12px;border-radius:10px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.08);color:#fcd34d;font-size:12.5px;line-height:1.5}' +
    '.frame{flex:1;min-height:0;margin:12px 18px 16px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#fff}' +
    '.frame iframe{width:100%;height:100%;border:0;display:block;background:#fff}' +
    '.srclay{flex:1;min-height:0;display:flex;margin:12px 18px 16px;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;background:#0a0a0f}' +
    '.tree{width:230px;flex:none;border-right:1px solid rgba(255,255,255,.08);overflow:auto;padding:10px}' +
    '.tfile{display:block;width:100%;text-align:left;background:transparent;border:0;color:#c7c7d1;font:12px/1.5 ui-monospace,monospace;padding:6px 8px;border-radius:8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tfile:hover{background:rgba(255,255,255,.06)}' +
    '.tfile.on{background:rgba(168,85,247,.18);color:#fff}' +
    '.code{flex:1;min-width:0;margin:0;overflow:auto;padding:16px;color:#d4d4e0;font:12.5px/1.65 ui-monospace,JetBrains Mono,monospace;white-space:pre}' +
    '.foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;border-top:1px solid rgba(255,255,255,.08);color:#9ca3af;font-size:12px}' +
    '.tools{display:flex;gap:8px}' +
    '.tool{background:transparent;border:1px solid rgba(255,255,255,.14);color:#c7c7d1;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer}' +
    '.tool:hover{background:rgba(255,255,255,.06)}' +
    '.confirm{padding:22px}' +
    '.confirm h3{margin:0 0 8px;font-size:16px;color:#fff}' +
    '.confirm p{margin:0 0 12px;color:#c7c7d1;font-size:13.5px;line-height:1.6}' +
    '.confirm .warn{color:#fbbf24}' +
    '.row{display:flex;gap:10px;justify-content:flex-end}' +
    '.status{padding:18px;color:#c7c7d1;font-size:13px}';
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML =
    '<button class="gear" title="JXR Template Explorer (press H)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1z"/></svg>' +
    '</button>' +
    '<div class="scrim"><div class="panel" role="dialog" aria-label="JXR Template Explorer"></div></div>';
  root.appendChild(wrap);

  var gear = wrap.querySelector('.gear');
  var scrim = wrap.querySelector('.scrim');
  var panel = wrap.querySelector('.panel');
  var input, chipsEl, stripEl, stageEl;

  var catalog = [];
  var filter = 'all';
  var query = '';
  var selectedId = null;
  var sourcePick = {};
  var loading = false;

  var CHIPS = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live preview' },
    { id: 'web', label: 'Web' },
    { id: 'worker', label: 'Worker' },
    { id: 'vanilla', label: 'Vanilla' },
    { id: 'native', label: 'Native' }
  ];

  function shell() {
    panel.innerHTML =
      '<div class="top">' +
        '<div class="search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
          '<input placeholder="Search templates by name, tag or feature..." aria-label="Search templates" />' +
          '<span class="kbd">esc</span>' +
        '</div>' +
        '<div class="chips"></div>' +
        '<div class="strip"></div>' +
      '</div>' +
      '<div class="stage"></div>' +
      '<div class="foot"><span class="hint">Pick a template to preview it, then Apply.</span>' +
        '<span class="tools">' +
          '<button class="tool" data-tool="docs">Docs</button>' +
          '<button class="tool" data-tool="support">Support</button>' +
          '<button class="tool" data-tool="install">Copy install</button>' +
          '<button class="tool" data-tool="hide">Hide overlay</button>' +
        '</span></div>';
    input = panel.querySelector('input');
    chipsEl = panel.querySelector('.chips');
    stripEl = panel.querySelector('.strip');
    stageEl = panel.querySelector('.stage');
    input.value = query;
    input.addEventListener('input', function () { query = input.value; renderStrip(); });
    input.addEventListener('keydown', onInputKey);
    panel.querySelector('[data-tool="docs"]').addEventListener('click', function () { window.open('https://github.com/jxrgameshub/jxr-js#readme', '_blank'); });
    panel.querySelector('[data-tool="support"]').addEventListener('click', function () { window.open('https://t.me/JGoatzTV', '_blank'); });
    panel.querySelector('[data-tool="install"]').addEventListener('click', function () { try { navigator.clipboard.writeText('pnpm add -g @jxrstudios/jxr'); } catch (e) {} });
    panel.querySelector('[data-tool="hide"]').addEventListener('click', function () { host.remove(); });
    renderChips();
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    CHIPS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (filter === c.id ? ' on' : '');
      b.textContent = c.label;
      b.addEventListener('click', function () { filter = c.id; renderChips(); renderStrip(); });
      chipsEl.appendChild(b);
    });
  }

  function filtered() {
    var q = query.trim().toLowerCase();
    return catalog.filter(function (t) {
      if (filter === 'live' && !t.livePreview) return false;
      if (filter !== 'all' && filter !== 'live' && t.kind !== filter) return false;
      if (!q) return true;
      var hay = (t.name + ' ' + t.description + ' ' + (t.tags || []).join(' ')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function renderStrip() {
    stripEl.innerHTML = '';
    var list = filtered();
    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'cmeta';
      empty.style.padding = '10px';
      empty.textContent = loading ? 'Loading templates...' : 'No templates match.';
      stripEl.appendChild(empty);
      stageEl.innerHTML = '<div class="status">' + (loading ? 'Loading templates...' : 'No templates match your search.') + '</div>';
      return;
    }
    if (!selectedId || !list.some(function (t) { return t.id === selectedId; })) {
      selectedId = list[0].id;
    }
    list.forEach(function (t) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'card' + (t.id === selectedId ? ' on' : '');
      card.innerHTML =
        '<span class="r1"><span class="cdot"></span><span class="cname"></span></span>' +
        '<span class="cmeta"></span>' +
        '<span class="r1"><span class="badge ' + (t.livePreview ? 'live' : 'src') + '"></span><span class="badge"></span></span>';
      card.querySelector('.cdot').style.background = t.accent;
      card.querySelector('.cname').textContent = t.name;
      card.querySelector('.cmeta').textContent = (t.tags || []).slice(0, 2).join(' / ');
      card.querySelectorAll('.badge')[0].textContent = t.livePreview ? 'Live' : 'Source';
      card.querySelectorAll('.badge')[1].textContent = t.kind;
      card.addEventListener('click', function () { selectedId = t.id; renderStrip(); });
      stripEl.appendChild(card);
    });
    var active = stripEl.querySelector('.card.on');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    renderStage();
  }

  function onInputKey(e) {
    var list = filtered();
    if (!list.length) return;
    var idx = 0;
    for (var i = 0; i < list.length; i++) { if (list[i].id === selectedId) { idx = i; break; } }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      selectedId = list[Math.min(idx + 1, list.length - 1)].id;
      renderStrip();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      selectedId = list[Math.max(idx - 1, 0)].id;
      renderStrip();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      confirmApply(list[idx]);
    }
  }

  function find(id) {
    for (var i = 0; i < catalog.length; i++) { if (catalog[i].id === id) return catalog[i]; }
    return null;
  }

  function renderStage() {
    var t = find(selectedId);
    stageEl.innerHTML = '';
    if (!t) {
      stageEl.innerHTML = '<div class="status">Select a template above to preview it.</div>';
      return;
    }

    var head = document.createElement('div');
    head.className = 'stagehead';
    head.innerHTML =
      '<div class="txt"><h3></h3><p></p><span class="tags"></span></div><div class="acts"></div>';
    head.querySelector('h3').textContent = t.name;
    head.querySelector('p').textContent = t.description;
    head.querySelector('.tags').textContent = (t.tags || []).join('  ·  ');

    var acts = head.querySelector('.acts');
    if (t.livePreview) {
      var reloadBtn = document.createElement('button');
      reloadBtn.type = 'button';
      reloadBtn.className = 'btn ghost';
      reloadBtn.textContent = 'Reload';
      reloadBtn.addEventListener('click', function () { renderStage(); });
      acts.appendChild(reloadBtn);

      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn ghost';
      openBtn.textContent = 'Open in new tab';
      openBtn.addEventListener('click', function () { window.open('/__jxr/preview/' + t.id, '_blank'); });
      acts.appendChild(openBtn);
    }
    var applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'btn primary';
    applyBtn.textContent = 'Apply this template';
    applyBtn.addEventListener('click', function () { confirmApply(t); });
    acts.appendChild(applyBtn);
    stageEl.appendChild(head);

    if (t.livePreview) {
      var frame = document.createElement('div');
      frame.className = 'frame';
      var iframe = document.createElement('iframe');
      iframe.setAttribute('title', 'Preview of ' + t.name);
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals');
      iframe.src = '/__jxr/preview/' + t.id;
      frame.appendChild(iframe);
      stageEl.appendChild(frame);
    } else {
      var note = document.createElement('div');
      note.className = 'note';
      note.textContent = 'Source preview — ' + (t.previewNote || 'This template is not a web drop-in and cannot be rendered live.');
      stageEl.appendChild(note);

      var files = (t.files || []).slice().sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
      var lay = document.createElement('div');
      lay.className = 'srclay';
      var tree = document.createElement('div');
      tree.className = 'tree';
      var pre = document.createElement('pre');
      pre.className = 'code';

      var entryName = (t.entry || '').replace(/^src\\//, '');
      function defaultFile() {
        if (sourcePick[t.id] && files.some(function (f) { return f.path === sourcePick[t.id]; })) return sourcePick[t.id];
        if (files.some(function (f) { return f.path === entryName; })) return entryName;
        var code = files.filter(function (f) { return /\\.(tsx|ts|jsx|js)$/.test(f.path); });
        return code.length ? code[0].path : (files.length ? files[0].path : null);
      }
      function showFile(path) {
        sourcePick[t.id] = path;
        var f = null;
        for (var i = 0; i < files.length; i++) { if (files[i].path === path) { f = files[i]; break; } }
        pre.textContent = f ? f.content : '// (empty)';
        var btns = tree.querySelectorAll('.tfile');
        for (var j = 0; j < btns.length; j++) { btns[j].className = 'tfile' + (btns[j].getAttribute('data-path') === path ? ' on' : ''); }
      }
      if (!files.length) {
        pre.textContent = '// No source files found for this template.';
      } else {
        files.forEach(function (f) {
          var fb = document.createElement('button');
          fb.type = 'button';
          fb.className = 'tfile';
          fb.setAttribute('data-path', f.path);
          fb.textContent = f.path;
          fb.addEventListener('click', function () { showFile(f.path); });
          tree.appendChild(fb);
        });
      }
      lay.appendChild(tree);
      lay.appendChild(pre);
      stageEl.appendChild(lay);
      if (files.length) showFile(defaultFile());
    }
  }

  function confirmApply(t) {
    if (!t) return;
    panel.innerHTML =
      '<div class="confirm">' +
        '<h3>Choose "' + t.name + '"?</h3>' +
        '<p>' + CONFIRM + '</p>' +
        '<p class="warn">Your current src/ is backed up to .jxr/backup-&lt;timestamp&gt;/ first.</p>' +
        '<div class="row"><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-apply>Choose this template</button></div>' +
      '</div>';
    panel.querySelector('[data-cancel]').addEventListener('click', function () {
      shell();
      renderStrip();
      input.focus();
    });
    panel.querySelector('[data-apply]').addEventListener('click', function () { apply(t); });
  }

  function apply(t) {
    panel.innerHTML = '<div class="status">Applying "' + t.name + '"...</div>';
    fetch('/__jxr/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) {
          panel.innerHTML = '<div class="status">Failed: ' + ((res && res.error) || 'unknown error') + '</div>';
          return;
        }
        panel.innerHTML = '<div class="status">Applied "' + t.name + '". Reloading...</div>';
        setTimeout(function () { location.reload(); }, 500);
      })
      .catch(function (err) {
        panel.innerHTML = '<div class="status">Failed: ' + err + '</div>';
      });
  }

  function load() {
    loading = true;
    fetch('/__jxr/templates')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        catalog = (res && res.templates) ? res.templates : [];
        loading = false;
        renderStrip();
      })
      .catch(function () { loading = false; renderStrip(); });
  }

  function open() { scrim.classList.add('open'); shell(); renderStrip(); load(); input.focus(); }
  function close() { scrim.classList.remove('open'); }
  function toggle() { scrim.classList.contains('open') ? close() : open(); }

  gear.addEventListener('click', toggle);
  scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
  document.addEventListener('keydown', function (e) {
    var typing = /input|textarea/i.test((document.activeElement && document.activeElement.tagName) || '');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && scrim.classList.contains('open')) close();
    else if (!typing && (e.key === 'h' || e.key === 'H') && !scrim.classList.contains('open')) {
      // preventDefault stops the "h" keystroke from also being typed into the
      // search box we focus on the next line (which would silently filter the
      // carousel down to only templates containing the letter "h").
      e.preventDefault();
      toggle();
    }
  });
})();
</script>`;
}
