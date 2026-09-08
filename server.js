// =============================================
// ANÚNCIO FANTASMA - Script do Cliente
// Versão: 2.0
// =============================================

(function() {
    'use strict';

    // ==================== CONFIGURAÇÕES ====================
    const STORAGE_KEY = 'anuncio_fantasma_ativado';
    const VISITS_TO_RESET = 2; // A cada 2 visitas, troca o ID do dispositivo

    // ==================== ATIVAÇÃO VIA URL ====================
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // ATIVAR: ?spoofer=on
        if (urlParams.get('spoofer') === 'on') {
            localStorage.setItem(STORAGE_KEY, 'true');
            // Remove o parâmetro da URL para não ficar visível
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA ATIVADO neste dispositivo!', 
                        'color: #00ff88; font-weight: bold; font-size: 16px;');
        } 
        // DESATIVAR: ?spoofer=off
        else if (urlParams.get('spoofer') === 'off') {
            localStorage.removeItem(STORAGE_KEY);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('%c👻 ANÚNCIO FANTASMA DESATIVADO neste dispositivo!', 
                        'color: #ff4444; font-weight: bold; font-size: 16px;');
            return; // Para a execução
        }
    } catch(e) {
        // Ignora erros de URL
    }

    // ==================== VERIFICAÇÃO ====================
    // Se NÃO estiver ativado via ?spoofer=on, não faz nada
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
        console.log('%c👻 Anúncio Fantasma: Inativo. Ative com ?spoofer=on', 
                    'color: #ffaa00; font-weight: bold;');
        return;
    }

    // ==================== FUNÇÕES ====================
    
    // Gerar novo ID de dispositivo (simula um celular diferente)
    function generateNewUserId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return 'device_' + timestamp + '_' + random;
    }

    // Limpar TODOS os rastros (cookies, localStorage, sessionStorage)
    function clearTracking() {
        try {
            // Limpa cookies
            document.cookie.split(";").forEach(cookie => {
                const name = cookie.split("=")[0].trim();
                if (name) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                }
            });

            // Limpa storages (mantém apenas a chave de ativação)
            const isActive = localStorage.getItem(STORAGE_KEY);
            localStorage.clear();
            sessionStorage.clear();
            
            // Restaura a chave de ativação
            if (isActive === 'true') {
                localStorage.setItem(STORAGE_KEY, 'true');
            }
        } catch(e) {
            // Ignora erros
        }
    }

    // Simular fingerprint do dispositivo (canvas fingerprinting)
    function spoofFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Desenha algo aleatório para mudar o fingerprint
            ctx.fillStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 220, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText('Device ' + Math.random().toString(36).substring(2, 7), 10, 20);
        } catch(e) {
            // Ignora erros
        }
    }

    // ==================== EXECUÇÃO PRINCIPAL ====================
    
    let visitCount = parseInt(localStorage.getItem('visit_counter') || '0');
    let currentUserId = localStorage.getItem('current_device_id');

    // Incrementa contador de visitas
    visitCount++;

    // A cada 2 visitas OU se não tiver ID, RESETA TUDO
    if (visitCount >= VISITS_TO_RESET || !currentUserId) {
        currentUserId = generateNewUserId();
        visitCount = 1; // Reinicia o contador
        clearTracking(); // Limpa tudo para parecer um novo celular
        console.log('%c🔄 Dispositivo RESETADO! Novo ID: ' + currentUserId, 
                    'color: #00ff88; font-weight: bold;');
    }

    // Salva os dados atualizados
    localStorage.setItem('visit_counter', visitCount);
    localStorage.setItem('current_device_id', currentUserId);
    localStorage.setItem(STORAGE_KEY, 'true');

    // Disponibiliza o ID globalmente para seus anúncios usarem
    window.currentFakeUserId = currentUserId;

    // Simula fingerprint para enganar rastreadores
    spoofFingerprint();

    // ==================== LOG DE DEBUG ====================
    console.log('%c👻 Anúncio Fantasma | Visita ' + visitCount + '/' + VISITS_TO_RESET + ' | ID: ' + currentUserId, 
                'color: #00ff88; font-weight: bold; font-size: 13px;');
    console.log('%c💡 Dica: Use ?spoofer=off para desativar', 
                'color: #888; font-size: 11px;');

    // ==================== EXPORTA FUNÇÕES PARA USO ====================
    // Permite que seus anúncios usem estas funções
    window.AnuncioFantasma = {
        getDeviceId: function() {
            return currentUserId;
        },
        isActive: function() {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        },
        getVisitCount: function() {
            return visitCount;
        }
    };

})();
