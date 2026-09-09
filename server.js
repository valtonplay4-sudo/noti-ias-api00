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
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Anúncio Fantasma - Servidor</title>
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #030712; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: rgba(15, 23, 42, 0.85); padding: 30px; border-radius: 16px; text-align: center; max-width: 450px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(16px); }
        h2 { color: #38bdf8; margin-bottom: 10px; }
        .status { color: #10b981; font-weight: 700; }
        code { background: #090d16; padding: 4px 10px; border-radius: 4px; color: #38bdf8; font-size: 13px; }
        .footer { margin-top: 15px; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>👻 Anúncio Fantasma</h2>
        <p>Status: <span class="status">✅ Online</span></p>
        <p>Versão: 3.0</p>
        <p>Uptime: ${Math.floor(process.uptime())}s</p>
        <p style="margin-top:15px; font-size:14px;">Para ativar: <code>?spoofer=on</code></p>
        <p>Para desativar: <code>?spoofer=off</code></p>
        <div class="footer">📡 Script: /script/:id.js</div>
      </div>
    </body>
    </html>
  `);
});

// ==================== ENTREGA DO SCRIPT ====================
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  console.log(`[${scriptId}] 📥 Requisição de: ${referer || 'Desconhecido'}`);

  try {
    // ==================== BUSCAR LICENÇA NO FIREBASE ====================
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    console.log(`[${scriptId}] 📋 Licença:`, license ? 'ENCONTRADA' : 'NÃO ENCONTRADA');

    // ==================== LICENÇA NÃO ENCONTRADA ====================
    if (!license) {
      console.log(`[${scriptId}] ❌ Licença não encontrada`);
      return res.status(200).send(`
console.warn("[Anúncio Fantasma] ❌ Licença não encontrada. Contate o suporte.");
      `);
    }

    // ==================== VERIFICAR SE ESTÁ ATIVO ====================
    if (license.active !== true) {
      console.log(`[${scriptId}] ⏳ Licença inativa`);
      return res.status(200).send(`
console.warn("[Anúncio Fantasma] ⏳ Licença inativa. Renove seu plano.");
      `);
    }

    // ==================== VERIFICAR EXPIRAÇÃO ====================
    if (license.expiresAt) {
      const expDate = new Date(license.expiresAt);
      if (Date.now() > expDate.getTime()) {
        console.log(`[${scriptId}] ⏰ Licença expirada`);
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { active: false });
        return res.status(200).send(`
console.warn("[Anúncio Fantasma] ⏰ Licença expirada. Renove seu plano.");
        `);
      }
    }

    // ==================== VALIDAÇÃO DE DOMÍNIO (FLEXÍVEL) ====================
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

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
