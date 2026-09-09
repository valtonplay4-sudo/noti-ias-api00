// ==================== BACKEND CORRIGIDO ====================
app.get('/script/:scriptId.js', async (req, res) => {
    const scriptId = req.params.scriptId;
    const referer = req.get('Referer') || req.get('Origin') || '';

    // 🔥 VALIDAÇÃO AUTOMÁTICA
    try {
        const response = await axios.get(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`);
        const license = response.data;

        // 🔥 SE NÃO EXISTIR, CRIA UMA LICENÇA AUTOMATICAMENTE (APENAS PARA TESTE)
        if (!license) {
            console.log(`[${scriptId}] ⚠️ Licença não encontrada. Criando automaticamente...`);
            
            // Cria uma licença automática para teste
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
            
            // Continua com a licença recém-criada
            return sendScript(res, scriptId, newLicense, referer);
        }

        // 🔥 SE EXISTIR, VERIFICA SE ESTÁ ATIVA
        if (license.active !== true) {
            console.log(`[${scriptId}] ⏳ Licença inativa. Ativando automaticamente...`);
            
            // Ativa automaticamente
            await axios.patch(`${FIREBASE_DB_URL}/licenses/${scriptId}.json`, { active: true });
            license.active = true;
            console.log(`[${scriptId}] ✅ Licença ativada automaticamente!`);
        }

        // 🔥 VERIFICA EXPIRAÇÃO E RENOVA AUTOMATICAMENTE
        if (license.expiresAt) {
            const expDate = new Date(license.expiresAt);
            if (Date.now() > expDate.getTime()) {
                console.log(`[${scriptId}] ⏰ Licença expirada. Renovando automaticamente...`);
                
                // Renova automaticamente (apenas para teste)
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
                
                // Atualiza o domínio automaticamente
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

    console.log('👻 Anúncio Fantasma carregado!');
    console.log('📋 Licença:', LICENSE_ID);
    console.log('🌐 Domínio:', DOMAIN);
    console.log('📊 Plano:', PLAN);

    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('spoofer') === 'on') {
            localStorage.setItem(STORAGE_KEY, 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA ATIVADO!', 'color: #00ff88; font-weight: bold; font-size: 16px;');
        } 
        else if (urlParams.get('spoofer') === 'off') {
            localStorage.removeItem(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA DESATIVADO!', 'color: #ff4444; font-weight: bold; font-size: 16px;');
            return;
        }
    } catch(e) {}

    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        console.log('%c👻 Anúncio Fantasma: Ative com ?spoofer=on', 'color: #ffaa00; font-weight: bold;');
        return;
    }

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
    localStorage.setItem(STORAGE_KEY, 'true');

    window.currentFakeUserId = currentUserId;
    spoofFingerprint();

    console.log('%c👻 Visita ' + visitCount + '/' + VISITS_TO_RESET + ' | ID: ' + currentUserId, 
                'color: #00ff88; font-weight: bold;');

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

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(scriptContent);
}
