import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore , collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc } from "firebase/firestore";

// Firebase-konfiguration
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

// För att lagra kategorier
let categories = [];

// Hämta kategorier från Firestore
const fetchCategoriesFromFirestore = async () => {
    normalizeCategories();
    const categoriesCollection = collection(db, "categories");
    const sortedQuery = query(categoriesCollection, orderBy("order"));
    const snapshot = await getDocs(sortedQuery);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            columns: data.columns || [
                { name: "Förmodad", key: "expected" },
                { name: "Faktisk", key: "actual" }
            ],
            items: Array.isArray(data.items) ? data.items.map(item => {
                const newItem = {};
                (data.columns || [{ key: "expected" }, { key: "actual" }]).forEach(col => {
                    newItem[col.key] = parseFloat(item[col.key]) || 0;
                });
                return { ...item, ...newItem };
            }) : []
        };
    });
};

// Ta bort kategori permanent
const deleteCategoryFromFirestore = async (categoryId) => {
    try {
        const categoryDoc = doc(db, "categories", categoryId);
        await deleteDoc(categoryDoc);
        categories = categories.filter(category => category.id !== categoryId);
        console.log(`Kategori med id ${categoryId} har tagits bort från Firestore.`);
    } catch (error) {
        console.error("Fel vid borttagning av kategori:", error);
    }
};

// Sätt elementen för uträkning
const setTextContent = (id, text) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
    else console.error(`Element med id "${id}" hittades inte!`);
};

// Beräkna totalsummor
const calculateTotals = () => {
    let expectedIncome = 0, expectedExpense = 0, actualIncome = 0, actualExpense = 0;

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

// Beräkna totalsumma per kategori
const calculateCategoryTotals = (category) => {
    const totals = {};
    category.columns.forEach(col => totals[col.key] = 0);
    category.items.forEach(item => {
        category.columns.forEach(col => totals[col.key] += parseFloat(item[col.key]) || 0);
    });
    return totals;
};

// Rendera kategorier
const categoryList = document.getElementById("category-list");
const renderCategories = () => {
    categoryList.innerHTML = "";
    if (!categories || categories.length === 0) {
        categoryList.innerHTML = "<p>Inga kategorier att visa</p>";
        return;
    }

    categories.forEach((category, index) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Färg
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = category.color || "#f9f9f9";
        colorInput.onchange = () => {
            categories[index].color = colorInput.value;
            categoryEl.style.backgroundColor = colorInput.value;
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(colorInput);

        // Order
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

        // Namn
        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            const newName = title.textContent.trim();
            if (newName) categories[index].name = newName;
            else title.textContent = categories[index].name;
            renderCategories();
            calculateTotals();
        };

        // Typ
        const typeSelect = document.createElement("select");
        ["income","expense"].forEach(val => {
            const option = document.createElement("option");
            option.value = val;
            option.textContent = val === "income" ? "Inkomst" : "Utgift";
            typeSelect.appendChild(option);
        });
        typeSelect.value = category.type || "expense";
        typeSelect.onchange = () => {
            categories[index].type = typeSelect.value;
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(title);
        categoryEl.appendChild(typeSelect);

        // Kolumnrubriker
        const spanHeadlines = document.createElement("div");
        category.columns.forEach((col, colIndex) => {
            const colHeader = document.createElement("h5");
            colHeader.textContent = col.name;
            colHeader.contentEditable = true;
            colHeader.onblur = () => {
                col.name = colHeader.textContent.trim();
                renderCategories();
                calculateTotals();
            };
            spanHeadlines.appendChild(colHeader);
        });
        // Lägg till knappar för kolumner
        const addColumnButton = document.createElement("button");
        addColumnButton.textContent = "+ Kolumn";
        addColumnButton.onclick = () => {
            const newKey = `col_${Date.now()}`;
            category.columns.push({ name: "Ny kolumn", key: newKey });
            category.items.forEach(item => item[newKey] = 0);
            renderCategories();
            calculateTotals();
        };
        spanHeadlines.appendChild(addColumnButton);
        categoryEl.appendChild(spanHeadlines);

        // Items
        const itemList = document.createElement("ul");
        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            category.columns.forEach(col => {
                const input = document.createElement("input");
                input.type = "number";
                input.value = item[col.key] || 0;
                input.onchange = () => {
                    item[col.key] = parseFloat(input.value) || 0;
                    renderCategories();
                    calculateTotals();
                };
                itemEl.appendChild(input);
            });

            // Totalsumma per kolumn som en "item"-rad
            const totals = calculateCategoryTotals(category);
            const totalsRow = document.createElement("li");
            totalsRow.classList.add("item");
            totalsRow.style.backgroundColor = "#f1f0f0d2"; // Visuell skillnad

            const totalsName = document.createElement("input");
            totalsName.value = "Summa";
            totalsName.readOnly = true;
            totalsName.style.fontWeight = "bold";
            totalsRow.appendChild(totalsName);

            category.columns.forEach(col => {
                const colTotalInput = document.createElement("input");
                colTotalInput.value = totals[col.key];
                colTotalInput.readOnly = true;
                colTotalInput.style.fontWeight = "bold";
                colTotalInput.style.backgroundColor = "#a7e7d8d2"; // tydlig för kolumntotal
                totalsRow.appendChild(colTotalInput);
            });

            itemList.appendChild(totalsRow);


            // Ta bort item
            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort";
            deleteItemButton.onclick = () => {
                category.items.splice(itemIndex,1);
                renderCategories();
                calculateTotals();
            };
            itemEl.appendChild(deleteItemButton);
            itemList.appendChild(itemEl);
        });
        categoryEl.appendChild(itemList);

        // Totals
        const totals = calculateCategoryTotals(category);
        const totalsDiv = document.createElement("div");
        totalsDiv.classList.add("category-totals");
        totalsDiv.innerHTML = category.columns.map(col => `<strong>${col.name}:</strong> ${totals[col.key]} kr`).join("<br>");
        categoryEl.appendChild(totalsDiv);

        // Lägg till ny item
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = () => {
            const newItem = {};
            category.columns.forEach(col => newItem[col.key] = 0);
            category.items.push(newItem);
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(addItemButton);

        // Ta bort kategori
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.onclick = async () => {
            const categoryId = category.id;
            if (categoryId) await deleteCategoryFromFirestore(categoryId);
            categories.splice(index,1);
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(deleteCategoryButton);

        categoryList.appendChild(categoryEl);
    });
};

// Normalisera kategori ID
const normalizeCategories = async () => {
    categories.forEach(category => {
        if (!category.id.startsWith("temp_")) console.log(`Kategori-ID verifierad: ${category.id}`);
        else console.warn(`Kategori har ett temporärt ID: ${category.id}`);
    });
};

// Ladda kategorier vid start
const loadCategories = async () => {
    normalizeCategories();
    try {
        categories = await fetchCategoriesFromFirestore();
        renderCategories();
        calculateTotals();
    } catch (error) {
        console.error("Fel vid laddning av kategorier:", error);
        alert("Kunde inte ladda kategorier. Kontrollera din nätverksanslutning.");
    }
};

// Spara kategorier
const saveCategoriesToFirestore = async (categories) => {
    try {
        const categoriesCollection = collection(db, "categories");
        for (const category of categories) {
            if (category.id) {
                const categoryDoc = doc(categoriesCollection, category.id);
                await updateDoc(categoryDoc, {
                    id: category.id,
                    name: category.name,
                    type: category.type,
                    color: category.color,
                    items: category.items,
                    columns: category.columns,
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
        } else errorMessage.textContent = "Fel användarnamn eller lösenord.";
    });

    // Lägg till kategori
    const addCategoryButton = document.getElementById("add-category");
    if (addCategoryButton) addCategoryButton.addEventListener("click", async () => {
        const newCategoryRef = await addDoc(collection(db, "categories"), {
            name: "Ny kategori",
            color: "#f9f9f9",
            type: "expense",
            items: [],
            columns: [
                { name: "Förmodad", key: "expected" },
                { name: "Faktisk", key: "actual" }
            ],
            order: categories.length + 1
        });
        categories.push({
            id: newCategoryRef.id,
            name: "Ny kategori",
            color: "#f9f9f9",
            type: "expense",
            items: [],
            columns: [
                { name: "Förmodad", key: "expected" },
                { name: "Faktisk", key: "actual" }
            ],
            order: categories.length + 1
        });
        renderCategories();
        calculateTotals();
    });

    // Spara
    const saveButton = document.getElementById("save-button");
    if (saveButton) saveButton.addEventListener("click", async () => {
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
});
