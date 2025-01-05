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
const totalBudgetEl = document.getElementById("total-budget");

let categories = JSON.parse(localStorage.getItem("budgetCategories")) || [];

const saveCategories = () => {
    localStorage.setItem("budgetCategories", JSON.stringify(categories));
};

const calculateTotalBudget = () => {
    const total = categories.reduce((sum, category) => {
        const categoryTotal = category.items.reduce((catSum, item) => catSum + parseFloat(item.amount || 0), 0);
        return sum + (category.type === "income" ? categoryTotal : -categoryTotal);
    }, 0);
    totalBudgetEl.textContent = total.toFixed(2);
};

const renderCategories = () => {
    categoryList.innerHTML = "";
    categories.forEach((category, index) => {
        const categoryEl = document.createElement("li");
        categoryEl.classList.add("category");
        categoryEl.style.backgroundColor = category.color || "#f9f9f9";

        const title = document.createElement("h3");
        title.textContent = category.name;
        title.contentEditable = true;
        title.onblur = () => {
            categories[index].name = title.textContent;
            saveCategories();
        };

        const typeSelect = document.createElement("select");
        ["income", "expense"].forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type === "income" ? "Income" : "Expense";
            option.selected = category.type === type;
            typeSelect.appendChild(option);
        });
        typeSelect.onchange = () => {
            categories[index].type = typeSelect.value;
            saveCategories();
            calculateTotalBudget();
        };

        const colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.value = category.color || "#f9f9f9";
        colorPicker.onchange = () => {
            categories[index].color = colorPicker.value;
            saveCategories();
            renderCategories();
        };

        const itemList = document.createElement("ul");

        category.items.forEach((item, itemIndex) => {
            const itemEl = document.createElement("li");
            itemEl.classList.add("item");

            const itemName = document.createElement("input");
            itemName.value = item.name;
            itemName.onchange = () => {
                categories[index].items[itemIndex].name = itemName.value;
                saveCategories();
            };

            const itemAmount = document.createElement("input");
            itemAmount.type = "number";
            itemAmount.value = item.amount;
            itemAmount.onchange = () => {
                categories[index].items[itemIndex].amount = itemAmount.value;
                saveCategories();
                calculateTotalBudget();
            };

            const deleteItemButton = document.createElement("button");
            deleteItemButton.textContent = "Delete";
            deleteItemButton.onclick = () => {
                categories[index].items.splice(itemIndex, 1);
                saveCategories();
                renderCategories();
                calculateTotalBudget();
            };

            itemEl.append(itemName, itemAmount, deleteItemButton);
            itemList.appendChild(itemEl);
        });

        const addItemButton = document.createElement("button");
        addItemButton.textContent = "Add Item";
        addItemButton.style.marginRight = "1rem";
        addItemButton.onclick = () => {
            categories[index].items.push({ name: "", amount: 0 });
            saveCategories();
            renderCategories();
        };

        const deleteCategoryButton = document.createElement("button");
        deleteCategoryButton.textContent = "Delete Category";
        deleteCategoryButton.onclick = () => {
            categories.splice(index, 1);
            saveCategories();
            renderCategories();
            calculateTotalBudget();
        };

        categoryEl.append(title, typeSelect, colorPicker, itemList, addItemButton, deleteCategoryButton);
        categoryList.appendChild(categoryEl);
    });

    calculateTotalBudget();
};

const md5 = (string) => {
    return CryptoJS.MD5(string).toString();
};

loginButton.addEventListener("click", () => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === validCredentials.username && md5(password) === validCredentials.passwordHash) {
        loginScreen.classList.add("hidden");
        appScreen.classList.remove("hidden");
        renderCategories();
    } else {
        errorMessage.textContent = "Invalid username or password.";
    }
});

addCategoryButton.addEventListener("click", () => {
    categories.push({ name: "New Category", type: "income", color: "#f9f9f9", items: [] });
    saveCategories();
    renderCategories();
});