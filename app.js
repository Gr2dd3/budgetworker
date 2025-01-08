import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore , collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";


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
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            items: Array.isArray(data.items) ? data.items.map(item => ({
                name: item.name || "",
                expected: parseFloat(item.expected) || 0,
                actual: parseFloat(item.actual) || 0
            })) : []
        };
    });
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
            const expected = parseFloat(item.expected) || 0;
            const actual = parseFloat(item.actual) || 0;

            if (category.type === "income") {
                expectedIncome += expected;
                actualIncome += actual;
            } else if (category.type === "expense") {
                expectedExpense += expected;
                actualExpense += actual;
            }
        });
    });

    // Uppdatera DOM
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

const renderCategories = () => {
    categoryList.innerHTML = "";

    categories.forEach((category, index) => {
        // Skapa kategori list-item
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

            // Välj färg på kategorin
            const colorInput = document.createElement("input");
            colorInput.Id ="color-input";
            colorInput.type = "color";
            colorInput.value = category.color || "#f9f9f9";
            colorInput.onchange = () => {
                categories[index].color = colorInput.value;
                categoryEl.style.backgroundColor = colorInput.value;
            };
            categoryEl.appendChild(colorInput);

        // Kategorinamn
        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            const newName = title.textContent.trim();
            if (newName) {
                categories[index].name = newName;
            } else {
                alert("Kategorinamn får inte vara tomt!");
                title.textContent = categories[index].name;
            }
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
                const value = parseFloat(itemExpected.value) || 0;
                categories[index].items[itemIndex].expected = value;
            };

            // Prisfält faktisk
            const itemActual = document.createElement("input");
            itemActual.type = "number";
            itemActual.value = item.actual;
            itemActual.placeholder = "Faktisk";
            itemActual.onchange = () => {
                const value = parseFloat(itemActual.value) || 0;
                categories[index].items[itemIndex].actual = value;
            };
            /*itemActual.onchange = () => {
                categories[index].items[itemIndex].actual = parseFloat(itemActual.value);
            };*/

            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort";
            deleteItemButton.onclick = () => {
                categories[index].items.splice(itemIndex, 1);
                renderCategories();
                calculateTotals();
            };

            itemEl.append(itemName, itemExpected, itemActual, deleteItemButton);
            itemList.appendChild(itemEl);
        });

        // Lägg till ny item
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = async () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0 });
            renderCategories();
            calculateTotals();
            // saveCategoriesToFirestore();
        };

        // Ta bort kategori
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.onclick = () => {
            categories.splice(index, 1);
            renderCategories();
            calculateTotals();
        };

        categoryEl.append(title, itemList, addItemButton, deleteCategoryButton);
        categoryList.appendChild(categoryEl);
    });
};

// Ladda kategorier vid start av app
const loadCategories = async () => {
    try {
        categories = await fetchCategoriesFromFirestore();
        if (!categories.length) {
            console.log("Inga kategorier hittades.");
        }
        renderCategories();
        calculateTotals();
    } catch (error) {
        console.error("Fel vid laddning av kategorier:", error);
        alert("Kunde inte ladda kategorier. Kontrollera din nätverksanslutning.");
    }
};
// Validera att kategorier har allt nödvändigt
const validateCategory = (category) => {
    if (!category.name || typeof category.name !== "string") return false;
    if (!Array.isArray(category.items)) return false;
    if (category.items.some(item => typeof item.name !== "string" || isNaN(item.expected) || isNaN(item.actual))) {
        return false;
    }
    return true;
};


// Spara alla kategorier i Firestore
/*const saveCategoriesToFirestore = async () => {
    console.log("Sparar kategori:", JSON.stringify(category, null, 2));

    if (!validateCategory(category)) {
        console.error("Ogiltig kategori:", category);
        return;
    }
    console.log("Sparar kategorier till Firestore:", categories);
    await Promise.all(categories.map(async (category) => {
        if (!category.id) {
            console.error("Kategori saknar ett giltigt ID:", category);
            return;
        }
        const categoryDoc = doc(db, "categories", category.id);
        await updateDoc(categoryDoc, { ...category }).catch((error) => {
            console.error(`Misslyckades att spara kategori med ID ${category.id}:`, error);
        });
    }));
    console.log("Kategorier sparade i Firestore!");
};*/

// Spara kategorier i Firestore (google)
/*const saveCategoriesToFirestore = async (categories) => {
    const categoriesCollection = collection(db, "categories");
    for (const category of categories) {
        const categoryDoc = doc(db, "categories", category.id);
        await updateDoc(categoriesCollection, category);
    }
    console.log("Kategorier sparade i Firestore!");
};*/

// FUNKAR DENNA VERKLIGEN FÖR SPARNING???
// Spara endast ändrade kategorier till Firestore
/*const saveCategoryToFirestore = async (category) => {
    const categoryDoc = doc(db, "categories", category.id);
    await updateDoc(categoryDoc, { ...category });
};*/

/*const saveCategoriesToFirestore = async (categories) => {
    const categoriesCollection = collection(db, "categories");
    for (const category of categories) {
        await addDoc(categoriesCollection, category);
    }
    console.log("Kategorier sparade i Firestore!");
};*/


// Inloggning (TODO: Byt till firebase Authentication)
const validCredentials = { 
    username: "Gradin2025", 
    passwordHash: "3af6f058eab3ac8f451704880d405ad9"
};

// Spara kategorier till Firestore
const saveCategoriesToFirestore = async (categories) => {
    try {
        const categoriesCollection = collection(db, "categories");
        
        for (const category of categories) {
            if (category.id) {
                // Uppdatera befintlig kategori
                const categoryDoc = doc(categoriesCollection, category.id);
                await updateDoc(categoryDoc, category);
            } else {
                // Skapa ny kategori
                const newCategoryRef = await addDoc(categoriesCollection, category);
                category.id = newCategoryRef.id; // Tilldela ID till kategorin lokalt
            }
        }

        console.log("Kategorier sparade framgångsrikt!");
    } catch (error) {
        console.error("Fel vid sparning av kategorier:", error);
    }
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

    // SPARA KNAPPEN
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            try {
                await saveCategoriesToFirestore(categories);
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
