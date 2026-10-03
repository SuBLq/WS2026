(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  let registrationPromise, refreshQueued = false;
  function showUpdate(worker) {
    if (document.getElementById('siteUpdate')) return;
    const box = document.createElement('div'); box.id = 'siteUpdate'; box.className = 'site-update'; box.setAttribute('role', 'status');
    const label = document.createElement('span'); label.textContent = 'Есть обновление справочника';
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Обновить';
    button.onclick = () => { refreshQueued = true; worker.postMessage({ type: 'ACTIVATE' }); };
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Обновить позже'); dismiss.onclick = () => box.remove();
    box.append(label, button, dismiss); document.body.append(box);
  }
  function register() {
    if (!registrationPromise) registrationPromise = navigator.serviceWorker.register(document.body.dataset.root + 'sw.js', { updateViaCache: 'none' }).then(reg => {
      if (reg.waiting) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller && reg.waiting) showUpdate(reg.waiting); });
      }); return reg;
    }); return registrationPromise;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (refreshQueued) location.reload(); });
  if (document.readyState === 'complete') register().catch(() => {}); else addEventListener('load', () => register().catch(() => {}), { once: true });
  document.querySelectorAll('[data-offline-save]').forEach(button => button.addEventListener('click', async () => {
    const original = button.textContent; button.disabled = true; button.textContent = 'Сохраняем…';
    try {
      await register(); const reg = await navigator.serviceWorker.ready, channel = new MessageChannel();
      const reply = new Promise((resolve, reject) => {
        const timer = setTimeout(() => { channel.port1.close(); reject(new Error('timeout')); }, 45000);
        channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); event.data.ok ? resolve(event.data) : reject(new Error(event.data.error)); };
      });
      // Only page resources are sent; no user profile or private storage is transmitted.
      const resources = [...document.querySelectorAll('link[rel="stylesheet"],script[src],img[src]')].map(node => node.href || node.src);
      for (const image of document.querySelectorAll('img[srcset]')) {
        for (const candidate of image.srcset.split(',')) resources.push(new URL(candidate.trim().split(/\s+/)[0], location.href).href);
      }
      resources.push(...[...document.querySelectorAll('[data-canyon-zoom]')].map(link => link.href));
      resources.push(new URL(document.body.dataset.searchIndex, location.href).href);
      reg.active.postMessage({ type: 'SAVE_PAGE', url: location.href.split('#')[0], resources }, [channel.port2]);
      await reply; button.textContent = '✓ Доступно офлайн'; window.WOS.notify?.('Гайд и его изображения сохранены на устройстве');
    } catch (_) { button.textContent = original; window.WOS.notify?.('Не удалось сохранить весь гайд. Проверьте соединение и свободное место.'); }
    finally { button.disabled = false; }
  }));
})();
