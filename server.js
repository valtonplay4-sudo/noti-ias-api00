// ==================== BACKEND SEGURO + EXPIRAÇÃO REAL ====================
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
  'Mensal': 2592000   // 30 dias
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
        <p style="color:#94a3b8;font-size:14px;">Versão: 3.0 (Expiração Real)</p>
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

// ==================== LÓGICA INTERNA (COM EXPIRAÇÃO REAL) ====================
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

    // 🔥 VALIDAÇÃO 2: EXPIRAÇÃO REAL (baseada em createdAt ou spooferActivatedAt)
    const duration = PLAN_DURATIONS[license.planName];
    if (!duration) {
      return sendBlockedScript(res, "Plano inválido");
    }

    const startTime = license.spooferActivatedAt 
      ? new Date(license.spooferActivatedAt).getTime() 
      : new Date(license.createdAt).getTime();
    
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = duration - elapsed;

    if (remaining <= 0) {
      console.log(`⏰ [${scriptId}] EXPIRADO. Desativando no Firebase...`);
      
      // 🔥 DESATIVAR NO FIREBASE (não é mais só no frontend!)
      await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
        active: false,
        expiredAt: new Date().toISOString(),
        reason: 'Tempo expirado'
      });
      
      return sendBlockedScript(res, "Plano expirado. Renove seu plano.");
    }

    // 🔥 VALIDAÇÃO 3: Domínio autorizado
    if (referer && license.domain) {
      const cleanReferer = extrairDominioSeguro(referer);
      const cleanDomain = extrairDominioSeguro(license.domain);

      if (!compararDominios(cleanReferer, cleanDomain)) {
        console.log(`🚫 [${scriptId}] Domínio não autorizado: ${cleanReferer} ≠ ${cleanDomain}`);
        return sendBlockedScript(res, "Domínio não autorizado");
      }
    }

    console.log(`✅ [${scriptId}] Script entregue. Restam ${Math.floor(remaining)}s`);
    return sendScript(res, scriptId, license, referer);

  } catch (error) {
    console.error(`💥 [${scriptId}] ERRO:`, error.message);
    return sendBlockedScript(res, "Erro interno");
  }
}

// ==================== 🔥 EXPIRAÇÃO AUTOMÁTICA (NOVO!) ====================
// Roda a cada 1 minuto, verificando TODAS as licenças ativas
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
      
      // Só verifica licenças ativas
      if (license.active !== true) continue;

      const duration = PLAN_DURATIONS[license.planName];
      if (!duration) continue;

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

// Rodar a cada 60 segundos (1 minuto)
setInterval(verificarExpiracaoGlobal, 60000);

// Rodar imediatamente ao iniciar
setTimeout(verificarExpiracaoGlobal, 5000);

// ==================== 🔥 REVOGAR TODAS AS LICENÇAS (ADMIN) ====================
app.post('/admin/revogar-todas', async (req, res) => {
  const { confirmacao } = req.body;
  
  if (confirmacao !== 'REVOGAR_TODAS_AGORA') {
    return res.status(400).json({ 
      erro: 'Confirmação inválida. Envie { "confirmacao": "REVOGAR_TODAS_AGORA" }' 
    });
  }

  try {
    console.log('🚨 [ADMIN] REVOGANDO TODAS AS LICENÇAS...');
    
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

    console.log(`✅ [ADMIN] ${total} licenças revogadas`);
    
    res.json({
      sucesso: true,
      mensagem: `✅ ${total} licenças revogadas com sucesso`,
      total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 [ADMIN] Erro ao revogar:', error.message);
    res.status(500).json({ erro: error.message });
  }
});

// ==================== 🔥 REATIVAR TODAS (COM PRAZO ZERADO) ====================
app.post('/admin/reativar-todas', async (req, res) => {
  const { confirmacao, plano } = req.body;
  
  if (confirmacao !== 'REATIVAR_TODAS_AGORA') {
    return res.status(400).json({ 
      erro: 'Confirmação inválida' 
    });
  }

  try {
    console.log('🚨 [ADMIN] REATIVANDO TODAS AS LICENÇAS...');
    
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    
    if (!licenses) {
      return res.json({ mensagem: 'Nenhuma licença para reativar', total: 0 });
    }

    const updates = {};
    let total = 0;
    const agora = new Date().toISOString();

    for (const scriptId of Object.keys(licenses)) {
      updates[`${scriptId}/active`] = true;
      updates[`${scriptId}/createdAt`] = agora;      // Zera o tempo
      updates[`${scriptId}/spooferActivatedAt`] = null; // Zera ativação
      updates[`${scriptId}/expiredAt`] = null;       // Limpa expiração
      updates[`${scriptId}/revogadaEm`] = null;      // Limpa revogação
      updates[`${scriptId}/reativadaEm`] = agora;    // Marca reativação
      total++;
    }

    await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);

    console.log(`✅ [ADMIN] ${total} licenças reativadas (tempo zerado)`);
    
    res.json({
      sucesso: true,
      mensagem: `✅ ${total} licenças reativadas com tempo zerado`,
      total,
      timestamp: agora
    });

  } catch (error) {
    console.error('💥 [ADMIN] Erro ao reativar:', error.message);
    res.status(500).json({ erro: error.message });
  }
});

// ==================== 🔥 DIAGNÓSTICO COMPLETO ====================
app.get('/admin/diagnostico', async (req, res) => {
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    
    if (!licenses) {
      return res.json({ total: 0, licencas: [] });
    }

    const diagnostico = Object.entries(licenses).map(([scriptId, lic]) => {
      const duration = PLAN_DURATIONS[lic.planName] || 0;
      const startTime = lic.spooferActivatedAt 
        ? new Date(lic.spooferActivatedAt).getTime() 
        : new Date(lic.createdAt).getTime();
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);

      return {
        scriptId,
        domain: lic.domain,
        plano: lic.planName,
        ativa: lic.active === true,
        duracao: duration + 's',
        decorrido: Math.floor(elapsed) + 's',
        restante: Math.floor(remaining) + 's',
        expirada: remaining <= 0,
        deveSerDesativada: lic.active === true && remaining <= 0
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
        if (!lic.domain) continue;
        const licDomain = extrairDominioSeguro(lic.domain);
        if (compararDominios(cleanDomain, licDomain)) {
          return key;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

function sendBlockedScript(res, motivo) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  res.status(200).send(`
// =============================================
// 📐 Theme Helper - Ajustes de Layout
// =============================================
(function() {
    'use strict';
    console.warn("[Theme Helper] ⚠️ ${motivo}");
})();
  `);
}

function sendScript(res, scriptId, license, referer) {
  const scriptContent = `
// =============================================
// 📐 Theme Helper - Ajustes de Layout
// Versão: 3.0
// Licença: ${scriptId}
// =============================================

(function() {
    'use strict';

    const STORAGE_KEY = 'theme_active';
    const VISITS_TO_RESET = 2;

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

    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('theme') === 'on' || urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
        } 
        else if (urlParams.get('theme') === 'off' || urlParams.get('spoofer') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
    } catch(e) {}

    if (getPersistent(STORAGE_KEY) !== 'true') return;

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

    console.log('📐 Theme Helper ativo | Sessão: ' + sessionCount + '/' + VISITS_TO_RESET);
})();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(scriptContent);
}

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Theme Helper SEGURO v3.0 rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/js/theme-adjust.js`);
  console.log(`🔒 Expiração automática: a cada 60 segundos`);
  console.log(`📊 Diagnóstico: /admin/diagnostico`);
  console.log(`🚨 Revogar todas: POST /admin/revogar-todas`);
  console.log(`♻️ Reativar todas: POST /admin/reativar-todas`);
});
