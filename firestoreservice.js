import { db } from "./firebase.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";

// Hämta kategorier från Firestore
export async function fetchCategoriesFromFirestore() {
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

// Spara kategorier till Firestore
export async function saveCategoriesToFirestore(categories) {
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

// Ta bort kategori permanent
export async function deleteCategoryFromFirestore(categoryId) {
    try {
        const categoryDoc = doc(db, "categories", categoryId);
        await deleteDoc(categoryDoc);
        categories = categories.filter(category => category.id !== categoryId);
        console.log(`Kategori med id ${categoryId} har tagits bort från Firestore.`);
    } catch (error) {
        console.error("Fel vid borttagning av kategori:", error);
    }
};
