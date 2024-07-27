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

const convertToColoredText = (node, currentColor = '') => {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue;
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        const color = node.style.color;
        const hexColor = rgbToHex(color);
        const content = Array.from(node.childNodes).map(child => convertToColoredText(child, hexColor)).join('');
        return `${hexColor}${content}`;
    }

    return Array.from(node.childNodes).map(child => convertToColoredText(child, currentColor)).join('');
};

const rgbToHex = (rgb) => {
    const rgbValues = rgb.match(/\d+/g).map(Number);
    return `#c${((1 << 24) + (rgbValues[0] << 16) + (rgbValues[1] << 8) + rgbValues[2]).toString(16).slice(1).toUpperCase()}`;
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
};

const colorPicker = document.getElementById('color-picker');
const messageInput = document.getElementById('message-input');
const outputCode = document.getElementById('output-code');
const charCounter = document.getElementById('char-counter');
const applyButton = document.getElementById('apply-button');
const resetButton = document.getElementById('reset-button');
const copyCodeButton = document.getElementById('copy-code');
const heartButton = document.querySelector('footer span[aria-label="heart"]');
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

messageInput.addEventListener('input', updateOutputCode);
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