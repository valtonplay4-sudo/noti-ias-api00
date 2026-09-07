const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Firebase Database Realtime URL
const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

// -------------------------------------------------------------
// 1. PÁGINA INFORMATIVA INICIAL (HOME)
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AdGhost | Servidor Ativo</title>
      <style>
        body { font-family: sans-serif; background: #030712; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #0f172a; padding: 30px; border-radius: 16px; text-align: center; max-width: 420px; border: 1px solid rgba(255,255,255,0.1); }
        h2 { margin-top: 0; color: #a855f7; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Servidor AdGhost Ativo</h2>
        <p>Aguardando chamadas de scripts individuais por ID único.</p>
      </div>
    </body>
    </html>
  `);
});

// -------------------------------------------------------------
// 2. ROTA DINÂMICA UNIVERSAL GERADA PELO ADM (:scriptId.js)
// -------------------------------------------------------------
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  try {
    // Busca a licença vinculada a este ID único no Firebase
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    // Se o ID não existir ou estiver inativo
    if (!license) {
      return res.status(200).send(`console.warn("AdGhost: Script ID inexistente ou cancelado.");`);
    }
    if (license.active === false) {
      return res.status(200).send(`console.warn("AdGhost: Licença inativa pelo Administrador.");`);
    }

    // Validação de Domínio (Garante que só roda no Blogger cadastrado)
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanAllowedDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

      if (!cleanReferer.includes(cleanAllowedDomain) && !cleanAllowedDomain.includes(cleanReferer)) {
        return res.status(200).send(`console.warn("AdGhost: Domínio [${cleanReferer}] não autorizado para este Script.");`);
      }
    }

    // Controle do Teste Grátis de 10 Minutos (Ativa contagem no 1º acesso no blog)
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

    // CÓDIGO JS PRINCIPAL ENTREGUE AO BLOGGER
    const scriptContent = `
(function() {
    'use strict';

    const STORAGE_KEY = 'user_spoofer_enabled';
    const VISITS_TO_RESET = 2;

    // 1. Identifica os comandos de ativação pela URL do blog (?spoofer=on / ?spoofer=off)
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

    // 2. Bloqueia a execução para leitores normais (só roda se este navegador usou ?spoofer=on)
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        return;
    }

    // 3. Simulador/Spoofer para o dispositivo ativado
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

    console.log('[AdGhost Ativo] ID do Script: ${scriptId} | Dispositivo: ' + currentUserId);
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
