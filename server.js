// ==================== BACKEND SEGURO - ANTI-BURLA ====================
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==================== CONFIGURAÇÕES DE SEGURANÇA ====================
const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

const PLAN_DURATIONS = {
  'Grátis': 600,      // 10 minutos
  'Diário': 86400,    // 24 horas
  'Semanal': 604800,  // 7 dias
  'Mensal': 2592000   // 30 dias
};

// Lista de domínios BLOQUEADOS (adicionar se descobrir mais)
const DOMINIOS_BLOQUEADOS = [
  'localhost',
  '127.0.0.1',
  'test',
  'demo',
  'hack',
  'burla'
];

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
        <p style="color:#94a3b8;font-size:14px;">Versão: 2.0 (Seguro)</p>
      </div>
    </body>
    </html>
  `);
});

// ==================== ROTAS DISFARÇADAS ====================
app.get('/js/theme-adjust.js', handleScript);
app.get('/js/layout-helper.js', handleScript);
app.get('/js/responsive-fix.js', handleScript);
app.get('/js/privacy-config.js', handleScript);
app.get('/js/cookie-helper.js', handleScript);

// Compatibilidade com rota antiga
app.get('/script/:scriptId.js', async (req, res) => {
  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';
  console.log(`[${scriptId}] 📥 Requisição (rota antiga) de: ${referer || 'Desconhecido'}`);
  
  await handleScriptInternal(req, res, scriptId);
});

// ==================== FUNÇÃO PRINCIPAL ====================
async function handleScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  let scriptId = req.query.id;
  const referer = req.get('Referer') || req.get('Origin') || '';

  // 🔥 SEGURANÇA: Se não tem ID, buscar por domínio (só se o referer for válido)
  if (!scriptId && referer) {
    scriptId = await buscarLicencaPorDominio(referer);
  }

  console.log(`[${scriptId || 'SEM_ID'}] 📥 Requisição de: ${referer || 'Desconhecido'}`);

  await handleScriptInternal(req, res, scriptId);
}

// ==================== LÓGICA INTERNA (COM SEGURANÇA REFORÇADA) ====================
async function handleScriptInternal(req, res, scriptId) {
  const referer = req.get('Referer') || req.get('Origin') || '';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  try {
    // 🔥 VALIDAÇÃO 1: Precisa ter um scriptId
    if (!scriptId) {
      console.log(`❌ [SEM_ID] Requisição sem scriptId de ${referer}`);
      return sendBlockedScript(res, "Licença não especificada");
    }

    // 🔥 VALIDAÇÃO 2: Buscar licença
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    // 🔥 VALIDAÇÃO 3: Licença precisa existir
    if (!license) {
      console.log(`❌ [${scriptId}] Licença NÃO EXISTE no Firebase`);
      return sendBlockedScript(res, "Licença não encontrada. Contate o suporte.");
    }

    // 🔥 VALIDAÇÃO 4: Licença precisa estar ATIVA
    if (license.active !== true) {
      console.log(`⏳ [${scriptId}] Licença INATIVA. Aguardando aprovação.`);
      return sendBlockedScript(res, "Aguardando aprovação do Administrador.");
    }

    // 🔥 VALIDAÇÃO 5: Verificar EXPIRAÇÃO (CRÍTICA!)
    if (license.expiresAt) {
      const expDate = new Date(license.expiresAt);
      const now = new Date();
      
      if (now > expDate) {
        console.log(`⏰ [${scriptId}] Licença EXPIRADA em ${license.expiresAt}`);
        
        // Desativar a licença automaticamente
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { 
          active: false,
          expiredAt: new Date().toISOString()
        });
        
        return sendBlockedScript(res, "Licença expirada. Renove seu plano.");
      }
    }

    // 🔥 VALIDAÇÃO 6: Verificar se plano é válido
    const duration = PLAN_DURATIONS[license.planName];
    if (!duration) {
      console.log(`❌ [${scriptId}] Plano INVÁLIDO: ${license.planName}`);
      return sendBlockedScript(res, "Plano inválido. Contate o suporte.");
    }

    // 🔥 VALIDAÇÃO 7: Calcular TEMPO RESTANTE desde a última ativação
    if (license.spooferActivatedAt || license.createdAt) {
      const startTime = license.spooferActivatedAt 
        ? new Date(license.spooferActivatedAt).getTime() 
        : new Date(license.createdAt).getTime();
      
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        console.log(`⏰ [${scriptId}] Tempo ESGOTADO (${Math.floor(elapsed)}s de ${duration}s)`);
        
        // Desativar a licença
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { 
          active: false,
          expiredAt: new Date().toISOString()
        });
        
        return sendBlockedScript(res, "Plano expirado. Renove seu plano.");
      }
    }

    // 🔥 VALIDAÇÃO 8: VALIDAR DOMÍNIO (A MAIS IMPORTANTE!)
    if (referer && license.domain) {
      const cleanReferer = extrairDominioSeguro(referer);
      const cleanDomain = extrairDominioSeguro(license.domain);

      // Verificar se está na lista de bloqueados
      if (DOMINIOS_BLOQUEADOS.some(blocked => cleanReferer.includes(blocked))) {
        console.log(`🚫 [${scriptId}] Domínio BLOQUEADO: ${cleanReferer}`);
        return sendBlockedScript(res, "Domínio não autorizado.");
      }

      // 🔥 COMPARAÇÃO EXATA (não usar includes!)
      const isMatch = compararDominios(cleanReferer, cleanDomain);

      if (!isMatch) {
        console.log(`🚫 [${scriptId}] DOMÍNIO NÃO AUTORIZADO: "${cleanReferer}" ≠ "${cleanDomain}"`);
        console.log(`    → Este é o motivo pelo qual o script não funciona!`);
        
        // 🔥 NÃO atualizar o domínio automaticamente (isso permitia burla!)
        return sendBlockedScript(res, `Domínio não autorizado. Registre "${cleanReferer}" no portal.`);
      }
    }

    console.log(`✅ [${scriptId}] Script entregue para: ${license.domain} | Plano: ${license.planName} | IP: ${clientIp}`);

    // 🔥 ENTREGAR O SCRIPT
    return sendScript(res, scriptId, license, referer);

  } catch (error) {
    console.error(`💥 [${scriptId}] ERRO:`, error.message);
    return sendBlockedScript(res, "Erro interno. Contate o suporte.");
  }
}

// ==================== COMPARAÇÃO SEGURA DE DOMÍNIOS ====================
function compararDominios(referer, dominio) {
  // 🔥 Remove 'www.' para comparação
  const cleanReferer = referer.replace(/^www\./, '').replace(/^m\./, '');
  const cleanDominio = dominio.replace(/^www\./, '').replace(/^m\./, '');

  // 🔥 Comparação EXATA (não usar includes!)
  if (cleanReferer === cleanDominio) {
    return true;
  }

  // 🔥 Permitir apenas subdomínios LEGÍTIMOS do mesmo domínio raiz
  // Ex: "blog.meublog.com" é subdomínio de "meublog.com"
  // MAS "hacker-meublog.com" NÃO é
  const refererParts = cleanReferer.split('.');
  const dominioParts = cleanDominio.split('.');

  // Precisa ter pelo menos 2 partes (dominio.com)
  if (refererParts.length < 2 || dominioParts.length < 2) {
    return false;
  }

  // 🔥 Comparar apenas o domínio RAIZ (últimas 2 partes)
  const refererRoot = refererParts.slice(-2).join('.');
  const dominioRoot = dominioParts.slice(-2).join('.');

  // 🔥 Para blogs do Blogger: precisa ser EXATO após remover subdomínios do Blogger
  if (cleanReferer.includes('blogspot.com') || cleanDominio.includes('blogspot.com')) {
    return cleanReferer === cleanDominio;
  }

  // Para outros domínios: comparar raiz E subdomínio deve começar com o domínio
  return refererRoot === dominioRoot && (
    cleanReferer === cleanDominio ||
    cleanReferer.endsWith('.' + cleanDominio) ||
    cleanDominio.endsWith('.' + cleanReferer)
  );
}

// ==================== EXTRAIR DOMÍNIO SEGURO ====================
function extrairDominioSeguro(url) {
  if (!url) return '';
  
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')  // Remove protocolo
    .replace(/^www\./, '')         // Remove www
    .split('/')[0]                 // Remove path
    .split(':')[0]                 // Remove porta
    .split('?')[0]                 // Remove query
    .trim();
}

// ==================== BUSCAR LICENÇA POR DOMÍNIO (SEGURO) ====================
async function buscarLicencaPorDominio(referer) {
  try {
    const cleanDomain = extrairDominioSeguro(referer);
    if (!cleanDomain) return null;

    const allLicenses = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    
    if (allLicenses.data) {
      for (const [key, lic] of Object.entries(allLicenses.data)) {
        if (!lic.domain) continue;
        
        const licDomain = extrairDominioSeguro(lic.domain);
        
        // 🔥 Comparação SEGURA
        if (compararDominios(cleanDomain, licDomain)) {
          console.log(`🔍 Licença encontrada para "${cleanDomain}": ${key}`);
          return key;
        }
      }
    }
    
    console.log(`🔍 Nenhuma licença encontrada para "${cleanDomain}"`);
    return null;
  } catch (error) {
    console.error('Erro em buscarLicencaPorDominio:', error.message);
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
// 📐 Theme Helper - Ajustes de Layout
// =============================================
(function() {
    'use strict';
    console.warn("[Theme Helper] ⚠️ Script bloqueado: ${motivo}");
})();
  `);
}

// ==================== ENTREGAR SCRIPT (SÓ SE TUDO OK) ====================
function sendScript(res, scriptId, license, referer) {
  const scriptContent = `
// =============================================
// 📐 Theme Helper - Ajustes de Layout
// Versão: 2.0
// Licença: ${scriptId}
// Domínio: ${license.domain}
// Plano: ${license.planName}
// =============================================

(function() {
    'use strict';

    const STORAGE_KEY = 'theme_active';
    const VISITS_TO_RESET = 2;
    const LICENSE_ID = '${scriptId}';
    const DOMAIN = '${license.domain || 'Desconhecido'}';
    const PLAN = '${license.planName || 'Grátis'}';

    // ==================== STORAGE PERSISTENTE ====================
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

    // ==================== REMOVER AVISO DE COOKIES ====================
    function removeCookieNotice() {
        try {
            const seletores = [
                '.cookie-consent', '.cc-banner', '.cc-window',
                '.cookie-notice', '.google-cookie-banner', '.cookies-banner',
                '.cookie-banner', '#cookie-banner', '#cookie-notice',
                '.consent-banner', '.gdpr-banner'
            ];

            seletores.forEach(seletor => {
                const elementos = document.querySelectorAll(seletor);
                elementos.forEach(el => {
                    if (el) {
                        el.style.display = 'none';
                        el.style.opacity = '0';
                        el.style.visibility = 'hidden';
                        el.style.pointerEvents = 'none';
                    }
                });
            });

            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                if (el && el.innerText && (
                    el.innerText.includes('cookies do Google') ||
                    el.innerText.includes('Google cookies') ||
                    el.innerText.includes('cookie consent') ||
                    el.innerText.includes('Este site usa cookies')
                )) {
                    el.style.display = 'none';
                    el.style.opacity = '0';
                    el.style.visibility = 'hidden';
                    el.style.pointerEvents = 'none';
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
        const observer = new MutationObserver(function() {
            removeCookieNotice();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    } catch(e) {}

    // ==================== AJUSTES DE LAYOUT ====================
    function adjustViewport() {
        var viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0';
            document.head.appendChild(viewport);
        }
    }

    function adjustImages() {
        var images = document.querySelectorAll('img:not([loading])');
        images.forEach(function(img) {
            img.setAttribute('loading', 'lazy');
        });
    }

    adjustViewport();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', adjustImages);
    } else {
        adjustImages();
    }

    // ==================== ATIVAÇÃO VIA URL ====================
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('theme') === 'on' || urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('📐 Theme Helper ativado');
        } 
        else if (urlParams.get('theme') === 'off' || urlParams.get('spoofer') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('📐 Theme Helper desativado');
            return;
        }
    } catch(e) {}

    // ==================== VERIFICAÇÃO PERSISTENTE ====================
    if (getPersistent(STORAGE_KEY) !== 'true') {
        console.log('📐 Theme Helper: Inativo');
        return;
    }

    // ==================== MODO ATIVO ====================
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

    function optimizePerformance() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 220, 30);
        } catch(e) {}
    }

    let sessionCount = parseInt(localStorage.getItem('theme_session') || '0');
    let currentSessionId = localStorage.getItem('theme_id');

    sessionCount++;

    if (sessionCount >= VISITS_TO_RESET || !currentSessionId) {
        currentSessionId = generateNewSessionId();
        sessionCount = 1;
        clearTracking();
        console.log('📐 Nova sessão');
    }

    localStorage.setItem('theme_session', sessionCount);
    localStorage.setItem('theme_id', currentSessionId);
    setPersistent(STORAGE_KEY, 'true');

    window.themeSessionId = currentSessionId;
    window.currentFakeUserId = currentSessionId;
    optimizePerformance();

    console.log('📐 Theme Helper ativo | Sessão: ' + sessionCount + '/' + VISITS_TO_RESET);

    window.ThemeHelper = {
        getSessionId: () => currentSessionId,
        isActive: () => getPersistent(STORAGE_KEY) === 'true',
        getVisitCount: () => sessionCount,
        getDeviceId: () => currentSessionId
    };

})();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).send(scriptContent);
}

// ==================== ENDPOINT DE DIAGNÓSTICO ====================
app.get('/debug/:scriptId', async (req, res) => {
  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';
  
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;
    
    if (!license) {
      return res.json({
        scriptId,
        existe: false,
        mensagem: 'Licença não encontrada'
      });
    }

    const duration = PLAN_DURATIONS[license.planName] || 0;
    const startTime = license.spooferActivatedAt 
      ? new Date(license.spooferActivatedAt).getTime() 
      : new Date(license.createdAt).getTime();
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, duration - elapsed);

    res.json({
      scriptId,
      existe: true,
      licenca: license,
      diagnostico: {
        ativa: license.active === true,
        planoValido: !!PLAN_DURATIONS[license.planName],
        duracaoTotal: duration + ' segundos',
        tempoDecorrido: Math.floor(elapsed) + ' segundos',
        tempoRestante: Math.floor(remaining) + ' segundos',
        expirado: remaining <= 0,
        domínioValido: referer ? compararDominios(
          extrairDominioSeguro(referer), 
          extrairDominioSeguro(license.domain)
        ) : 'referer ausente'
      }
    });
  } catch (error) {
    res.json({
      scriptId,
      erro: error.message
    });
  }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Theme Helper SEGURO rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/js/theme-adjust.js`);
  console.log(`📡 Debug: https://noti-ias-api00.onrender.com/debug/:id`);
  console.log(`🔒 Validações: domínio exato, plano, expiração, ativação`);
});
