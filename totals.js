
import { categories } from "./state.js";

export function calculateTotals() {
    const columnNames = categories[0]?.columnNames || ["Förmodad","Faktisk","Extra"];
    
    let totals = [
        { income:0, expense:0 },
        { income:0, expense:0 },
        { income:0, expense:0 }
    ];

    categories.forEach(cat => {
        cat.items.forEach(item => {
            ["expected","actual","extra"].forEach((key,i) => {
                const val = parseFloat(item[key]) || 0;
                if (cat.type === "income") totals[i].income += val;
                else totals[i].expense += val;
            });
        });
    });

    // Uppdatera DOM
    ["col1","col2","col3"].forEach((prefix,i) => {
        setTextContent(`${prefix}-income`, `Inkomst: ${totals[i].income} kr`);
        setTextContent(`${prefix}-expense`, `Utgift: ${totals[i].expense} kr`);
        setTextContent(`total-${["expected","actual","extra"][i]}`, `Totalt: ${totals[i].income - totals[i].expense} kr`);
        setTextContent(`col-block-${i+1}-title`, columnNames[i]);
    });
}

// Sätt elementen för uträkning och kolla att de finns innan de körs
const setTextContent = (id, text) => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    } else {
        console.error(`Element med id "${id}" hittades inte!`);
    }
};