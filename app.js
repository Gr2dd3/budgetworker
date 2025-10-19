import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore , collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

// === Firebase-konfiguration (oförändrad) ===
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

// === State ===
let categories = [];            // categories loaded from firestore (normalized)
let globalColumns = [];         // array of { name: "Jan" } — global column headers

// === Helpers: normalize data loaded from Firestore (backwards compatible) ===
const normalizeLoadedCategories = (loaded) => {
    // Determine globalColumns:
    // Priority:
    // 1) If any category has columns[] saved, use that (first encountered)
    // 2) Else if any item has values[] saved, use that length to create generic names
    // 3) Else if items have expected/actual -> create ["Förmodad", "Faktisk"]
    // 4) Else default ["Kolumn 1"]
    const catWithColumns = loaded.find(c => Array.isArray(c.columns) && c.columns.length > 0);
    if (catWithColumns) {
        globalColumns = catWithColumns.columns.map(c => ({ name: c.name || c }));
    } else {
        // check for values[]
        const someWithValues = loaded.find(c => Array.isArray(c.items) && c.items.some(i => Array.isArray(i.values)));
        if (someWithValues) {
            const len = someWithValues.items.find(i => Array.isArray(i.values)).values.length;
            globalColumns = Array.from({length: len}, (_,i) => ({ name: `Kolumn ${i+1}` }));
        } else {
            // check expected/actual
            const hasExpectedActual = loaded.some(c => Array.isArray(c.items) && c.items.some(i => ('expected' in i) || ('actual' in i)));
            if (hasExpectedActual) {
                globalColumns = [{ name: "Förmodad" }, { name: "Faktisk" }];
            } else {
                globalColumns = [{ name: "Kolumn 1" }];
            }
        }
    }

    // Normalize each category and item -> ensure category.items is array with items { name, values[] }
    loaded.forEach(cat => {
        cat.items = Array.isArray(cat.items) ? cat.items : [];
        cat.items = cat.items.map(item => {
            // If item already has values array, use it
            if (Array.isArray(item.values)) {
                // normalize length to globalColumns
                const vals = item.values.slice(0, globalColumns.length);
                while (vals.length < globalColumns.length) vals.push(0);
                return { name: item.name || "", values: vals };
            }

            // If legacy expected/actual present -> map to two-element values
            if ('expected' in item || 'actual' in item) {
                const v0 = parseFloat(item.expected) || 0;
                const v1 = parseFloat(item.actual) || 0;
                const vals = [v0, v1];
                // expand/trim to fit globalColumns
                while (vals.length < globalColumns.length) vals.push(0);
                if (vals.length > globalColumns.length) vals.length = globalColumns.length;
                return { name: item.name || "", values: vals };
            }

            // Otherwise, try to pick numeric fields? For safety, just create zeros
            const vals = Array.from({length: globalColumns.length}, () => 0);
            return { name: item.name || "", values: vals };
        });

        // Keep some category-level defaults
        cat.columns = globalColumns.map(c => ({ name: c.name })); // useful when saving back
        cat.color = cat.color || "#f9f9f9";
        cat.type = cat.type || "expense";
        cat.order = cat.order || 1;
    });

    return loaded;
};

// === Firestore operations ===
const fetchCategoriesFromFirestore = async () => {
    const categoriesCollection = collection(db, "categories");
    const sortedQuery = query(categoriesCollection, orderBy("order"));
    const snapshot = await getDocs(sortedQuery);
    const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const normalized = normalizeLoadedCategories(loaded);
    return normalized;
};

const deleteCategoryFromFirestore = async (categoryId) => {
    try {
        const categoryDoc = doc(db, "categories", categoryId);
        await deleteDoc(categoryDoc);
        categories = categories.filter(c => c.id !== categoryId);
        console.log(`Kategori med id ${categoryId} har tagits bort från Firestore.`);
    } catch (error) {
        console.error("Fel vid borttagning av kategori:", error);
    }
};

const saveCategoriesToFirestore = async (cats) => {
    try {
        const categoriesCollection = collection(db, "categories");
        for (const category of cats) {
            const itemsToSave = category.items.map(it => ({ name: it.name, values: it.values }));
            if (category.id) {
                const categoryDoc = doc(categoriesCollection, category.id);
                await updateDoc(categoryDoc, {
                    id: category.id,
                    name: category.name,
                    type: category.type,
                    color: category.color,
                    items: itemsToSave,
                    order: category.order,
                    columns: globalColumns.map(c => ({ name: c.name }))
                });
            } else {
                const newCategoryRef = await addDoc(categoriesCollection, {
                    name: category.name,
                    color: category.color,
                    type: category.type,
                    items: itemsToSave,
                    order: category.order,
                    columns: globalColumns.map(c => ({ name: c.name }))
                });
                category.id = newCategoryRef.id;
            }
        }
        console.log("Kategorier sparade framgångsrikt!");
    } catch (error) {
        console.error("Fel vid sparning av kategorier:", error);
    }
};

// === Calculation logic ===
// calculateCategoryTotals returns array of totals per column (index-aligned)
const calculateCategoryTotals = (category) => {
    const totals = Array.from({ length: globalColumns.length }, () => 0);
    category.items.forEach(item => {
        for (let i = 0; i < globalColumns.length; i++) {
            totals[i] += parseFloat(item.values[i]) || 0;
        }
    });
    return totals;
};

// calculateTotals (global) — to preserve original expected/actual UI, we also compute expected/actual totals
// Here: if there are at least 2 columns, we treat column 0 as "Förmodad" and column 1 as "Faktisk" for the top summary.
// If only 1 column exists, it's used for both expected and actual in the old UI to avoid breaking existing layout.
const calculateTotals = () => {
    let expectedIncome = 0, expectedExpense = 0, actualIncome = 0, actualExpense = 0;

    categories.forEach(category => {
        category.items.forEach(item => {
            const val0 = parseFloat(item.values[0]) || 0;
            const val1 = parseFloat(item.values[1]) || 0;

            if (category.type === "income") {
                expectedIncome += val0;
                actualIncome += (globalColumns.length > 1 ? val1 : val0);
            } else if (category.type === "expense") {
                expectedExpense += val0;
                actualExpense += (globalColumns.length > 1 ? val1 : val0);
            }
        });
    });

    return {
        expectedIncome,
        expectedExpense,
        actualIncome,
        actualExpense
    };
};

// === Rendering ===
const appRoot = document.getElementById("app");
const categoryList = document.getElementById("category-list");

// Top-level controls and header
const globalControls = document.createElement("div");
globalControls.classList.add("global-controls");

const columnsHeader = document.createElement("div");
columnsHeader.classList.add("columns-header");
const columnsHeaderInner = document.createElement("div");
columnsHeaderInner.classList.add("columns-header-inner");
columnsHeader.appendChild(columnsHeaderInner);

const globalTotalsContainer = document.createElement("div");
globalTotalsContainer.classList.add("global-totals-container");

const renderHeaderControls = () => {
    globalControls.innerHTML = "";

    const addColBtn = document.createElement("button");
    addColBtn.textContent = "+ Kolumn";
    addColBtn.classList.add("add-col-btn-global");
    addColBtn.onclick = () => {
        // prompt for name (simple and quick)
        const name = prompt("Namn på ny kolumn (t.ex. Jan, Semester):", `Kolumn ${globalColumns.length + 1}`);
        if (name === null) return;
        globalColumns.push({ name: name.trim() || `Kolumn ${globalColumns.length + 1}` });
        categories.forEach(cat => cat.items.forEach(it => it.values.push(0)));
        renderAll();
    };
    globalControls.appendChild(addColBtn);

    const removeColBtn = document.createElement("button");
    removeColBtn.textContent = "- Kolumn";
    removeColBtn.classList.add("remove-col-btn-global");
    removeColBtn.onclick = () => {
        if (globalColumns.length === 0) return;
        const idx = globalColumns.length - 1;
        globalColumns.splice(idx, 1);
        categories.forEach(cat => cat.items.forEach(it => it.values.splice(idx, 1)));
        renderAll();
    };
    globalControls.appendChild(removeColBtn);

    const saveHint = document.createElement("span");
    saveHint.textContent = "Kom ihåg att trycka Spara när du vill skriva till Firestore.";
    saveHint.classList.add("save-hint");
    globalControls.appendChild(saveHint);

    if (!appRoot.querySelector(".global-controls")) {
        appRoot.insertBefore(globalControls, categoryList);
    }
};

const renderColumnsHeader = () => {
    columnsHeaderInner.innerHTML = "";

    // left placeholder
    const left = document.createElement("div");
    left.classList.add("col-name-placeholder");
    left.textContent = ""; // keep empty so looks like original
    columnsHeaderInner.appendChild(left);

    globalColumns.forEach((col, idx) => {
        const wrap = document.createElement("div");
        wrap.classList.add("col-header-item");

        const input = document.createElement("input");
        input.type = "text";
        input.value = col.name;
        input.classList.add("col-name-input");
        input.onchange = () => {
            globalColumns[idx].name = input.value || `Kolumn ${idx+1}`;
            // no need to save immediately; rendering will update placeholders
            renderAll();
        };
        wrap.appendChild(input);

        const del = document.createElement("button");
        del.textContent = "×";
        del.classList.add("col-delete-btn");
        del.onclick = () => {
            globalColumns.splice(idx, 1);
            categories.forEach(cat => cat.items.forEach(it => it.values.splice(idx, 1)));
            renderAll();
        };
        wrap.appendChild(del);

        columnsHeaderInner.appendChild(wrap);
    });

    if (!appRoot.querySelector(".columns-header")) {
        appRoot.insertBefore(columnsHeader, categoryList);
    }
};

const renderCategories = () => {
    categoryList.innerHTML = "";

    if (!categories || categories.length === 0) {
        categoryList.innerHTML = "<p>Inga kategorier att visa</p>";
        return;
    }

    categories.forEach((category, catIndex) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // control row (color, order, title, type)
        const ctrlRow = document.createElement("div");
        ctrlRow.classList.add("category-ctrl-row");

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = category.color || "#f9f9f9";
        colorInput.onchange = () => {
            categories[catIndex].color = colorInput.value;
            categoryEl.style.backgroundColor = colorInput.value;
            renderAll();
        };
        ctrlRow.appendChild(colorInput);

        const orderInput = document.createElement("input");
        orderInput.type = "number";
        orderInput.value = category.order || catIndex + 1;
        orderInput.min = 1;
        orderInput.onchange = () => {
            const newOrder = parseInt(orderInput.value, 10);
            if (newOrder > 0) {
                categories[catIndex].order = newOrder;
                categories.sort((a,b) => a.order - b.order);
                renderAll();
            } else {
                alert("Ordningen måste vara ett positivt heltal!");
                orderInput.value = categories[catIndex].order;
            }
        };
        ctrlRow.appendChild(orderInput);

        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            const newName = title.textContent.trim();
            if (newName) {
                categories[catIndex].name = newName;
                renderAll();
            } else {
                title.textContent = categories[catIndex].name;
            }
        };
        ctrlRow.appendChild(title);

        const typeSelect = document.createElement("select");
        ["expense","income"].forEach(val => {
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = val === "income" ? "Inkomst" : "Utgift";
            typeSelect.appendChild(opt);
        });
        typeSelect.value = category.type || "expense";
        typeSelect.onchange = () => {
            categories[catIndex].type = typeSelect.value;
            renderAll();
        };
        ctrlRow.appendChild(typeSelect);

        categoryEl.appendChild(ctrlRow);

        // items list
        const itemList = document.createElement("ul");
        itemList.classList.add("item-list");

        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            // name input (keeps original behaviour)
            const itemName = document.createElement("input");
            itemName.value = item.name || "";
            itemName.placeholder = "Namn";
            itemName.id = "item-name";
            itemName.onchange = () => {
                categories[catIndex].items[itemIndex].name = itemName.value;
                renderAll();
            };
            itemEl.appendChild(itemName);

            // cell inputs for each global column
            for (let ci = 0; ci < globalColumns.length; ci++) {
                const cell = document.createElement("input");
                cell.type = "number";
                cell.value = item.values[ci] ?? 0;
                cell.placeholder = globalColumns[ci].name;
                cell.classList.add("cell-input");
                cell.onchange = () => {
                    categories[catIndex].items[itemIndex].values[ci] = parseFloat(cell.value) || 0;
                    renderAll();
                };
                itemEl.appendChild(cell);
            }

            // delete item button
            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort";
            deleteItemButton.id = "delete-button";
            deleteItemButton.onclick = () => {
                categories[catIndex].items.splice(itemIndex, 1);
                renderAll();
            };
            itemEl.appendChild(deleteItemButton);

            itemList.appendChild(itemEl);
        });

        // add row & delete category buttons (as original)
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = () => {
            const newItem = { name: "", values: Array.from({length: globalColumns.length}, () => 0) };
            categories[catIndex].items.push(newItem);
            renderAll();
        };

        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.id = "delete-button";
        deleteCategoryButton.onclick = async () => {
            const categoryId = categories[catIndex].id;
            if (categoryId) {
                await deleteCategoryFromFirestore(categoryId);
            }
            categories.splice(catIndex, 1);
            renderAll();
        };

        categoryEl.appendChild(itemList);
        categoryEl.appendChild(addItemButton);
        categoryEl.appendChild(deleteCategoryButton);

        categoryList.appendChild(categoryEl);
    });
};

const renderGlobalTotals = () => {
    globalTotalsContainer.innerHTML = "";
    globalTotalsContainer.classList.add("global-totals");

    const left = document.createElement("div");
    left.classList.add("col-name-placeholder");
    left.textContent = "Total";
    globalTotalsContainer.appendChild(left);

    const totals = Array.from({length: globalColumns.length}, () => 0);
    categories.forEach(cat => {
        cat.items.forEach(it => {
            for (let i = 0; i < globalColumns.length; i++) {
                totals[i] += parseFloat(it.values[i]) || 0;
            }
        });
    });

    totals.forEach(sum => {
        const totInput = document.createElement("input");
        totInput.type = "text";
        totInput.value = sum;
        totInput.readOnly = true;
        totInput.classList.add("total-cell");
        globalTotalsContainer.appendChild(totInput);
    });

    if (!appRoot.querySelector(".global-totals")) {
        appRoot.appendChild(globalTotalsContainer);
    }
};

const renderAll = () => {
    renderHeaderControls();
    renderColumnsHeader();
    renderCategories();
    renderGlobalTotals();

    // Also update the top "totals" text nodes like original calculateTotals display
    const topTotals = calculateTotals();
    setTextContent("total-budget-expected-income", `Förmodad inkomst: ${topTotals.expectedIncome} kr`);
    setTextContent("total-budget-expected-expense", `Förmodad utgift: ${topTotals.expectedExpense} kr`);
    setTextContent("total-expected", `Förmodad budget: ${topTotals.expectedIncome - topTotals.expectedExpense} kr`);
    setTextContent("total-budget-actual-income", `Faktisk inkomst: ${topTotals.actualIncome} kr`);
    setTextContent("total-budget-actual-expense", `Faktisk utgift: ${topTotals.actualExpense} kr`);
    setTextContent("total-actual", `Faktisk budget: ${topTotals.actualIncome - topTotals.actualExpense} kr`);
};

// Utility for updating existing text nodes (same as original)
const setTextContent = (id, text) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
    else console.error(`Element med id "${id}" hittades inte!`);
};

// === Load/init ===
const loadCategories = async () => {
    try {
        const loaded = await fetchCategoriesFromFirestore();
        categories = loaded;
        if (!categories.length) {
            // default category when empty
            categories.push({
                id: null,
                name: "Ny kategori",
                color: "#f9f9f9",
                type: "expense",
                order: 1,
                items: []
            });
        }
        renderAll();
    } catch (error) {
        console.error("Fel vid laddning av kategorier:", error);
        alert("Kunde inte ladda kategorier. Kontrollera din nätverksanslutning.");
    }
};

// === Login + event handlers (behåller din ursprungliga login / save / add category logik) ===
const validCredentials = { 
    username: "Gradin2025", 
    passwordHash: "3af6f058eab3ac8f451704880d405ad9"
};

document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("app");
    const errorMessage = document.getElementById("error-message");
    const loginButton = document.getElementById("login-button");

    if (loginButton) {
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
    } else {
        loadCategories();
    }

    // add category
    const addCategoryButton = document.getElementById("add-category");
    if (addCategoryButton) {
        addCategoryButton.addEventListener("click", async () => {
            const newCategoryRef = await addDoc(collection(db, "categories"), {
                name: "Ny kategori",
                color: "#f9f9f9",
                type: "expense",
                items: [],
                columns: globalColumns.map(c => ({ name: c.name })),
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
            renderAll();
        });
    }

    // save button
    const saveButton = document.getElementById("save-button");
    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            try {
                await saveCategoriesToFirestore(categories);
                renderAll();
                alert("Kategorier sparade!");
            } catch (error) {
                console.error("Fel vid sparning:", error);
                alert("Misslyckades att spara kategorier.");
            }
        });
    }
});
