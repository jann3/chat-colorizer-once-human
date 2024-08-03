(function () {
    const googleFontURL = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap';
    const localFontURL = 'css/local-font.css';

    function applyFont(url) {
        const linkElement = document.getElementById('font-link');
        linkElement.href = url;
    }

    async function loadFont() {
        try {
            const response = await fetch(googleFontURL, { method: 'HEAD' });
            if (response.ok) {
                applyFont(googleFontURL);
            }
        } catch (error) {
            console.log('Google Fonts not accessible, falling back to local font.');
            applyFont(localFontURL);
        }
    }

    loadFont();
})();