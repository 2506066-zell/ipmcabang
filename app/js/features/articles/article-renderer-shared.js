(function attachArticleRenderer(global) {
    'use strict';

    const LOCAL_ARTICLE_FALLBACK = '/ipm%20(2).png';
    const ALLOWED_TAGS = new Set(['p', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'br']);
    const VOID_TAGS = new Set(['img', 'br']);

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return (div.textContent || div.innerText || '').trim();
    }

    function sanitizeUrl(raw, fallback = '#') {
        const val = String(raw || '').trim();
        if (!val) return fallback;
        if (/^javascript:/i.test(val)) return fallback;
        if (/^data:image\//i.test(val)) return val;
        if (/^data:/i.test(val)) return fallback;
        if (/^(https?:)?\/\//i.test(val) || val.startsWith('/') || val.startsWith('#')) return val;
        return fallback;
    }

    function isSafeHref(raw) {
        const val = String(raw || '').trim();
        if (!val) return false;
        if (/^https?:\/\//i.test(val)) return true;
        if (/^mailto:/i.test(val)) return true;
        if (/^tel:/i.test(val)) return true;
        if (val.startsWith('#')) return true;
        return false;
    }

    function toAbsoluteUrl(raw, base = global.location ? global.location.origin : '') {
        try {
            return new URL(raw, base).toString();
        } catch {
            return '';
        }
    }

    function normalizeNode(doc, node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;

        [...node.children].forEach((child) => normalizeNode(doc, child));
        const tag = node.tagName.toLowerCase();

        if (!ALLOWED_TAGS.has(tag)) {
            const parent = node.parentNode;
            if (!parent) return;
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            parent.removeChild(node);
            return;
        }

        [...node.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = String(attr.value || '').trim();
            if (name.startsWith('on')) {
                node.removeAttribute(attr.name);
                return;
            }

            if (tag === 'a') {
                if (name === 'href') {
                    if (!isSafeHref(value)) node.setAttribute('href', '#');
                    return;
                }
                if (name === 'target') {
                    node.setAttribute('target', '_blank');
                    return;
                }
                if (name === 'rel') {
                    node.setAttribute('rel', 'noopener noreferrer');
                    return;
                }
                node.removeAttribute(attr.name);
                return;
            }

            if (tag === 'img') {
                if (name === 'src') {
                    node.setAttribute('src', sanitizeUrl(value, LOCAL_ARTICLE_FALLBACK));
                    return;
                }
                if (name === 'alt') {
                    node.setAttribute('alt', value.slice(0, 150));
                    return;
                }
                node.removeAttribute(attr.name);
                return;
            }

            node.removeAttribute(attr.name);
        });

        if (tag === 'a') {
            if (!node.getAttribute('href')) node.setAttribute('href', '#');
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }

        if (tag === 'img') {
            if (!node.getAttribute('src')) node.setAttribute('src', LOCAL_ARTICLE_FALLBACK);
            if (!node.getAttribute('alt')) node.setAttribute('alt', 'Gambar artikel');
        }

        if (!VOID_TAGS.has(tag)) {
            const plain = stripHtml(node.innerHTML);
            if (!plain && !node.querySelector('img')) {
                node.remove();
            }
        }
    }

    function sanitizeArticleHTML(rawHtml, options = {}) {
        const fallback = String(rawHtml || '');
        if (!fallback) return '';

        if (typeof DOMParser === 'undefined') {
            return fallback
                .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
                .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
                .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
                .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(fallback, 'text/html');
        doc.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form,input,button,textarea,select').forEach((el) => el.remove());
        normalizeNode(doc, doc.body);

        const html = doc.body.innerHTML
            .replace(/<p>\s*<\/p>/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (options.removeHeadingOne) {
            const postDoc = parser.parseFromString(html, 'text/html');
            postDoc.querySelectorAll('h1').forEach((h1) => {
                const h2 = postDoc.createElement('h2');
                h2.innerHTML = h1.innerHTML;
                h1.parentNode.replaceChild(h2, h1);
            });
            return postDoc.body.innerHTML.trim();
        }

        return html;
    }

    function estimateReadMinutes(rawHtml) {
        const words = stripHtml(rawHtml).split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(words / 200));
    }

    function formatDate(value, options) {
        const date = new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('id-ID', options || { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function toIsoDate(value) {
        const date = new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) return new Date().toISOString();
        return date.toISOString();
    }

    function pickDek(raw) {
        const explicitDek = String(raw.summary || raw.excerpt || '').trim();
        if (explicitDek) return explicitDek;
        const plain = stripHtml(raw.content || '');
        if (!plain) return '';
        if (plain.length <= 210) return plain;
        return `${plain.slice(0, 210).trim()}...`;
    }

    function buildArticleViewModel(rawArticle, options = {}) {
        const raw = rawArticle || {};
        const contentHtml = sanitizeArticleHTML(raw.content || '', { removeHeadingOne: true });
        const title = String(raw.title || 'Artikel').trim() || 'Artikel';
        const author = String(raw.author || 'Redaksi IPM Panawuan').trim() || 'Redaksi IPM Panawuan';
        const category = String(raw.category || 'Umum').trim() || 'Umum';
        const image = sanitizeUrl(raw.image || '', '');
        const publishDate = raw.publish_date || raw.created_at || Date.now();
        const url = options.url || '';

        return {
            title,
            author,
            category,
            dek: pickDek({ ...raw, content: contentHtml }),
            contentHtml,
            image,
            publishDateIso: toIsoDate(publishDate),
            publishDateLong: formatDate(publishDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            publishDateShort: formatDate(publishDate, { day: 'numeric', month: 'short', year: 'numeric' }),
            readMinutes: estimateReadMinutes(contentHtml),
            url: url ? toAbsoluteUrl(url) : ''
        };
    }

    function renderArticleDetailHTML(viewModel, options = {}) {
        const vm = viewModel || {};
        const idPrefix = String(options.idPrefix || '');
        const id = (name) => `${idPrefix}${name}`;
        const includeBackLink = options.includeBackLink !== false;
        const backHref = options.backHref || '/articles';
        const showReadingTools = options.showReadingTools !== false;
        const showToc = options.showToc !== false;
        const articleClassName = options.articleClassName || 'article-detail fade-in';

        const heroImage = vm.image ? `
            <figure class="article-hero">
                <img src="${escapeHtml(vm.image)}" alt="${escapeHtml(vm.title)}" class="hero-img" loading="lazy" decoding="async">
            </figure>
        ` : '';

        return `
            <article class="${escapeHtml(articleClassName)}" aria-labelledby="${escapeHtml(id('article-headline'))}">
                <header class="reading-hero">
                    ${includeBackLink ? `
                        <a href="${escapeHtml(backHref)}" class="reading-back-link no-transition" id="${escapeHtml(id('reading-back-link'))}" aria-label="Kembali ke daftar artikel">
                            <i class="fas fa-arrow-left"></i>
                            <span>Kembali ke daftar</span>
                        </a>
                    ` : ''}
                    <p class="reading-kicker">${escapeHtml(vm.category || 'Umum')}</p>
                    <h1 id="${escapeHtml(id('article-headline'))}" class="detail-title" tabindex="-1">${escapeHtml(vm.title || 'Artikel')}</h1>
                    ${vm.dek ? `<p class="detail-dek">${escapeHtml(vm.dek)}</p>` : ''}
                    <div class="reading-byline" role="list" aria-label="Informasi artikel">
                        <span class="byline-item" role="listitem"><i class="fas fa-user-edit" aria-hidden="true"></i>${escapeHtml(vm.author || 'Redaksi')}</span>
                        <span class="byline-item" role="listitem"><i class="fas fa-calendar-alt" aria-hidden="true"></i><time datetime="${escapeHtml(vm.publishDateIso || toIsoDate(Date.now()))}">${escapeHtml(vm.publishDateLong || '-')}</time></span>
                        <span class="byline-item" role="listitem"><i class="fas fa-clock" aria-hidden="true"></i>${escapeHtml(String(vm.readMinutes || 1))} menit baca</span>
                    </div>
                    ${heroImage}
                    <div class="reading-summary-meta">
                        <span>${escapeHtml(vm.publishDateShort || '-')}</span>
                        <span>${escapeHtml(String(vm.readMinutes || 1))} menit</span>
                    </div>
                </header>

                ${showReadingTools ? `
                    <section class="reading-tools" id="${escapeHtml(id('reading-tools'))}" role="region" aria-label="Alat bantu membaca">
                        <div class="reading-tools-status">
                            <span id="${escapeHtml(id('reading-progress-label'))}" aria-live="polite">0% dibaca</span>
                            <span id="${escapeHtml(id('reading-remaining-label'))}" aria-live="polite">Sisa ${escapeHtml(String(vm.readMinutes || 1))} menit</span>
                        </div>
                        <div class="reading-tools-actions">
                            <button type="button" class="reading-tool-btn primary" data-share="native" aria-label="Bagikan artikel">Bagikan</button>
                            <button type="button" class="reading-tool-btn" data-share="copy" aria-label="Salin tautan artikel">Salin link</button>
                            <button type="button" class="reading-tool-btn" data-share="whatsapp" aria-label="Bagikan ke WhatsApp">WhatsApp</button>
                        </div>
                    </section>
                ` : ''}

                ${showToc ? `<nav class="article-toc" id="${escapeHtml(id('article-toc'))}" aria-label="Daftar isi artikel" hidden></nav>` : ''}
                <div class="article-divider"></div>
                <div class="article-content-body pro-article" id="${escapeHtml(id('article-content-body'))}">
                    ${vm.contentHtml || ''}
                </div>
            </article>
        `;
    }

    global.ArticleRenderer = {
        LOCAL_ARTICLE_FALLBACK,
        sanitizeUrl,
        sanitizeArticleHTML,
        stripHtml,
        estimateReadMinutes,
        buildArticleViewModel,
        renderArticleDetailHTML
    };
})(window);
