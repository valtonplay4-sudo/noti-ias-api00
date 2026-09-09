// ==================== server.js COMPLETO ====================
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CORS ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <h2>👻 Servidor Anúncio Fantasma Ativo</h2>
    <p>Status: Online ✅</p>
    <p>Versão: 3.0</p>
    <p>Uptime: ${process.uptime().toFixed(0)}s</p>
  `);
});

// ==================== ENTREGA DO SCRIPT ====================
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  console.log(`[${scriptId}] 📥 Requisição recebida de: ${referer || 'Desconhecido'}`);

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    console.log(`[${scriptId}] 📋 Licença:`, license ? 'ENCONTRADA' : 'NÃO ENCONTRADA');

    if (!license) {
      console.log(`[${scriptId}] ❌ Licença não encontrada`);
      return res.status(200).send(`
console.warn("[Anúncio Fantasma] ❌ Licença não encontrada. Contate o suporte.");
      `);
    }

    // ==================== VERIFICAR PLANO E ATIVAÇÃO ====================
    const isFree = license.planName === 'Grátis';
    
    if (!isFree && license.active !== true) {
      console.log(`[${scriptId}] ⏳ Aguardando aprovação. Plano: ${license.planName}`);
      return res.status(200).send(`
console.warn("[Anúncio Fantasma] ⏳ Aguardando aprovação do Administrador.");
      `);
    }

    // ==================== VERIFICAR EXPIRAÇÃO ====================
    if (license.expiresAt) {
      const expDate = new Date(license.expiresAt);
      if (Date.now() > expDate.getTime()) {
        console.log(`[${scriptId}] ⏰ Licença expirada em: ${license.expiresAt}`);
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { active: false });
        return res.status(200).send(`
console.warn("[Anúncio Fantasma] ⏰ Licença expirada. Renove seu plano.");
        `);
      }
    }

    // ==================== VALIDAR DOMÍNIO (CORRIGIDO) ====================
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

      // 🔥 CORREÇÃO: Verifica se o domínio está contido no referer (mais flexível)
      const isMatch = cleanReferer.includes(cleanDomain) || 
                      cleanDomain.includes(cleanReferer) ||
                      cleanReferer === cleanDomain;

      if (!isMatch) {
        console.log(`[${scriptId}] 🚫 Domínio não autorizado: ${cleanReferer} vs ${cleanDomain}`);
        return res.status(200).send(`
console.warn("[Anúncio Fantasma] 🚫 Domínio não autorizado. Registre seu domínio no portal.");
        `);
      }
    }

    console.log(`[${scriptId}] ✅ Script entregue para: ${license.domain} | Plano: ${license.planName}`);

    // ==================== SCRIPT COMPLETO ====================
    const scriptContent = `
// =============================================
// ANÚNCIO FANTASMA - ${license.domain}
// Plano: ${license.planName}
// Licença: ${scriptId}
// =============================================

(function() {
    'use strict';

    // ==================== CONFIGURAÇÕES ====================
    const STORAGE_KEY = 'user_spoofer_enabled';
    const VISITS_TO_RESET = 2;
    const LICENSE_ID = '${scriptId}';
    const DOMAIN = '${license.domain}';
    const PLAN = '${license.planName}';

    console.log('👻 Anúncio Fantasma carregado!');
    console.log('📋 Licença:', LICENSE_ID);
    console.log('🌐 Domínio:', DOMAIN);
    console.log('📊 Plano:', PLAN);

    // ==================== ATIVAÇÃO VIA URL ====================
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        console.log('🔍 Parâmetros da URL:', urlParams.toString());
        
        if (urlParams.get('spoofer') === 'on') {
            localStorage.setItem(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA ATIVADO!', 'color: #00ff88; font-weight: bold; font-size: 16px;');
            console.log('%c📋 Licença: ' + LICENSE_ID, 'color: #888;');
            console.log('%c🌐 Domínio: ' + DOMAIN, 'color: #888;');
            console.log('%c📊 Plano: ' + PLAN, 'color: #888;');
        } 
        else if (urlParams.get('spoofer') === 'off') {
            localStorage.removeItem(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA DESATIVADO!', 'color: #ff4444; font-weight: bold; font-size: 16px;');
            return;
        }
    } catch(e) {
        console.error('❌ Erro ao processar URL:', e);
    }

    // ==================== VERIFICAÇÃO ====================
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        console.log('%c👻 Anúncio Fantasma: Ative com ?spoofer=on', 'color: #ffaa00; font-weight: bold;');
        return;
    }

    // ==================== FUNÇÕES ====================
    function generateNewUserId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return 'device_' + timestamp + '_' + random;
    }

    function clearTracking() {
        try {
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                if (name) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
            });
            const isActive = localStorage.getItem(STORAGE_KEY);
            localStorage.clear();
            sessionStorage.clear();
            if (isActive === 'true') localStorage.setItem(STORAGE_KEY, 'true');
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

    // ==================== EXECUÇÃO PRINCIPAL ====================
    let visitCount = parseInt(localStorage.getItem('visit_counter') || '0');
    let currentUserId = localStorage.getItem('current_device_id');

    visitCount++;

    if (visitCount >= VISITS_TO_RESET || !currentUserId) {
        currentUserId = generateNewUserId();
        visitCount = 1;
        clearTracking();
        console.log('%c🔄 Dispositivo RESETADO! Novo ID: ' + currentUserId, 'color: #00ff88; font-weight: bold;');
    }

    localStorage.setItem('visit_counter', visitCount);
    localStorage.setItem('current_device_id', currentUserId);
    localStorage.setItem(STORAGE_KEY, 'true');

    window.currentFakeUserId = currentUserId;
    spoofFingerprint();

    console.log('%c👻 Visita ' + visitCount + '/' + VISITS_TO_RESET + ' | ID: ' + currentUserId, 
                'color: #00ff88; font-weight: bold;');

    // ==================== EXPORTA FUNÇÕES ====================
    window.AnuncioFantasma = {
        getDeviceId: () => currentUserId,
        isActive: () => localStorage.getItem(STORAGE_KEY) === 'true',
        getVisitCount: () => visitCount,
        licenseId: LICENSE_ID,
        domain: DOMAIN,
        plan: PLAN
    };

})();
    `;

    return res.status(200).send(scriptContent);

  } catch (error) {
    console.error(`[${scriptId}] 💥 ERRO:`, error.message);
    return res.status(200).send(`
console.error("[Anúncio Fantasma] 💥 Erro interno. Contate o suporte.");
console.error("${error.message}");
    `);
  }
});

// ==================== ENDPOINT DE TESTE ====================
app.get('/test/:scriptId', async (req, res) => {
  const scriptId = req.params.scriptId;
  
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;
    
    res.json({
      id: scriptId,
      found: !!license,
      license: license,
      firebaseUrl: `${FIREBASE_DB_URL}/licenses/${scriptId}.json`
    });
  } catch (error) {
    res.json({
      id: scriptId,
      found: false,
      error: error.message
    });
  }
});

// ==================== ENDPOINT DE STATUS ====================
app.get('/status/:scriptId', async (req, res) => {
  const scriptId = req.params.scriptId;
  
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;
    
    if (!license) {
      return res.status(404).json({ error: 'Licença não encontrada' });
    }

    res.json({
      id: scriptId,
      domain: license.domain,
      plan: license.planName,
      active: license.active,
      expiresAt: license.expiresAt || null,
      isFree: license.planName === 'Grátis',
      createdAt: license.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar status' });
  }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Servidor Anúncio Fantasma rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`📡 Script: https://noti-ias-api00.onrender.com/script/:id.js`);
  console.log(`📡 Teste: https://noti-ias-api00.onrender.com/test/:id`);
});
