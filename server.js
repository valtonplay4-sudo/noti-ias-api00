const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Firebase Realtime Database
const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Anúncio Fantasma | API</title>
      <style>
        body { font-family: sans-serif; background: #030712; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #0f172a; padding: 30px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        h2 { color: #a855f7; margin-top: 0; }
        p { color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Servidor Anúncio Fantasma Ativo</h2>
        <p>Validação de Licenças em Tempo Real Conectada ao Firebase</p>
      </div>
    </body>
    </html>
  `);
});

// -------------------------------------------------------------
// ROTA DO SCRIPT DO BLOGGER (/script/:scriptId.js)
// -------------------------------------------------------------
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    // 1. Se a licença não existe
    if (!license) {
      return res.status(200).send(`console.warn("Anúncio Fantasma: Licença não encontrada.");`);
    }

    // 2. BLOQUEIO OBRIGATÓRIO: Se o ADMIN ainda não aprovou (active === false)
    if (license.active !== true) {
      return res.status(200).send(`console.warn("Anúncio Fantasma: Licença PENDENTE de aprovação do Administrador.");`);
    }

    // 3. Validação de Domínio Autorizado
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanAllowedDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

      if (!cleanReferer.includes(cleanAllowedDomain) && !cleanAllowedDomain.includes(cleanReferer)) {
        return res.status(200).send(`console.warn("Anúncio Fantasma: Domínio [${cleanReferer}] não autorizado para esta licença.");`);
      }
    }

    // 4. Validação de Validade / Expiração
    if (license.expiresAt && Date.now() > new Date(license.expiresAt).getTime()) {
      return res.status(200).send(`console.warn("Anúncio Fantasma: Licença expirada.");`);
    }

    // SE APROVADO PELO ADMIN E VÁLIDO: Executa o Script no Blogger
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

    console.log('[Anúncio Fantasma Ativo] Licença Aprovada ID: ${scriptId}');
})();
    `;

    return res.status(200).send(scriptContent);

  } catch (error) {
    return res.status(200).send(`console.warn("Anúncio Fantasma: Erro interno de validação no servidor.");`);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Anúncio Fantasma rodando na porta ${PORT}`);
});
