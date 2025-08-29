const expenseCategories = ["Food", "Transportation", "School Supplies", "Tuition/Fees", "Rent/Boarding", "Utilities", "Clothes", "Health", "Leisure", "Other"];
const incomeCategories = ["Allowance", "Part-time Job", "Scholarship/Grant", "Gift", "Other"];

const $ = (sel) => document.querySelector(sel);
const format = (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

let state = { items: [] };

// API helpers
async function fetchTransactions() {
  const res = await fetch("/api/transactions");
  state.items = await res.json();
}
async function addTransaction(data) {
  const res = await fetch("/api/transactions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const tx = await res.json();
  state.items.push(tx);
}
async function deleteTransaction(id) {
  await fetch("/api/transactions/" + id, { method: "DELETE" });
  state.items = state.items.filter(x => x.id !== id);
}

// UI helpers
function nowLocalDatetime() {
  const d = new Date();
  return d.toISOString().slice(0, 16);
}
function setCategories() {
  const type = $("#type").value;
  const list = type === "income" ? incomeCategories : expenseCategories;
  const cat = $("#category");
  cat.innerHTML = "";
  for (const c of list) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    cat.appendChild(opt);
  }
}

function render() {
  // Monthly summary
  const monthly = {};
  for (const it of state.items) {
    const d = new Date(it.date);
    const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2, "0");
    if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
    monthly[key][it.type] += it.amount;
  }
  $("#monthlyBody").innerHTML = Object.keys(monthly).sort().reverse().map(k => {
    const m = monthly[k], bal = m.income - m.expense;
    return `<tr>
      <td>${k}</td>
      <td class="amount mono">${format(m.income)}</td>
      <td class="amount mono">${format(m.expense)}</td>
      <td class="amount mono">${format(bal)}</td>
    </tr>`;
  }).join("");

  // Totals
  let income = 0, expense = 0;
  let dailyExpense = 0;
  let today = new Date();
  today.setHours(0,0,0,0);

  for (const it of state.items) {
    if (it.type === "income") income += it.amount;
    else expense += it.amount;

    // Daily expenses calculation
    const d = new Date(it.date);
    if (it.type === "expense" && d >= today) {
      dailyExpense += it.amount;
    }
  }

  $("#totalIncome").textContent = format(income);
  $("#totalExpense").textContent = format(expense);
  $("#balance").textContent = format(income - expense);
  $("#dailyExpense").textContent = format(dailyExpense);

  // History table
  $("#tbody").innerHTML = state.items
    .slice().sort((a,b) => new Date(b.date) - new Date(a.date))
    .map(it => `<tr>
      <td>${new Date(it.date).toLocaleString()}</td>
      <td><span class="pill ${it.type}">${it.type}</span></td>
      <td>${it.category}</td>
      <td class="amount mono">${it.amount.toFixed(2)}</td>
      <td>${it.note || ""}</td>
      <td><button class="btn-outline" onclick="handleDelete('${it.id}')">Delete</button></td>
    </tr>`).join("");
}

async function handleDelete(id) {
  if (confirm("Delete this transaction?")) {
    await deleteTransaction(id);
    render();
  }
}

async function clearAll() {
  if (!confirm("This will remove ALL transactions. Continue?")) return;
  for (const tx of state.items) {
    await deleteTransaction(tx.id);
  }
  render();
}

async function init() {
  await fetchTransactions();
  setCategories();
  $("#type").addEventListener("change", setCategories);
  $("#addBtn").addEventListener("click", async () => {
    const type = $("#type").value, category = $("#category").value;
    const amount = parseFloat($("#amount").value), note = $("#note").value;
    const date = $("#date").value;
    if (!amount || amount < 0) return alert("Invalid amount");
    if (!date) return alert("Please pick a date");
    await addTransaction({ type, category, amount, note, date });
    $("#amount").value = "";
    $("#note").value = "";
    $("#date").value = nowLocalDatetime();
    render();
  });
  $("#clearAllBtn").addEventListener("click", clearAll);
  $("#exportCsvBtn").addEventListener("click", () => {
    window.location.href = "/api/export";
  });
  $("#date").value = nowLocalDatetime();
  render();
}
init();
