import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";

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

const categoryList = document.getElementById("category-list");
const addCategoryButton = document.getElementById("add-category");

let categories = []; // För att lagra kategorier

// Hämta kategorier från Firestore
const fetchCategoriesFromFirestore = async () => {
    const categoriesCollection = collection(db, "categories");
    const snapshot = await getDocs(categoriesCollection);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return categories;
};

// Hämta kategorier från Firestore
const loadCategories = async () => {
    categories = await fetchCategoriesFromFirestore(); 
    renderCategories();
};

// Spara kategorier i Firestore
const saveCategoriesToFirestore = async (categories) => {
    const categoriesCollection = collection(db, "categories");
    // Rensa befintliga kategorier innan uppdatering
    await Promise.all(categories.map(async (category) => {
        const categoryDoc = doc(db, "categories", category.id);
        await updateDoc(categoryDoc, { ...category });
    }));
    console.log("Kategorier sparade i Firestore!");
};

document.addEventListener("DOMContentLoaded", () => {
    const totalExpectedEl = document.getElementById("total-expected");
    const totalActualEl = document.getElementById("total-actual");
    const totalBudgetExpectedIncomeEl = document.getElementById("total-budget-expected-income");
    const totalBudgetExpectedExpenseEl = document.getElementById("total-budget-expected-expense");
    const totalBudgetActualIncomeEl = document.getElementById("total-budget-actual-income");
    const totalBudgetActualExpenseEl = document.getElementById("total-budget-actual-expense");

    // Uppdatera UI
    const updateUI = (totalExpectedIncome, totalExpectedExpense, totalExpected, totalActualIncome, totalActualExpense, totalActual) => {
        // Kontrollera om alla element finns innan du försöker uppdatera dem
        const elementsExist = totalBudgetExpectedIncomeEl && totalBudgetExpectedExpenseEl && totalBudgetActualIncomeEl && totalBudgetActualExpenseEl;
        
        if (elementsExist) {
            totalBudgetExpectedIncomeEl.textContent = `Inkomst: ${totalExpectedIncome.toFixed(2)} kr`;
            totalBudgetExpectedExpenseEl.textContent = `Utgift: ${totalExpectedExpense.toFixed(2)} kr`;
            totalExpectedEl.textContent = `Total budget: ${totalExpected.toFixed(2)} kr`;

            totalBudgetActualIncomeEl.textContent = `Inkomst: ${totalActualIncome.toFixed(2)} kr`;
            totalBudgetActualExpenseEl.textContent = `Utgift: ${totalActualExpense.toFixed(2)} kr`;
            totalActualEl.textContent = `Total budget: ${totalActual.toFixed(2)} kr`;
        } else {
            console.error("Ett eller flera HTML-element har inte hittats!", {
                totalBudgetExpectedIncomeEl,
                totalBudgetExpectedExpenseEl,
                totalBudgetActualIncomeEl,
                totalBudgetActualExpenseEl
            });
        }
    };

    // Beräkna totalsummor
    const calculateTotals = () => {
        let totalExpectedIncome = 0;
        let totalExpectedExpense = 0;
        let totalActualIncome = 0;
        let totalActualExpense = 0;

        categories.forEach(category => {
            category.items.forEach(item => {
                const expected = isNaN(parseFloat(item.expected)) ? 0 : parseFloat(item.expected);
                const actual = isNaN(parseFloat(item.expected)) ? 0 : parseFloat(item.actual);

                if (category.type === "income") {
                    totalExpectedIncome += expected;
                    totalActualIncome += actual;
                } else {
                    totalExpectedExpense += expected;
                    totalActualExpense += actual;
                }
            });
        });

        const totalExpected = totalExpectedIncome - totalExpectedExpense;
        const totalActual = totalActualIncome - totalActualExpense;

        // Uppdatera textinnehållet i HTML
        updateUI(totalExpectedIncome, totalExpectedExpense, totalExpected, totalActualIncome, totalActualExpense, totalActual);
    };

    // Kör beräkning och uppdatera UI när DOM är redo
    calculateTotals();  // Beräkna totalsummor och uppdatera UI
});


// Rendera kategorier
const renderCategories = async () => {
    categoryList.innerHTML = "";

    categories.forEach((category, index) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Gör kategorin dragbar
        categoryEl.draggable = true;
        categoryEl.ondragstart = (event) => {
            event.dataTransfer.setData("categoryIndex", index); // Spara indexet för dragged kategori
        };

        categoryEl.ondragover = (event) => {
            event.preventDefault(); // Tillåt drop
        };

        categoryEl.ondrop = (event) => {
            event.preventDefault();
            const draggedCategoryIndex = parseInt(event.dataTransfer.getData("categoryIndex"));
            const draggedCategory = categories.splice(draggedCategoryIndex, 1)[0];
            categories.splice(index, 0, draggedCategory);
            renderCategories();
        };
        

        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            if (categories[index].name !== title.textContent) {
                categories[index].name = title.textContent;
            }
        };

        // Färgval
        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.value = category.color || "#f9f9f9";
        colorPicker.onchange = () => {
            if (categories[index].color !== colorPicker.value) {
                categories[index].color = colorPicker.value;
            }
        };

        // Val av inkomst eller utgift
        const typeSelect = document.createElement("select");
        ["income", "expense"].forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type === "income" ? "Inkomst" : "Utgift";
            option.selected = category.type === type;
            typeSelect.appendChild(option);
        });
        typeSelect.onchange = () => {
            if (categories[index].type !== typeSelect.value) {
                categories[index].type = typeSelect.value;
            }
        };

        const headers = document.createElement("div");
        headers.classList.add("headers");

        const nameHeader = document.createElement("span");
        nameHeader.textContent = "Namn";
        const expectedHeader = document.createElement("span");
        expectedHeader.textContent = "Förmodad";
        const actualHeader = document.createElement("span");
        actualHeader.textContent = "Faktisk";

        headers.append(nameHeader, expectedHeader, actualHeader);

        const itemList = document.createElement("ul");

        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            // Gör item dragbart
            itemEl.draggable = true;
            itemEl.ondragstart = (event) => {
                event.dataTransfer.setData("itemIndex", itemIndex); // Spara indexet för dragged item
                event.dataTransfer.setData("categoryIndex", index); // Spara kategoriindexet
            };

            itemEl.ondragover = (event) => {
                event.preventDefault(); // Tillåt drop
            };

            itemEl.ondrop = (event) => {
                event.preventDefault();
                const draggedItemIndex = parseInt(event.dataTransfer.getData("itemIndex"));
                const draggedCategoryIndex = parseInt(event.dataTransfer.getData("categoryIndex"));
            
                if (draggedCategoryIndex === index) {
                    const draggedItem = categories[index].items.splice(draggedItemIndex, 1)[0];
                    categories[index].items.splice(itemIndex, 0, draggedItem);
                    renderCategories();
                }
            };            

            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.placeholder = "Namn";
            itemName.onchange = () => {
                if (categories[index].items[itemIndex].name !== itemName.value) {
                    categories[index].items[itemIndex].name = itemName.value;
                }
            };

            const itemExpected = document.createElement("input");
            itemExpected.type = "number";
            itemExpected.value = item.expected;
            itemExpected.placeholder = "Förmodad";
            itemExpected.onchange = () => {
                const newValue = parseFloat(itemExpected.value);
                if (categories[index].items[itemIndex].expected !== newValue) {
                    categories[index].items[itemIndex].expected = newValue;
                }
            };

            const itemActual = document.createElement("input");
            itemActual.type = "number";
            itemActual.value = item.actual;
            itemActual.placeholder = "Faktisk";
            itemActual.onchange = () => {
                const newValue = parseFloat(itemActual.value);
                if (categories[index].items[itemIndex].actual !== newValue) {
                    categories[index].items[itemIndex].actual = newValue;
                }
            };

            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort";
            deleteItemButton.onclick = () => {
                categories[index].items.splice(itemIndex, 1);
                renderCategories(); 
            };

            itemEl.append(itemName, itemExpected, itemActual, deleteItemButton);
            itemList.appendChild(itemEl);
        });

        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.style.display = "block";
        addItemButton.onclick = () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0 });
            renderCategories(); 
        };

        // Ta bort kategori
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.onclick = () => {
            categories.splice(index, 1);
            renderCategories(); 
        };

        categoryEl.append(title, colorPicker, typeSelect, headers, itemList, addItemButton, deleteCategoryButton);
        categoryList.appendChild(categoryEl);
    });

    saveCategoriesToFirestore(categories);
};

// Lägg till kategori
addCategoryButton.addEventListener("click", () => {
    categories.push({
        name: "Ny kategori",
        color: "#f9f9f9",
        type: "expense",
        items: []
    });
    renderCategories();
});

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
});