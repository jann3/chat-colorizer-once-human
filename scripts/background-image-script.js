const backgroundImages = [
    'images/once-human-background-low-res1.webp',
    'images/once-human-background-low-res2.webp',
    'images/once-human-background-low-res3.webp',
    'images/once-human-background-low-res4.webp',
    'images/once-human-background-low-res5.webp'
];

const setRandomBackgroundImage = () => {
    if (document.documentElement) {
        const randomIndex = Math.floor(Math.random() * backgroundImages.length);
        document.body.style.backgroundImage = `url(${backgroundImages[randomIndex]})`;
    }
};

setRandomBackgroundImage();