import { fetchCategoriesFromFirestore } from "./firestoreservice.js";
import { renderCategories } from "./ui.js";
import { calculateTotals } from "./totals.js";

export let categories = [];

export function setCategories(list) {
    categories = list;
}

// Ladda kategorier
export async function loadCategories() {
    try {
        categories = await fetchCategoriesFromFirestore();
        normalizeCategories();
        if (categories.length > 0) {
            const names = categories[0].columnNames || ["Förmodad","Faktisk","Extra"];
            categories.forEach(cat => cat.columnNames = names);
        }
        renderCategories();
        calculateTotals();
    } catch (err) {
        console.error("Fel vid laddning av kategorier:", err);
        alert("Kunde inte ladda kategorier.");
    }
}

// Normalisera kategori-ID
function normalizeCategories() {
    categories.forEach(category => {
        if (!category.id.startsWith("temp_")) {
            console.log(`Kategori-ID verifierad: ${category.id}`);
        } else {
            console.warn(`Kategori har ett temporärt ID: ${category.id}`);
        }
    });
}


