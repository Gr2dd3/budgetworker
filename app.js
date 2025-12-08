
import { validCredentials } from "./login.js";
import { loadCategories, categories } from "./state.js";
import { renderCategories } from "./ui.js";
import { calculateTotals } from "./totals.js";
import { saveCategoriesToFirestore } from "./firestoreservice.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("app");
    const errorMessage = document.getElementById("error-message");

    const loginButton = document.getElementById("login-button");
    loginButton.addEventListener("click", () => {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (username === validCredentials.username && CryptoJS.MD5(password).toString() === validCredentials.passwordHash) {
            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");
            loadCategories();
        } else {
            errorMessage.textContent = "Fel användarnamn eller lösenord.";
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














/*
import { fetchCategoriesFromFirestore, saveCategoriesToFirestore, deleteCategoryFromFirestore } from '.\firestoreservice.js';
import { validCredentials } from './login';
import { calculateTotals } from './totals';

// Rendera kategorier
const categoryList = document.getElementById("category-list");

document.addEventListener("DOMContentLoaded", () => {
    // Logga in
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("app");
    const errorMessage = document.getElementById("error-message");
    const loginButton = document.getElementById("login-button");

    loginButton.addEventListener("click", () => {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
    
        if (username === validCredentials.username && CryptoJS.MD5(password).toString() === validCredentials.passwordHash) {
            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");
            loadCategories();
            renderCategories();
            calculateTotals();
        } else {
            errorMessage.textContent = "Fel användarnamn eller lösenord.";
        }
    });

    // Addera kategorier
    const addCategoryButton = document.getElementById("add-category");
    if (addCategoryButton) {
        addCategoryButton.addEventListener("click", async () => {
            // Hämta de aktuella kolumnnamnen från en befintlig kategori, annars standard
            const currentColumnNames = categories[0]?.columnNames || ["Förmodad", "Faktisk", "Extra"];

            const newCategoryData = {
                name: "Ny kategori",
                color: "#f9f9f9",
                type: "expense",
                items: [],
                order: categories.length + 1,
                columnNames: currentColumnNames, // Lägg till kolumnnamnen här
            };
            
            const newCategoryRef = await addDoc(collection(db, "categories"), newCategoryData);
            
            // Pusha till den lokala arrayen med det nya ID:t och datan
            categories.push({
                id: newCategoryRef.id,
                ...newCategoryData
            });
            
            renderCategories();
            calculateTotals();
        });
    } else {
        console.error("Add category button not found!");
    }
    
    // SPARA KNAPPEN
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            try {
                await saveCategoriesToFirestore(categories);
                renderCategories();
                calculateTotals();
                alert("Kategorier sparade!");
            } catch (error) {
                console.error("Fel vid sparning:", error);
                alert("Misslyckades att spara kategorier.");
            }
        });    
    } else {
        console.error("Save button not found!");
    }
});

*/