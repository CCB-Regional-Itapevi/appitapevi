(function (window) {
    'use strict';

    window.getAppSupabaseClient = function () {
        var config = window.APP_SUPABASE_CONFIG;
        if (!config || !config.url || !config.publishableKey || !config.storageKey) {
            throw new Error('Configuracao publica do Supabase indisponivel.');
        }
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            throw new Error('Biblioteca do Supabase indisponivel.');
        }
        if (!window.__appSupabaseClient) {
            window.__appSupabaseClient = window.supabase.createClient(config.url, config.publishableKey, {
                auth: { storageKey: config.storageKey }
            });
        }
        return window.__appSupabaseClient;
    };
})(window);
