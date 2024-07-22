const backgroundImages = [
    'images/once-human-background-low-res1.jpg',
    'images/once-human-background-low-res2.jpg',
    'images/once-human-background-low-res3.jpg',
    'images/once-human-background-low-res4.jpg'
];

function setRandomBackgroundImage() {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    document.body.style.backgroundImage = `url(${backgroundImages[randomIndex]})`;
}

setRandomBackgroundImage();