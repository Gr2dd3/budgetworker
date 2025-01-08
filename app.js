import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD8B8qwp91a6N8_B_hwds5j8jsGZhrFtyk",
    authDomain: "ourbudget-d2b40.firebaseapp.com",
    projectId: "ourbudget-d2b40",
    storageBucket: "ourbudget-d2b40.firebasestorage.app",
    messagingSenderId: "10785224419",
    appId: "1:10785224419:web:2bfa5295fb70102934f7d6",
    measurementId: "G-94E36FGRMZ"
};

// Initiera Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Hämta kategorier från Firestore
const fetchCategoriesFromFirestore = async () => {
    const categoriesCollection = collection(db, "categories");
    const snapshot = await getDocs(categoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Spara kategorier i Firestore
const saveCategoriesToFirestore = async () => {
    await Promise.all(categories.map(async (category) => {
        const categoryDoc = doc(db, "categories", category.id);
        await updateDoc(categoryDoc, { ...category });
    }));
    console.log("Kategorier sparade i Firestore!");
};


// Sätt elementen för uträkning och kolla att de finns innan de körs
const setTextContent = (id, text) => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    } else {
        console.error(`Element med id "${id}" hittades inte!`);
    }
};

// Räkna ut total
const calculateTotals = () => {
    let expectedIncome = 0;
    let expectedExpense = 0;
    let actualIncome = 0;
    let actualExpense = 0;

    categories.forEach(category => {
        category.items.forEach(item => {
            if (category.type === "income") {
                expectedIncome += item.expected || 0;
                actualIncome += item.actual || 0;
            } else if (category.type === "expense") {
                expectedExpense += item.expected || 0;
                actualExpense += item.actual || 0;
            }
        });
    });

    setTextContent("total-budget-expected-income", `Förmodad inkomst: ${expectedIncome} kr`);
    setTextContent("total-budget-expected-expense", `Förmodad utgift: ${expectedExpense} kr`);
    setTextContent("total-expected", `Förmodad budget: ${expectedIncome - expectedExpense} kr`);
    setTextContent("total-budget-actual-income", `Faktisk inkomst: ${actualIncome} kr`);
    setTextContent("total-budget-actual-expense", `Faktisk utgift: ${actualExpense} kr`);
    setTextContent("total-actual", `Faktisk budget: ${actualIncome - actualExpense} kr`);
};


// För att lagra kategorier
let categories = []; 

// Rendera kategorier
const categoryList = document.getElementById("category-list");
const addCategoryButton = document.getElementById("add-category");

const renderCategories = () => {
    categoryList.innerHTML = "";

    categories.forEach((category, index) => {
        // Skapa list-item
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Kategorinamn
        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            categories[index].name = title.textContent;
        };

        //Skapa ul för items i en kategori
        const itemList = document.createElement("ul");
        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            // Item namn
            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.placeholder = "Namn";
            itemName.onchange = () => {
                categories[index].items[itemIndex].name = itemName.value;
            };

            // Prisfält förmodad
            const itemExpected = document.createElement("input");
            itemExpected.type = "number";
            itemExpected.value = item.expected;
            itemExpected.placeholder = "Förmodad";
            itemExpected.onchange = () => {
                categories[index].items[itemIndex].expected = parseFloat(itemExpected.value);
            };

            // Prisfält faktisk
            const itemActual = document.createElement("input");
            itemActual.type = "number";
            itemActual.value = item.actual;
            itemActual.placeholder = "Faktisk";
            itemActual.onchange = () => {
                categories[index].items[itemIndex].actual = parseFloat(itemActual.value);
            };

            itemEl.append(itemName, itemExpected, itemActual);
            itemList.appendChild(itemEl);
        });

        // Lägg till ny item
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0 });
            renderCategories();
            calculateTotals();
            saveCategoriesToFirestore();
        };

        categoryEl.append(title, itemList, addItemButton);
        categoryList.appendChild(categoryEl);
    });
};

// Ladda kategorier vid start av app
const loadCategories = async () => {
    categories = await fetchCategoriesFromFirestore();
    renderCategories();
    calculateTotals();
};

// Inloggning
const validCredentials = { 
    username: "Gradin2025", 
    passwordHash: "3af6f058eab3ac8f451704880d405ad9"
};
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
            renderCategories();
            calculateTotals();
        } else {
            errorMessage.textContent = "Fel användarnamn eller lösenord.";
        }
    });

    // Addera kategorier
    const addCategoryButton = document.getElementById("add-category");
    if (addCategoryButton) {
        addCategoryButton.addEventListener("click", () => {
            categories.push({ name: "Ny kategori", color: "#f9f9f9", type: "expense", items: [] });
            renderCategories();
            calculateTotals();
        });
    } else {
        console.error("Add category button not found!");
    }

    // Spara manuellt till firebase med spara knapp
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            renderCategories();
            calculateTotals();
            saveCategoriesToFirestore();
        });
    } else {
        console.error("Save button not found!");
    }
});
