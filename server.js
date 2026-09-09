// ==================== BACKEND COMPLETO COM PERSISTÊNCIA ====================
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
    <h2>👻 Servidor Anúncio Fantasma Ativo</h2>
    <p>Status: Online ✅</p>
    <p>Versão: 3.0</p>
    <p>Uptime: ${process.uptime().toFixed(0)}s</p>
  `);
});

// ==================== ENTREGA DO SCRIPT ====================
app.get('/script/:scriptId.js', async (req, res) => {
    const scriptId = req.params.scriptId;
    const referer = req.get('Referer') || req.get('Origin') || '';

    console.log(`[${scriptId}] 📥 Requisição de: ${referer || 'Desconhecido'}`);

    // 🔥 VALIDAÇÃO AUTOMÁTICA
    try {
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
console.error("[Anúncio Fantasma] 💥 Erro interno. Contate o suporte.");
        `);
    }
});

// ==================== FUNÇÃO PARA ENTREGAR O SCRIPT ====================
function sendScript(res, scriptId, license, referer) {
    const scriptContent = `
// =============================================
// ANÚNCIO FANTASMA - ${license.domain || 'Desconhecido'}
// Plano: ${license.planName || 'Grátis'}
// Licença: ${scriptId}
// =============================================

(function() {
    'use strict';

    const STORAGE_KEY = 'user_spoofer_enabled';
    const VISITS_TO_RESET = 2;
    const LICENSE_ID = '${scriptId}';
    const DOMAIN = '${license.domain || 'Desconhecido'}';
    const PLAN = '${license.planName || 'Grátis'}';

    // ==================== STORAGE PERSISTENTE (COOKIE + LOCALSTORAGE) ====================
    function getPersistent(key) {
        // Tenta localStorage primeiro
        let value = localStorage.getItem(key);
        if (value) return value;
        
        // Depois tenta cookie
        const cookie = document.cookie.split('; ').find(row => row.startsWith(key + '='));
        if (cookie) {
            value = decodeURIComponent(cookie.split('=')[1]);
            localStorage.setItem(key, value); // Restaura no localStorage
            return value;
        }
        
        return null;
    }

    function setPersistent(key, value) {
        try {
            localStorage.setItem(key, value);
            document.cookie = key + '=' + encodeURIComponent(value) + ';path=/;max-age=31536000'; // 1 ano
        } catch(e) {}
    }

    function deletePersistent(key) {
        localStorage.removeItem(key);
        document.cookie = key + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }

    // ==================== REMOVER AVISO DE COOKIES AUTOMATICAMENTE ====================
    function removerAvisoCookies() {
        try {
            // Remove banners de cookies do Google
            const seletores = [
                '.cookie-consent',
                '.cc-banner',
                '.cc-window',
                '.cookie-notice',
                '.google-cookie-banner',
                '.cookies-banner',
                '.cookie-banner',
                '#cookie-banner',
                '#cookie-notice',
                '.consent-banner',
                '.gdpr-banner'
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

            // Remove também por texto (fallback)
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

    // Executa imediatamente
    removerAvisoCookies();

    // Executa novamente após o DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removerAvisoCookies);
    }

    // Executa novamente após o carregamento completo
    window.addEventListener('load', function() {
        setTimeout(removerAvisoCookies, 1000);
        setTimeout(removerAvisoCookies, 3000);
    });

    // Observer para remover banners que aparecem depois
    try {
        const observer = new MutationObserver(function() {
            removerAvisoCookies();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    } catch(e) {}

    console.log('👻 Anúncio Fantasma carregado!');
    console.log('📋 Licença:', LICENSE_ID);
    console.log('🌐 Domínio:', DOMAIN);
    console.log('📊 Plano:', PLAN);
    console.log('🍪 Aviso de cookies removido automaticamente!');

    // ==================== ATIVAÇÃO VIA URL ====================
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('spoofer') === 'on') {
            setPersistent(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA ATIVADO!', 'color: #00ff88; font-weight: bold; font-size: 16px;');
            alert('✅ Anúncio Fantasma ATIVADO neste dispositivo!');
        } 
        else if (urlParams.get('spoofer') === 'off') {
            deletePersistent(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA DESATIVADO!', 'color: #ff4444; font-weight: bold; font-size: 16px;');
            alert('❌ Anúncio Fantasma DESATIVADO neste dispositivo!');
            return;
        }
    } catch(e) {
        console.error('❌ Erro ao processar URL:', e);
    }

    // ==================== VERIFICAÇÃO PERSISTENTE ====================
    // 🔥 MESMO DEPOIS DE LIMPAR OS DADOS, O COOKIE RECUPERA A ATIVAÇÃO
    if (getPersistent(STORAGE_KEY) !== 'true') {
        console.log('%c👻 Anúncio Fantasma: Ative com ?spoofer=on', 'color: #ffaa00; font-weight: bold;');
        return;
    }

    // ==================== FUNÇÕES ====================
    function generateNewUserId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    function clearTracking() {
        try {
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                if (name) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
            });
            const isActive = getPersistent(STORAGE_KEY);
            localStorage.clear();
            sessionStorage.clear();
            if (isActive === 'true') setPersistent(STORAGE_KEY, 'true');
        } catch(e) {}
    }

    function spoofFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 220, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Device ' + Math.random().toString(36).substring(2, 7), 10, 20);
        } catch(e) {}
    }

    // ==================== EXECUÇÃO ====================
    let visitCount = parseInt(localStorage.getItem('visit_counter') || '0');
    let currentUserId = localStorage.getItem('current_device_id');

    visitCount++;

    if (visitCount >= VISITS_TO_RESET || !currentUserId) {
        currentUserId = generateNewUserId();
        visitCount = 1;
        clearTracking();
        console.log('%c🔄 Dispositivo RESETADO!', 'color: #00ff88; font-weight: bold;');
    }

    localStorage.setItem('visit_counter', visitCount);
    localStorage.setItem('current_device_id', currentUserId);
    setPersistent(STORAGE_KEY, 'true');

    window.currentFakeUserId = currentUserId;
    spoofFingerprint();

    console.log('%c👻 Visita ' + visitCount + '/' + VISITS_TO_RESET + ' | ID: ' + currentUserId, 
                'color: #00ff88; font-weight: bold;');

    window.AnuncioFantasma = {
        getDeviceId: () => currentUserId,
        isActive: () => getPersistent(STORAGE_KEY) === 'true',
        getVisitCount: () => visitCount,
        licenseId: LICENSE_ID,
        domain: DOMAIN,
        plan: PLAN
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
  console.log(`🚀 Servidor Anúncio Fantasma rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/script/:id.js`);
});
