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
            // Läs in columnNames från Firestore, annars använd standardvärden
            columnNames: Array.isArray(data.columnNames) && data.columnNames.length === 3
                ? data.columnNames
                : ["Förmodad", "Faktisk", "Extra"],
            items: Array.isArray(data.items) ? data.items.map(item => ({
                name: item.name || "",
                expected: parseFloat(item.expected) || 0,
                actual: parseFloat(item.actual) || 0,
                // Läs in 'extra' från Firestore, viktigt för den tredje kolumnen
                extra: parseFloat(item.extra) || 0 
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
    const columnNames = categories[0]?.columnNames || ["Förmodad", "Faktisk", "Extra"];
    
    // Totaler för de tre kolumnerna
    let totalIncome1 = 0, totalExpense1 = 0;
    let totalIncome2 = 0, totalExpense2 = 0;
    let totalIncome3 = 0, totalExpense3 = 0;

    categories.forEach(category => {
        category.items.forEach(item => {
            const expected = parseFloat(item.expected) || 0;
            const actual = parseFloat(item.actual) || 0;
            const extra = parseFloat(item.extra) || 0;
            
            if (category.type === "income") {
                totalIncome1 += expected;
                totalIncome2 += actual;
                totalIncome3 += extra;
            } else if (category.type === "expense") {
                totalExpense1 += expected;
                totalExpense2 += actual;
                totalExpense3 += extra;
            }
        });
    });

    // Beräkna totalt budgetresultat
    const totalResult1 = totalIncome1 - totalExpense1;
    const totalResult2 = totalIncome2 - totalExpense2;
    const totalResult3 = totalIncome3 - totalExpense3; // För den tredje kolumnen

    // --- UPPDATERING AV DOM-ELEMENT (De tre summeringsblocken längst ner) ---
    
    // Kolumn 1 (Förmodad/Expected) - Använder de nya ID:na från HTML-uppdateringen
    setTextContent("col1-income", `Inkomst: ${totalIncome1} kr`);
    setTextContent("col1-expense", `Utgift: ${totalExpense1} kr`);
    setTextContent("total-expected", `${columnNames[0]} Totalt: ${totalResult1} kr`);

    // Kolumn 2 (Faktisk/Actual)
    setTextContent("col2-income", `Inkomst: ${totalIncome2} kr`);
    setTextContent("col2-expense", `Utgift: ${totalExpense2} kr`);
    setTextContent("total-actual", `${columnNames[1]} Totalt: ${totalResult2} kr`);

    // Kolumn 3 (Extra/Dynamisk)
    setTextContent("col3-income", `Inkomst: ${totalIncome3} kr`);
    setTextContent("col3-expense", `Utgift: ${totalExpense3} kr`);
    setTextContent("total-extra", `${columnNames[2]} Totalt: ${totalResult3} kr`);

    // NY SUMMERING: Den tredje summeringen som summerar skillnaden (Faktisk - Förmodad)
    setTextContent("total-difference", `Total skillnad (${columnNames[1]} - ${columnNames[0]}): ${totalResult2 - totalResult1} kr`);
    
    // --- Vi behåller de gamla totalbudget-ID:na men använder dem för den totala inkomsten/utgiften om nödvändigt ---
    // (Dessa ID:n används inte längre i den nya totalsummans struktur, men behålls ifall de används någon annanstans)
    setTextContent("total-budget-col1", `Totalt ${columnNames[0]}: ${totalIncome1 + totalExpense1} kr`);
    setTextContent("total-budget-col2", `Totalt ${columnNames[1]}: ${totalIncome2 + totalExpense2} kr`);
    setTextContent("total-budget-col3", `Totalt ${columnNames[2]}: ${totalIncome3 + totalExpense3} kr`);
};

// Räkna ut totalen för varje kategori (Denna funktion används inte längre i UI men behålls ifall den används internt)
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
    
    // Hämta de nuvarande kolumnnamnen för enhetlighet
    const currentColumnNames = categories[0]?.columnNames || ["Förmodad", "Faktisk", "Extra"];

    categories.forEach((category, index) => {
        // Säkerställ att kolumnnamn finns och är enhetliga
        category.columnNames = currentColumnNames;

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
                    // UPPDATERA kolumnnamn på ALLA kategorier 
                    categories.forEach(cat => {
                        cat.columnNames = cat.columnNames || ["Förmodad", "Faktisk", "Extra"];
                        cat.columnNames[colIndex] = newName;
                    });

                    renderCategories(); // Rendera om alla kategorier
                    calculateTotals(); // Uppdatera totaler
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
            itemName.type = "text"; // För att se till att den har rätt typ
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

        // !!! BORTTAGEN KOD: Den oönskade summeringen i kategorin !!!
        /*
        const totalsDiv = document.createElement("div");
        totalsDiv.classList.add("category-totals");
        totalsDiv.innerHTML = `
            ... borttagen summeringskod ...
        `;
        categoryEl.appendChild(totalsDiv);
        */

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

// ... resten av JS-filen (loadCategories, saveCategoriesToFirestore, etc.) är oförändrad ...

// Ladda kategorier vid start av app
const loadCategories = async () => {
    // normalizeCategories(); 
    try {
        categories = await fetchCategoriesFromFirestore();
        if (categories.length > 0) {
            // Sätt samma kolumnnamn på alla kategorier vid laddning 
            const names = categories[0].columnNames;
            categories.forEach(cat => cat.columnNames = names);
        }
        
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

        // Hämta de nuvarande kolumnnamnen från den första kategorin
        const columnNamesToSave = categories[0]?.columnNames || ["Förmodad", "Faktisk", "Extra"];

        for (const category of categories) {
            
            const dataToSave = {
                name: category.name,
                type: category.type,
                color: category.color,
                items: category.items.map(item => ({ // Se till att items är serialiserbara
                    name: item.name,
                    expected: parseFloat(item.expected) || 0,
                    actual: parseFloat(item.actual) || 0,
                    extra: parseFloat(item.extra) || 0,
                })),
                order: category.order,
                columnNames: columnNamesToSave // Inkludera de dynamiska rubrikerna i databasen
            };

            if (category.id) {
                const categoryDoc = doc(categoriesCollection, category.id);
                // Använd updateDoc
                await updateDoc(categoryDoc, dataToSave); 
            } else {
                // Använd addDoc
                const newCategoryRef = await addDoc(categoriesCollection, dataToSave);
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