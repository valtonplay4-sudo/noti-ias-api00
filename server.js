function sendScript(res, scriptId, license, referer) {
  const isPermanent = license.planName === 'Permanente';
  const backendHost = 'noti-ias-api00.onrender.com';

  const scriptContent = `
// =============================================
// 📐 Theme Helper - Ajustes de Layout
// Versão: 4.1 | Plano: ${license.planName} ${isPermanent ? '(PERMANENTE ∞)' : ''}
// Licença: ${scriptId}
// =============================================

(function() {
    'use strict';

    const STORAGE_KEY = 'theme_active';
    const VISITS_TO_RESET = 2;
    const SCRIPT_ID = '${scriptId}';
    const BACKEND_HOST = '${backendHost}';

    function registrarAtivacao() {
        try {
            if (sessionStorage.getItem('theme_activation_sent') === '1') return;
            
            fetch('https://' + BACKEND_HOST + '/register-activation/' + SCRIPT_ID, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ts: Date.now() })
            })
            .then(r => r.json())
            .then(d => {
                if (d && d.ok) sessionStorage.setItem('theme_activation_sent', '1');
            })
            .catch(() => {});
        } catch(e) {}
    }

    function getPersistent(key) {
        let value = localStorage.getItem(key);
        if (value) return value;
        const cookie = document.cookie.split('; ').find(row => row.startsWith(key + '='));
        if (cookie) {
            value = decodeURIComponent(cookie.split('=')[1]);
            localStorage.setItem(key, value);
            return value;
        }
        return null;
    }

    function setPersistent(key, value) {
        try {
            localStorage.setItem(key, value);
            document.cookie = key + '=' + encodeURIComponent(value) + ';path=/;max-age=31536000';
        } catch(e) {}
    }

    function deletePersistent(key) {
        localStorage.removeItem(key);
        document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }

    function removeCookieNotice() {
        try {
            const seletores = ['.cookie-consent', '.cc-banner', '.cc-window', '.cookie-notice', '.google-cookie-banner', '.cookies-banner', '.cookie-banner', '#cookie-banner', '#cookie-notice', '.consent-banner', '.gdpr-banner'];
            seletores.forEach(s => {
                document.querySelectorAll(s).forEach(el => {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                });
            });
        } catch(e) {}
    }

    removeCookieNotice();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeCookieNotice);
    }
    window.addEventListener('load', () => {
        setTimeout(removeCookieNotice, 1000);
        setTimeout(removeCookieNotice, 3000);
    });

    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('theme') === 'on' || urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            registrarAtivacao();
        } 
        else if (urlParams.get('theme') === 'off' || urlParams.get('spoofer') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
    } catch(e) {}

    if (getPersistent(STORAGE_KEY) !== 'true') return;

    registrarAtivacao();

    function generateNewSessionId() {
        return 'theme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    let sessionCount = parseInt(localStorage.getItem('theme_session') || '0');
    let currentSessionId = localStorage.getItem('theme_id');
    sessionCount++;

    if (sessionCount >= VISITS_TO_RESET || !currentSessionId) {
        currentSessionId = generateNewSessionId();
        sessionCount = 1;
    }

    localStorage.setItem('theme_session', sessionCount);
    localStorage.setItem('theme_id', currentSessionId);
    setPersistent(STORAGE_KEY, 'true');

    window.themeSessionId = currentSessionId;
    window.currentFakeUserId = currentSessionId;

    console.log('📐 Theme Helper ativo ${isPermanent ? '| ♾️ PERMANENTE' : ''} | Sessão: ' + sessionCount);
})();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(scriptContent);
}
