// ==================== BACKEND SEGURO v5.0 — BLOQUEIO DEFINITIVO ====================
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

// ==================== DURAÇÃO DOS PLANOS ====================
const PLAN_DURATIONS = {
  'Grátis': 600,          // 10 minutos
  'Diário': 86400,        // 24 horas
  'Semanal': 604800,      // 7 dias
  'Mensal': 2592000,      // 30 dias
  'Permanente': Infinity  // NUNCA EXPIRA
};

// ==================== HEALTH ====================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Theme Helper</title></head>
    <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
      <div style="text-align:center;">
        <h2>📐 Theme Helper</h2>
        <p style="color:#10b981;">✅ Online v5.0</p>
        <p style="color:#94a3b8;font-size:14px;">Bloqueio Total + Cache-Buster</p>
      </div>
    </body></html>
  `);
});

// ==================== 🔥 FUNÇÃO CENTRAL DE VALIDAÇÃO ====================
async function validarLicenca(scriptId, referer) {
  if (!scriptId) return { valid: false, reason: 'no_id' };

  let license;
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    license = response.data;
  } catch (e) {
    return { valid: false, reason: 'db_error' };
  }

  if (!license) return { valid: false, reason: 'not_found' };

  // 🔥 1. Ativa?
  if (license.active !== true) {
    return { valid: false, reason: license.revogadaEm ? 'revoked' : 'inactive' };
  }

  // 🔥 2. Revogada explicitamente?
  if (license.revogadaEm) {
    return { valid: false, reason: 'revoked' };
  }

  // 🔥 3. Expirou explicitamente?
  if (license.expiredAt) {
    return { valid: false, reason: 'expired_explicit' };
  }

  // 🔥 4. Plano válido?
  const duration = PLAN_DURATIONS[license.planName];
  if (!duration) {
    return { valid: false, reason: 'invalid_plan' };
  }

  // 🔥 5. Expiração por tempo (exceto Permanente)
  if (duration !== Infinity) {
    const startTime = license.spooferActivatedAt
      ? new Date(license.spooferActivatedAt).getTime()
      : new Date(license.createdAt).getTime();

    if (isNaN(startTime)) {
      return { valid: false, reason: 'invalid_dates' };
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = duration - elapsed;

    if (remaining <= 0) {
      try {
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          active: false,
          expiredAt: new Date().toISOString(),
          reason: `Expirado automaticamente (${license.planName})`
        });
      } catch (e) {}
      return { valid: false, reason: 'expired', remaining: 0 };
    }

    // 🔥 6. Domínio autorizado (multi-domínio)
    if (referer) {
      const cleanReferer = extrairDominioSeguro(referer);
      const dominiosAutorizados = [];

      if (Array.isArray(license.domains)) {
        license.domains.forEach(d => dominiosAutorizados.push(extrairDominioSeguro(d)));
      }
      if (license.domain) {
        dominiosAutorizados.push(extrairDominioSeguro(license.domain));
      }

      if (dominiosAutorizados.length > 0) {
        const autorizado = dominiosAutorizados.some(dom => compararDominios(cleanReferer, dom));
        if (!autorizado) {
          return { valid: false, reason: 'domain_not_allowed' };
        }
      }
    }

    return { valid: true, license, remaining: Math.floor(remaining) };
  }

  // Permanente: só valida domínio
  if (referer) {
    const cleanReferer = extrairDominioSeguro(referer);
    const dominiosAutorizados = [];

    if (Array.isArray(license.domains)) {
      license.domains.forEach(d => dominiosAutorizados.push(extrairDominioSeguro(d)));
    }
    if (license.domain) {
      dominiosAutorizados.push(extrairDominioSeguro(license.domain));
    }

    if (dominiosAutorizados.length > 0) {
      const autorizado = dominiosAutorizados.some(dom => compararDominios(cleanReferer, dom));
      if (!autorizado) {
        return { valid: false, reason: 'domain_not_allowed' };
      }
    }
  }

  return { valid: true, license, remaining: null };
}

// ==================== 🔥 ENDPOINT DE VALIDAÇÃO (HEARTBEAT) ====================
app.get('/api/validate/:scriptId', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  const result = await validarLicenca(scriptId, referer);

  if (result.valid) {
    res.json({
      valid: true,
      planName: result.license.planName,
      remaining: result.remaining,
      serverTime: Date.now()
    });
  } else {
    res.json({
      valid: false,
      reason: result.reason,
      serverTime: Date.now()
    });
  }
});

// ==================== ROTAS DO SCRIPT ====================
app.get('/js/theme-adjust.js', handleScript);
app.get('/js/layout-helper.js', handleScript);
app.get('/js/responsive-fix.js', handleScript);

app.get('/script/:scriptId.js', async (req, res) => {
  await handleScriptInternal(req, res, req.params.scriptId);
});

// ==================== HANDLE SCRIPT ====================
async function handleScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let scriptId = req.query.id;
  const referer = req.get('Referer') || req.get('Origin') || '';

  if (!scriptId && referer) {
    scriptId = await buscarLicencaPorDominio(referer);
  }

  await handleScriptInternal(req, res, scriptId);
}

async function handleScriptInternal(req, res, scriptId) {
  const referer = req.get('Referer') || req.get('Origin') || '';
  const result = await validarLicenca(scriptId, referer);

  if (!result.valid) {
    console.log(`⛔ [${scriptId}] BLOQUEADO: ${result.reason}`);
    return sendBlockedScript(res, result.reason);
  }

  console.log(`✅ [${scriptId}] Script entregue. Plano: ${result.license.planName}`);
  return sendScript(res, scriptId, result.license, referer);
}

// ==================== CRON: EXPIRAÇÃO AUTOMÁTICA ====================
async function verificarExpiracaoGlobal() {
  try {
    console.log('🔍 [CRON] Verificando expirações...');

    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;

    if (!licenses) return;

    let verificadas = 0, expiradas = 0;
    const updates = {};

    for (const [scriptId, license] of Object.entries(licenses)) {
      verificadas++;

      if (license.active !== true) continue;
      if (license.planName === 'Permanente') continue;

      const duration = PLAN_DURATIONS[license.planName];
      if (!duration || duration === Infinity) continue;

      const startTime = license.spooferActivatedAt
        ? new Date(license.spooferActivatedAt).getTime()
        : new Date(license.createdAt).getTime();

      if (isNaN(startTime)) continue;

      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        console.log(`⏰ [CRON] ${scriptId} EXPIROU (${license.planName})`);
        updates[`${scriptId}/active`] = false;
        updates[`${scriptId}/expiredAt`] = new Date().toISOString();
        updates[`${scriptId}/reason`] = `Expiração automática CRON (${license.planName})`;
        expiradas++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);
    }

    console.log(`✅ [CRON] ${verificadas} verificadas, ${expiradas} expiradas`);
  } catch (error) {
    console.error('💥 [CRON] Erro:', error.message);
  }
}

setInterval(verificarExpiracaoGlobal, 60000);
setTimeout(verificarExpiracaoGlobal, 3000);

// ==================== ADMIN ====================
app.post('/admin/revogar-todas', async (req, res) => {
  const { confirmacao } = req.body;
  if (confirmacao !== 'REVOGAR_TODAS_AGORA') {
    return res.status(400).json({ erro: 'Confirmação inválida' });
  }

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    if (!licenses) return res.json({ mensagem: 'Nenhuma licença', total: 0 });

    const updates = {};
    let total = 0;
    const agora = new Date().toISOString();

    for (const scriptId of Object.keys(licenses)) {
      updates[`${scriptId}/active`] = false;
      updates[`${scriptId}/revogadaEm`] = agora;
      updates[`${scriptId}/revogadaMotivo`] = 'Revogação em massa';
      total++;
    }

    await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);
    res.json({ sucesso: true, total, timestamp: agora });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.post('/admin/reativar-todas', async (req, res) => {
  const { confirmacao } = req.body;
  if (confirmacao !== 'REATIVAR_TODAS_AGORA') {
    return res.status(400).json({ erro: 'Confirmação inválida' });
  }

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    if (!licenses) return res.json({ mensagem: 'Nenhuma licença', total: 0 });

    const updates = {};
    let total = 0;
    const agora = new Date().toISOString();

    for (const [scriptId, lic] of Object.entries(licenses)) {
      if (lic.planName === 'Permanente') continue;
      updates[`${scriptId}/active`] = true;
      updates[`${scriptId}/createdAt`] = agora;
      updates[`${scriptId}/spooferActivatedAt`] = null;
      updates[`${scriptId}/expiredAt`] = null;
      updates[`${scriptId}/revogadaEm`] = null;
      updates[`${scriptId}/reativadaEm`] = agora;
      total++;
    }

    await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);
    res.json({ sucesso: true, total, timestamp: agora });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.get('/admin/diagnostico', async (req, res) => {
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    if (!licenses) return res.json({ total: 0, licencas: [] });

    const agora = Date.now();
    const diagnostico = Object.entries(licenses).map(([scriptId, lic]) => {
      const duration = PLAN_DURATIONS[lic.planName] || 0;
      const isPermanente = lic.planName === 'Permanente';

      const startTime = lic.spooferActivatedAt
        ? new Date(lic.spooferActivatedAt).getTime()
        : new Date(lic.createdAt).getTime();

      const elapsed = (agora - startTime) / 1000;
      const remaining = isPermanente ? Infinity : Math.max(0, duration - elapsed);
      const expirada = !isPermanente && remaining <= 0;
      const revogada = !!lic.revogadaEm;
      const deveSerDesativada = lic.active === true && (expirada || revogada);

      return {
        scriptId,
        domain: lic.domain,
        domains: lic.domains || [lic.domain].filter(Boolean),
        plano: lic.planName,
        ativa: lic.active === true,
        revogada,
        expirada,
        duracao: isPermanente ? 'Permanente' : duration + 's',
        decorrido: Math.floor(elapsed) + 's',
        restante: isPermanente ? '∞' : Math.floor(remaining) + 's',
        deveSerDesativada,
        permanente: isPermanente
      };
    });

    res.json({
      total: diagnostico.length,
      ativas: diagnostico.filter(d => d.ativa && !d.expirada && !d.revogada).length,
      expiradas: diagnostico.filter(d => d.expirada).length,
      revogadas: diagnostico.filter(d => d.revogada).length,
      precisamCorrecao: diagnostico.filter(d => d.deveSerDesativada).length,
      licencas: diagnostico
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ==================== AUXILIARES ====================
function compararDominios(referer, dominio) {
  const cr = referer.replace(/^www\./, '').replace(/^m\./, '');
  const cd = dominio.replace(/^www\./, '').replace(/^m\./, '');
  if (cr === cd) return true;

  const rp = cr.split('.'), dp = cd.split('.');
  if (rp.length < 2 || dp.length < 2) return false;

  const rr = rp.slice(-2).join('.');
  const dr = dp.slice(-2).join('.');

  if (cr.includes('blogspot.com') || cd.includes('blogspot.com')) {
    return cr === cd;
  }

  return rr === dr && (cr === cd || cr.endsWith('.' + cd) || cd.endsWith('.' + cr));
}

function extrairDominioSeguro(url) {
  if (!url) return '';
  return url.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0].split(':')[0].split('?')[0].trim();
}

async function buscarLicencaPorDominio(referer) {
  try {
    const cleanDomain = extrairDominioSeguro(referer);
    if (!cleanDomain) return null;

    const all = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    if (all.data) {
      for (const [key, lic] of Object.entries(all.data)) {
        const list = Array.isArray(lic.domains) ? lic.domains : (lic.domain ? [lic.domain] : []);
        for (const d of list) {
          if (compararDominios(cleanDomain, extrairDominioSeguro(d))) return key;
        }
      }
    }
    return null;
  } catch (e) { return null; }
}

// ==================== SCRIPT BLOQUEADO (AUTO-DESTRUTIVO) ====================
function sendBlockedScript(res, motivo) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const motivoSafe = String(motivo).replace(/[^a-z_]/gi, '');

  res.status(200).send(`
// =============================================
// 📐 Theme Helper - BLOQUEADO (${motivoSafe})
// =============================================
(function() {
    'use strict';

    try {
        localStorage.removeItem('theme_active');
        localStorage.removeItem('theme_session');
        localStorage.removeItem('theme_id');
        localStorage.removeItem('spoofer_active');
        localStorage.removeItem('spoofer_session');
        
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && (k.indexOf('theme') === 0 || k.indexOf('spoofer') === 0)) {
                keysToRemove.push(k);
            }
        }
        keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

        sessionStorage.clear();

        document.cookie.split(";").forEach(function(c) {
            var name = c.split("=")[0].trim();
            if (name && (name.indexOf('theme') === 0 || name.indexOf('spoofer') === 0)) {
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
            }
        });

        if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then(function(dbs) {
                dbs.forEach(function(db) {
                    if (db.name && (db.name.indexOf('theme') >= 0 || db.name.indexOf('spoofer') >= 0)) {
                        indexedDB.deleteDatabase(db.name);
                    }
                });
            }).catch(function(){});
        }
    } catch(e) {}

    window.themeBlocked = true;
    window.spooferBlocked = true;
    window.currentFakeUserId = null;
    window.themeSessionId = null;
    window.spooferSessionId = null;

    function limparBanners() {
        try {
            var seletores = ['.cookie-consent', '.cc-banner', '.cc-window', '.cookie-notice', '.google-cookie-banner', '.cookies-banner', '.cookie-banner', '#cookie-banner', '#cookie-notice', '.consent-banner', '.gdpr-banner'];
            seletores.forEach(function(s) {
                document.querySelectorAll(s).forEach(function(el) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                });
            });
        } catch(e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', limparBanners);
    } else {
        limparBanners();
    }

    console.warn("[Theme Helper] ⛔ BLOQUEADO: ${motivoSafe}");
})();
  `);
}

// ==================== SCRIPT ATIVO (HEARTBEAT 10s + CACHE-BUSTER) ====================
function sendScript(res, scriptId, license, referer) {
  const scriptContent = `
// =============================================
// 📐 Theme Helper - v5.0
// Licença: ${scriptId}
// Plano: ${license.planName}
// =============================================

(function() {
    'use strict';

    var STORAGE_KEY = 'theme_active';
    var LICENSE_ID = '${scriptId}';
    var SERVER_HOST = 'noti-ias-api00.onrender.com';
    var VISITS_TO_RESET = 2;
    var VALIDATION_INTERVAL = 10000; // 🔥 10 segundos
    var validationTimer = null;
    var isRunning = false;

    // ==================== PERSISTÊNCIA ====================
    function getPersistent(key) {
        var value = null;
        try { value = localStorage.getItem(key); } catch(e) {}
        if (value) return value;
        var cookie = document.cookie.split('; ').find(function(r) { return r.indexOf(key + '=') === 0; });
        if (cookie) {
            value = decodeURIComponent(cookie.split('=')[1]);
            try { localStorage.setItem(key, value); } catch(e) {}
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
        try { localStorage.removeItem(key); } catch(e) {}
        document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
    }

    // ==================== LIMPEZA TOTAL ====================
    function limpezaTotal() {
        try {
            var keysToRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && (k.indexOf('theme') === 0 || k.indexOf('spoofer') === 0)) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
            sessionStorage.clear();

            document.cookie.split(";").forEach(function(c) {
                var name = c.split("=")[0].trim();
                if (name && (name.indexOf('theme') === 0 || name.indexOf('spoofer') === 0)) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
                }
            });
        } catch(e) {}
    }

    // ==================== BLOQUEIO ====================
    function bloquear(reason) {
        console.warn('🚫 [Theme Helper] BLOQUEADO: ' + reason);
        isRunning = false;
        
        limpezaTotal();

        if (validationTimer) {
            clearInterval(validationTimer);
            validationTimer = null;
        }

        window.themeBlocked = true;
        window.spooferBlocked = true;
        window.currentFakeUserId = null;
        window.themeSessionId = null;
        window.spooferSessionId = null;
    }

    // ==================== REMOVE BANNERS ====================
    function removeCookieNotice() {
        try {
            var seletores = ['.cookie-consent', '.cc-banner', '.cc-window', '.cookie-notice', '.google-cookie-banner', '.cookies-banner', '.cookie-banner', '#cookie-banner', '#cookie-notice', '.consent-banner', '.gdpr-banner'];
            seletores.forEach(function(s) {
                document.querySelectorAll(s).forEach(function(el) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                });
            });
            document.querySelectorAll('*').forEach(function(el) {
                if (el && el.innerText && (
                    el.innerText.indexOf('cookies do Google') >= 0 ||
                    el.innerText.indexOf('Este site usa cookies') >= 0
                )) {
                    el.style.display = 'none';
                }
            });
        } catch(e) {}
    }

    removeCookieNotice();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeCookieNotice);
    }
    window.addEventListener('load', function() {
        setTimeout(removeCookieNotice, 1000);
        setTimeout(removeCookieNotice, 3000);
    });
    try {
        new MutationObserver(removeCookieNotice).observe(document.body, { childList: true, subtree: true });
    } catch(e) {}

    // ==================== PARÂMETROS URL ====================
    try {
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('theme') === 'on' || urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
        } 
        else if (urlParams.get('theme') === 'off' || urlParams.get('spoofer') === 'off') {
            limpezaTotal();
            if (validationTimer) clearInterval(validationTimer);
            return;
        }
    } catch(e) {}

    if (getPersistent(STORAGE_KEY) !== 'true') {
        console.log('📐 Theme Helper: aguardando ?spoofer=on');
        return;
    }

    // ==================== VALIDAÇÃO COM SERVIDOR ====================
    function validar() {
        return new Promise(function(resolve) {
            var xhr = new XMLHttpRequest();
            var url = 'https://' + SERVER_HOST + '/api/validate/' + LICENSE_ID + '?t=' + Date.now() + '&r=' + Math.random();
            xhr.open('GET', url, true);
            xhr.timeout = 6000;
            
            xhr.onload = function() {
                try {
                    var data = JSON.parse(xhr.responseText);
                    resolve(data.valid === true);
                } catch(e) { resolve(null); }
            };
            xhr.onerror = function() { resolve(null); };
            xhr.ontimeout = function() { resolve(null); };
            try { xhr.send(); } catch(e) { resolve(null); }
        });
    }

    // ==================== LÓGICA PRINCIPAL ====================
    async function iniciar() {
        var valid = await validar();

        if (valid === false) {
            bloquear('Licença inválida/revogada/apagada');
            return;
        }

        if (valid === true || valid === null) {
            isRunning = true;
            window.themeBlocked = false;
            startTheme();
        }
    }

    function startTheme() {
        function generateNewSessionId() {
            return 'theme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        }

        function clearTracking() {
            try {
                document.cookie.split(";").forEach(function(cookie) {
                    var name = cookie.split("=")[0].trim();
                    if (name && name.indexOf('theme_') !== 0 && name.indexOf('_ga') !== 0) {
                        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    }
                });
                var isActive = getPersistent(STORAGE_KEY);
                localStorage.clear();
                sessionStorage.clear();
                if (isActive === 'true') setPersistent(STORAGE_KEY, 'true');
            } catch(e) {}
        }

        var sessionCount = parseInt(localStorage.getItem('theme_session') || '0');
        var currentSessionId = localStorage.getItem('theme_id');
        sessionCount++;

        if (sessionCount >= VISITS_TO_RESET || !currentSessionId) {
            currentSessionId = generateNewSessionId();
            sessionCount = 1;
            clearTracking();
        }

        try {
            localStorage.setItem('theme_session', sessionCount);
            localStorage.setItem('theme_id', currentSessionId);
        } catch(e) {}
        setPersistent(STORAGE_KEY, 'true');

        window.themeSessionId = currentSessionId;
        window.currentFakeUserId = currentSessionId;

        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 220, 30);
        } catch(e) {}

        console.log('📐 Theme Helper ATIVO | Sessão: ' + sessionCount + '/' + VISITS_TO_RESET);

        if (validationTimer) clearInterval(validationTimer);
        validationTimer = setInterval(async function() {
            var valid = await validar();
            if (valid === false) {
                bloquear('Licença revogada/apagada durante a sessão');
            }
        }, VALIDATION_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

    document.addEventListener('visibilitychange', async function() {
        if (document.visibilityState === 'visible' && getPersistent(STORAGE_KEY) === 'true' && isRunning) {
            var valid = await validar();
            if (valid === false) {
                bloquear('Licença inválida (visibilitychange)');
            }
        }
    });

    window.addEventListener('focus', async function() {
        if (getPersistent(STORAGE_KEY) === 'true' && isRunning) {
            var valid = await validar();
            if (valid === false) {
                bloquear('Licença inválida (focus)');
            }
        }
    });

})();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).send(scriptContent);
}

// ==================== INICIAR ====================
app.listen(PORT, () => {
  console.log(`🚀 Theme Helper v5.0 rodando na porta ${PORT}`);
  console.log(`🔒 Validação: /api/validate/:scriptId`);
  console.log(`⏱️  Heartbeat: 10s + focus + visibilitychange`);
  console.log(`📊 Diagnóstico: /admin/diagnostico`);
});
