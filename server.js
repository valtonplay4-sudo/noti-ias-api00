// ==================== BACKEND SEGURO v4.1 ====================
// + Plano PERMANENTE (Infinity)
// + Multi-domínio (domains[], allDomains)
// + Ativação por spoofer (timer começa na ativação)
// ============================================================
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
  'Grátis': 600,
  'Diário': 86400,
  'Semanal': 604800,
  'Mensal': 2592000,
  'Permanente': Infinity
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
        <p style="color:#94a3b8;font-size:14px;">Versão: 4.1 (Permanente + Ativação)</p>
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

// ==================== 🔥 ENDPOINT DE ATIVAÇÃO ====================
app.post('/register-activation/:scriptId', async (req, res) => {
  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    if (!license) {
      return res.status(404).json({ ok: false, msg: 'Licença não encontrada' });
    }

    const cleanReferer = extrairDominioSeguro(referer);
    if (!isDominioAutorizado(cleanReferer, license)) {
      return res.status(403).json({ ok: false, msg: 'Domínio não autorizado' });
    }

    // Se já tem spooferActivatedAt, não mexe
    if (license.spooferActivatedAt) {
      return res.json({ 
        ok: true, 
        msg: 'Já registrado', 
        spooferActivatedAt: license.spooferActivatedAt 
      });
    }

    const agora = new Date().toISOString();
    await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
      spooferActivatedAt: agora
    });

    console.log(`🎬 [${scriptId}] Ativação registrada: ${cleanReferer} → ${agora}`);

    res.json({ ok: true, msg: 'Ativação registrada', spooferActivatedAt: agora });

  } catch (error) {
    console.error(`💥 [${scriptId}] Erro ao registrar ativação:`, error.message);
    res.status(500).json({ ok: false, msg: error.message });
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

    // VALIDAÇÃO 1: Ativa?
    if (license.active !== true) {
      return sendBlockedScript(res, "Aguardando aprovação do Administrador");
    }

    // VALIDAÇÃO 2: Expiração
    const isPermanent = license.planName === 'Permanente';

    if (!isPermanent) {
      const duration = PLAN_DURATIONS[license.planName];
      if (!duration || duration === Infinity) {
        return sendBlockedScript(res, "Plano inválido");
      }

      const startTime = license.spooferActivatedAt 
        ? new Date(license.spooferActivatedAt).getTime() 
        : new Date(license.createdAt).getTime();
      
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        console.log(`⏰ [${scriptId}] EXPIRADO. Desativando...`);
        
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          active: false,
          expiredAt: new Date().toISOString(),
          reason: 'Tempo expirado'
        });
        
        return sendBlockedScript(res, "Plano expirado. Renove seu plano.");
      }
    } else {
      console.log(`♾️ [${scriptId}] Plano PERMANENTE — sem expiração`);
    }

    // VALIDAÇÃO 3: Domínios
    if (referer) {
      const cleanReferer = extrairDominioSeguro(referer);

      if (!isDominioAutorizado(cleanReferer, license)) {
        console.log(`🚫 [${scriptId}] Domínio não autorizado: ${cleanReferer}`);
        return sendBlockedScript(res, "Domínio não autorizado");
      }

      if (license.allDomains === true) {
        console.log(`✅ [${scriptId}] allDomains=true → ${cleanReferer}`);
      } else if (Array.isArray(license.domains) && license.domains.length > 0) {
        console.log(`✅ [${scriptId}] Domínio na lista: ${cleanReferer}`);
      } else if (license.domain) {
        console.log(`✅ [${scriptId}] Domínio único: ${cleanReferer}`);
      }
    }

    // Log final
    let logRemaining = '∞ (permanente)';
    if (!isPermanent) {
      const duration = PLAN_DURATIONS[license.planName];
      const startTime = license.spooferActivatedAt 
        ? new Date(license.spooferActivatedAt).getTime() 
        : new Date(license.createdAt).getTime();
      const elapsed = (Date.now() - startTime) / 1000;
      logRemaining = Math.floor(duration - elapsed) + 's';
    }

    console.log(`✅ [${scriptId}] Script entregue. Restam ${logRemaining}`);
    return sendScript(res, scriptId, license, referer);

  } catch (error) {
    console.error(`💥 [${scriptId}] ERRO:`, error.message);
    return sendBlockedScript(res, "Erro interno");
  }
}

// ==================== HELPER: DOMÍNIO AUTORIZADO? ====================
function isDominioAutorizado(cleanReferer, license) {
  // Caso 1: "Todos os domínios"
  if (license.allDomains === true) {
    return true;
  }

  // Caso 2: Lista (array)
  if (Array.isArray(license.domains) && license.domains.length > 0) {
    for (const d of license.domains) {
      const cleanD = extrairDominioSeguro(d);
      if (cleanD && compararDominios(cleanReferer, cleanD)) {
        return true;
      }
    }
    return false;
  }

  // Caso 3: Domínio único
  if (license.domain) {
    const cleanDomain = extrairDominioSeguro(license.domain);
    return compararDominios(cleanReferer, cleanDomain);
  }

  // Caso 4: Sem restrição
  return true;
}

// ==================== CRON: EXPIRAÇÃO AUTOMÁTICA ====================
async function verificarExpiracaoGlobal() {
  try {
    console.log('🔍 [CRON] Verificando expiração...');
    
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    
    if (!licenses) {
      console.log('📭 Nenhuma licença encontrada');
      return;
    }

    let totalVerificadas = 0;
    let totalExpiradas = 0;
    let totalPermanentes = 0;

    for (const [scriptId, license] of Object.entries(licenses)) {
      totalVerificadas++;
      
      if (license.active !== true) continue;

      if (license.planName === 'Permanente') {
        totalPermanentes++;
        continue;
      }

      const duration = PLAN_DURATIONS[license.planName];
      if (!duration || duration === Infinity) continue;

      const startTime = license.spooferActivatedAt 
        ? new Date(license.spooferActivatedAt).getTime() 
        : new Date(license.createdAt).getTime();
      
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        console.log(`⏰ [CRON] ${scriptId} EXPIROU. Desativando...`);
        
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          active: false,
          expiredAt: new Date().toISOString(),
          reason: 'Expiração automática (CRON)'
        });
        
        totalExpiradas++;
      }
    }

    console.log(`✅ [CRON] ${totalVerificadas} verificadas, ${totalExpiradas} expiradas, ${totalPermanentes} permanentes`);
  } catch (error) {
    console.error('💥 [CRON] Erro:', error.message);
  }
}

setInterval(verificarExpiracaoGlobal, 60000);
setTimeout(verificarExpiracaoGlobal, 5000);

// ==================== REVOGAR TODAS ====================
app.post('/admin/revogar-todas', async (req, res) => {
  const { confirmacao } = req.body;
  
  if (confirmacao !== 'REVOGAR_TODAS_AGORA') {
    return res.status(400).json({ 
      erro: 'Confirmação inválida' 
    });
  }

  try {
    console.log('🚨 [ADMIN] REVOGANDO TODAS...');
    
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    
    if (!licenses) {
      return res.json({ mensagem: 'Nenhuma licença', total: 0 });
    }

    const updates = {};
    let total = 0;

    for (const scriptId of Object.keys(licenses)) {
      updates[`${scriptId}/active`] = false;
      updates[`${scriptId}/revogadaEm`] = new Date().toISOString();
      updates[`${scriptId}/revogadaMotivo`] = 'Revogação em massa';
      total++;
    }

    await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);

    console.log(`✅ [ADMIN] ${total} revogadas`);
    
    res.json({
      sucesso: true,
      mensagem: `✅ ${total} licenças revogadas`,
      total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ==================== REATIVAR TODAS ====================
app.post('/admin/reativar-todas', async (req, res) => {
  const { confirmacao } = req.body;
  
  if (confirmacao !== 'REATIVAR_TODAS_AGORA') {
    return res.status(400).json({ erro: 'Confirmação inválida' });
  }

  try {
    console.log('🚨 [ADMIN] REATIVANDO TODAS...');
    
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    
    if (!licenses) {
      return res.json({ mensagem: 'Nenhuma licença', total: 0 });
    }

    const updates = {};
    let total = 0;
    const agora = new Date().toISOString();

    for (const scriptId of Object.keys(licenses)) {
      updates[`${scriptId}/active`] = true;
      updates[`${scriptId}/createdAt`] = agora;
      updates[`${scriptId}/spooferActivatedAt`] = null;
      updates[`${scriptId}/expiredAt`] = null;
      updates[`${scriptId}/revogadaEm`] = null;
      updates[`${scriptId}/reativadaEm`] = agora;
      total++;
    }

    await axios.patch(`${FIREBASE_DB_URL}/licenses.json`, updates);

    console.log(`✅ [ADMIN] ${total} reativadas`);
    
    res.json({
      sucesso: true,
      mensagem: `✅ ${total} licenças reativadas`,
      total,
      timestamp: agora
    });

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ==================== DIAGNÓSTICO ====================
app.get('/admin/diagnostico', async (req, res) => {
  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses.json`);
    const licenses = response.data;
    
    if (!licenses) {
      return res.json({ total: 0, licencas: [] });
    }

    const diagnostico = Object.entries(licenses).map(([scriptId, lic]) => {
      const isPermanent = lic.planName === 'Permanente';
      const duration = isPermanent ? Infinity : (PLAN_DURATIONS[lic.planName] || 0);
      
      let remaining = Infinity;
      if (!isPermanent && duration !== Infinity) {
        const startTime = lic.spooferActivatedAt 
          ? new Date(lic.spooferActivatedAt).getTime() 
          : new Date(lic.createdAt).getTime();
        const elapsed = (Date.now() - startTime) / 1000;
        remaining = Math.max(0, duration - elapsed);
      }

      return {
        scriptId,
        domain: lic.domain || null,
        domains: lic.domains || null,
        allDomains: lic.allDomains || false,
        plano: lic.planName,
        ativa: lic.active === true,
        permanente: isPermanent,
        spooferActivatedAt: lic.spooferActivatedAt || null,
        duracao: isPermanent ? '∞' : duration + 's',
        restante: isPermanent ? '∞' : Math.floor(remaining) + 's',
        expirada: isPermanent ? false : remaining <= 0
      };
    });

    res.json({
      total: diagnostico.length,
      ativas: diagnostico.filter(d => d.ativa).length,
      permanentes: diagnostico.filter(d => d.permanente).length,
      expiradas: diagnostico.filter(d => d.expirada).length,
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
      // Passo 1: match exato de domain
      for (const [key, lic] of Object.entries(allLicenses.data)) {
        if (!lic.active) continue;
        if (lic.domain) {
          const licDomain = extrairDominioSeguro(lic.domain);
          if (compararDominios(cleanDomain, licDomain)) {
            return key;
          }
        }
      }

      // Passo 2: match em domains[]
      for (const [key, lic] of Object.entries(allLicenses.data)) {
        if (!lic.active) continue;
        if (Array.isArray(lic.domains) && lic.domains.length > 0) {
          for (const d of lic.domains) {
            const licDomain = extrairDominioSeguro(d);
            if (compararDominios(cleanDomain, licDomain)) {
              return key;
            }
          }
        }
      }

      // Passo 3: allDomains (fallback)
      for (const [key, lic] of Object.entries(allLicenses.data)) {
        if (!lic.active) continue;
        if (lic.allDomains === true) return key;
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

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Theme Helper v4.1 rodando na porta ${PORT}`);
  console.log(`📡 Health: https://noti-ias-api00.onrender.com/`);
  console.log(`♾️ Plano PERMANENTE habilitado`);
  console.log(`🎬 Ativação: POST /register-activation/:scriptId`);
  console.log(`🔒 Expiração: a cada 60 segundos`);
  console.log(`📊 Diagnóstico: /admin/diagnostico`);
});
