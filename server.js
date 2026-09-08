const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const FIREBASE_DB_URL = "https://maestro-server-pro-default-rtdb.firebaseio.com";

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<h2>Servidor Anúncio Fantasma Ativo</h2>`);
});

// -------------------------------------------------------------
// ENTREGA DO SCRIPT
// -------------------------------------------------------------
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    // 1. Licença não encontrada
    if (!license) {
      return res.status(200).send(`console.warn("[Anúncio Fantasma] Licença não encontrada.");`);
    }

    // 2. Bloqueio se não for teste e o Admin não aprovou (active !== true)
    if (!license.isTest && license.active !== true) {
      return res.status(200).send(`console.warn("[Anúncio Fantasma] BLOQUEADO: Aguardando aprovação do Administrador.");`);
    }

    // 3. Validação de Expiração de Tempo
    if (license.expiresAt && Date.now() > new Date(license.expiresAt).getTime()) {
      return res.status(200).send(`console.warn("[Anúncio Fantasma] Licença expirada.");`);
    }

    // 4. Trava de Único Dispositivo (Vincula ao primeiro IP de uso)
    if (!license.boundDevice) {
      // Registra o primeiro dispositivo
      await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { boundDevice: clientIp });
    } else if (license.boundDevice !== clientIp) {
      return res.status(200).send(`console.warn("[Anúncio Fantasma] BLOQUEADO: Esta licença só pode ser usada em um único dispositivo.");`);
    }

    // 5. Validação de Domínio
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanAllowedDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

      if (!cleanReferer.includes(cleanAllowedDomain) && !cleanAllowedDomain.includes(cleanReferer)) {
        return res.status(200).send(`console.warn("[Anúncio Fantasma] Domínio não autorizado.");`);
      }
    }

    // SCRIPT EXATO ENVIADO AO BLOGGER (Preservado da versão antiga)
    const scriptContent = `
(function() {
    'use strict';

    const STORAGE_KEY = 'user_spoofer_enabled';
    const VISITS_TO_RESET = 2;

    // LÓGICA DO ATIVADOR ?spoofer=on NA URL DO BLOG
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

    // SE O SPOOFER NÃO FOI ATIVADO VIA LINK, INTERROMPE O EXECUTÁVEL
    if (localStorage.getItem(STORAGE_KEY) !== 'true') return;

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
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {}
    }

    function spoofFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16);
            ctx.fillRect(0, 0, 220, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Device ' + Math.random().toString(36).substr(2, 6), 10, 20);
        } catch(e) {}
    }

    let visitCount = parseInt(localStorage.getItem('visit_counter') || '0');
    let currentUserId = localStorage.getItem('current_device_id');

    visitCount++;

    if (visitCount >= VISITS_TO_RESET || !currentUserId) {
        currentUserId = generateNewUserId();
        visitCount = 1;
        clearTracking();
    }

    localStorage.setItem('visit_counter', visitCount);
    localStorage.setItem('current_device_id', currentUserId);
    localStorage.setItem(STORAGE_KEY, 'true');

    window.currentFakeUserId = currentUserId;

    spoofFingerprint();

    console.log('%c[Custom Ads] Visita ' + visitCount + '/' + VISITS_TO_RESET + ' | Device ID: ' + currentUserId, 'color: #00ff88; font-weight: bold');
})();
    `;

    return res.status(200).send(scriptContent);

  } catch (error) {
    return res.status(200).send(`console.warn("[Anúncio Fantasma] Erro de banco de dados.");`);
  }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
