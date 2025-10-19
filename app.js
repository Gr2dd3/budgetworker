import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";

// --- Firebase Config och Init (OFÖRÄNDRAD) ---
const firebaseConfig = {
    apiKey: "AIzaSyD8B8qwp91a6N8_B_hwds5j8jsGZhrFtyk",
    authDomain: "ourbudget-d2b40.firebaseapp.com",
    projectId: "ourbudget-d2b40",
    storageBucket: "ourbudget-d2b40.firebasestorage.app",
    messagingSenderId: "10785224419",
    appId: "1:10785224419:web:2bfa5295fb70102934f7d6",
    measurementId: "G-94E36FGRMZ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// --- Globala variabler ---
let categories = [];
let globalColumns = []; // Lagrar kolumnobjekt: [{id: 'col1', name: 'Jan'}, ...]
const COLUMNS_DOC_ID = "budgetColumns"; // Fast ID för dokumentet som lagrar kolumnerna
let columnsDocRef = doc(db, "globals", COLUMNS_DOC_ID); // Referens till kolumner i Firebase

// --- Kolumnhantering (NYTT) ---

// Hämta kolumner från Firestore
const fetchColumnsFromFirestore = async () => {
    try {
        const columnsSnapshot = await getDocs(collection(db, "globals"));
        const columnsDoc = columnsSnapshot.docs.find(doc => doc.id === COLUMNS_DOC_ID);

        if (columnsDoc && columnsDoc.exists()) {
            const data = columnsDoc.data();
            // Kontrollera att det är en array av objekt med id och name
            if (Array.isArray(data.columns) && data.columns.every(col => col.id && col.name)) {
                return data.columns;
            }
        }
    } catch (error) {
        console.error("Fel vid hämtning av kolumner:", error);
    }
    // Standardkolumner om ingen data hittas
    return [
        { id: 'col-' + Date.now(), name: 'Ny kolumn 1' },
    ];
};

// Spara kolumner till Firestore
const saveColumnsToFirestore = async () => {
    try {
        await updateDoc(columnsDocRef, { columns: globalColumns });
        console.log("Kolumner sparade framgångsrikt!");
    } catch (error) {
        // Om dokumentet inte finns, skapa det
        if (error.code === 'not-found') {
             try {
                await addDoc(collection(db, "globals"), { columns: globalColumns }, COLUMNS_DOC_ID);
                console.log("Nytt kolumndokument skapat och sparat!");
             } catch (e) {
                console.error("Fel vid skapande av kolumndokument:", e);
             }
        } else {
            console.error("Fel vid sparning av kolumner:", error);
        }
    }
};

// Lägg till ny kolumn (NYTT)
const addColumn = (name) => {
    const newId = 'col-' + Date.now();
    globalColumns.push({ id: newId, name: name });
    
    // Lägg till nollvärde för den nya kolumnen i alla befintliga rader
    categories.forEach(category => {
        category.items.forEach(item => {
            item.values[newId] = 0;
        });
    });

    saveColumnsToFirestore();
    renderCategories();
    calculateTotals();
};

// Ta bort kolumn (NYTT)
const deleteColumn = (columnId) => {
    globalColumns = globalColumns.filter(col => col.id !== columnId);

    // Ta bort kolumnens värden från alla rader i alla kategorier
    categories.forEach(category => {
        category.items.forEach(item => {
            if (item.values && item.values[columnId] !== undefined) {
                delete item.values[columnId];
            }
        });
    });

    saveColumnsToFirestore();
    renderCategories();
    calculateTotals();
};

// --- Hämta/Spara kategorier (UPPDATERAD) ---

// Hämta kategorier från Firestore (UPPDATERAD för ny datamodell)
const fetchCategoriesFromFirestore = async () => {
    // normalizeCategories(); // Denna behövs inte längre med en korrekt load/init
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
                // Konvertera den gamla expected/actual till den nya 'values' om de finns, annars initiera 'values'
                values: item.values && typeof item.values === 'object' ? 
                        item.values : 
                        globalColumns.reduce((acc, col) => {
                            // Första laddningen från Firebase (legacy data)
                            if (col.name.toLowerCase().includes('förmodad') && item.expected !== undefined) {
                                acc[col.id] = parseFloat(item.expected) || 0;
                            } else if (col.name.toLowerCase().includes('faktisk') && item.actual !== undefined) {
                                acc[col.id] = parseFloat(item.actual) || 0;
                            } else {
                                acc[col.id] = 0; // Standardvärde för nya kolumner
                            }
                            return acc;
                        }, {})
            })) : []
        };
    });
};

// Spara kategorier till Firestore (UPPDATERAD för ny datamodell)
const saveCategoriesToFirestore = async (categories) => {
    try {
        const categoriesCollection = collection(db, "categories");

        for (const category of categories) {
            // Skapa en kopia av kategoriobjektet för att ta bort temporära fält innan spara
            const categoryToSave = { ...category };
            // Ingen mer expected/actual i item-objekten, bara values
            categoryToSave.items = categoryToSave.items.map(item => ({
                name: item.name,
                values: item.values // Sparar det nya 'values' objektet
            }));

            if (category.id) {
                const categoryDoc = doc(categoriesCollection, category.id);
                await updateDoc(categoryDoc, categoryToSave);
            } else {
                const newCategoryRef = await addDoc(categoriesCollection, categoryToSave);
                category.id = newCategoryRef.id;
            }
        }
        await saveColumnsToFirestore(); // Spara kolumnerna samtidigt
        console.log("Kategorier och kolumner sparade framgångsrikt!");
    } catch (error) {
        console.error("Fel vid sparning av kategorier:", error);
    }
};

// --- Uträkningar (UPPDATERAD) ---

// Räkna ut totalsumman per kolumn (NY FUNKTIONALITET)
const calculateColumnTotals = () => {
    const columnTotals = globalColumns.reduce((acc, col) => {
        acc[col.id] = { income: 0, expense: 0 };
        return acc;
    }, {});

    categories.forEach(category => {
        category.items.forEach(item => {
            globalColumns.forEach(col => {
                const value = parseFloat(item.values[col.id]) || 0;
                if (category.type === "income") {
                    columnTotals[col.id].income += value;
                } else if (category.type === "expense") {
                    columnTotals[col.id].expense += value;
                }
            });
        });
    });
    return columnTotals;
};

// Räkna ut global total (UPPDATERAD)
const calculateTotals = () => {
    const columnTotals = calculateColumnTotals();
    const grandTotals = { income: 0, expense: 0 };

    // Summera alla kolumner för den globala totalsumman
    globalColumns.forEach(col => {
        grandTotals.income += columnTotals[col.id].income;
        grandTotals.expense += columnTotals[col.id].expense;
    });

    // Uppdatera DOM för global total
    setTextContent("total-budget-income", `Total inkomst: ${grandTotals.income} kr`);
    setTextContent("total-budget-expense", `Total utgift: ${grandTotals.expense} kr`);
    setTextContent("total-budget-overall", `Total budget: ${grandTotals.income - grandTotals.expense} kr`);

    // Rendera kolumntotalerna i ett nytt element
    renderColumnTotals(columnTotals);
};

// Räkna ut totalen för varje kategori (UPPDATERAD)
const calculateCategoryTotals = (category) => {
    const totals = globalColumns.reduce((acc, col) => {
        acc[col.id] = 0;
        return acc;
    }, {});

    category.items.forEach(item => {
        globalColumns.forEach(col => {
            totals[col.id] += parseFloat(item.values[col.id]) || 0;
        });
    });

    // Summera den totala summan för alla kolumner i kategorin
    const categoryGrandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);

    return { totals, categoryGrandTotal };
};


// Hjälpfunktion för att sätta textinnehåll (OFÖRÄNDRAD)
const setTextContent = (id, text) => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    } else {
        console.error(`Element med id "${id}" hittades inte!`);
    }
};

// --- Rendering (UPPDATERAD) ---

// Rendera kolumnrubriker globalt (NYTT)
const renderColumnHeadlines = () => {
    const container = document.getElementById('column-headlines-container');
    if (!container) return;

    // Bygg rubrikerna
    const headlinesDiv = document.createElement("div");
    headlinesDiv.id = "dynamic-headlines";

    // "Namn" rubriken
    const itemNameHeadline = document.createElement("h5");
    itemNameHeadline.innerHTML = "Namn";
    headlinesDiv.appendChild(itemNameHeadline);

    // Dynamiska kolumnrubriker och ta bort-knapp
    globalColumns.forEach(col => {
        const colHeader = document.createElement("div");
        colHeader.classList.add('column-header');

        const nameInput = document.createElement("input");
        nameInput.value = col.name;
        nameInput.placeholder = "Kolumnnamn";
        nameInput.onchange = () => {
            col.name = nameInput.value;
            renderCategories(); // Render om för att uppdatera alla headers
            calculateTotals();
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = 'X';
        deleteBtn.classList.add('delete-column-btn');
        deleteBtn.onclick = () => deleteColumn(col.id);

        colHeader.append(nameInput, deleteBtn);
        headlinesDiv.appendChild(colHeader);
    });

    // Rubrik för Totalsumma per kategori
    const totalHeadline = document.createElement("h5");
    totalHeadline.innerHTML = "Kat. Total";
    headlinesDiv.appendChild(totalHeadline);
    
    container.innerHTML = '';
    container.appendChild(headlinesDiv);
};

// Rendera kategorier (REJÄLT UPPDATERAD)
const categoryList = document.getElementById("category-list");

const renderCategories = () => {
    categoryList.innerHTML = "";
    renderColumnHeadlines(); // Rendera rubriker först

    if (!categories || categories.length === 0) {
        categoryList.innerHTML = "<p>Inga kategorier att visa</p>";
        return;
    }

    categories.forEach((category, index) => {
        // ... (Oredigerad rendering av kategori-container, färg, ordning, namn, typ) ...
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Välj färg på kategorin
        const colorInput = document.createElement("input");
        colorInput.id = "color-input";
        colorInput.type = "color";
        colorInput.value = category.color || "#f9f9f9";
        colorInput.onchange = () => {
            categories[index].color = colorInput.value;
            categoryEl.style.backgroundColor = colorInput.value;
            renderCategories();
            calculateTotals();
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
                renderCategories();
                calculateTotals();
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
            renderCategories();
            calculateTotals();
        };
        categoryEl.appendChild(typeSelect);

        // --- Items och rader ---
        const itemList = document.createElement("ul");
        itemList.classList.add('item-list-dynamic');

        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item", "dynamic-item");

            // Item namn
            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.id = "item-name";
            itemName.placeholder = "Namn på rad";
            itemName.onchange = () => {
                categories[index].items[itemIndex].name = itemName.value;
                renderCategories();
                calculateTotals();
            };

            itemEl.appendChild(itemName);

            // Dynamiska värdefält
            globalColumns.forEach(col => {
                const itemValueInput = document.createElement("input");
                itemValueInput.type = "number";
                itemValueInput.value = item.values[col.id] || 0; // Hämta värdet för den specifika kolumnen
                itemValueInput.placeholder = col.name; // Använd kolumnnamnet som placeholder
                itemValueInput.onchange = () => {
                    const value = parseFloat(itemValueInput.value) || 0;
                    // Spara värdet i det dynamiska 'values' objektet
                    categories[index].items[itemIndex].values[col.id] = value;
                    renderCategories();
                    calculateTotals();
                };
                itemEl.appendChild(itemValueInput);
            });
            
            // Total för raden (valfritt, men användbart)
            const rowTotal = Object.values(item.values || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            const rowTotalSpan = document.createElement("span");
            rowTotalSpan.classList.add('item-row-total');
            rowTotalSpan.textContent = `${rowTotal} kr`;
            itemEl.appendChild(rowTotalSpan);

            // Ta bort Item knapp
            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort rad";
            deleteItemButton.classList.add('delete-item-btn');
            deleteItemButton.onclick = () => {
                categories[index].items.splice(itemIndex, 1);
                renderCategories();
                calculateTotals();
            };
            itemEl.appendChild(deleteItemButton);

            itemList.appendChild(itemEl);
        });

        // Visa totalsummor för kategorin
        const { totals, categoryGrandTotal } = calculateCategoryTotals(category);
        const totalsDiv = document.createElement("div");
        totalsDiv.classList.add("category-totals", "dynamic-totals");

        // Lägg till en tom plats för radnamnet (för att linjera med kolumnerna)
        const nameSpacer = document.createElement('span');
        nameSpacer.classList.add('spacer-for-name');
        totalsDiv.appendChild(nameSpacer);

        // Skriv ut totalsumma per kolumn
        globalColumns.forEach(col => {
            const totalSpan = document.createElement("span");
            totalSpan.classList.add('column-total-value');
            totalSpan.textContent = `${totals[col.id]} kr`;
            totalsDiv.appendChild(totalSpan);
        });

        // Skriv ut kategori-översummor (Total över alla kolumner)
        const grandTotalSpan = document.createElement("span");
        grandTotalSpan.classList.add('category-grand-total');
        grandTotalSpan.innerHTML = `<strong>${categoryGrandTotal} kr</strong>`;
        totalsDiv.appendChild(grandTotalSpan);

        // Lägg till ny item (rad)
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = async () => {
            // Skapa ett nytt item med initiala nollvärden för alla aktiva kolumner
            const newItemValues = globalColumns.reduce((acc, col) => {
                acc[col.id] = 0;
                return acc;
            }, {});

            categories[index].items.push({ name: "", values: newItemValues });
            renderCategories();
            calculateTotals();
        };

        // Ta bort kategori-knapp
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
            if (!categoryId) {
                console.warn("Kategori saknar ID och kan inte tas bort från Firestore.");
            }
        };

        categoryEl.append(
            title,
            typeSelect,
            itemList,
            totalsDiv,
            addItemButton,
            deleteCategoryButton
        );

        categoryList.appendChild(categoryEl);
    });
};

// Rendera totaler per kolumn längst ner (NYTT)
const renderColumnTotals = (columnTotals) => {
    const grandTotalsDiv = document.getElementById("grand-column-totals");
    if (!grandTotalsDiv) return;

    grandTotalsDiv.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.classList.add('column-totals-wrapper');

    // Kolumn för rubriker (Inkomst, Utgift, Total)
    const labelColumn = document.createElement('div');
    labelColumn.classList.add('column-totals-labels');
    labelColumn.innerHTML = '<div>Inkomst:</div><div>Utgift:</div><div class="grand-total-difference">Total:</div>';
    wrapper.appendChild(labelColumn);

    // Kolumner med värden
    globalColumns.forEach(col => {
        const total = columnTotals[col.id];
        const difference = total.income - total.expense;
        const columnDiv = document.createElement('div');
        columnDiv.classList.add('column-total-box');
        columnDiv.innerHTML = `
            <div>${total.income} kr</div>
            <div>${total.expense} kr</div>
            <div class="grand-total-difference">${difference} kr</div>
        `;
        wrapper.appendChild(columnDiv);
    });

    grandTotalsDiv.appendChild(wrapper);
};


// --- Initialisering och Event Listeners (UPPDATERAD) ---

// Ladda kategorier vid start av app (UPPDATERAD)
const loadCategories = async () => {
    try {
        // Ladda kolumner först
        globalColumns = await fetchColumnsFromFirestore();
        // Ladda kategorier (som nu kan använda globalColumns)
        categories = await fetchCategoriesFromFirestore();

        if (!categories.length) {
            console.log("Inga kategorier hittades.");
        }
        renderCategories();
        calculateTotals();
    } catch (error) {
        console.error("Fel vid laddning av data:", error);
        alert("Kunde inte ladda data. Kontrollera din nätverksanslutning.");
    }
};

// ... (Övriga funktioner som inte ändrats i grundläggande logik) ...

document.addEventListener("DOMContentLoaded", () => {
    // ... (Login-logik, oförändrad) ...
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("app");
    const errorMessage = document.getElementById("error-message");
    const loginButton = document.getElementById("login-button");

    loginButton.addEventListener("click", () => {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
    
        // CryptoJS är antagligen tillgängligt globalt från ett script-tagg i din HTML
        // Om du använder Webpack måste du eventuellt importera det: import CryptoJS from 'crypto-js';
        if (username === validCredentials.username && window.CryptoJS && window.CryptoJS.MD5(password).toString() === validCredentials.passwordHash) {
            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");
            loadCategories();
        } else {
            errorMessage.textContent = "Fel användarnamn eller lösenord.";
        }
    });

    // Addera kategorier (OFÖRÄNDRAD, men kommer att använda den nya item-strukturen vid render)
    const addCategoryButton = document.getElementById("add-category");
    if (addCategoryButton) {
        addCategoryButton.addEventListener("click", async () => {
             // Skapa initiala nollvärden för alla aktiva kolumner
             const initialItemValues = globalColumns.reduce((acc, col) => {
                acc[col.id] = 0;
                return acc;
            }, {});

            const newCategoryRef = await addDoc(collection(db, "categories"), {
                name: "Ny kategori",
                color: "#f9f9f9",
                type: "expense",
                items: [{name: "", values: initialItemValues}], // Lägg till en första rad med tomma värden
                order: categories.length + 1,
            });

            categories.push({
                id: newCategoryRef.id,
                name: "Ny kategori",
                color: "#f9f9f9",
                type: "expense",
                items: [{name: "", values: initialItemValues}],
                order: categories.length + 1,
            });
            renderCategories();
            calculateTotals();
        });
    } else {
        console.error("Add category button not found!");
    }

    // SPARA KNAPPEN (UPPDATERAD)
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            try {
                await saveCategoriesToFirestore(categories); // Använder den uppdaterade save-funktionen
                renderCategories();
                calculateTotals();
                alert("Kategorier och kolumner sparade!");
            } catch (error) {
                console.error("Fel vid sparning:", error);
                alert("Misslyckades att spara data.");
            }
        });
    } else {
        console.error("Save button not found!");
    }

    // NY KNAPP: Lägg till kolumn (NYTT)
    const addColumnButton = document.getElementById("add-column-button");
    if(addColumnButton) {
        addColumnButton.addEventListener('click', () => {
            const columnName = prompt("Ange namn på den nya kolumnen (t.ex. 'Mars', 'Semester'):");
            if (columnName) {
                addColumn(columnName.trim());
            }
        });
    } else {
        console.error("Add column button not found!");
    }

});

// Lägg till dessa i HTML:en för att visa globala totaler
// <div id="total-budget-income"></div>
// <div id="total-budget-expense"></div>
// <div id="total-budget-overall"></div>
// <div id="grand-column-totals"></div>