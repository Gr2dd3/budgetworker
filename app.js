import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore , collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

// Firebase-konfiguration (oförändrad)
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

// Global state
let categories = [];
let globalColumns = []; // array of { name: "Jan" } - only names needed; index definierar kolumnen

// --- HELPERS / NORMALIZE DATA ---
// Konvertera gamla strukturer till nya (i minnet)
const normalizeLoadedCategories = (loaded) => {
    // If any category has explicit columns, use that as globalColumns (first found)
    const firstWithCols = loaded.find(c => Array.isArray(c.columns) && c.columns.length > 0);
    if (firstWithCols) {
        globalColumns = firstWithCols.columns.map(col => ({ name: col.name || col }));
    } else {
        // If no category has columns, detect if items have 'values' arrays
        const firstWithValues = loaded.find(c => Array.isArray(c.items) && c.items.some(i => Array.isArray(i.values)));
        if (firstWithValues) {
            // assume columns length from first item's values
            const len = firstWithValues.items.find(i => Array.isArray(i.values)).values.length;
            globalColumns = Array.from({length: len}, (_,i) => ({ name: `Kolumn ${i+1}` }));
        } else {
            // lastly, if items have expected/actual (old format) we convert to two columns
            const hasExpectedActual = loaded.some(c => Array.isArray(c.items) && c.items.some(i => ('expected' in i) || ('actual' in i)));
            if (hasExpectedActual) {
                globalColumns = [{ name: "Förmodad" }, { name: "Faktisk" }];
            } else {
                // default to one column
                globalColumns = [{ name: "Kolumn 1" }];
            }
        }
    }

    // Now normalize each category and item to use values[] (aligned with globalColumns length)
    loaded.forEach(cat => {
        // If category has its own columns (old variant), ignore it; we will use globalColumns
        // Ensure items exist
        cat.items = Array.isArray(cat.items) ? cat.items : [];

        cat.items = cat.items.map(item => {
            // If item already has values array, normalize length
            let values = Array.isArray(item.values) ? [...item.values] : null;

            // If no values but legacy expected/actual exist -> map them
            if (!values && ('expected' in item || 'actual' in item)) {
                values = [
                    parseFloat(item.expected) || 0,
                    parseFloat(item.actual) || 0
                ];
            }

            // If still no values but item has numeric properties (other keys), try to preserve numeric props? skip for now
            if (!values) {
                // initialize empty values with zeros matching globalColumns
                values = Array.from({length: globalColumns.length}, () => 0);
            } else {
                // ensure length matches globalColumns
                if (values.length < globalColumns.length) {
                    values = values.concat(Array.from({length: globalColumns.length - values.length}, () => 0));
                } else if (values.length > globalColumns.length) {
                    // trim to global columns
                    values = values.slice(0, globalColumns.length);
                }
            }

            // Keep name if exists
            return {
                name: item.name || "",
                values
            };
        });

        // ensure category has order/color/type etc.
        cat.columns = globalColumns.map(c => ({ name: c.name })); // keep for legacy when saving
        cat.color = cat.color || "#f9f9f9";
        cat.type = cat.type || "expense";
        cat.order = cat.order || 1;
    });

    return loaded;
};

// --- FIRESTORE INTERACTION ---
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
            // Prepare object to save - we save values[] as items (array of objects with name + values)
            const itemsToSave = category.items.map(item => ({ name: item.name, values: item.values }));
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

// --- CALCULATIONS ---
const calculateCategoryTotals = (category) => {
    // totals per column index
    const totals = Array.from({length: globalColumns.length}, () => 0);
    category.items.forEach(item => {
        for (let i = 0; i < globalColumns.length; i++) {
            totals[i] += parseFloat(item.values[i]) || 0;
        }
    });
    return totals; // array
};

const calculateTotals = () => {
    // global totals per column (across all categories)
    const totals = Array.from({length: globalColumns.length}, () => 0);
    categories.forEach(cat => {
        cat.items.forEach(item => {
            for (let i = 0; i < globalColumns.length; i++) {
                totals[i] += parseFloat(item.values[i]) || 0;
            }
        });
    });
    return totals;
};

// --- RENDERING ---
// Root elements
const appRoot = document.getElementById("app");
const categoryList = document.getElementById("category-list");

// Global control area (add column etc.)
const globalControls = document.createElement("div");
globalControls.classList.add("global-controls");

// Sticky header area for column names
const columnsHeader = document.createElement("div");
columnsHeader.classList.add("columns-header"); // sticky

// Totals area (under all categories)
const globalTotalsContainer = document.createElement("div");
globalTotalsContainer.classList.add("global-totals-container");

const renderHeaderControls = () => {
    globalControls.innerHTML = ""; // reset

    // Add column button (global, as requested)
    const addColBtn = document.createElement("button");
    addColBtn.textContent = "+ Kolumn";
    addColBtn.classList.add("add-col-btn-global");
    addColBtn.onclick = () => {
        const name = prompt("Namn på ny kolumn (t.ex. Jan, Semester):", `Kolumn ${globalColumns.length + 1}`);
        if (name !== null) {
            globalColumns.push({ name: name.trim() || `Kolumn ${globalColumns.length + 1}` });
            // Add zero value for all items in all categories
            categories.forEach(cat => {
                cat.items.forEach(item => item.values.push(0));
            });
            renderAll();
        }
    };
    globalControls.appendChild(addColBtn);

    // Button to remove last column easily
    const removeLastBtn = document.createElement("button");
    removeLastBtn.textContent = "- Kolumn";
    removeLastBtn.classList.add("remove-col-btn-global");
    removeLastBtn.onclick = () => {
        if (globalColumns.length === 0) return;
        // remove last index globally
        const idx = globalColumns.length - 1;
        globalColumns.splice(idx, 1);
        categories.forEach(cat => {
            cat.items.forEach(item => item.values.splice(idx, 1));
        });
        renderAll();
    };
    globalControls.appendChild(removeLastBtn);

    // Save button also present globally
    const saveBtn = document.getElementById("save-button");
    if (saveBtn) {
        // keep original button behavior; also show a small hint in controls
        const hint = document.createElement("span");
        hint.textContent = "Spara ändringar längst ner också.";
        hint.classList.add("save-hint");
        globalControls.appendChild(hint);
    }

    // Append global controls to the top of app
    if (!appRoot.querySelector(".global-controls")) {
        appRoot.insertBefore(globalControls, categoryList);
    }
};

const renderColumnsHeader = () => {
    columnsHeader.innerHTML = ""; // reset
    columnsHeader.classList.add("columns-header-inner");

    // empty placeholder for row-name column
    const namePlaceholder = document.createElement("div");
    namePlaceholder.classList.add("col-name-placeholder");
    namePlaceholder.textContent = ""; // could put "Namn" or icon
    columnsHeader.appendChild(namePlaceholder);

    // Render each column name with edit and delete
    globalColumns.forEach((col, idx) => {
        const colWrap = document.createElement("div");
        colWrap.classList.add("col-header-item");

        const colName = document.createElement("input");
        colName.type = "text";
        colName.value = col.name;
        colName.classList.add("col-name-input");
        colName.onchange = () => {
            globalColumns[idx].name = colName.value || `Kolumn ${idx+1}`;
            renderAll();
        };
        colWrap.appendChild(colName);

        const delBtn = document.createElement("button");
        delBtn.textContent = "×";
        delBtn.classList.add("col-delete-btn");
        delBtn.onclick = () => {
            // Direct delete (no confirm as requested)
            globalColumns.splice(idx, 1);
            // remove that index from all item.values
            categories.forEach(cat => cat.items.forEach(it => it.values.splice(idx, 1)));
            renderAll();
        };
        colWrap.appendChild(delBtn);

        columnsHeader.appendChild(colWrap);
    });

    // Insert header before categoryList (sticky)
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

        // small controls: color, order, title, type
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
            const option = document.createElement("option");
            option.value = val;
            option.textContent = val === "income" ? "Inkomst" : "Utgift";
            typeSelect.appendChild(option);
        });
        typeSelect.value = category.type || "expense";
        typeSelect.onchange = () => {
            categories[catIndex].type = typeSelect.value;
            renderAll();
        };
        ctrlRow.appendChild(typeSelect);

        categoryEl.appendChild(ctrlRow);

        // Items (rows)
        const itemList = document.createElement("ul");
        itemList.classList.add("item-list");

        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item-row");

            // Name input
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.value = item.name || "";
            nameInput.placeholder = "Namn";
            nameInput.classList.add("row-name-input");
            nameInput.onchange = () => {
                categories[catIndex].items[itemIndex].name = nameInput.value;
                renderAll();
            };
            itemEl.appendChild(nameInput);

            // For each global column, render a numeric input
            for (let ci = 0; ci < globalColumns.length; ci++) {
                const valInput = document.createElement("input");
                valInput.type = "number";
                valInput.value = item.values[ci] ?? 0;
                valInput.classList.add("cell-input");
                valInput.placeholder = globalColumns[ci].name;
                valInput.onchange = () => {
                    categories[catIndex].items[itemIndex].values[ci] = parseFloat(valInput.value) || 0;
                    renderAll(); // updating totals and possibly other UI
                };
                itemEl.appendChild(valInput);
            }

            // Delete item button
            const delItemBtn = document.createElement("button");
            delItemBtn.textContent = "Ta bort";
            delItemBtn.classList.add("delete-item-btn");
            delItemBtn.onclick = () => {
                categories[catIndex].items.splice(itemIndex, 1);
                renderAll();
            };
            itemEl.appendChild(delItemBtn);

            itemList.appendChild(itemEl);
        });

        // Add a "Lägg till rad" button for this category
        const addRowBtn = document.createElement("button");
        addRowBtn.textContent = "Lägg till rad";
        addRowBtn.classList.add("add-row-btn");
        addRowBtn.onclick = () => {
            const newItem = { name: "", values: Array.from({length: globalColumns.length}, () => 0) };
            categories[catIndex].items.push(newItem);
            renderAll();
        };

        // Delete category button
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.classList.add("delete-category-btn");
        deleteCategoryButton.onclick = async () => {
            const categoryId = categories[catIndex].id;
            if (categoryId) await deleteCategoryFromFirestore(categoryId);
            categories.splice(catIndex, 1);
            renderAll();
        };

        categoryEl.appendChild(itemList);
        categoryEl.appendChild(addRowBtn);
        categoryEl.appendChild(deleteCategoryButton);

        categoryList.appendChild(categoryEl);
    });
};

const renderGlobalTotals = () => {
    globalTotalsContainer.innerHTML = "";
    globalTotalsContainer.classList.add("global-totals");

    // label column placeholder
    const namePlaceholder = document.createElement("div");
    namePlaceholder.classList.add("col-name-placeholder");
    namePlaceholder.textContent = "Totalt";
    globalTotalsContainer.appendChild(namePlaceholder);

    const totals = calculateTotals();
    for (let i = 0; i < globalColumns.length; i++) {
        const totInput = document.createElement("input");
        totInput.type = "text";
        totInput.value = totals[i];
        totInput.readOnly = true;
        totInput.classList.add("total-cell");
        globalTotalsContainer.appendChild(totInput);
    }
};

// Full render
const renderAll = () => {
    renderHeaderControls();
    renderColumnsHeader();
    renderCategories();
    renderGlobalTotals();
    // make sure totals are placed after categories
    if (!appRoot.querySelector(".global-totals-container")) {
        appRoot.appendChild(globalTotalsContainer);
    }
};

// --- LOAD / INIT ---
const loadCategories = async () => {
    try {
        const loaded = await fetchCategoriesFromFirestore();
        categories = loaded;
        // If there are no categories, ensure at least one default
        if (!categories.length) {
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
        alert("Kunde inte ladda kategorier. Kontrollera nätverksanslutning.");
    }
};

// --- LOGIN + DOMContentLoaded (oförändrat i beteende) ---
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
        // If no login UI, load directly
        loadCategories();
    }

    // Lägg till kategori knapp (oförändrad)
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

    // Save button (oförändrad logik)
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
