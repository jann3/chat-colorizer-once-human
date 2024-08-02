const applyColor = () => {
    const selection = window.getSelection();
    const popup = document.getElementById('message-warning');
    if (selection.rangeCount === 0 || selection.getRangeAt(0).collapsed) {
        try {
            popup.showPopover();
            focusInput();
        } catch (err) {
            console.error(err);
        }
        return;
    }

    closePopup();
    blurInput();

    const span = document.createElement('span');
    span.style.color = selectedColor;
    selection.getRangeAt(0).surroundContents(span);

    updateOutputCode();
    blurOnUpdate();
};

const checkMessageInputLength = () => {
    const message = messageInput.textContent.trim();
    if (message.length === 0) {
        resetInput();
    }
};

const focusInput = () => {
    blurElements.forEach(el => el.classList.add('blurred'));
};

const blurInput = () => {
    blurElements.forEach(el => el.classList.remove('blurred'));
};

const blurOnUpdate = () => {
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    } else if (document.selection) {
        document.selection.empty();
    }
};

const closePopup = () => {
    try {
        document.getElementById('message-warning').hidePopover();
    } catch (err) {
        console.error(err);
    }
};

const updateOutputCode = () => {
    const html = messageInput.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const coloredText = convertToColoredText(tempDiv);
    outputCode.value = coloredText;
    updateCharCounter(coloredText.length);
};

const convertToColoredText = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue.includes('#') ? node.nodeValue.replace(/#/g, '##') : node.nodeValue;
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        const color = node.style.color;
        const hexColor = rgbToHex(color);
        const formattedHexColor = hexColor.startsWith('#c') ? hexColor : `#c${hexColor.slice(1)}`;
        const content = Array.from(node.childNodes).map(child => convertToColoredText(child)).join('');
        return `${formattedHexColor}${content}`;
    }

    return Array.from(node.childNodes).map(child => convertToColoredText(child)).join('');
};

const rgbToHex = (rgb) => {
    if (!rgb || !rgb.startsWith('rgb')) {
        return '';
    }
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues || rgbValues.length !== 3) {
        return '';
    }
    const [r, g, b] = rgbValues.map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
};

const updateCharCounter = (length) => {
    charCounter.innerHTML = `${length}/${charLimit}<span class="collapse"> characters</span>`;
    charCounter.style.color = length > charLimit ? warnFont : defaultFont;
};

const copyCode = () => {
    outputCode.select();
    outputCode.setSelectionRange(0, 130);
    navigator.clipboard.writeText(outputCode.value);
    try {
        const popover = document.getElementById('confirm-message')
        popover.togglePopover();
        setTimeout(() => {
            popover.hidePopover();
        }, "1200");
    } catch (err) {
        console.error(err);
    }
    copyCodeButton.focus();
};

const switchBackgroundImage = () => {
    const backgroundStyle = document.querySelector('.fade-in').style;
    backgroundStyle.animationName = backgroundStyle.animationName === 'fadeInBackground-1' ? 'fadeInBackground-2' : 'fadeInBackground-1';

    const currentBackgroundImage = getComputedStyle(document.body).backgroundImage;
    const matches = currentBackgroundImage.match(/url\("?(.+?)"?\)$/);
    let currentImageName = matches ? new URL(matches[1]).pathname.replace(/^\//, '') : null;

    const currentIndex = backgroundImages.findIndex(image => currentImageName?.includes(image));
    const newIndex = currentIndex !== -1 ? (currentIndex + 1) % backgroundImages.length : 0;
    document.body.style.backgroundImage = `url(${backgroundImages[newIndex]})`;
};

const resetInput = () => {
    messageInput.innerHTML = '';
    outputCode.value = '';
    colorPicker.value = '#ffffff';
    updateCharCounter(0);
};

const randomHueColor = (saturation, lightness) => {
    const hue = Math.floor(Math.random() * 360);
    const rgb = hslToRgb(hue / 360, saturation, lightness);
    return rgbToHex(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
};

const readyPreset = () => {
    presetSelect.selectedIndex = -1;
}

const applyPreset = () => {
    const preset = presetSelect.value;
    let colors = [];

    switch (preset) {
        case 'pastelRainbow':
            colors = ['#FF5252', '#FFA052', '#8EDF58', '#3EEAC7', '#65A9F1', '#CD69F2', '#ED5AB7'];
            break;
        case 'onceHuman':
            colors = ['#4AC2C5', '#DA002B', '#4AC2C5', '#DA002B', '#4AC2C5'];
            break;
        case 'galaxyNebula':
            colors = ['#E958CF', '#BB78F2', '#765bec', '#6785e0', '#68C5E3', '#5BD29E'];
            break;
        case 'vintagePoster':
            colors = ['#ff411f', '#e96758', '#edc47c', '#5fb8b2', '#3987a1', '#5b67d2'];
            break;
        case 'sharkPlush':
            colors = ['#6dc2fa', '#f695f1', '#ffffff', '#f695f1', '#6dc2fa'];
            break;
        case 'randomChalk':
            for (let i = 0; i < 7; i++) {
                colors.push(randomHueColor(0.7, 0.8));
            }
            break;
        case 'randomHue':
            for (let i = 0; i < 7; i++) {
                colors.push(randomHueColor(1, 0.6));
            }
            break;
        default:
            break;
    }

    const text = messageInput.textContent || '';
    const textLength = text.length;
    const numColorTags = Math.min(Math.floor((charLimit - textLength) / 8), colors.length);

    if (textLength === 0) {
        messageInput.innerHTML = '';
        updateOutputCode();
        return;
    }

    messageInput.innerHTML = '';
    let colorIndex = 0;
    let colorSpan = null;
    let spanStartIndex = 0;
    const sectionLength = Math.ceil(textLength / numColorTags);

    for (let i = 0; i < textLength; i++) {
        if (i % sectionLength === 0 && colorIndex < colors.length) {
            if (colorSpan) {
                colorSpan.innerHTML = text.slice(spanStartIndex, i);
                messageInput.appendChild(colorSpan);
            }
            colorSpan = document.createElement('span');
            colorSpan.style.color = colors[colorIndex++];
            spanStartIndex = i;
        }
        const char = text[i];
        if (char === '#') {
            if (colorSpan) {
                colorSpan.innerHTML += '##';
            }
        } else {
            if (colorSpan) {
                colorSpan.innerHTML += char;
            }
        }
    }
    if (colorSpan) {
        colorSpan.innerHTML = text.slice(spanStartIndex);
        messageInput.appendChild(colorSpan);
    }

    updateOutputCode();
};

const hslToRgb = (h, s, l) => {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const checkApplyButton = () => {
    const preset = presetSelect.value;
    let randomizedSelected;
    switch (preset) {
        case 'randomChalk':
            randomizedSelected = true;
            break;
        case 'randomHue':
            randomizedSelected = true;
            break;
        default:
            randomizedSelected = false;
            break;
    }
    if (randomizedSelected) {
        console.log(randomizedSelected);
        applyPresetButton.disabled = false;
    } else {
        console.log(randomizedSelected);
        applyPresetButton.disabled = true;
    }
}

const colorPicker = document.getElementById('color-picker');
const messageInput = document.getElementById('message-input');
const outputCode = document.getElementById('output-code');
const charCounter = document.getElementById('char-counter');
const applyButton = document.getElementById('apply-button');
const resetButton = document.getElementById('reset-button');
const copyCodeButton = document.getElementById('copy-code');
const heartButton = document.querySelector('footer span[aria-label="heart"]');
const presetSelect = document.getElementById('preset-select');
const applyPresetButton = document.getElementById('apply-preset-button');
const charLimit = 130;
let selectedColor = colorPicker.value;

const rootStlye = getComputedStyle(document.body);
const warnFont = rootStlye.getPropertyValue('--warn-font');
const defaultFont = rootStlye.getPropertyValue('--main-font');

const blurElements = [
    document.querySelector('.output-container'),
    document.querySelector('h1'),
    document.querySelector('ol'),
    document.querySelector('footer')
];

colorPicker.addEventListener('input', () => {
    selectedColor = colorPicker.value;
});

messageInput.addEventListener('input', () => {
    checkMessageInputLength();
    updateOutputCode();
});
messageInput.addEventListener('focus', () => {
    closePopup();
    blurInput();
});

applyButton.addEventListener('click', () => {
    applyColor();
});
applyButton.addEventListener('blur', () => {
    blurInput();
});

resetButton.addEventListener('click', resetInput);
copyCodeButton.addEventListener('click', copyCode);
heartButton.addEventListener('click', switchBackgroundImage);
presetSelect.addEventListener('change', () => {
    applyPreset();
    checkApplyButton();
});
presetSelect.addEventListener('focus', readyPreset);
applyPresetButton.addEventListener('click', applyPreset);