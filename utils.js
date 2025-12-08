// Kontroll av lokala kategori id
export const normalizeCategories = async () => {
    categories.forEach(category => {
        if (!category.id.startsWith("temp_")) {
            console.log(`Kategori-ID verifierad: ${category.id}`);
        } else {
            console.warn(`Kategori har ett temporärt ID: ${category.id}`);
        }
    });
};

// Sätt elementen för uträkning och kolla att de finns innan de körs
export const setTextContent = (id, text) => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    } else {
        console.error(`Element med id "${id}" hittades inte!`);
    }
};
