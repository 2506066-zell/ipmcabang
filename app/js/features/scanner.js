/**
 * QR Scanner System for PC IPM Panawuan
 * Powered by jsQR for robust cross-browser scanning
 */

(function () {
    'use strict';

    const state = {
        stream: null,
        scanning: false,
        video: null,
        canvas: null,
        ctx: null,
        callback: null
    };

    const els = {
        modal: null,
        closeBtn: null,
        overlay: null,
        status: null
    };

    function initScannerUi() {
        if (document.getElementById('qr-scanner-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'qr-scanner-modal';
        modal.className = 'qr-scanner-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="scanner-container">
                <div class="scanner-header">
                    <h3>Pindai QR Kader</h3>
                    <button type="button" id="scanner-close-btn" class="scanner-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="scanner-view-shell">
                    <canvas id="scanner-canvas" hidden></canvas>
                    <div class="scanner-mask">
                        <div class="scanner-frame"></div>
                        <div class="scanner-line"></div>
                    </div>
                    <div class="scanner-status" id="scanner-status">Mencari QR Code...</div>
                </div>
                <div class="scanner-footer">
                    <p>Arahkan kamera ke Kartu Anggota Digital kader lain untuk melihat profil.</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        els.modal = modal;
        els.closeBtn = document.getElementById('scanner-close-btn');
        els.status = document.getElementById('scanner-status');
        els.canvas = document.getElementById('scanner-canvas');
        els.ctx = els.canvas.getContext('2d', { willReadFrequently: true });

        els.closeBtn.addEventListener('click', stopScanner);
    }

    async function startScanner(onScanFound) {
        initScannerUi();
        state.callback = onScanFound;
        els.modal.hidden = false;
        state.scanning = true;

        try {
            if (window.AppLoader) window.AppLoader.show('Memulai Scanner...');
            
            const constraints = {
                video: { facingMode: 'environment' }, // Rear camera
                audio: false
            };

            state.stream = await navigator.mediaDevices.getUserMedia(constraints);
            const video = document.createElement('video');
            video.srcObject = state.stream;
            video.setAttribute('playsinline', 'true');
            video.play();
            state.video = video;

            requestAnimationFrame(scanLoop);
        } catch (error) {
            console.error('[Scanner] Error:', error);
            const msg = error.name === 'NotAllowedError' ? 'Izin kamera ditolak.' : 'Gagal membuka kamera.';
            if (window.Toast) window.Toast.show(msg, 'error');
            stopScanner();
        } finally {
            if (window.AppLoader) window.AppLoader.hide();
        }
    }

    function stopScanner() {
        state.scanning = false;
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
            state.stream = null;
        }
        if (els.modal) els.modal.hidden = true;
        state.callback = null;
    }

    function scanLoop() {
        if (!state.scanning) return;

        if (state.video.readyState === state.video.HAVE_ENOUGH_DATA) {
            els.canvas.hidden = false;
            els.canvas.height = state.video.videoHeight;
            els.canvas.width = state.video.videoWidth;
            els.ctx.drawImage(state.video, 0, 0, els.canvas.width, els.canvas.height);
            
            const imageData = els.ctx.getImageData(0, 0, els.canvas.width, els.canvas.height);
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                state.scanning = false;
                handleScanSuccess(code.data);
                return;
            }
        }
        requestAnimationFrame(scanLoop);
    }

    function handleScanSuccess(data) {
        stopScanner();
        if (window.Toast) window.Toast.show('QR Berhasil dipindai!', 'success');
        
        if (state.callback) {
            state.callback(data);
        } else {
            // Default behavior: show scanned info
            try {
                const parsed = JSON.parse(data);
                alert(`Member Found: ${parsed.u || 'Unknown'}\nFrom: ${parsed.p || '-'}`);
            } catch (e) {
                alert(`Data QR: ${data}`);
            }
        }
    }

    window.CardScanner = {
        scan: startScanner,
        stop: stopScanner
    };

})();
