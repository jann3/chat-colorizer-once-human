const colorPicker = document.getElementById('color-picker');
const messageInput = document.getElementById('message-input');
const outputCode = document.getElementById('output-code');
const charCounter = document.getElementById('char-counter');
const charLimit = 130;
let selectedColor = colorPicker.value;

const blurElements = [
    document.querySelector('.output-container'),
    document.querySelector('h1'),
    document.querySelector('ol'),
    document.querySelector('footer')
];

colorPicker.addEventListener('input', () => {
    selectedColor = colorPicker.value;
});

function applyColor() {
    const selection = window.getSelection();

    if (selection.rangeCount === 0) {
        const popup = document.getElementById('message-warning');
        try {
            popup.showPopover();
            focusInput();
        } catch (err) {
            console.log(err);
        }
        return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
        const popup = document.getElementById('message-warning');
        try {
            popup.showPopover();
            focusInput();
        } catch (err) {
            console.log(err);
        }
        return;
    }

    closePopup();
    blurInput();

    const span = document.createElement('span');
    span.style.color = selectedColor;
    range.surroundContents(span);

    updateOutputCode();
    blurOnUpdate();
}

function focusInput() {
    blurElements.forEach(el => {
        el.classList.add('blurred');
    });
}

function blurInput() {
    blurElements.forEach(el => {
        el.classList.remove('blurred');
    });
}

function blurOnUpdate() {
    if (window.getSelection) { window.getSelection().removeAllRanges(); }
    else if (document.selection) { document.selection.empty(); }
}

function closePopup() {
    try {
        const popup = document.getElementById('message-warning');
        popup.hidePopover();
    } catch (err) {
        console.log(err);
    }
}

function updateOutputCode() {
    const output = document.getElementById('output-code');
    const html = messageInput.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const coloredText = convertToColoredText(tempDiv);
    output.value = coloredText;
    updateCharCounter(coloredText.length);
}

function convertToColoredText(node, currentColor = '') {
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
}

function rgbToHex(rgb) {
    const rgbValues = rgb.match(/\d+/g).map(Number);
    return `#c${((1 << 24) + (rgbValues[0] << 16) + (rgbValues[1] << 8) + rgbValues[2]).toString(16).slice(1).toUpperCase()}`;
}

function updateCharCounter(length) {
    const style = getComputedStyle(document.body);

    charCounter.innerHTML = `${length}/${charLimit}<span class="collapse"> characters</span>`;
    if (length > charLimit) {
        charCounter.style.color = style.getPropertyValue('--warn-font');
    } else {
        charCounter.style.color = style.getPropertyValue('--main-font');
    }
}

function copyCode() {
    const code = document.getElementById('output-code');
    code.select();
    code.setSelectionRange(0, 130);
    navigator.clipboard.writeText(code.value);
    const popup = document.getElementById('confirm-message');
    try {
        popup.togglePopover();
    } catch (err) {
        console.log(err);
    }
}

function switchBackgroundImage() {
    const backgroundStyle = document.getElementsByClassName('fade-in')[0].style;

    if (backgroundStyle.animationName == 'fadeInBackground-1') {
        backgroundStyle.animationName = 'fadeInBackground-2'
    } else {
        backgroundStyle.animationName = 'fadeInBackground-1'
    }

    const bodyElement = document.body;
    const currentBackgroundImage = getComputedStyle(bodyElement).backgroundImage;

    const matches = currentBackgroundImage.match(/url\("?(.+?)"?\)$/);
    let currentImageName = matches ? matches[1] : null;

    if (currentImageName) {
        const url = new URL(currentImageName);
        currentImageName = url.pathname.replace(/^\//, '');
    }

    const currentIndex = backgroundImages.findIndex(image => currentImageName.includes(image));
    let newIndex;

    if (currentIndex !== -1) {
        newIndex = (currentIndex + 1) % backgroundImages.length;
    } else {
        newIndex = 0;
    }
    bodyElement.style.backgroundImage = `url(${backgroundImages[newIndex]})`;
}

function resetInput() {
    const input = document.getElementById('message-input');
    const output = document.getElementById('output-code');
    const color = document.getElementById('color-picker');

    input.innerHTML = '';
    output.value = '';
    color.value = '#ffffff';
}

messageInput.addEventListener('input', updateOutputCode);