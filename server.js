// ==================== BACKEND COMPLETO COM PERSISTÊNCIA E DISFARCE ====================
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

// ==================== DURAÇÃO DOS PLANOS ====================
const PLAN_DURATIONS = {
  'Grátis': 600,
  'Diário': 86400,
  'Semanal': 604800,
  'Mensal': 2592000
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
        <p style="color:#94a3b8;font-size:14px;">Versão: 1.0.0</p>
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

// 🔥 COMPATIBILIDADE COM ROTA ANTIGA (mantém funcionando)
app.get('/script/:scriptId.js', async (req, res) => {
    const scriptId = req.params.scriptId;
    const referer = req.get('Referer') || req.get('Origin') || '';
    console.log(`[${scriptId}] 📥 Requisição (rota antiga) de: ${referer || 'Desconhecido'}`);
    
    // Redireciona para a nova lógica
    await handleScriptInternal(req, res, scriptId);
});

// ==================== FUNÇÃO PRINCIPAL ====================
async function handleScript(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  let scriptId = req.query.id;
  const referer = req.get('Referer') || req.get('Origin') || '';

  // Se não tiver ID, buscar pelo domínio
  if (!scriptId && referer) {
    scriptId = await buscarLicencaPorDominio(referer);
  }

  console.log(`[${scriptId}] 📥 Requisição de: ${referer || 'Desconhecido'}`);

  await handleScriptInternal(req, res, scriptId);
}

// ==================== LÓGICA INTERNA (ORIGINAL) ====================
async function handleScriptInternal(req, res, scriptId) {
    const referer = req.get('Referer') || req.get('Origin') || '';

    // 🔥 VALIDAÇÃO AUTOMÁTICA
    try {
        if (!scriptId) {
            return sendScript(res, 'desconhecido', { domain: 'desconhecido', planName: 'Grátis' }, referer);
        }

        const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
        const license = response.data;

        // 🔥 SE NÃO EXISTIR, CRIA UMA LICENÇA AUTOMATICAMENTE
        if (!license) {
            console.log(`[${scriptId}] ⚠️ Licença não encontrada. Criando automaticamente...`);
            
            const newLicense = {
                id: scriptId,
                active: true,
                domain: referer ? referer.replace(/^https?:\/\//, '').split('/')[0] : 'dominio-desconhecido',
                planName: 'Grátis',
                planType: 'free',
                price: '0',
                createdAt: new Date().toISOString(),
                expiresAt: null,
                userId: 'auto_created',
                userName: 'Usuário Automático'
            };

            await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, newLicense);
            console.log(`[${scriptId}] ✅ Licença criada automaticamente!`);
            
            return sendScript(res, scriptId, newLicense, referer);
        }

        // 🔥 SE EXISTIR, VERIFICA SE ESTÁ ATIVA
        if (license.active !== true) {
            console.log(`[${scriptId}] ⏳ Licença inativa. Ativando automaticamente...`);
            await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { active: true });
            license.active = true;
            console.log(`[${scriptId}] ✅ Licença ativada automaticamente!`);
        }

        // 🔥 VERIFICA EXPIRAÇÃO E RENOVA AUTOMATICAMENTE
        if (license.expiresAt) {
            const expDate = new Date(license.expiresAt);
            if (Date.now() > expDate.getTime()) {
                console.log(`[${scriptId}] ⏰ Licença expirada. Renovando automaticamente...`);
                const duration = PLAN_DURATIONS[license.planName] || 86400;
                const newExpiresAt = new Date(Date.now() + duration * 1000).toISOString();
                await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { 
                    active: true,
                    expiresAt: newExpiresAt
                });
                license.expiresAt = newExpiresAt;
                license.active = true;
                console.log(`[${scriptId}] ✅ Licença renovada automaticamente!`);
            }
        }

        // 🔥 VALIDA DOMÍNIO (FLEXÍVEL)
        if (referer && license.domain) {
            let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
            let cleanDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

            const isMatch = cleanReferer.includes(cleanDomain) || 
                            cleanDomain.includes(cleanReferer) ||
                            cleanReferer === cleanDomain;

            if (!isMatch) {
                console.log(`[${scriptId}] 🚫 Domínio não autorizado. Atualizando automaticamente...`);
                await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { 
                    domain: cleanReferer 
                });
                license.domain = cleanReferer;
                console.log(`[${scriptId}] ✅ Domínio atualizado automaticamente!`);
            }
        }

        // 🔥 ENTREGA O SCRIPT
        return sendScript(res, scriptId, license, referer);

    } catch (error) {
        console.error(`[${scriptId}] 💥 ERRO:`, error.message);
        return res.status(200).send(`
console.error("[Theme Helper] 💥 Erro interno. Contate o suporte.");
        `);
    }
}

// ==================== BUSCAR LICENÇA POR DOMÍNIO ====================
async function buscarLicencaPorDominio(referer) {
  try {
    const cleanDomain = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
    const allLicenses = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    
    if (allLicenses.data) {
      for (const [key, lic] of Object.entries(allLicenses.data)) {
        if (lic.domain && cleanDomain.includes(lic.domain.replace(/^https?:\/\//, '').split('/')[0])) {
          return key;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ==================== FUNÇÃO PARA ENTREGAR O SCRIPT (DISFARÇADO) ====================
function sendScript(res, scriptId, license, referer) {
    const scriptContent = `
// =============================================
// 📐 Theme Helper - Ajustes de Layout
// Versão: 1.0.0
// =============================================

(function() {
    'use strict';

    const STORAGE_KEY = 'theme_active';
    const VISITS_TO_RESET = 2;
    const LICENSE_ID = '${scriptId}';
    const DOMAIN = '${license.domain || 'Desconhecido'}';
    const PLAN = '${license.planName || 'Grátis'}';

    // ==================== STORAGE PERSISTENTE (COOKIE + LOCALSTORAGE) ====================
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

    // ==================== REMOVER AVISO DE COOKIES AUTOMATICAMENTE ====================
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

    console.log('📐 Theme Helper carregado');
    console.log('🎨 Tema:', DOMAIN);

    // ==================== AJUSTES DE LAYOUT (DISFARCE) ====================
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

    function adjustLinks() {
        var links = document.querySelectorAll('a[href^="http"]:not([target])');
        links.forEach(function(link) {
            if (link.hostname !== window.location.hostname) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener');
            }
        });
    }

    // Aplicar ajustes básicos SEMPRE
    adjustViewport();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            adjustImages();
            adjustLinks();
        });
    } else {
        adjustImages();
        adjustLinks();
    }

    // ==================== ATIVAÇÃO VIA URL ====================
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 🔥 NOVO PARÂMETRO DISFARÇADO
        if (urlParams.get('theme') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('📐 Theme Helper ativado');
        } 
        else if (urlParams.get('theme') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('📐 Theme Helper desativado');
            return;
        }
        
        // 🔥 COMPATIBILIDADE COM PARÂMETRO ANTIGO
        if (urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('📐 Theme Helper ativado');
        } 
        else if (urlParams.get('spoofer') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('📐 Theme Helper desativado');
            return;
        }
    } catch(e) {}

    // ==================== VERIFICAÇÃO PERSISTENTE ====================
    if (getPersistent(STORAGE_KEY) !== 'true') {
        console.log('📐 Theme Helper (modo passivo)');
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
        console.log('📐 Nova sessão de tema');
    }

    localStorage.setItem('theme_session', sessionCount);
    localStorage.setItem('theme_id', currentSessionId);
    setPersistent(STORAGE_KEY, 'true');

    window.themeSessionId = currentSessionId;
    window.currentFakeUserId = currentSessionId;
    optimizePerformance();

    console.log('📐 Theme Helper ativo | Sessão: ' + sessionCount + '/' + VISITS_TO_RESET);

    // API disfarçada
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
    res.status(200).send(scriptContent);
}

// ==================== FUNÇÕES AUXILIARES ====================
function extrairDominio(url) {
  if (!url) return 'desconhecido';
  return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
}

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Theme Helper rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/js/theme-adjust.js`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/js/layout-helper.js`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/js/responsive-fix.js`);
  console.log(`📡 Rota antiga: https://noti-ias-api00.onrender.com/script/:id.js`);
});
