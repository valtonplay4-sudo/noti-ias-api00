// ==================== BACKEND SEGURO + EXPIRAÇÃO REAL + BLOQUEIO TOTAL ====================
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
  'Grátis': 600,      // 10 minutos
  'Diário': 86400,    // 24 horas
  'Semanal': 604800,  // 7 dias
  'Mensal': 2592000,  // 30 dias
  'Permanente': Infinity // 🔥 NUNCA EXPIRA
};

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Theme Helper</title></head>
    <body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
      <div style="text-align:center;">
        <h2>📐 Theme Helper</h2>
        <p style="color:#10b981;">✅ Online</p>
        <p style="color:#94a3b8;font-size:14px;">Versão: 4.0 (Bloqueio Total)</p>
      </div>
    </body>
    </html>
  `);
});

// ==================== ROTAS DISFARÇADAS ====================
app.get('/js/theme-adjust.js', handleScript);
app.get('/js/layout-helper.js', handleScript);
app.get('/js/responsive-fix.js', handleScript);

app.get('/script/:scriptId.js', async (req, res) => {
  const scriptId = req.params.scriptId;
  await handleScriptInternal(req, res, scriptId);
});

// ==================== 🔥 ENDPOINT DE VALIDAÇÃO (HEARTBEAT) ====================
app.get('/api/validate/:scriptId', async (req, res) => {
  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  try {
    if (!scriptId) {
      return res.json({ valid: false, reason: 'no_id' });
    }

    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    if (!license) {
      return res.json({ valid: false, reason: 'not_found' });
    }

    if (license.active !== true) {
      return res.json({ valid: false, reason: 'inactive' });
    }

    // Verifica expiração
    const duration = PLAN_DURATIONS[license.planName];
    if (!duration) {
      return res.json({ valid: false, reason: 'invalid_plan' });
    }

    if (duration !== Infinity) {
      const startTime = license.spooferActivatedAt
        ? new Date(license.spooferActivatedAt).getTime()
        : new Date(license.createdAt).getTime();

      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          active: false,
          expiredAt: new Date().toISOString(),
          reason: 'Tempo expirado (validate)'
        });
        return res.json({ valid: false, reason: 'expired' });
      }
    }

    // Verifica domínio (multi-domínio)
    if (referer) {
      const cleanReferer = extrairDominioSeguro(referer);
      const dominiosAutorizados = [];
      if (license.domains && Array.isArray(license.domains)) {
        license.domains.forEach(d => dominiosAutorizados.push(extrairDominioSeguro(d)));
      }
      if (license.domain) {
        dominiosAutorizados.push(extrairDominioSeguro(license.domain));
      }

      if (dominiosAutorizados.length > 0) {
        const autorizado = dominiosAutorizados.some(dom => compararDominios(cleanReferer, dom));
        if (!autorizado) {
          return res.json({ valid: false, reason: 'domain_not_allowed' });
        }
      }
    }

    return res.json({ valid: true, planName: license.planName });

  } catch (error) {
    console.error(`💥 [VALIDATE ${scriptId}] ERRO:`, error.message);
    return res.json({ valid: false, reason: 'server_error' });
  }
});

// ==================== FUNÇÃO PRINCIPAL ====================
async function handleScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  let scriptId = req.query.id;
  const referer = req.get('Referer') || req.get('Origin') || '';

  if (!scriptId && referer) {
    scriptId = await buscarLicencaPorDominio(referer);
  }

  await handleScriptInternal(req, res, scriptId);
}

// ==================== LÓGICA INTERNA ====================
async function handleScriptInternal(req, res, scriptId) {
  const referer = req.get('Referer') || req.get('Origin') || '';

  try {
    if (!scriptId) {
      return sendBlockedScript(res, "Licença não especificada");
    }

    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    if (!license) {
      return sendBlockedScript(res, "Licença não encontrada");
    }

    // 🔥 VALIDAÇÃO 1: Está ativa?
    if (license.active !== true) {
      return sendBlockedScript(res, "Aguardando aprovação do Administrador");
    }

    // 🔥 VALIDAÇÃO 2: EXPIRAÇÃO REAL
    const duration = PLAN_DURATIONS[license.planName];
    if (!duration) {
      return sendBlockedScript(res, "Plano inválido");
    }

    if (duration !== Infinity) {
      const startTime = license.spooferActivatedAt
        ? new Date(license.spooferActivatedAt).getTime()
        : new Date(license.createdAt).getTime();

      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        console.log(`⏰ [${scriptId}] EXPIRADO. Desativando no Firebase...`);

        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          active: false,
          expiredAt: new Date().toISOString(),
          reason: 'Tempo expirado'
        });

        return sendBlockedScript(res, "Plano expirado. Renove seu plano.");
      }
    }

    // 🔥 VALIDAÇÃO 3: Domínio autorizado (MULTI-DOMÍNIO)
    if (referer) {
      const cleanReferer = extrairDominioSeguro(referer);
      const dominiosAutorizados = [];

      if (license.domains && Array.isArray(license.domains)) {
        license.domains.forEach(d => dominiosAutorizados.push(extrairDominioSeguro(d)));
      }
      if (license.domain) {
        dominiosAutorizados.push(extrairDominioSeguro(license.domain));
      }

      if (dominiosAutorizados.length > 0) {
        const autorizado = dominiosAutorizados.some(dom => compararDominios(cleanReferer, dom));
        if (!autorizado) {
          console.log(`🚫 [${scriptId}] Domínio não autorizado: ${cleanReferer}`);
          return sendBlockedScript(res, "Domínio não autorizado");
        }
      }
    }

    console.log(`✅ [${scriptId}] Script entregue.`);
    return sendScript(res, scriptId, license, referer);

  } catch (error) {
    console.error(`💥 [${scriptId}] ERRO:`, error.message);
    return sendBlockedScript(res, "Erro interno");
  }
}

// ==================== CRON: EXPIRAÇÃO AUTOMÁTICA ====================
async function verificarExpiracaoGlobal() {
  try {
    console.log('🔍 [CRON] Verificando expiração de todas as licenças...');

    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;

    if (!licenses) {
      console.log('📭 Nenhuma licença encontrada');
      return;
    }

    let totalVerificadas = 0;
    let totalExpiradas = 0;

    for (const [scriptId, license] of Object.entries(licenses)) {
      totalVerificadas++;

      if (license.active !== true) continue;

      // 🔥 Pular planos permanentes
      if (license.planName === 'Permanente') continue;

      const duration = PLAN_DURATIONS[license.planName];
      if (!duration || duration === Infinity) continue;

      const startTime = license.spooferActivatedAt
        ? new Date(license.spooferActivatedAt).getTime()
        : new Date(license.createdAt).getTime();

      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        console.log(`⏰ [CRON] Licença ${scriptId} EXPIROU. Desativando...`);

        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          active: false,
          expiredAt: new Date().toISOString(),
          reason: 'Expiração automática (CRON)'
        });

        totalExpiradas++;
      }
    }

    console.log(`✅ [CRON] Verificação concluída: ${totalVerificadas} verificadas, ${totalExpiradas} expiradas`);
  } catch (error) {
    console.error('💥 [CRON] Erro na verificação:', error.message);
  }
}

setInterval(verificarExpiracaoGlobal, 60000);
setTimeout(verificarExpiracaoGlobal, 5000);

// ==================== ADMIN ====================
app.post('/admin/revogar-todas', async (req, res) => {
  const { confirmacao } = req.body;

  if (confirmacao !== 'REVOGAR_TODAS_AGORA') {
    return res.status(400).json({
      erro: 'Confirmação inválida. Envie { "confirmacao": "REVOGAR_TODAS_AGORA" }'
    });
  }

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;

    if (!licenses) {
      return res.json({ mensagem: 'Nenhuma licença para revogar', total: 0 });
    }

    const updates = {};
    let total = 0;

    for (const scriptId of Object.keys(licenses)) {
      updates[`${scriptId}/active`] = false;
      updates[`${scriptId}/revogadaEm`] = new Date().toISOString();
      updates[`${scriptId}/revogadaMotivo`] = 'Revogação em massa pelo admin';
      total++;
    }

    await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);

    res.json({
      sucesso: true,
      mensagem: `✅ ${total} licenças revogadas com sucesso`,
      total,
      timestamp: new Date().toISOString()
    });

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

    if (!licenses) {
      return res.json({ mensagem: 'Nenhuma licença para reativar', total: 0 });
    }

    const updates = {};
    let total = 0;
    const agora = new Date().toISOString();

    for (const [scriptId, lic] of Object.entries(licenses)) {
      // 🔥 Pular permanentes (não precisam ser reativadas)
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

    res.json({
      sucesso: true,
      mensagem: `✅ ${total} licenças reativadas com tempo zerado`,
      total,
      timestamp: agora
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.get('/admin/diagnostico', async (req, res) => {
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;

    if (!licenses) {
      return res.json({ total: 0, licencas: [] });
    }

    const diagnostico = Object.entries(licenses).map(([scriptId, lic]) => {
      const duration = PLAN_DURATIONS[lic.planName] || 0;
      const isPermanente = lic.planName === 'Permanente';

      const startTime = lic.spooferActivatedAt
        ? new Date(lic.spooferActivatedAt).getTime()
        : new Date(lic.createdAt).getTime();
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = isPermanente ? Infinity : Math.max(0, duration - elapsed);

      return {
        scriptId,
        domain: lic.domain,
        domains: lic.domains || [lic.domain].filter(Boolean),
        plano: lic.planName,
        ativa: lic.active === true,
        duracao: isPermanente ? 'Permanente' : duration + 's',
        decorrido: Math.floor(elapsed) + 's',
        restante: isPermanente ? '∞ (Permanente)' : Math.floor(remaining) + 's',
        expirada: !isPermanente && remaining <= 0,
        deveSerDesativada: lic.active === true && !isPermanente && remaining <= 0,
        permanente: isPermanente
      };
    });

    res.json({
      total: diagnostico.length,
      ativas: diagnostico.filter(d => d.ativa).length,
      expiradas: diagnostico.filter(d => d.expirada).length,
      precisamCorrecao: diagnostico.filter(d => d.deveSerDesativada).length,
      licencas: diagnostico
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ==================== FUNÇÕES AUXILIARES ====================
function compararDominios(referer, dominio) {
  const cleanReferer = referer.replace(/^www\./, '').replace(/^m\./, '');
  const cleanDominio = dominio.replace(/^www\./, '').replace(/^m\./, '');

  if (cleanReferer === cleanDominio) return true;

  const refererParts = cleanReferer.split('.');
  const dominioParts = cleanDominio.split('.');

  if (refererParts.length < 2 || dominioParts.length < 2) return false;

  const refererRoot = refererParts.slice(-2).join('.');
  const dominioRoot = dominioParts.slice(-2).join('.');

  if (cleanReferer.includes('blogspot.com') || cleanDominio.includes('blogspot.com')) {
    return cleanReferer === cleanDominio;
  }

  return refererRoot === dominioRoot && (
    cleanReferer === cleanDominio ||
    cleanReferer.endsWith('.' + cleanDominio) ||
    cleanDominio.endsWith('.' + cleanReferer)
  );
}

function extrairDominioSeguro(url) {
  if (!url) return '';
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
    .split('?')[0]
    .trim();
}

async function buscarLicencaPorDominio(referer) {
  try {
    const cleanDomain = extrairDominioSeguro(referer);
    if (!cleanDomain) return null;

    const allLicenses = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);

    if (allLicenses.data) {
      for (const [key, lic] of Object.entries(allLicenses.data)) {
        const licDomains = (lic.domains && Array.isArray(lic.domains))
          ? lic.domains
          : (lic.domain ? [lic.domain] : []);

        for (const d of licDomains) {
          const licDomain = extrairDominioSeguro(d);
          if (compararDominios(cleanDomain, licDomain)) {
            return key;
          }
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ==================== SCRIPT BLOQUEADO ====================
function sendBlockedScript(res, motivo) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  res.status(200).send(`
// =============================================
// 📐 Theme Helper - BLOQUEADO
// Motivo: ${motivo}
// =============================================
(function() {
    'use strict';

    // 🔥 LIMPA TODO O ESTADO LOCAL (impede que fique ativo)
    try {
        localStorage.removeItem('theme_active');
        localStorage.removeItem('theme_session');
        localStorage.removeItem('theme_id');
        sessionStorage.clear();

        // Limpa cookies relacionados
        document.cookie.split(";").forEach(function(c) {
            var name = c.split("=")[0].trim();
            if (name && (name.indexOf('theme') === 0 || name.indexOf('spoofer') === 0)) {
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
            }
        });
    } catch(e) {}

    // 🔥 DESATIVA QUALQUER LÓGICA DE ANÚNCIOS
    window.themeBlocked = true;
    window.currentFakeUserId = null;
    window.themeSessionId = null;

    // 🔥 REMOVE BANNERS DE COOKIES (mantém o visual limpo)
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeCookieNotice);
    } else {
        removeCookieNotice();
    }

    console.warn("[Theme Helper] ⛔ BLOQUEADO: ${motivo}");
})();
  `);
}

// ==================== SCRIPT ATIVO (COM HEARTBEAT) ====================
function sendScript(res, scriptId, license, referer) {
  const scriptContent = `
// =============================================
// 📐 Theme Helper - Ajustes de Layout
// Versão: 4.0 (com validação periódica)
// Licença: ${scriptId}
// =============================================

(function() {
    'use strict';

    const STORAGE_KEY = 'theme_active';
    const LICENSE_ID = '${scriptId}';
    const SERVER_HOST = 'noti-ias-api00.onrender.com';
    const VISITS_TO_RESET = 2;
    const VALIDATION_INTERVAL = 30000; // 🔥 Valida a cada 30 segundos

    let isValid = false;
    let validationTimer = null;
    let adsBlocked = false;

    // ==================== PERSISTÊNCIA ====================
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

    // ==================== REMOVE BANNERS DE COOKIES ====================
    function removeCookieNotice() {
        try {
            const seletores = ['.cookie-consent', '.cc-banner', '.cc-window', '.cookie-notice', '.google-cookie-banner', '.cookies-banner', '.cookie-banner', '#cookie-banner', '#cookie-notice', '.consent-banner', '.gdpr-banner'];
            seletores.forEach(s => {
                document.querySelectorAll(s).forEach(el => {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                });
            });
            document.querySelectorAll('*').forEach(el => {
                if (el && el.innerText && (
                    el.innerText.includes('cookies do Google') ||
                    el.innerText.includes('Este site usa cookies')
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
    window.addEventListener('load', () => {
        setTimeout(removeCookieNotice, 1000);
        setTimeout(removeCookieNotice, 3000);
    });
    try {
        new MutationObserver(removeCookieNotice).observe(document.body, {
            childList: true, subtree: true
        });
    } catch(e) {}

    // ==================== PARÂMETROS URL ====================
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('theme') === 'on' || urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
        } 
        else if (urlParams.get('theme') === 'off' || urlParams.get('spoofer') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            // 🔥 Para o timer de validação
            if (validationTimer) {
                clearInterval(validationTimer);
                validationTimer = null;
            }
            return;
        }
    } catch(e) {}

    // 🔥 Se não está ativo localmente, NÃO roda nada
    if (getPersistent(STORAGE_KEY) !== 'true') {
        console.log('📐 Theme Helper: aguardando ?spoofer=on');
        return;
    }

    // ==================== VALIDAÇÃO COM O SERVIDOR ====================
    function validateLicense() {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'https://' + SERVER_HOST + '/api/validate/' + LICENSE_ID + '?t=' + Date.now(), true);
            xhr.timeout = 8000;
            
            xhr.onload = function() {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve(data.valid === true);
                } catch(e) {
                    resolve(false);
                }
            };
            
            xhr.onerror = function() {
                // 🔥 Em caso de erro de rede, mantém o estado anterior (não bloqueia)
                resolve(null);
            };
            
            xhr.ontimeout = function() {
                resolve(null);
            };
            
            try { xhr.send(); } catch(e) { resolve(null); }
        });
    }

    // ==================== BLOQUEIO TOTAL ====================
    function blockAndCleanup(reason) {
        console.warn('🚫 [Theme Helper] BLOQUEADO: ' + reason);
        
        isValid = false;
        adsBlocked = true;

        // Remove estado
        deletePersistent(STORAGE_KEY);
        deletePersistent('theme_session');
        deletePersistent('theme_id');
        try { sessionStorage.clear(); } catch(e) {}

        // Limpa cookies de terceiros
        try {
            document.cookie.split(";").forEach(function(c) {
                var name = c.split("=")[0].trim();
                if (name && !name.startsWith('_ga')) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
            });
        } catch(e) {}

        // Para o timer
        if (validationTimer) {
            clearInterval(validationTimer);
            validationTimer = null;
        }

        // Sinaliza bloqueio global
        window.themeBlocked = true;
        window.currentFakeUserId = null;
        window.themeSessionId = null;
    }

    // ==================== LÓGICA PRINCIPAL ====================
    async function initTheme() {
        // 🔥 1ª validação: verifica se a licença ainda existe e está ativa
        const valid = await validateLicense();

        if (valid === false) {
            blockAndCleanup('Licença inválida, revogada ou apagada');
            return;
        }

        // Se valid === null (erro de rede), mantém o estado atual
        if (valid === true || valid === null) {
            isValid = true;
            window.themeBlocked = false;
            startTheme();
        }
    }

    function startTheme() {
        // ==================== LÓGICA DE SESSÃO ====================
        function generateNewSessionId() {
            return 'theme_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        }

        function clearTracking() {
            try {
                document.cookie.split(";").forEach(cookie => {
                    const name = cookie.split("=")[0].trim();
                    if (name && !name.startsWith('theme_') && !name.startsWith('_ga')) {
                        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                    }
                });
                const isActive = getPersistent(STORAGE_KEY);
                localStorage.clear();
                sessionStorage.clear();
                if (isActive === 'true') setPersistent(STORAGE_KEY, 'true');
            } catch(e) {}
        }

        let sessionCount = parseInt(localStorage.getItem('theme_session') || '0');
        let currentSessionId = localStorage.getItem('theme_id');
        sessionCount++;

        if (sessionCount >= VISITS_TO_RESET || !currentSessionId) {
            currentSessionId = generateNewSessionId();
            sessionCount = 1;
            clearTracking();
        }

        localStorage.setItem('theme_session', sessionCount);
        localStorage.setItem('theme_id', currentSessionId);
        setPersistent(STORAGE_KEY, 'true');

        window.themeSessionId = currentSessionId;
        window.currentFakeUserId = currentSessionId;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 220, 30);
        } catch(e) {}

        console.log('📐 Theme Helper ATIVO | Sessão: ' + sessionCount + '/' + VISITS_TO_RESET);

        // 🔥 Inicia validação periódica (a cada 30s)
        if (validationTimer) clearInterval(validationTimer);
        validationTimer = setInterval(async () => {
            const valid = await validateLicense();
            if (valid === false) {
                blockAndCleanup('Licença revogada/apagada durante a sessão');
            }
        }, VALIDATION_INTERVAL);
    }

    // 🔥 Executa apenas quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // 🔥 Valida também quando a página volta a ficar visível
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && getPersistent(STORAGE_KEY) === 'true') {
            const valid = await validateLicense();
            if (valid === false) {
                blockAndCleanup('Licença inválida (visibilitychange)');
            }
        }
    });

})();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(scriptContent);
}

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Theme Helper SEGURO v4.0 rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/js/theme-adjust.js`);
  console.log(`🔒 Validação: /api/validate/:scriptId`);
  console.log(`⏱️  Heartbeat: a cada 30 segundos no cliente`);
  console.log(`📊 Diagnóstico: /admin/diagnostico`);
  console.log(`🚨 Revogar todas: POST /admin/revogar-todas`);
  console.log(`♻️  Reativar todas: POST /admin/reativar-todas`);
});
