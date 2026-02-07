    async function fetchJsonWithRetry(url, init, retries = 2, delay = 600) {
        try { return await fetchJson(url, init); }
        catch (e) {
            // Do not retry for client errors (4xx) except maybe 429
            if (e.message && (e.message.startsWith('HTTP 4') && !e.message.includes('429'))) {
                throw e;
            }
            if (retries <= 0) throw e;
            await new Promise(r => setTimeout(r, delay));
            return await fetchJsonWithRetry(url, init, retries - 1, delay * 1.5);
        }
    }
