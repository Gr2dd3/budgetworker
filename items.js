import { categories } from "./state.js";
import { calculateTotals } from "./totals.js";
import { renderCategories } from "./ui.js";

function renderItem(item, categoryIndex, itemIndex) {
    const itemEl = document.createElement("li");
    itemEl.classList.add("item");

    // Namn
    const itemName = document.createElement("input");
    itemName.type = "text";
    itemName.value = item.name;
    itemName.placeholder = "Namn";
    itemName.onchange = () => {
        categories[categoryIndex].items[itemIndex].name = itemName.value;
        calculateTotals();
    };
    itemEl.appendChild(itemName);

    // Kolumner: expected, actual, extra
    ["expected", "actual", "extra"].forEach((key, colIndex) => {
        const input = document.createElement("input");
        input.type = "number";
        input.value = item[key] || 0;
        input.placeholder = categories[categoryIndex].columnNames[colIndex];
        input.onchange = () => {
            categories[categoryIndex].items[itemIndex][key] = parseFloat(input.value) || 0;
            calculateTotals();
        };
        itemEl.appendChild(input);
    });

    // Ta bort-item-knapp
    const deleteItemButton = document.createElement("button");
    deleteItemButton.textContent = "Ta bort";
    deleteItemButton.onclick = () => {
        categories[categoryIndex].items.splice(itemIndex, 1);
        renderCategories();
        calculateTotals();
    };
    itemEl.appendChild(deleteItemButton);

    return itemEl;
}

export function renderItems(category, categoryIndex) {
    const itemList = document.createElement("ul");

    category.items.forEach((item, itemIndex) => {
        const itemEl = renderItem(item, categoryIndex, itemIndex);
        itemList.appendChild(itemEl);
    });

    return itemList;
}