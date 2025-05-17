document.addEventListener("DOMContentLoaded", () => {
    // Animated Title
    const title = "Welcome to ESGT Diaspora Website";
    const animatedTitleElement = document.getElementById("animated-title");
    let index = 0;

    const typeTitle = () => {
        if (index < title.length) {
            animatedTitleElement.textContent += title[index];
            index++;
            setTimeout(typeTitle, 100); // Type each letter every 100ms
        }
    };

    typeTitle();

    // Interactive Global Map
    window.exploreMap = () => {
        alert("Interactive Map is under construction! Stay tuned for updates.");
    };
});

