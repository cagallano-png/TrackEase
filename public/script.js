// ==== Helpers ====
const $ = (sel) => document.querySelector(sel);
const format = (num) =>
  "₱" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ==== State ====
let state = {
  items: JSON.parse(localStorage.getItem("items") || "[]"),
  user: JSON.parse(localStorage.getItem("user") || "null") // === AUTH ===
};

// ==== Save State ====
function save() {
  localStorage.setItem("items", JSON.stringify(state.items));
  localStorage.setItem("user", JSON.stringify(state.user)); // === AUTH ===
}

// ==== Delete Item ====
function deleteItem(id) {
  state.items = state.items.filter((it) => it.id !== id);
  save();
  render();
}

// ==== Charts ====
let expensePieChart, monthlyBarChart;

function updateCharts() {
  // (your existing chart code unchanged) ...
  // ---- Expense Pie (this month) ----
  const now = new Date();
  const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  const catTotals = {};
  for (const it of state.items) {
    if (it.type === "expense" && it.date.startsWith(ym)) {
      catTotals[it.category] = (catTotals[it.category] || 0) + it.amount;
    }
  }
  const pieLabels = Object.keys(catTotals);
  const pieData = Object.values(catTotals);

  if (expensePieChart) expensePieChart.destroy();
  expensePieChart = new Chart($("#expensePie"), {
    type: "pie",
    data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: ["#ef4444","#f59e0b","#3b82f6","#22c55e","#8b5cf6","#ec4899","#14b8a6"] }] },
    options: { plugins: { legend: { labels: { color: "#e5e7eb" } } } }
  });

  // ---- Monthly Income vs Expense Bar ----
  const monthly = {};
  for (const it of state.items) {
    const d = new Date(it.date);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
    if (it.type === "income") monthly[key].income += it.amount;
    else monthly[key].expense += it.amount;
  }
  const labels = Object.keys(monthly).sort();
  const incomeData = labels.map((k) => monthly[k].income);
  const expenseData = labels.map((k) => monthly[k].expense);

  if (monthlyBarChart) monthlyBarChart.destroy();
  monthlyBarChart = new Chart($("#monthlyBar"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Income", data: incomeData, backgroundColor: "#22c55e" }, { label: "Expenses", data: expenseData, backgroundColor: "#ef4444" }] },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#e5e7eb" } } },
      scales: { x: { ticks: { color: "#e5e7eb" } }, y: { ticks: { color: "#e5e7eb" } } }
    }
  });
}

// ==== Render ====
function render() {
  // (your existing render code unchanged)
  // monthly summary
  const monthly = {};
  for (const it of state.items) {
    const d = new Date(it.date);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
    if (it.type === "income") monthly[key].income += it.amount;
    else monthly[key].expense += it.amount;
  }
  const mbody = $("#monthlyBody");
  mbody.innerHTML = "";
  const keys = Object.keys(monthly).sort().reverse();
  for (const k of keys) {
    const row = document.createElement("tr");
    const bal = monthly[k].income - monthly[k].expense;
    row.innerHTML = `<td>${k}</td><td class="amount mono">${format(monthly[k].income)}</td><td class="amount mono">${format(monthly[k].expense)}</td><td class="amount mono">${format(bal)}</td>`;
    mbody.appendChild(row);
  }

  // totals
  let income = 0, expense = 0;
  for (const it of state.items) {
    if (it.type === "income") income += it.amount;
    else expense += it.amount;
  }
  $("#totalIncome").textContent = format(income);
  $("#totalExpense").textContent = format(expense);
  $("#balance").textContent = format(income - expense);

  // today's expenses
  const todayStr = new Date().toISOString().split("T")[0];
  let dailyExpense = 0;
  for (const it of state.items) {
    if (it.type === "expense" && it.date.startsWith(todayStr)) dailyExpense += it.amount;
  }
  $("#dailyExpense").textContent = format(dailyExpense);

  // history
  const tbody = $("#tbody");
  tbody.innerHTML = "";
  const sorted = [...state.items].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const it of sorted) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(it.date).toLocaleString()}</td>
      <td><span class="pill ${it.type}">${it.type}</span></td>
      <td>${it.category}</td>
      <td class="amount mono">${it.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${it.note || ""}</td>
      <td><button class="btn-outline">Delete</button></td>`;
    tr.querySelector("button").addEventListener("click", () => deleteItem(it.id));
    tbody.appendChild(tr);
  }

  // update charts
  updateCharts();
}

// ==== Add Transaction ====
$("#addBtn").addEventListener("click", () => {
  const type = $("#type").value;
  const category = $("#category").value || "Other";
  const amount = parseFloat($("#amount").value);
  const note = $("#note").value;
  const date = $("#date").value || new Date().toISOString();

  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid amount");
    return;
  }

  state.items.push({ id: Date.now(), type, category, amount, note, date });
  save();
  render();

  $("#amount").value = "";
  $("#note").value = "";
});

// ==== Clear All ====
$("#clearAllBtn").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all data?")) {
    state.items = [];
    save();
    render();
  }
});

// ==== Export CSV ====
$("#exportCsvBtn").addEventListener("click", () => {
  let csv = "Date,Type,Category,Amount,Note\n";
  for (const it of state.items) {
    csv += `"${it.date}","${it.type}","${it.category}",${it.amount},"${it.note}"\n`;
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ==== Categories ====
const categories = ["Food", "Transport", "School", "Allowance", "Other"];
const catSelect = $("#category");
for (const c of categories) {
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  catSelect.appendChild(opt);
}

// ==== AUTH ====
function updateAuthUI() {
  if (state.user) {
    $("#authSection").style.display = "none";
    $("#app").style.display = "block";
  } else {
    $("#authSection").style.display = "block";
    $("#app").style.display = "none";
  }
}

$("#loginBtn").addEventListener("click", () => {
  const email = $("#authEmail").value.trim();
  const pass = $("#authPassword").value.trim();
  if (!email || !pass) return alert("Enter email and password");
  // fake login
  state.user = { email };
  save();
  updateAuthUI();
  render();
});

$("#registerBtn").addEventListener("click", () => {
  const email = $("#authEmail").value.trim();
  const pass = $("#authPassword").value.trim();
  if (!email || !pass) return alert("Enter email and password");
  // fake register = just store email
  state.user = { email };
  save();
  updateAuthUI();
  render();
});

// ==== Init ====
updateAuthUI();
render();
