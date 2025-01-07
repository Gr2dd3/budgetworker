import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD8B8qwp91a6N8_B_hwds5j8jsGZhrFtyk",
    authDomain: "ourbudget-d2b40.firebaseapp.com",
    projectId: "ourbudget-d2b40",
    storageBucket: "ourbudget-d2b40.firebasestorage.app",
    messagingSenderId: "10785224419",
    appId: "1:10785224419:web:2bfa5295fb70102934f7d6",
    measurementId: "G-94E36FGRMZ"
};

const calculateTotals = () => {
    let expectedIncome = 0;
    let expectedExpense = 0;
    let actualIncome = 0;
    let actualExpense = 0;

    categories.forEach(category => {
        category.items.forEach(item => {
            if (category.type === "income") {
                expectedIncome += item.expected || 0;
                actualIncome += item.actual || 0;
            } else if (category.type === "expense") {
                expectedExpense += item.expected || 0;
                actualExpense += item.actual || 0;
            }
        });
    });

    // Uppdatera DOM
    document.getElementById("total-budget-expected-income").textContent = `Inkomst: ${expectedIncome}`;
    document.getElementById("total-budget-expected-expense").textContent = `Utgift: ${expectedExpense}`;
    document.getElementById("total-expected").textContent = `Total budget: ${expectedIncome - expectedExpense}`;
    document.getElementById("total-budget-actual-income").textContent = `Inkomst: ${actualIncome}`;
    document.getElementById("total-budget-actual-expense").textContent = `Utgift: ${actualExpense}`;
    document.getElementById("total-actual").textContent = `Total budget: ${actualIncome - actualExpense}`;
};


// Initiera Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

const categoryList = document.getElementById("category-list");
const addCategoryButton = document.getElementById("add-category");

let categories = []; // För att lagra kategorier

// Hämta kategorier från Firestore
const fetchCategoriesFromFirestore = async () => {
    const categoriesCollection = collection(db, "categories");
    const snapshot = await getDocs(categoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Spara kategorier i Firestore
const saveCategoriesToFirestore = async () => {
    await Promise.all(categories.map(async (category) => {
        const categoryDoc = doc(db, "categories", category.id);
        await updateDoc(categoryDoc, { ...category });
    }));
    console.log("Kategorier sparade i Firestore!");
};

// Rendera kategorier
const renderCategories = () => {
    categoryList.innerHTML = "";

    categories.forEach((category, index) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Gör kategorin dragbar
        categoryEl.draggable = true;
        categoryEl.ondragstart = (event) => {
            console.log("Dragging category:", index);
            event.dataTransfer.setData("categoryIndex", index);
        };

        categoryEl.ondragover = (event) => {
            event.preventDefault();
        };

        categoryEl.ondrop = (event) => {
            event.preventDefault();
            console.log("Dropped on category:", index);
            const draggedCategoryIndex = parseInt(event.dataTransfer.getData("categoryIndex"));
            console.log("Dragged category index:", draggedCategoryIndex);
            const draggedCategory = categories.splice(draggedCategoryIndex, 1)[0];
            categories.splice(index, 0, draggedCategory);
            renderCategories();
            calculateTotals();
            saveCategoriesToFirestore();
        };

        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            categories[index].name = title.textContent;
            saveCategoriesToFirestore();
        };

        const itemList = document.createElement("ul");
        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            // Gör item dragbart
            itemEl.draggable = true;
            itemEl.ondragstart = (event) => {
                event.dataTransfer.setData("itemIndex", itemIndex);
                event.dataTransfer.setData("categoryIndex", index);
            };

            itemEl.ondragover = (event) => {
                event.preventDefault();
            };

            itemEl.ondrop = (event) => {
                event.preventDefault();
                const draggedItemIndex = parseInt(event.dataTransfer.getData("itemIndex"));
                const draggedCategoryIndex = parseInt(event.dataTransfer.getData("categoryIndex"));

                if (draggedCategoryIndex === index) {
                    const draggedItem = categories[index].items.splice(draggedItemIndex, 1)[0];
                    categories[index].items.splice(itemIndex, 0, draggedItem);
                    renderCategories();
                    calculateTotals();
                    saveCategoriesToFirestore();
                }
            };

            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.placeholder = "Namn";
            itemName.onchange = () => {
                categories[index].items[itemIndex].name = itemName.value;
                saveCategoriesToFirestore();
            };

            const itemExpected = document.createElement("input");
            itemExpected.type = "number";
            itemExpected.value = item.expected;
            itemExpected.placeholder = "Förmodad";
            itemExpected.onchange = () => {
                categories[index].items[itemIndex].expected = parseFloat(itemExpected.value);
                saveCategoriesToFirestore();
            };

            const itemActual = document.createElement("input");
            itemActual.type = "number";
            itemActual.value = item.actual;
            itemActual.placeholder = "Faktisk";
            itemActual.onchange = () => {
                categories[index].items[itemIndex].actual = parseFloat(itemActual.value);
                saveCategoriesToFirestore();
            };

            itemEl.append(itemName, itemExpected, itemActual);
            itemList.appendChild(itemEl);
        });

        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.onclick = () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0 });
            renderCategories();
            calculateTotals();
            saveCategoriesToFirestore();
        };

        categoryEl.append(title, itemList, addItemButton);
        categoryList.appendChild(categoryEl);
    });
};

// Ladda kategorier
const loadCategories = async () => {
    categories = await fetchCategoriesFromFirestore();
    renderCategories();
    calculateTotals();
};

// Initiera efter DOM laddats
document.addEventListener("DOMContentLoaded", () => {
    const loginButton = document.getElementById("login-button");
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            console.log("Login button clicked!");
            loadCategories();
        });
    } else {
        console.error("Login button not found!");
    }

    if (addCategoryButton) {
        addCategoryButton.addEventListener("click", () => {
            categories.push({ name: "Ny kategori", color: "#f9f9f9", type: "expense", items: [] });
            renderCategories();
            calculateTotals();
        });
    } else {
        console.error("Add category button not found!");
    }
});
