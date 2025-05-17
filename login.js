/* 
document.addEventListener("DOMContentLoaded", () => {
const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("error-message");
const content = document.getElementById("content");
const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".navbar a");

const credentials = {
    username: "admin",
    password: "password123",
};

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === credentials.username && password === credentials.password) {
        loginForm.style.display = "none";
        errorMessage.textContent = "";
        content.style.display = "block";
        showPage("about");
    } else {
        errorMessage.textContent = "Invalid username or password.";
    }
});

navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = e.target.id.split("-")[0];
        showPage(target);
    });
});

function showPage(pageId) {
    pages.forEach((page) => {
        page.style.display = page.id === pageId ? "block" : "none";
    });
}
}); */



// Login functionality
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("error-message");

    // Hardcoded credentials for demonstration
    const validUsername = "admin";
    const validPassword = "password";

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault(); // Prevent form submission

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Check credentials
        if (username === validUsername && password === validPassword) {
        window.location.href = "my pages/about.html"; // Redirect to About page
        } else {
            errorMessage.textContent = "Invalid username or password.";
            errorMessage.style.display = "block";
        }
    });
});


