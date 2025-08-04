(function (global) {
    // 📦 Semat v0.2

    const SematConfig = global.SematConfig || {};

    const log = {
        success: (...args) => {
            console.log(`%c✔️ ${args.join(' ')}`, 'color:  #26a646; font-weight: bold');
        },
        error: (...args) => {
            console.log(`%c❌ ${args.join(' ')}`, 'color: #e74c3c; font-weight: bold');
        },
        warn: (...args) => {
            console.log(`%c⚠️ ${args.join(' ')}`, 'color: #f39c12; font-weight: bold');
        },
        info: (...args) => {
            console.log(`%cℹ️ ${args.join(' ')}`, 'color: #3498db; font-weight: bold');
        },
    };

    // async function SematFetchData({ url, method = 'GET', el, successFn, cacheKey, cacheTimeout = 0 }) {
    //     if (url.startsWith('/') && SematConfig.baseUrl) {
    //         url = SematConfig.baseUrl + url;
    //     }

    //     const finalCacheKey = cacheKey || `cache_${url}`;
    //     if (cacheTimeout > 0) {
    //         const cached = localStorage.getItem(finalCacheKey);
    //         if (cached) {
    //             try {
    //                 const { data, expires } = JSON.parse(cached);
    //                 if (Date.now() < expires) {
    //                     SematConfig.debug && log.success('[Semat] Loaded from cache:', finalCacheKey);
    //                     try {
    //                         const fn = eval(successFn);
    //                         if (typeof fn === 'function') fn.call(el, data);
    //                     } catch (e) {
    //                         log.error('[Semat] Error executing success function:', e);
    //                     }
    //                     return data;
    //                 }
    //             } catch (e) {
    //                 log.warn('[Semat] Cache parse error:', e);
    //             }
    //         }
    //     }

    //     const res = await fetch(url, { method });
    //     const data = await res.json();
    //     SematConfig.debug && log.success('[Semat] Fetched:', url);

    //     if (res.ok) {
    //         if (cacheTimeout > 0) {
    //             localStorage.setItem(
    //                 finalCacheKey,
    //                 JSON.stringify({
    //                     data,
    //                     expires: Date.now() + cacheTimeout * 1000,
    //                 })
    //             );
    //         }

    //         if (successFn) {
    //             try {
    //                 const fn = eval(successFn);
    //                 if (typeof fn === 'function') fn.call(el, data);
    //             } catch (e) {
    //                 log.error('[Semat] Error executing success function:', e);
    //             }
    //         }
    //     }

    //     return data;
    // }

    function showSpinner() {
        let loader = document.querySelector('#semat-spinner-wrapper');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'semat-spinner-wrapper';
            loader.innerHTML = `<div class="semat-spinner"></div>`;
            Object.assign(loader.style, {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
            });
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    function hideSpinner() {
        const loader = document.querySelector('#semat-spinner-wrapper');
        if (loader) loader.style.display = 'none';
    }

    async function SematFetchData({ url, method = 'GET', el, successFn, cacheKey, cacheTimeout = 0 }) {
        const baseUrl = SematConfig.baseUrl;
        let urlsToTry = [];

        // Tentukan URL-URL yang akan dicoba
        if (url.startsWith('/')) {
            if (Array.isArray(baseUrl)) {
                urlsToTry = baseUrl.map(base => base + url);
            } else if (typeof baseUrl === 'string') {
                urlsToTry = [baseUrl + url];
            } else {
                urlsToTry = [url]; // baseUrl tidak diset
            }
        } else {
            urlsToTry = [url]; // URL absolut
        }

        const finalCacheKey = cacheKey || `cache_${urlsToTry[0]}`;

        // Coba ambil dari cache
        if (cacheTimeout > 0) {
            const cached = localStorage.getItem(finalCacheKey);
            if (cached) {
                try {
                    const { data, expires } = JSON.parse(cached);
                    if (Date.now() < expires) {
                        SematConfig.debug && log.success('[Semat] Loaded from cache:', finalCacheKey);
                        try {
                            const fn = eval(successFn);
                            if (typeof fn === 'function') fn.call(el, data);
                        } catch (e) {
                            log.error('[Semat] Error executing success function:', e);
                        }
                        return data;
                    }
                } catch (e) {
                    log.warn('[Semat] Cache parse error:', e);
                }
            }
        }

        let res, data, lastError;

        for (const tryUrl of urlsToTry) {
            showSpinner();
            try {
                res = await fetch(tryUrl, { method });
                if (res.ok) {
                    data = await res.json();
                    SematConfig.debug && log.success('[Semat] Fetched from:', tryUrl);
                    url = tryUrl; // update url yang sukses
                    break;
                } else {
                    lastError = `[Semat] ${tryUrl} responded with status ${res.status}`;
                    log.warn(lastError);
                }
            } catch (err) {
                lastError = `[Semat] Failed to fetch from ${tryUrl}: ${err.message}`;
                log.warn(lastError);
            } finally {
                hideSpinner();
            }
        }

        if (!res || !res.ok) {
            log.error(lastError || '[Semat] All fetch attempts failed.');
            return null;
        }

        // Simpan ke cache
        if (cacheTimeout > 0) {
            localStorage.setItem(
                finalCacheKey,
                JSON.stringify({
                    data,
                    expires: Date.now() + cacheTimeout * 1000,
                })
            );
        }

        // Panggil success function
        if (successFn) {
            try {
                const fn = eval(successFn);
                if (typeof fn === 'function') fn.call(el, data);
            } catch (e) {
                log.error('[Semat] Error executing success function:', e);
            }
        }

        return data;
    }

    const state = new Proxy(
        {},
        {
            set(obj, prop, value) {
                obj[prop] = value;
                document.querySelectorAll(`[data-bind='${prop}']`).forEach(el => {
                    el.textContent = value;
                });
                document.querySelectorAll(`[data-show]`).forEach(el => {
                    try {
                        const cond = el.dataset.show;
                        const fn = new Function('state', `with(state) { return ${cond} }`);
                        el.style.display = fn(state) ? '' : 'none';
                    } catch {}
                });
                document.querySelectorAll(`[data-repeat]`).forEach(renderRepeat);
                return true;
            },
        }
    );

    function renderRepeat(el) {
        const [itemName, arrayName] = el.dataset.repeat.split(' in ').map(s => s.trim());
        const arr = state[arrayName];
        if (!Array.isArray(arr)) return;

        SematConfig.debug && console.log('[Semat] Item:', itemName + '.' + arrayName);

        const parent = el.parentNode;
        const tpl = el.cloneNode(true);
        parent.querySelectorAll(`[data-repeat='${el.dataset.repeat}']`).forEach(e => e.remove());

        arr.forEach(item => {
            const clone = tpl.cloneNode(true);
            clone.removeAttribute('data-repeat');
            clone.setAttribute('data-item', arrayName);

            clone.innerHTML = clone.innerHTML.replace(/\${([^}]+)}/g, (_, expr) => {
                try {
                    const fn = new Function(itemName, `return ${expr}`);
                    return fn(item);
                } catch (e) {
                    console.warn('[Semat] Failed to render template:', expr, e);
                    return '';
                }
            });

            parent.appendChild(clone);
        });
    }

    document.addEventListener('input', e => {
        const key = e.target.dataset.model;
        if (key) state[key] = e.target.value;
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-load-url]').forEach(async el => {
            SematFetchData({
                url: el.dataset.loadUrl,
                el,
                successFn: el.dataset.success,
                cacheKey: el.dataset.cache,
                cacheTimeout: parseInt(el.dataset.cacheTimeout || SematConfig.cacheTimeout || 0),
            });
        });
    });

    global.addEventListener('click', async e => {
        //const el = e.target.closest('[data-url]');

        const target = e.target;
        const el = target && target.closest ? target.closest('[data-url]') : null;

        if (!el) return;

        const confirm = el.dataset.confirm;
        // if (confirm) {
        //     const ok = new Function(confirm).call(el);
        //     if (!ok) return;
        // }
        if (confirm) {
            try {
                const fn = new Function('return ' + confirm);
                const result = await fn.call(el);
                if (!result) return;
            } catch (e) {
                log.error('[Semat] Error in async confirm:', e);
                return;
            }
        }

        const data = await SematFetchData({
            url: el.dataset.url,
            method: el.dataset.method || 'GET',
            el,
            successFn: el.dataset.success,
            cacheKey: el.dataset.cache,
            cacheTimeout: parseInt(el.dataset.cacheTimeout || SematConfig.cacheTimeout || 0),
        });

        if (el.dataset.removeOnSuccess === 'true') {
            const toRemove = el.closest('[data-item]') || el.parentElement;
            toRemove?.remove();
        }
    });

    global.Semat = {
        state,
        log,
        fetch: SematFetchData,
    };
})(window); // ← global alias
