
import { loadCategories, categories } from "./state.js";
import { renderCategories } from "./ui.js";
import { calculateTotals } from "./totals.js";
import { saveCategoriesToFirestore } from "./firestoreservice.js";
import { signInUser } from "./firebase.js";

    document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("app");
    const errorMessageElement = document.getElementById("error-message-element");

    const loginButton = document.getElementById("login-button");
        console.log("Hello");
    loginButton.addEventListener("click", async () => {
        const email = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        console.log("starting to login with email: " + email);
        // Anropa din importerade funktion
        const result = await signInUser(email, password);

        console.log("result: " + result);
        console.log("is success? " + result.success);
        if (result.success) {
            console.log("Användare inloggad:", result.user.email);
            errorMessageElement.textContent = "";
            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");
            loadCategories();
        } else {
            const error = result.error;
            const errorCode = error.code;
            const errorMessageText = error.message;

            console.error("Inloggningsfel:", errorCode, errorMessageText);

            // Visa ett användarvänligt felmeddelande
            if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                errorMessageElement.textContent = "Felaktig e-postadress eller lösenord.";
            } else if (errorCode === 'auth/invalid-email') {
                errorMessageElement.textContent = "Ogiltig e-postadress.";
            } else if (errorCode === 'auth/user-disabled') {
                errorMessageElement.textContent = "Detta användarkonto har inaktiverats.";
            } else {
                errorMessageElement.textContent = "Ett oväntat fel uppstod vid inloggning.";
            }
        }
    });

    // Lägg till kategori
    const addCategoryButton = document.getElementById("add-category");
    addCategoryButton.addEventListener("click", () => {
        const currentColumnNames = categories[0]?.columnNames || ["Förmodad","Faktisk","Extra"];
        const newCategory = {
            name: "Ny kategori",
            color: "#f9f9f9",
            type: "expense",
            items: [],
            order: categories.length+1,
            columnNames: currentColumnNames
        };
        categories.push(newCategory);
        renderCategories();
        calculateTotals();
    });

    // Spara
    const saveButton = document.getElementById("save-button");
    saveButton.addEventListener("click", async () => {
        try {
            await saveCategoriesToFirestore(categories);
            alert("Kategorier sparade!");
        } catch (err) {
            console.error(err);
            alert("Fel vid sparning");
        }
    });
});