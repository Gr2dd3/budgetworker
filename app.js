import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyD8B8qwp91a6N8_B_hwds5j8jsGZhrFtyk",
    authDomain: "ourbudget-d2b40.firebaseapp.com",
    projectId: "ourbudget-d2b40",
    storageBucket: "ourbudget-d2b40.firebasestorage.app",
    messagingSenderId: "10785224419",
    appId: "1:10785224419:web:2bfa5295fb70102934f7d6",
    measurementId: "G-94E36FGRMZ"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

/*Tillfällig inlogg
const validCredentials = { 
    username: "1", 
    passwordHash: "c4ca4238a0b923820dcc509a6f75849b" /**lösen nu: 1 
};
console.log("Förväntad hash för 1: " + CryptoJS.MD5("1").toString());
*/

const validCredentials = { 
    username: "Gradin2025", 
    passwordHash: "3af6f058eab3ac8f451704880d405ad9"
};

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app");
const errorMessage = document.getElementById("error-message");
const loginButton = document.getElementById("login-button");

const categoryList = document.getElementById("category-list");
const addCategoryButton = document.getElementById("add-category");
const totalExpectedEl = document.getElementById("total-expected");
const totalActualEl = document.getElementById("total-actual");
const totalBudgetExpectedEl = document.getElementById("total-budget-expected");
const totalBudgetActualEl = document.getElementById("total-budget-actual");


// Hämta kategorier från Firestore
let categories = fetchCategoriesFromFirestore();

//let categories = JSON.parse(localStorage.getItem("budgetCategories")) || [];
// Spara kategorier i localStorage
/*const saveCategories = () => {
    localStorage.setItem("budgetCategories", JSON.stringify(categories));
};*/

// Spara kategorier i Firestore (google)
const saveCategoriesToFirestore = async (categories) => {
    const categoriesCollection = collection(db, "categories");
    for (const category of categories) {
        await addDoc(categoriesCollection, category);
    }
    console.log("Kategorier sparade i Firestore!");
};

const fetchCategoriesFromFirestore = async () => {
    const categoriesCollection = collection(db, "categories");
    const snapshot = await getDocs(categoriesCollection);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return categories;
};

// Beräkna totalsummor
const calculateTotals = () => {
    let totalExpectedIncome = 0;
    let totalExpectedExpense = 0;
    let totalActualIncome = 0;
    let totalActualExpense = 0;

    categories.forEach(category => {
        category.items.forEach(item => {
            const expected = parseFloat(item.expected) || 0;
            const actual = parseFloat(item.actual) || 0;

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

    totalExpectedEl.textContent = `Total budget (förmodad): ${totalExpected.toFixed(2)} kr`;
    totalActualEl.textContent = `Total budget (faktisk): ${totalActual.toFixed(2)} kr`;
    totalBudgetExpectedEl.textContent = `Inkomst (förmodad): ${totalExpectedIncome.toFixed(2)}, Utgift (förmodad): ${totalExpectedExpense.toFixed(2)} kr`;
    totalBudgetActualEl.textContent = `Inkomst (faktisk): ${totalActualIncome.toFixed(2)}, Utgift (faktisk): ${totalActualExpense.toFixed(2)} kr`;
};

// Rendera kategorier
const renderCategories = () => {
    categoryList.innerHTML = "";
    categories.forEach((category, index) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        // Rubrik för kategori
        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            categories[index].name = title.textContent;
            saveCategoriesToFirestore();
        };

        // Färgval
        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.value = category.color || "#f9f9f9";
        colorPicker.onchange = () => {
            categories[index].color = colorPicker.value;
            saveCategoriesToFirestore();
            renderCategories();
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
            categories[index].type = typeSelect.value;
            saveCategoriesToFirestore();
            calculateTotals();
        };

        // Rubriker för "Förmodad" och "Faktisk"
        const headers = document.createElement("div");
        headers.classList.add("headers");

        const nameHeader = document.createElement("span");
        nameHeader.textContent = "Namn";
        const expectedHeader = document.createElement("span");
        expectedHeader.textContent = "Förmodad";
        const actualHeader = document.createElement("span");
        actualHeader.textContent = "Faktisk";

        headers.append(nameHeader, expectedHeader, actualHeader);

        // Lista för objekt
        const itemList = document.createElement("ul");

        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

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
                categories[index].items[itemIndex].expected = itemExpected.value;
                saveCategoriesToFirestore();
                calculateTotals();
            };

            const itemActual = document.createElement("input");
            itemActual.type = "number";
            itemActual.value = item.actual;
            itemActual.placeholder = "Faktisk";
            itemActual.onchange = () => {
                categories[index].items[itemIndex].actual = itemActual.value;
                saveCategoriesToFirestore();
                calculateTotals();
            };

            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Ta bort";
            deleteItemButton.onclick = () => {
                categories[index].items.splice(itemIndex, 1);
                saveCategoriesToFirestore();
                renderCategories();
                calculateTotals();
            };

            itemEl.append(itemName, itemExpected, itemActual, deleteItemButton);
            itemList.appendChild(itemEl);
        });

        // Lägg till ny rad
        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Lägg till rad";
        addItemButton.style.display = "block";
        addItemButton.onclick = () => {
            categories[index].items.push({ name: "", expected: 0, actual: 0 });
            saveCategoriesToFirestore();
            renderCategories();
        };

        // Ta bort kategori
        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Ta bort kategori";
        deleteCategoryButton.onclick = () => {
            categories.splice(index, 1);
            saveCategoriesToFirestore();
            renderCategories();
            calculateTotals();
        };

        categoryEl.append(title, colorPicker, typeSelect, headers, itemList, addItemButton, deleteCategoryButton);
        categoryList.appendChild(categoryEl);
    });

    calculateTotals();
};

// Inloggning
loginButton.addEventListener("click", () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === validCredentials.username && CryptoJS.MD5(password).toString() === validCredentials.passwordHash) {
        loginScreen.classList.add("hidden");
        appScreen.classList.remove("hidden");
        renderCategories();
    } else {
        errorMessage.textContent = "Fel användarnamn eller lösenord.";
    }
});

// Lägg till kategori
addCategoryButton.addEventListener("click", () => {
    categories.push({
        name: "Ny kategori",
        type: "expense",
        color: "#f9f9f9",
        items: []
    });
    saveCategoriesToFirestore();
    renderCategories();
});
