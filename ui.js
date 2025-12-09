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

        // Rubrik + färgväljare + ta bort kategori
        const titleRow = document.createElement("div");
        titleRow.classList.add("category-title-row");

        const title = document.createElement("h3");
        title.textContent = category.name;
        titleRow.appendChild(title);

        // Färgväljare
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = category.color || "#f9f9f9";
        colorInput.onchange = () => {
            category.color = colorInput.value;
            categoryEl.style.backgroundColor = colorInput.value;
        };
        titleRow.appendChild(colorInput);

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

        // Applicera sparad färg
        if (category.color) {
            categoryEl.style.backgroundColor = category.color;
        }

        // Kolumnnamn (headers med div-headlines) - bara 3 inputs för de 3 numeric kolumnerna
        const headerRow = document.createElement("div");
        headerRow.id = "div-headlines";

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