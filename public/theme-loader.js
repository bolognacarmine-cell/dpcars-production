// Theme Loader - DP CARS
(async function() {
    try {
        const host = window.location.hostname;
        const isLocalhost = host === 'localhost' || host === '127.0.0.1';
        const isPrivateNetwork =
            /^10\./.test(host) ||
            /^192\.168\./.test(host) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(host);
        if (isLocalhost || isPrivateNetwork) return;

        const res = await fetch('/api/config/theme');
        if (res.ok) {
            const data = await res.json();
            const theme = data.value;
            const themes = {
                blue: { primary: '#2563eb', accent: '#1d4ed8', secondary: '#60a5fa' },
                red: { primary: '#e11d48', accent: '#b91c1c', secondary: '#38bdf8' },
                orange: { primary: '#f97316', accent: '#ea580c', secondary: '#fdba74' },
                gold: { primary: '#d4af37', accent: '#b8860b', secondary: '#fde047' }
            };
            if (themes[theme]) {
                const styleId = 'dynamic-theme-vars';
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                styleEl.innerHTML = `
                    :root {
                        --primary-sport: ${themes[theme].primary} !important;
                        --accent-red: ${themes[theme].accent} !important;
                        --secondary-sport: ${themes[theme].secondary} !important;
                    }
                `;
                // Update theme-color meta if exists
                const metaTheme = document.querySelector('meta[name="theme-color"]');
                if (metaTheme) metaTheme.setAttribute('content', themes[theme].primary);
            }
        }
    } catch (e) { console.error('Theme load error:', e); }
})();
