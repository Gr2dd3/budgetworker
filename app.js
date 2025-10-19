import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore , collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc } from "firebase/firestore";


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
    normalizeCategories();
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
        categories = categories.filter(category => category.id !== categoryId);
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

const calculateTotals = () => {
    let totalCol1 = 0; // motsvarar "expected"
    let totalCol2 = 0; // motsvarar "actual"
    let totalCol3 = 0; // motsvarar "extra"

    categories.forEach(category => {
        category.items.forEach(item => {
            totalCol1 += parseFloat(item.expected) || 0;
            totalCol2 += parseFloat(item.actual) || 0;
            totalCol3 += parseFloat(item.extra) || 0;
        });
    });

    // Uppdatera DOM
    setTextContent("total-budget-col1", `Totalt ${categories[0]?.columnNames[0] || "Förmodad"}: ${totalCol1} kr`);
    setTextContent("total-budget-col2", `Totalt ${categories[0]?.columnNames[1] || "Faktisk"}: ${totalCol2} kr`);
    setTextContent("total-budget-col3", `Totalt ${categories[0]?.columnNames[2] || "Extra"}: ${totalCol3} kr`);

    // Om du vill visa "budgetresultat" som tidigare (inkomst - utgift)
    let totalIncome1 = 0, totalExpense1 = 0;
    let totalIncome2 = 0, totalExpense2 = 0;
    let totalIncome3 = 0, totalExpense3 = 0;

    categories.forEach(category => {
        category.items.forEach(item => {
            if (category.type === "income") {
                totalIncome1 += parseFloat(item.expected) || 0;
                totalIncome2 += parseFloat(item.actual) || 0;
                totalIncome3 += parseFloat(item.extra) || 0;
            } else if (category.type === "expense") {
                totalExpense1 += parseFloat(item.expected) || 0;
                totalExpense2 += parseFloat(item.actual) || 0;
                totalExpense3 += parseFloat(item.extra) || 0;
            }
        });
    });

    setTextContent("total-expected", `Budgetresultat (${categories[0]?.columnNames[0] || "Förmodad"}): ${totalIncome1 - totalExpense1} kr`);
    setTextContent("total-actual", `Budgetresultat (${categories[0]?.columnNames[1] || "Faktisk"}): ${totalIncome2 - totalExpense2} kr`);
    setTextContent("total-extra", `Budgetresultat (${categories[0]?.columnNames[2] || "Extra"}): ${totalIncome3 - totalExpense3} kr`);
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

    // Kontroll om inga kategorier finns
    if (!categories || categories.length === 0) {
        categoryList.innerHTML = "<p>Inga kategorier att visa</p>";
        return;
    }    

    categories.forEach((category, index) => {
        // Säkerställ att kolumnnamn finns
        category.columnNames = category.columnNames || ["Förmodad", "Faktisk", "Extra"];

        // Skapa kategori-element
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Färginput
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

        // Ordning
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
        title.contentEditable = true;
        title.onblur = () => {
            const newName = title.textContent.trim();
            if (newName) {
                categories[index].name = newName;
                renderCategories();
                calculateTotals();
            } else {
                title.textContent = categories[index].name;
            }
        };
        categoryEl.appendChild(title);

        // Typ
        const typeSelect = document.createElement("select");
        const incomeOption = new Option("Inkomst", "income");
        const expenseOption = new Option("Utgift", "expense");
        typeSelect.append(incomeOption, expenseOption);
        typeSelect.value = category.type || "expense";
        typeSelect.onchange = () => {
            categories[index].type = typeSelect.value;
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(typeSelect);

        // Rubriker för kolumner
        const spanHeadlines = document.createElement("div");
        spanHeadlines.id = "div-headlines";
        category.columnNames.forEach((name, colIndex) => {
            const colHeadline = document.createElement("h5");
            colHeadline.textContent = name;
            colHeadline.contentEditable = true;
            colHeadline.onblur = () => {
                const newName = colHeadline.textContent.trim();
                if (newName) {
                    categories[index].columnNames[colIndex] = newName;
                    renderCategories();
                } else {
                    colHeadline.textContent = categories[index].columnNames[colIndex];
                }
            };
            spanHeadlines.appendChild(colHeadline);
        });
        categoryEl.appendChild(spanHeadlines);

        // Lista med items
        const itemList = document.createElement("ul");
        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            // Namn
            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.placeholder = "Namn";
            itemName.onchange = () => {
                categories[index].items[itemIndex].name = itemName.value;
                renderCategories();
                calculateTotals();
            };
            itemEl.appendChild(itemName);

            // Tre kolumner dynamiskt
            ["expected", "actual", "extra"].forEach((key, colIndex) => {
                const input = document.createElement("input");
                input.type = "number";
                input.value = item[key] || 0;
                input.placeholder = category.columnNames[colIndex];
                input.onchange = () => {
                    categories[index].items[itemIndex][key] = parseFloat(input.value) || 0;
                    renderCategories();
                    calculateTotals();
                };
                itemEl.appendChild(input);
            });

            // Ta bort-item-knapp
            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort";
            deleteItemButton.onclick = () => {
                categories[index].items.splice(itemIndex, 1);
                renderCategories();
                calculateTotals();
            };
            itemEl.appendChild(deleteItemButton);

            itemList.appendChild(itemEl);
        });
        categoryEl.appendChild(itemList);

        // Totals
        const totals = {
            totalExpected: category.items.reduce((sum, i) => sum + (parseFloat(i.expected) || 0), 0),
            totalActual: category.items.reduce((sum, i) => sum + (parseFloat(i.actual) || 0), 0),
            totalExtra: category.items.reduce((sum, i) => sum + (parseFloat(i.extra) || 0), 0),
        };
        const totalsDiv = document.createElement("div");
        totalsDiv.classList.add("category-totals");
        totalsDiv.innerHTML = `
            <strong>${category.columnNames[0]}:</strong> ${totals.totalExpected} kr<br>
            <strong>${category.columnNames[1]}:</strong> ${totals.totalActual} kr<br>
            <strong>${category.columnNames[2]}:</strong> ${totals.totalExtra} kr
        `;
        categoryEl.appendChild(totalsDiv);

        // Lägg till item
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0, extra: 0 });
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(addItemButton);

        // Ta bort kategori
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.onclick = async () => {
            const categoryId = categories[index].id;
            if (categoryId) await deleteCategoryFromFirestore(categoryId);
            categories.splice(index, 1);
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(deleteCategoryButton);

        categoryList.appendChild(categoryEl);
    });
};

// Ladda kategorier vid start av app
const loadCategories = async () => {
    normalizeCategories();
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

// Kontroll av lokala kategori id
const normalizeCategories = async () => {
    categories.forEach(category => {
        if (!category.id.startsWith("temp_")) {
            console.log(`Kategori-ID verifierad: ${category.id}`);
        } else {
            console.warn(`Kategori har ett temporärt ID: ${category.id}`);
        }
    });
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
                    id: category.id,
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
    addCategoryButton.addEventListener("click", async () => {
        const newCategoryRef = await addDoc(collection(db, "categories"), {
            name: "Ny kategori",
            color: "#f9f9f9",
            type: "expense",
            items: [],
            order: categories.length + 1,
        });
        categories.push({
            id: newCategoryRef.id,
            name: "Ny kategori",
            color: "#f9f9f9",
            type: "expense",
            items: [],
            order: categories.length + 1,
        });
        renderCategories();
        calculateTotals();
    });
    } else {
        console.error("Add category button not found!");
    }
    
    /*if (addCategoryButton) {
        addCategoryButton.addEventListener("click", () => {
            categories.push({ name: "Ny kategori", color: "#f9f9f9", type: "expense", items: [], order: categories.length + 1});
            renderCategories();
            calculateTotals();
        });
    } */

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
