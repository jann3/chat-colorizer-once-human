const applyColor = () => {
    const selection = window.getSelection();
    const popup = document.getElementById('message-warning');

    if (selection.rangeCount === 0 || selection.getRangeAt(0).collapsed) {
        try {
            popup.togglePopover();
            focusInput();
        } catch (err) {
            console.error('Error showing popover:', err);
        }
        return;
    }

    closePopup();
    blurInput();

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    const handleTextNode = (node, startOffset, endOffset) => {
        if (node.nodeType !== Node.TEXT_NODE) {
            return;
        }

        const fullText = node.textContent;
        const beforeText = fullText.slice(0, startOffset);
        const selectedText = fullText.slice(startOffset, endOffset);
        const afterText = fullText.slice(endOffset);

        const fragment = document.createDocumentFragment();

        if (beforeText) {
            const beforeNode = document.createTextNode(beforeText);
            fragment.appendChild(beforeNode);
        }

        if (selectedText) {
            const span = document.createElement('span');
            span.style.color = selectedColor;
            span.textContent = selectedText;
            fragment.appendChild(span);
        }

        if (afterText) {
            const afterNode = document.createTextNode(afterText);
            fragment.appendChild(afterNode);
        }

        node.replaceWith(fragment);
    };

    const splitSpan = (span, startOffset, endOffset) => {
        if (span.nodeType !== Node.ELEMENT_NODE || span.tagName !== 'SPAN') {
            return;
        }

        const fullText = span.textContent;
        const beforeText = fullText.slice(0, startOffset);
        const selectedText = fullText.slice(startOffset, endOffset);
        const afterText = fullText.slice(endOffset);

        const fragment = document.createDocumentFragment();

        if (beforeText) {
            const beforeSpan = span.cloneNode();
            beforeSpan.textContent = beforeText;
            fragment.appendChild(beforeSpan);
        }

        if (selectedText) {
            const selectedSpan = document.createElement('span');
            selectedSpan.style.color = selectedColor;
            selectedSpan.textContent = selectedText;
            fragment.appendChild(selectedSpan);
        }

        if (afterText) {
            const afterSpan = span.cloneNode();
            afterSpan.textContent = afterText;
            fragment.appendChild(afterSpan);
        }

        span.replaceWith(fragment);
    };

    const processNodesInRange = (range) => {
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (range.intersectsNode(node) && node.parentNode !== messageInput) {
                        return NodeFilter.FILTER_ACCEPT;
                    } else {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
            },
            false
        );

        const nodesToProcess = [];
        let currentNode = walker.currentNode;

        while (currentNode) {
            const isStartNode = currentNode === startContainer;
            const isEndNode = currentNode === endContainer;

            if (isStartNode && isEndNode) {
                nodesToProcess.push({ node: currentNode, startOffset: range.startOffset, endOffset: range.endOffset });
                break;
            } else if (isStartNode) {
                nodesToProcess.push({ node: currentNode, startOffset: range.startOffset, endOffset: currentNode.textContent.length });
            } else if (isEndNode) {
                nodesToProcess.push({ node: currentNode, startOffset: 0, endOffset: range.endOffset });
                break;
            } else {
                nodesToProcess.push({ node: currentNode, startOffset: 0, endOffset: currentNode.textContent.length });
            }
            currentNode = walker.nextNode();
        }

        nodesToProcess.forEach(({ node, startOffset, endOffset }) => {
            const parentElement = node.parentElement;
            if (parentElement && parentElement.tagName === 'SPAN' && parentElement.style.color) {
                splitSpan(parentElement, startOffset, endOffset);
            } else {
                handleTextNode(node, startOffset, endOffset);
            }
        });
    };

    processNodesInRange(range);
    mergeAdjacentSpans();

    updateOutputCode();
    blurOnUpdate();
};

const mergeAdjacentSpans = () => {
    if (!messageInput) return;

    const spans = Array.from(messageInput.querySelectorAll('span'));
    if (!spans.length) return;

    let i = 0;
    while (i < spans.length - 1) {
        const currentSpan = spans[i];
        const nextSpan = spans[i + 1];

        if (currentSpan.textContent === '' || nextSpan.textContent === '') {
            i++;
            continue;
        }

        if (currentSpan.style.color === nextSpan.style.color) {
            currentSpan.textContent += nextSpan.textContent;
            nextSpan.remove();
            spans.splice(i + 1, 1);
        } else {
            i++;
        }
    }
};

const calculateContrastRatios = () => {
    const defaultBackgroundColor = '#404040';
    const spans = messageInput.querySelectorAll('span');

    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    };

    const luminance = (r, g, b) => {
        const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const contrastRatio = (lum1, lum2) => {
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
    };

    const backgroundColorRgb = hexToRgb(defaultBackgroundColor);
    const backgroundLuminance = luminance(...backgroundColorRgb);

    const ratios = [];

    spans.forEach((span) => {
        const color = window.getComputedStyle(span).color;
        const rgb = color.match(/\d+/g).map(Number);
        const textLuminance = luminance(...rgb);
        const ratio = contrastRatio(backgroundLuminance, textLuminance);

        if (span.textContent !== ' ') {
            // console.log(`Contrast ratio for ${span.textContent}: ${ratio.toFixed(2)}`);
            ratios.push(Number(ratio.toFixed(2)));
        }
    });

    const averageRatio = ratios.reduce((previous, current, index, array) => {
        return previous + (current / array.length);
    }, 0);

    const minRatio = ratios.reduce((previous, current) => {
        return current < previous ? current : previous;
    }, ratios[0]);

    const weightedRatio = (a, b) => {
        return ((a * 1 + b * 2) / 3).toFixed(2);
    };

    const finalRatio = weightedRatio(averageRatio.toFixed(2), minRatio)

    if (averageRatio !== 0) {
        if (finalRatio > 10) {
            contrastMeter.value = 10;
        } else {
            contrastMeter.value = finalRatio;
        }
    }
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
        console.error('Error hiding popover:', err);
    }
};

const updateOutputCode = () => {
    const html = messageInput.innerHTML;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const coloredText = convertToColoredText(tempDiv);
    outputCode.value = coloredText;
    updateCharCounter(coloredText.length);
    calculateContrastRatios();
};

const colorShortcuts = {
    '#FFFFFF': '#W',
    '#000000': '#K',
    '#FF0000': '#R',
    '#00FF00': '#G',
    '#0000FF': '#B',
    '#FFFF00': '#Y'
};

const convertToColoredText = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue.includes('#') ? node.nodeValue.replace(/#/g, '##') : node.nodeValue;
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
        let color = node.style.color;
        const hexColor = rgbToHex(color);

        if (node.textContent.trim() === '') {
            return node.textContent;
        }

        let formattedHexColor = colorShortcuts[hexColor] || hexColor;
        if (!colorShortcuts[hexColor]) {
            formattedHexColor = hexColor.startsWith('#c') ? hexColor : `#c${hexColor.slice(1)}`;
        }

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
        }, '1200');
    } catch (err) {
        console.error('Error hiding popover:', err);
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
    contrastMeter.value = 10;
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
            colors = ['#ff5252', '#ffA052', '#8edf58', '#3eeac7', '#65a9f1', '#cd69f2', '#ed5ab7'];
            break;
        case 'sunrise':
            colors = ['#ff5858', '#ff6938', '#fb8f23', '#fcb138', '#ffeb46', '#fcb138', '#fb8f23', '#ff6938', '#ff5858'];
            break;
        case 'brazil':
            colors = ['#5ed928', '#fae43f', '#ffce0f', '#42ae3b', '#3cb4ff', '#61e3ff', '#5ed928', '#fae43f'];
            break;
        case 'galaxyNebula':
            colors = ['#e958cf', '#bb78f2', '#a08aff', '#7d9bf3', '#68c5e3', '#5bd29e'];
            break;
        case 'warpStorm':
            colors = ['#cc2253', '#dc306b', '#d83a7a', '#d2407b', '#bf409c', '#bb52d0', '#cc55cc', '#dd66e0'];
            break;
        case 'morningLight':
            colors = ['#ffd88d', '#ffed8d', '#efeba5', '#c9e490', '#95f6f1', '#7edbff', '#95adf6', '#da8bff'];
            break;
        case 'vintagePoster':
            colors = ['#ff411f', '#f56f5f', '#e7b96e', '#edc47c', '#5fb8b2', '#5096c8', '#5a64fa'];
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
        applyPresetButton.disabled = false;
    } else {
        applyPresetButton.disabled = true;
    }
    const message = messageInput.textContent.trim();
    const popup = document.getElementById('enter-message-warning');

    if (message.length === 0) {
        setTimeout(() => {
            focusInput();
            popup.showPopover();
        }, '70');
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
const contrastMeter = document.getElementById('contrast-meter');
const contrastContainer = document.querySelector('.contrast-container');
const contrastWarning = document.getElementById('contrast-meter-message-warning');

const charLimit = 130;
let selectedColor = colorPicker.value;

const rootStlye = getComputedStyle(document.body);
const warnFont = rootStlye.getPropertyValue('--warn-font');
const defaultFont = rootStlye.getPropertyValue('--main-font');

const blurElements = [
    document.querySelector('.output-container'),
    document.querySelector('details'),
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

contrastContainer.addEventListener('mouseover', () => {
    contrastWarning.showPopover();
});

contrastContainer.addEventListener('focus', () => {
    contrastWarning.showPopover();
});

contrastContainer.addEventListener('mouseleave', () => {
    contrastWarning.hidePopover();
});

contrastContainer.addEventListener('blur', () => {
    contrastWarning.hidePopover();
});

resetButton.addEventListener('click', resetInput);
copyCodeButton.addEventListener('click', copyCode);
heartButton.addEventListener('click', switchBackgroundImage);
presetSelect.addEventListener('change', () => {
    applyPreset();
    checkApplyButton();
});
presetSelect.addEventListener('click', () => {
    blurInput();
});
presetSelect.addEventListener('blur', blurInput);
presetSelect.addEventListener('focus', readyPreset);
applyPresetButton.addEventListener('click', applyPreset);