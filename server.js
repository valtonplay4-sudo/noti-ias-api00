const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// URL do seu Firebase Realtime Database
const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

// CONFIGURAÇÃO DE AMBIENTE: Altere para 'false' quando quiser ativar o limite de 10 min e trava de dispositivo
const IS_UNLIMITED_TEST_MODE = true; 

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>AdGhost | Servidor Ativo</title>
      <style>
        body { font-family: sans-serif; background: #030712; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #0f172a; padding: 30px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        h2 { color: #a855f7; margin-top: 0; }
        p { color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Servidor AdGhost Ativo</h2>
        <p>Status Teste: ${IS_UNLIMITED_TEST_MODE ? '<b>ILIMITADO (DEV MODE)</b>' : 'PADRÃO (10 MIN)'}</p>
      </div>
    </body>
    </html>
  `);
});

// -------------------------------------------------------------
// ROTA DO SCRIPT GERADO POR ID ÚNICO (/script/:scriptId.js)
// -------------------------------------------------------------
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    if (!license) {
      return res.status(200).send(`console.warn("AdGhost: Licença ou Script inexistente.");`);
    }

    if (license.active === false) {
      return res.status(200).send(`console.warn("AdGhost: Licença desativada pelo Administrador.");`);
    }

    // 1. Validação de Domínio Autorizado
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanAllowedDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

      if (!cleanReferer.includes(cleanAllowedDomain) && !cleanAllowedDomain.includes(cleanReferer)) {
        return res.status(200).send(`console.warn("AdGhost: Domínio [${cleanReferer}] não autorizado.");`);
      }
    }

    // 2. Trava de Dispositivo Único (Preparada para ativação)
    if (!IS_UNLIMITED_TEST_MODE && license.lockToSingleDevice) {
      if (!license.boundDeviceId) {
        // Vincula no primeiro uso
        await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
          boundDeviceId: clientIp
        });
      } else if (license.boundDeviceId !== clientIp) {
        return res.status(200).send(`console.warn("AdGhost: Acesso bloqueado. Esta licença está vinculada a outro dispositivo.");`);
      }
    }

    // 3. Validação de Tempo (Ignorada se IS_UNLIMITED_TEST_MODE for true)
    if (!IS_UNLIMITED_TEST_MODE) {
      if (license.isTest) {
        if (!license.startedAt) {
          const startTime = new Date().toISOString();
          const expirationTime = new Date(Date.now() + (10 * 60 * 1000)).toISOString(); 

          await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, {
            startedAt: startTime,
            expiresAt: expirationTime
          });
        } else if (Date.now() > new Date(license.expiresAt).getTime()) {
          return res.status(200).send(`console.warn("AdGhost: Teste grátis de 10 minutos expirado.");`);
        }
      } else if (license.expiresAt && Date.now() > new Date(license.expiresAt).getTime()) {
        return res.status(200).send(`console.warn("AdGhost: Licença paga expirada.");`);
      }
    }

    // Script JS Executável no Navegador do Leitor/Administrador
    const scriptContent = `
(function() {
    'use strict';

    const STORAGE_KEY = 'user_spoofer_enabled';
    const VISITS_TO_RESET = 2;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('spoofer') === 'on') {
            localStorage.setItem(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('spoofer') === 'off') {
            localStorage.removeItem(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
    } catch(e) {}

    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        return;
    }

    function generateNewUserId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    function clearTracking() {
        try {
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                if (name) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
            });
            sessionStorage.clear();
            localStorage.removeItem('visit_counter');
            localStorage.removeItem('current_device_id');
        } catch(e) {}
    }

    function spoofFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16);
                ctx.fillRect(0, 0, 220, 30);
            }
        } catch(e) {}
    }

    let visitCount = parseInt(localStorage.getItem('visit_counter') || '0');
    let currentUserId = localStorage.getItem('current_device_id');

    visitCount++;

    if (visitCount >= VISITS_TO_RESET || !currentUserId) {
        clearTracking();
        currentUserId = generateNewUserId();
        visitCount = 1;
    }

    localStorage.setItem('visit_counter', visitCount.toString());
    localStorage.setItem('current_device_id', currentUserId);

    window.currentFakeUserId = currentUserId;
    spoofFingerprint();

    console.log('[AdGhost Ativo] ID: ${scriptId} | Dispositivo: ' + currentUserId);
})();
    `;

    return res.status(200).send(scriptContent);

  } catch (error) {
    return res.status(200).send(`console.warn("AdGhost: Erro no servidor de licenças.");`);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor AdGhost rodando na porta ${PORT}`);
});
