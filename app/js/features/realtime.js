/**
 * Real-time System for PC IPM Panawuan
 * Handles SSE (Server-Sent Events) for instant updates
 */

(function () {
    'use strict';

    function initRealTimeSystem() {
        if (!window.EventSource) return;

        console.log('[RealTime] Initializing SSE...');

        const connect = () => {
            const es = new EventSource('/api/events');

            es.onmessage = (e) => {
                try {
                    const event = JSON.parse(e.data);
                    handleRealTimeEvent(event);
                } catch (err) {
                    console.warn('[RealTime] Parse error:', err);
                }
            };

            es.onerror = () => {
                es.close();
                // Retry after 10s
                setTimeout(connect, 10000);
            };
        };

        const handleRealTimeEvent = (event) => {
            if (event.type === 'schedule_update' && event.data) {
                if (window.Toast) {
                    window.Toast.show(`Agenda baru: ${event.data.title}`, 'info');
                }
                const badge = document.getElementById('notif-badge');
                if (badge) {
                    badge.hidden = false;
                    badge.textContent = '!';
                    badge.classList.add('pulse');
                }
            }

            if (event.type === 'new_article' && event.data) {
                if (window.Toast) {
                    window.Toast.show(`Artikel baru: ${event.data.title}`, 'success');
                }
                const badge = document.getElementById('notif-badge');
                if (badge) {
                    badge.hidden = false;
                    badge.textContent = '!';
                }
            }
        };

        connect();
    }

    if (document.readyState === 'complete') {
        initRealTimeSystem();
    } else {
        window.addEventListener('load', initRealTimeSystem);
    }

})();
