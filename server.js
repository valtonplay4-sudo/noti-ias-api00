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
  res.send(`<h2>Servidor Anúncio Fantasma Rodando</h2>`);
});

// -------------------------------------------------------------
// ROTA DE RENDERIZAÇÃO DO SCRIPT
// -------------------------------------------------------------
app.get('/script/:scriptId.js', async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptId = req.params.scriptId;
  const referer = req.get('Referer') || req.get('Origin') || '';

  try {
    const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
    const license = response.data;

    // 1. Se a licença não existir no Firebase
    if (!license) {
      return res.status(200).send(`console.warn("Anúncio Fantasma: Licença não encontrada.");`);
    }

    // 2. REGRA DE SEGURANÇA: Se não for Teste e o Admin NÃO aprovou (active !== true)
    if (!license.isTest && license.active !== true) {
      return res.status(200).send(`console.warn("Anúncio Fantasma: Acesso BLOQUEADO. Licença pendente de aprovação do Administrador.");`);
    }

    // 3. Validação de Expiração (Útil para o Teste Grátis de Minutos ou Planos Expirados)
    if (license.expiresAt && Date.now() > new Date(license.expiresAt).getTime()) {
      return res.status(200).send(`console.warn("Anúncio Fantasma: Tempo limite expirado.");`);
    }

    // 4. Validação de Domínio
    if (referer && license.domain) {
      let cleanReferer = referer.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();
      let cleanAllowedDomain = license.domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0].toLowerCase();

      if (!cleanReferer.includes(cleanAllowedDomain) && !cleanAllowedDomain.includes(cleanReferer)) {
        return res.status(200).send(`console.warn("Anúncio Fantasma: Domínio não autorizado.");`);
      }
    }

    // SCRIPT EXECUTADO NO BLOGGER SE TUDO ESTIVER APROVADO
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

    if (localStorage.getItem(STORAGE_KEY) !== 'true') return;

    function generateNewUserId() {
        return 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    function clearTracking() {
        try {
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                if (name) document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
            sessionStorage.clear();
            localStorage.removeItem('visit_counter');
            localStorage.removeItem('current_device_id');
        } catch(e) {}
    }

    let visitCount = parseInt(localStorage.getItem('visit_counter') || '0') + 1;
    let currentUserId = localStorage.getItem('current_device_id');

    if (visitCount >= VISITS_TO_RESET || !currentUserId) {
        clearTracking();
        currentUserId = generateNewUserId();
        visitCount = 1;
    }

    localStorage.setItem('visit_counter', visitCount.toString());
    localStorage.setItem('current_device_id', currentUserId);
    console.log('[Anúncio Fantasma] Executando Licença: ${scriptId}');
})();
    `;

    return res.status(200).send(scriptContent);

  } catch (error) {
    return res.status(200).send(`console.warn("Anúncio Fantasma: Erro ao conectar ao banco de dados.");`);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
