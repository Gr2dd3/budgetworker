
import { categories } from "./state.js";
import { setTextContent } from "./utils.js";

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











/*
import { categories } from "./state.js";
import { setTextContent } from "./utils.js";

export function calculateTotals() {

    // VIKTIGT: Hämta de dynamiska kolumnnamnen
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
    const totalResult3 = totalIncome3 - totalExpense3; 

    // --- UPPDATERING AV DOM-ELEMENT (De tre summeringsblocken längst ner) ---
    
    // Sätter den STORA RUBRIKEN på blocket till det dynamiska namnet (t.ex. Oktober)
    setTextContent("col-block-1-title", columnNames[0]);
    setTextContent("col-block-2-title", columnNames[1]);
    setTextContent("col-block-3-title", columnNames[2]);
    
    // Kolumn 1
    setTextContent("col1-income", `Inkomst: ${totalIncome1} kr`);
    setTextContent("col1-expense", `Utgift: ${totalExpense1} kr`);
    // Nu endast statisk text: "Totalt:"
    setTextContent("total-expected", `Totalt: ${totalResult1} kr`); 

    // Kolumn 2
    setTextContent("col2-income", `Inkomst: ${totalIncome2} kr`);
    setTextContent("col2-expense", `Utgift: ${totalExpense2} kr`);
    // Nu endast statisk text: "Totalt:"
    setTextContent("total-actual", `Totalt: ${totalResult2} kr`); 

    // Kolumn 3
    setTextContent("col3-income", `Inkomst: ${totalIncome3} kr`);
    setTextContent("col3-expense", `Utgift: ${totalExpense3} kr`);
    // Nu endast statisk text: "Totalt:"
    setTextContent("total-extra", `Totalt: ${totalResult3} kr`);
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
*/