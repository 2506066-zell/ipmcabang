/**
 * WebAuthn Client Helper for PC IPM Panawuan
 * Encapsulates Passkey Registration and Authentication
 */

(function (window) {
    'use strict';

    const WebAuthnClient = {
        /**
         * Converts a base64url string to Uint8Array
         */
        base64urlToUint8Array(base64url) {
            const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
            const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        },

        /**
         * Converts ArrayBuffer to base64url string
         */
        bufferToBase64url(buffer) {
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        },

        /**
         * Recursive function to convert recursive bytes to base64url in credential responses
         */
        recursiveBase64url(obj) {
            if (obj === null || typeof obj !== 'object') return obj;

            if (obj instanceof ArrayBuffer || obj instanceof Uint8Array) {
                return this.bufferToBase64url(obj);
            }

            if (Array.isArray(obj)) {
                return obj.map(item => this.recursiveBase64url(item));
            }

            const next = {};
            for (const key in obj) {
                next[key] = this.recursiveBase64url(obj[key]);
            }
            return next;
        },

        async isSupported() {
            return window.PublicKeyCredential && 
                   PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && 
                   await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        },

        async register() {
            try {
                // 1. Get Options from Server
                const resp = await fetch('/api/webauthn?action=register-options');
                const options = await resp.json();
                if (options.status === 'error') throw new Error(options.message);

                // 2. Adjust Options for Browser
                options.challenge = this.base64urlToUint8Array(options.challenge);
                options.user.id = this.base64urlToUint8Array(options.user.id);
                if (options.excludeCredentials) {
                    options.excludeCredentials = options.excludeCredentials.map(c => ({
                        ...c,
                        id: this.base64urlToUint8Array(c.id)
                    }));
                }

                // 3. Create Credential
                const credential = await navigator.credentials.create({ publicKey: options });

                // 4. Send to Server for Verification
                const verifyResp = await fetch('/api/webauthn?action=register-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.recursiveBase64url(credential))
                });

                return await verifyResp.json();
            } catch (err) {
                console.error('WebAuthn Registration Error:', err);
                return { status: 'error', message: err.message };
            }
        },

        async login(username) {
            try {
                // 1. Get Options
                const resp = await fetch(`/api/webauthn?action=login-options&username=${encodeURIComponent(username)}`);
                const options = await resp.json();
                if (options.status === 'error') throw new Error(options.message);

                // 2. Adjust Options
                options.challenge = this.base64urlToUint8Array(options.challenge);
                if (options.allowCredentials) {
                    options.allowCredentials = options.allowCredentials.map(c => ({
                        ...c,
                        id: this.base64urlToUint8Array(c.id)
                    }));
                }

                // 3. Get Assertion
                const assertion = await navigator.credentials.get({ publicKey: options });

                // 4. Verify
                const verifyResp = await fetch(`/api/webauthn?action=login-verify&username=${encodeURIComponent(username)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.recursiveBase64url(assertion))
                });

                return await verifyResp.json();
            } catch (err) {
                console.error('WebAuthn Login Error:', err);
                return { status: 'error', message: err.message };
            }
        }
    };

    window.WebAuthnClient = WebAuthnClient;

})(window);
