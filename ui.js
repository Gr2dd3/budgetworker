import { categories } from "./state.js";
import { renderItems } from "./items.js";
import { calculateTotals } from "./totals.js";
import { deleteCategoryFromFirestore } from "./firestoreservice.js";

export function renderCategories() {
    const categoryList = document.getElementById("category-list");
    categoryList.innerHTML = "";

    categories.forEach((category, categoryIndex) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");

        // Rubrik + ta bort kategori
        const titleRow = document.createElement("div");
        titleRow.classList.add("category-title-row");

        const title = document.createElement("h3");
        title.textContent = category.name;
        titleRow.appendChild(title);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Ta bort kategori";
        deleteButton.onclick = async () => {
            // Firestore
            await deleteCategoryFromFirestore(category.firestoreId);

            // Lokalt
            categories.splice(categoryIndex, 1);
            renderCategories();
            calculateTotals();
        };
        titleRow.appendChild(deleteButton);

        categoryEl.appendChild(titleRow);

        // Kolumnnamn
        const headerRow = document.createElement("div");
        headerRow.classList.add("category-header");

        category.columnNames.forEach((colName, colIndex) => {
            const colInput = document.createElement("input");
            colInput.type = "text";
            colInput.value = colName;
            colInput.placeholder = `Kolumn ${colIndex + 1}`;
            colInput.onchange = () => {
                category.columnNames[colIndex] = colInput.value;
                renderCategories();     // Uppdatera rubriker överallt
                calculateTotals();
            };
            headerRow.appendChild(colInput);
        });

        categoryEl.appendChild(headerRow);

        // Items-raden (UL genererad via renderItems)
        const itemsList = renderItems(category, categoryIndex);
        categoryEl.appendChild(itemsList);

        // Lägg till item-knapp
        const addItemBtn = document.createElement("button");
        addItemBtn.textContent = "Lägg till rad";
        addItemBtn.onclick = () => {
            category.items.push({
                name: "",
                expected: 0,
                actual: 0,
                extra: 0
            });

            renderCategories();
            calculateTotals();
        };

        categoryEl.appendChild(addItemBtn);

        // Lägg till hela kategorin i listan
        categoryList.appendChild(categoryEl);
    });

    // Uppdatera totals längst ner
    calculateTotals();
}










/* *** ORIGINAL CODE ***

import { categories } from "./state.js";
import { calculateTotals } from "./totals.js";

export function renderCategories() {

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

        /*
        const totalsDiv = document.createElement("div");
        totalsDiv.classList.add("category-totals");
        totalsDiv.innerHTML = `
            ... borttagen summeringskod ...
        `;
        categoryEl.appendChild(totalsDiv);
        /* /

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
*/