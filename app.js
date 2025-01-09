import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore , collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";


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
    const sortedQuery = query(categoriesCollection, orderBy("order"));
    const snapshot = await getDocs(sortedQuery);
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

// Ta bort kategori permanent
const deleteCategoryFromFirestore = async (categoryId) => {
    try {
        const categoryDoc = doc(db, "categories", categoryId);
        await deleteDoc(categoryDoc);
        console.log(`Kategori med id ${categoryId} har tagits bort från Firestore.`);
    } catch (error) {
        console.error("Fel vid borttagning av kategori:", error);
    }
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

// Räkna ut totalen för varje kategori
const calculateCategoryTotals = (category) => {
    let totalExpected = 0;
    let totalActual = 0;

    category.items.forEach(item => {
        totalExpected += parseFloat(item.expected) || 0;
        totalActual += parseFloat(item.actual) || 0;
    });

    return { totalExpected, totalActual };
};


// För att lagra kategorier
let categories = []; 

// Rendera kategorier
const categoryList = document.getElementById("category-list");

const renderCategories = () => {
    categoryList.innerHTML = "";

    // Kontroll och åtgärd om inga kategorier finns
    if (!categories || categories.length === 0) {
        categoryList.innerHTML = "<p>Inga kategorier att visa</p>";
        return;
    }    

    categories.forEach((category, index) => {
        // Skapa kategori list-item
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Välj färg på kategorin
        const colorInput = document.createElement("input");
        colorInput.id ="color-input";
        colorInput.type = "color";
        colorInput.value = category.color || "#f9f9f9";
        colorInput.onchange = () => {
            categories[index].color = colorInput.value;
            categoryEl.style.backgroundColor = colorInput.value;
        };
        categoryEl.appendChild(colorInput);

        // Välj vilken placering kategorin ska ha i kategori-listan
        const orderInput = document.createElement("input");
        orderInput.type = "number";
        orderInput.value = category.order || index + 1;
        orderInput.min = 1;
        orderInput.onchange = () => {
            const newOrder = parseInt(orderInput.value, 10);
            if (newOrder > 0) {
                categories[index].order = newOrder;
                categories.sort((a, b) => a.order - b.order);
                renderCategories();
                calculateTotals();
            } else {
                alert("Ordningen måste vara ett positivt heltal!");
                orderInput.value = categories[index].order;
            }
        };
        categoryEl.appendChild(orderInput);


        // Kategorinamn
        const title = document.createElement("h3");
        title.textContent = category.name;
        title.id = "category-name";
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

        // Typ (inkomst/utgift)
        const typeSelect = document.createElement("select");
        const incomeOption = document.createElement("option");
        incomeOption.value = "income";
        incomeOption.textContent = "Inkomst";
        const expenseOption = document.createElement("option");
        expenseOption.value = "expense";
        expenseOption.textContent = "Utgift";

        typeSelect.append(incomeOption, expenseOption);
        typeSelect.value = category.type || "expense";
        typeSelect.onchange = () => {
            categories[index].type = typeSelect.value;
        };
        categoryEl.appendChild(typeSelect);

        // Rubriker för item fälten
        const spanHeadlines = document.createElement("div");
        spanHeadlines.id = "div-headlines";
        const itemNameHeadline = document.createElement("p");
        itemNameHeadline.innerHTML = "Namn";
        const itemExpectedHeadline = document.createElement("p");
        itemExpectedHeadline.innerHTML = "Förmodad";
        const itemActualHeadline = document.createElement("p");
        itemActualHeadline.innerHTML = "Faktisk";
        spanHeadlines.appendChild(itemNameHeadline);
        spanHeadlines.appendChild(itemExpectedHeadline);
        spanHeadlines.appendChild(itemActualHeadline);


        //Skapa ul för items i en kategori
        const itemList = document.createElement("ul");
        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            // Item namn
            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.id = "item-name";
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

            // Ta bort Item knapp
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

        // Visa totalsummor för kategorin
        const totals = calculateCategoryTotals(category);
        console.log('totals.totalExpected: ' + totals.totalExpected);
        console.log('totals.totalActual: ' + totals.totalActual);
        const totalsDiv = document.createElement("div");
        totalsDiv.classList.add("category-totals");
        totalsDiv.innerHTML = `
            <strong>Total förmodad:</strong> ${totals.totalExpected} kr<br>
            <strong>Total faktisk:</strong> ${totals.totalActual} kr
        `;

        // Lägg till ny item
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = async () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0 });
            renderCategories();
            calculateTotals();
        };

        // Ta bort kategori
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.id = "delete-button";
        deleteCategoryButton.onclick = async () => {
            const categoryId = categories[index].id;
            if (categoryId) {
                await deleteCategoryFromFirestore(categoryId);
            }
            categories.splice(index, 1);
            renderCategories();
            calculateTotals();
        };


        categoryEl.append(
            title, 
            spanHeadlines, 
            itemList, 
            totalsDiv,
            addItemButton, 
            deleteCategoryButton
        );

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
                const categoryDoc = doc(categoriesCollection, category.id);
                await updateDoc(categoryDoc, {
                    name: category.name,
                    type: category.type,
                    color: category.color,
                    items: category.items,
                    order: category.order
                });
            } else {
                const newCategoryRef = await addDoc(categoriesCollection, category);
                category.id = newCategoryRef.id;
            }
        }
        console.log("Kategorier sparade framgångsrikt!");
    } catch (error) {
        console.error("Fel vid sparning av kategorier:", error);
    }
};

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
        addCategoryButton.addEventListener("click", () => {
            categories.push({ name: "Ny kategori", color: "#f9f9f9", type: "expense", items: [], order: categories.length + 1});
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
