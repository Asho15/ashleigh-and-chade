import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Coffee,
  Heart,
  Home,
  PiggyBank,
  Plus,
  Settings,
  Target,
  Trash2,
  Wallet,
  Users,
  TrendingUp,
  Landmark,
  ReceiptText,
  BookOpen,
  Search,
  Filter,
  Pencil,
  Save,
} from "lucide-react";

const STORAGE_KEY = "ashleigh-chade-10-year-plan-v2";

const money = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const bibleVerses = [
  "Proverbs 16:3 — Commit to the Lord whatever you do, and he will establish your plans.",
  "Proverbs 21:5 — The plans of the diligent lead to profit as surely as haste leads to poverty.",
  "Matthew 6:21 — For where your treasure is, there your heart will be also.",
  "Luke 14:28 — Suppose one of you wants to build a tower. Won’t you first sit down and estimate the cost?",
  "Psalm 37:5 — Commit your way to the Lord; trust in him and he will do this.",
  "Philippians 4:19 — And my God will meet all your needs according to the riches of his glory.",
  "Jeremiah 29:11 — For I know the plans I have for you, declares the Lord.",
  "Proverbs 3:5-6 — Trust in the Lord with all your heart and lean not on your own understanding.",
  "Ecclesiastes 11:2 — Invest in seven ventures, yes, in eight; you do not know what disaster may come.",
  "1 Timothy 6:18-19 — Be rich in good deeds, generous and willing to share, laying up treasure for the coming age.",
];

const defaultData = {
  selectedMonth: "May 2026",
  months: ["May 2026"],
  targetNetWorth: 2830000,
  targetDate: "May 2036",
  monthlySavingsTarget: 16000,
  categories: [
    "Rent",
    "Groceries",
    "Fuel",
    "Utilities",
    "Insurance",
    "Subscriptions",
    "Coffee",
    "Take Out",
    "Medical",
    "Beauty",
    "Date Night",
    "Other",
  ],
  budgets: {
    "May 2026": {
      Rent: 8000,
      Groceries: 5000,
      Fuel: 2500,
      Utilities: 1500,
      Insurance: 2100,
      Subscriptions: 500,
      Coffee: 800,
      "Take Out": 1000,
      Medical: 500,
      Beauty: 500,
      "Date Night": 1000,
      Other: 1000,
    },
  },
  income: {
    "May 2026": [
      { id: 1, who: "Ashleigh", source: "Salary", amount: 22000 },
      { id: 2, who: "Chade", source: "Salary", amount: 22000 },
    ],
  },
  expenses: {
    "May 2026": [
      { id: 1, date: "2026-05-01", who: "Joint", place: "Rent", category: "Rent", amount: 8000 },
      { id: 2, date: "2026-05-02", who: "Ashleigh", place: "Pick n Pay", category: "Groceries", amount: 850 },
      { id: 3, date: "2026-05-03", who: "Chade", place: "Vida e Caffe", category: "Coffee", amount: 72 },
      { id: 4, date: "2026-05-04", who: "Chade", place: "Vida e Caffe", category: "Coffee", amount: 68 },
      { id: 5, date: "2026-05-05", who: "Ashleigh", place: "Uber Eats", category: "Take Out", amount: 210 },
      { id: 6, date: "2026-05-06", who: "Chade", place: "Shell", category: "Fuel", amount: 600 },
      { id: 7, date: "2026-05-07", who: "Joint", place: "Insurance", category: "Insurance", amount: 2100 },
    ],
  },
  savingsAccounts: [
    { id: 1, owner: "Ashleigh", name: "TFSA - Allan Gray", type: "TFSA", current: 4000, previous: 4000, monthly: 3000, deposits: [] },
    { id: 2, owner: "Ashleigh", name: "FNB 32-Day Account", type: "Deposit", current: 8000, previous: 8000, monthly: 2500, deposits: [] },
    { id: 3, owner: "Ashleigh", name: "FNB 1-Year Fixed Deposit", type: "Fixed Deposit", current: 10000, previous: 10000, monthly: 2500, deposits: [] },
    { id: 4, owner: "Chade", name: "TFSA - FNB", type: "TFSA", current: 909, previous: 909, monthly: 3000, deposits: [] },
    { id: 5, owner: "Chade", name: "FNB 32-Day Account", type: "Deposit", current: 0, previous: 0, monthly: 2500, deposits: [] },
    { id: 6, owner: "Chade", name: "FNB 1-Year Fixed Deposit", type: "Fixed Deposit", current: 0, previous: 0, monthly: 2500, deposits: [] },
  ],
};

function migrateData(raw) {
  const clean = { ...defaultData, ...raw };
  clean.months = clean.months?.length ? clean.months : [clean.selectedMonth || "May 2026"];
  clean.selectedMonth = clean.selectedMonth || clean.months[0];
  clean.categories = (clean.categories || defaultData.categories).filter(
    (c) => !["Alcohol", "Tobacco"].includes(c)
  );
  clean.expenses = clean.expenses || {};
  clean.income = clean.income || {};
  clean.budgets = clean.budgets || {};
  clean.months.forEach((m) => {
    clean.expenses[m] = clean.expenses[m] || [];
    clean.income[m] = clean.income[m] || [];
    clean.budgets[m] = clean.budgets[m] || {};
    clean.categories.forEach((cat) => {
      if (clean.budgets[m][cat] === undefined) clean.budgets[m][cat] = 0;
    });
  });
  clean.savingsAccounts = (clean.savingsAccounts || []).map((a) => ({
    ...a,
    previous: a.previous ?? a.current ?? 0,
    current: Number(a.current || 0),
    monthly: Number(a.monthly || 0),
    deposits: a.deposits || [],
  }));
  return clean;
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? migrateData(JSON.parse(saved)) : defaultData;
  } catch {
    return defaultData;
  }
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    who: "Ashleigh",
    place: "",
    category: "Coffee",
    amount: "",
  });
  const [incomeForm, setIncomeForm] = useState({ who: "Ashleigh", source: "Salary", amount: "" });
  const [accountForm, setAccountForm] = useState({
    owner: "Ashleigh",
    name: "",
    type: "Deposit",
    current: "",
    monthly: "",
  });
  const [categoryName, setCategoryName] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("All");
  const [expensePersonFilter, setExpensePersonFilter] = useState("All");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const month = data.selectedMonth;
  const monthExpenses = data.expenses[month] || [];
  const monthIncome = data.income[month] || [];
  const monthBudgets = data.budgets?.[month] || {};

  const actualDepositsThisMonth = useMemo(() => {
    return data.savingsAccounts.reduce((sum, account) => {
      const deposits = account.deposits || [];
      return (
        sum +
        deposits
          .filter((d) => d.month === month && d.kind !== "balance-edit")
          .reduce((s, d) => s + Number(d.amount || 0), 0)
      );
    }, 0);
  }, [data.savingsAccounts, month]);

  const totals = useMemo(() => {
    const totalIncome = monthIncome.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalSpent = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalCurrent = data.savingsAccounts.reduce((s, a) => s + Number(a.current || 0), 0);
    const monthlySavings = data.savingsAccounts.reduce((s, a) => s + Number(a.monthly || 0), 0);
    const totalBudget = Object.values(monthBudgets).reduce((s, b) => s + Number(b || 0), 0);
    const progress = Math.min(100, Math.round((totalCurrent / data.targetNetWorth) * 100));
    const remaining = data.targetNetWorth - totalCurrent;
    const cashRemaining = totalIncome - totalSpent - actualDepositsThisMonth;
    return { totalIncome, totalSpent, totalCurrent, monthlySavings, totalBudget, progress, remaining, cashRemaining };
  }, [data, monthExpenses, monthIncome, monthBudgets, actualDepositsThisMonth]);

  const analytics = useMemo(() => {
    const byCategory = {};
    const byPlace = {};
    const byWho = {};
    const entriesByPersonCategory = {};

    monthExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0);
      byPlace[e.place] = (byPlace[e.place] || 0) + Number(e.amount || 0);
      byWho[e.who] = (byWho[e.who] || 0) + Number(e.amount || 0);
      const key = `${e.who}-${e.category}`;
      entriesByPersonCategory[key] = (entriesByPersonCategory[key] || 0) + 1;
    });

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
    const topPlaces = Object.entries(byPlace).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topPerson = Object.entries(byWho).sort((a, b) => b[1] - a[1])[0] || null;
    const topExpenses = [...monthExpenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 10);
    const coffeeAsh = entriesByPersonCategory["Ashleigh-Coffee"] || 0;
    const coffeeChade = entriesByPersonCategory["Chade-Coffee"] || 0;
    const takeoutAsh = entriesByPersonCategory["Ashleigh-Take Out"] || 0;
    const takeoutChade = entriesByPersonCategory["Chade-Take Out"] || 0;

    return { byCategory, byPlace, byWho, topCategory, topPlaces, topPerson, topExpenses, coffeeAsh, coffeeChade, takeoutAsh, takeoutChade };
  }, [monthExpenses]);

  const filteredExpenses = useMemo(() => {
    const q = expenseSearch.toLowerCase().trim();
    return monthExpenses.filter((e) => {
      const matchesSearch = !q || `${e.date} ${e.who} ${e.place} ${e.category} ${e.amount}`.toLowerCase().includes(q);
      const matchesCategory = expenseCategoryFilter === "All" || e.category === expenseCategoryFilter;
      const matchesPerson = expensePersonFilter === "All" || e.who === expensePersonFilter;
      return matchesSearch && matchesCategory && matchesPerson;
    });
  }, [monthExpenses, expenseSearch, expenseCategoryFilter, expensePersonFilter]);

  const todaysVerse = bibleVerses[Math.floor(Date.now() / 86400000) % bibleVerses.length];

  function savePatch(patch) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addExpense() {
    if (!expenseForm.place.trim() || !expenseForm.amount) return alert("Add a place and amount first.");
    const newExpense = { ...expenseForm, id: Date.now(), amount: Number(expenseForm.amount) };
    savePatch({ expenses: { ...data.expenses, [month]: [newExpense, ...monthExpenses] } });
    setExpenseForm({ ...expenseForm, place: "", amount: "" });
  }

  function deleteExpense(id) {
    savePatch({ expenses: { ...data.expenses, [month]: monthExpenses.filter((e) => e.id !== id) } });
  }

  function addIncome() {
    if (!incomeForm.source.trim() || !incomeForm.amount) return alert("Add an income source and amount first.");
    const newIncome = { ...incomeForm, id: Date.now(), amount: Number(incomeForm.amount) };
    savePatch({ income: { ...data.income, [month]: [newIncome, ...monthIncome] } });
    setIncomeForm({ ...incomeForm, amount: "" });
  }

  function deleteIncome(id) {
    savePatch({ income: { ...data.income, [month]: monthIncome.filter((i) => i.id !== id) } });
  }

  function addSavingsAccount() {
    if (!accountForm.name.trim()) return alert("Add an account name first.");
    const newAccount = {
      ...accountForm,
      id: Date.now(),
      current: Number(accountForm.current || 0),
      previous: Number(accountForm.current || 0),
      monthly: Number(accountForm.monthly || 0),
      deposits: [],
    };
    savePatch({ savingsAccounts: [...data.savingsAccounts, newAccount] });
    setAccountForm({ owner: "Ashleigh", name: "", type: "Deposit", current: "", monthly: "" });
  }

  function deleteAccount(id) {
    savePatch({ savingsAccounts: data.savingsAccounts.filter((a) => a.id !== id) });
  }

  function addDepositToAccount(accountId, depositAmount, note = "Manual deposit") {
    const amount = Number(depositAmount || 0);
    if (!amount || amount <= 0) return alert("Enter a deposit amount first.");

    const updatedAccounts = data.savingsAccounts.map((account) => {
      if (account.id !== accountId) return account;
      const previousBalance = Number(account.current || 0);
      const newBalance = previousBalance + amount;
      return {
        ...account,
        previous: previousBalance,
        current: newBalance,
        deposits: [
          {
            id: Date.now(),
            date: new Date().toISOString().slice(0, 10),
            month,
            kind: "deposit",
            amount,
            note,
            previousBalance,
            newBalance,
          },
          ...(account.deposits || []),
        ],
      };
    });

    savePatch({ savingsAccounts: updatedAccounts });
  }

  function editAccountBalance(accountId, newBalanceValue) {
    const newBalance = Number(newBalanceValue || 0);
    if (newBalance < 0) return alert("Balance cannot be negative.");

    const updatedAccounts = data.savingsAccounts.map((account) => {
      if (account.id !== accountId) return account;
      const previousBalance = Number(account.current || 0);
      const difference = newBalance - previousBalance;
      return {
        ...account,
        previous: previousBalance,
        current: newBalance,
        deposits: [
          {
            id: Date.now(),
            date: new Date().toISOString().slice(0, 10),
            month,
            kind: "balance-edit",
            amount: difference,
            note: "Balance edited for interest/adjustment",
            previousBalance,
            newBalance,
          },
          ...(account.deposits || []),
        ],
      };
    });

    savePatch({ savingsAccounts: updatedAccounts });
  }

  function updateBudget(category, value) {
    savePatch({
      budgets: {
        ...data.budgets,
        [month]: {
          ...(data.budgets?.[month] || {}),
          [category]: Number(value || 0),
        },
      },
    });
  }

  function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    if (data.categories.includes(name)) return alert("This category already exists.");
    savePatch({
      categories: [...data.categories, name],
      budgets: {
        ...data.budgets,
        [month]: {
          ...(data.budgets?.[month] || {}),
          [name]: 0,
        },
      },
    });
    setCategoryName("");
  }

  function createMonth() {
    const newMonth = prompt("Enter the new month, e.g. June 2026");
    if (!newMonth) return;
    const previousBudget = data.budgets?.[month] || {};
    savePatch({
      selectedMonth: newMonth,
      months: data.months.includes(newMonth) ? data.months : [...data.months, newMonth],
      expenses: { ...data.expenses, [newMonth]: data.expenses[newMonth] || [] },
      income: { ...data.income, [newMonth]: data.income[newMonth] || [] },
      budgets: { ...data.budgets, [newMonth]: data.budgets?.[newMonth] || previousBudget },
    });
  }

  function ownerAccounts(owner) {
    return data.savingsAccounts.filter((a) => a.owner === owner);
  }

  return (
    <div className="appShell">
      <style>{css}</style>

      <aside className="sideNav">
        <div className="sideLogo"><Heart size={28} /></div>
        <NavIcon icon={<Home />} label="Dashboard" active onClick={() => scrollToSection("dashboard")} />
        <NavIcon icon={<PiggyBank />} label="Savings" onClick={() => scrollToSection("savings")} />
        <NavIcon icon={<ReceiptText />} label="Expenses" onClick={() => scrollToSection("expenses")} />
        <NavIcon icon={<Wallet />} label="Income" onClick={() => scrollToSection("income")} />
        <NavIcon icon={<BarChart3 />} label="Analytics" onClick={() => scrollToSection("analytics")} />
        <NavIcon icon={<Calendar />} label="Months" onClick={() => scrollToSection("history")} />
        <NavIcon icon={<Settings />} label="Settings" onClick={() => scrollToSection("settings")} />
        <div className="sideBottom">You got this 🤎</div>
      </aside>

      <main className="mainContent">
        <header className="topHeader" id="dashboard">
          <div>
            <h1>Our 10 Year Plan</h1>
            <p>Building our future together 🤎</p>
          </div>
          <div className="headerActions">
            <select value={month} onChange={(e) => savePatch({ selectedMonth: e.target.value })}>
              {data.months.map((m) => <option key={m}>{m}</option>)}
            </select>
            <button onClick={createMonth}>+ New Month</button>
          </div>
        </header>

        <section className="goalCard">
          <div className="sectionTitle"><Target size={22} /><span>10 Year Goal Tracker</span></div>
          <div className="goalGrid">
            <div className="progressWrap">
              <div className="progressRing" style={{ background: `conic-gradient(#7a3f20 ${totals.progress * 3.6}deg, #f0e2d8 0deg)` }}>
                <div className="progressInner">
                  <strong>{totals.progress}%</strong>
                  <span>of goal</span>
                </div>
              </div>
            </div>

            <div className="goalNumbers">
              <MiniStat title="Target Amount" value={money(data.targetNetWorth)} />
              <MiniStat title="Current Amount" value={money(totals.totalCurrent)} />
              <MiniStat title="Remaining" value={money(totals.remaining)} />
              <div className="barTrack"><div className="barFill" style={{ width: `${totals.progress}%` }} /></div>
            </div>

            <div className="projectionBox">
              <h3>Progress Over 10 Years</h3>
              <div className="fakeChart">
                <div className="chartLine dark"></div>
                <div className="chartLine light"></div>
                <div className="chartLabel target">R2.83M</div>
                <div className="chartLabel actual">{money(totals.totalCurrent)}</div>
              </div>
            </div>

            <div className="goalFacts">
              <Fact icon={<Calendar />} label="Target Date" value={data.targetDate} />
              <Fact icon={<Users />} label="Monthly Saving Target" value={money(totals.monthlySavings)} />
              <Fact icon={<TrendingUp />} label="Actual Deposited This Month" value={money(actualDepositsThisMonth)} />
            </div>
          </div>
        </section>

        <section className="grid threeCols" id="income">
          <Panel title="Income / Salary" icon={<Wallet />}>
            <div className="bigNumber">{money(totals.totalIncome)}</div>
            <p className="muted">Total income for {month}</p>
            <div className="donutAndList">
              <div className="miniDonut"></div>
              <div className="smallList">
                {monthIncome.map((i) => (
                  <div key={i.id} className="incomeRow">
                    <span>{i.who} — {i.source}</span>
                    <strong>{money(i.amount)}</strong>
                    <button className="trash" onClick={() => deleteIncome(i.id)}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="formGrid oneCol">
              <select value={incomeForm.who} onChange={(e) => setIncomeForm({ ...incomeForm, who: e.target.value })}>
                <option>Ashleigh</option><option>Chade</option><option>Joint</option>
              </select>
              <input value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })} placeholder="Income source" />
              <input value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} placeholder="Amount" type="number" />
              <button onClick={addIncome}>Add Income</button>
            </div>
          </Panel>

          <div id="savings" className="anchorWrap">
            <SavingsPanel title="Her Savings" owner="Ashleigh" accounts={ownerAccounts("Ashleigh")} onDelete={deleteAccount} onAddDeposit={addDepositToAccount} onEditBalance={editAccountBalance} />
          </div>
          <SavingsPanel title="His Savings" owner="Chade" accounts={ownerAccounts("Chade")} onDelete={deleteAccount} onAddDeposit={addDepositToAccount} onEditBalance={editAccountBalance} />
        </section>

        <section className="grid twoCols" id="settings">
          <Panel title="Add New Savings Account" icon={<Landmark />}>
            <div className="formGrid twoColForm">
              <select value={accountForm.owner} onChange={(e) => setAccountForm({ ...accountForm, owner: e.target.value })}>
                <option>Ashleigh</option><option>Chade</option>
              </select>
              <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}>
                <option>TFSA</option><option>Deposit</option><option>Fixed Deposit</option><option>32-Day</option><option>Other</option>
              </select>
              <input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Account name" />
              <input value={accountForm.current} onChange={(e) => setAccountForm({ ...accountForm, current: e.target.value })} placeholder="Current balance" type="number" />
              <input value={accountForm.monthly} onChange={(e) => setAccountForm({ ...accountForm, monthly: e.target.value })} placeholder="Monthly target" type="number" />
              <button onClick={addSavingsAccount}><Plus size={16} /> Add Account</button>
            </div>
          </Panel>

          <Panel title="Budget Categories + Planned Budget" icon={<Settings />}>
            <div className="inlineForm">
              <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g. Padel, Beauty, Date Night" />
              <button onClick={addCategory}>Add</button>
            </div>
            <div className="budgetEditor">
              {data.categories.map((c) => (
                <div key={c}>
                  <span>{c}</span>
                  <input type="number" value={monthBudgets[c] || ""} onChange={(e) => updateBudget(c, e.target.value)} placeholder="Budget" />
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid twoCols" id="expenses">
          <Panel title="Expenses Overview" icon={<ReceiptText />}>
            <div className="expenseOverview">
              <div className="spentBox">
                <p>Total Spent</p>
                <h2>{money(totals.totalSpent)}</h2>
                <span>Actual manual savings deposits this month:</span>
                <strong>{money(actualDepositsThisMonth)}</strong>
                <span className="secondSpan">Remaining after income, actual deposits and spending:</span>
                <strong>{money(totals.cashRemaining)}</strong>
              </div>
              <div className="categoryBars scrollBox">
                {Object.entries(analytics.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="barTop"><span>{cat}</span><strong>{money(amount)}</strong></div>
                      <div className="barTrack small"><div className="barFill" style={{ width: `${Math.min(100, (amount / Math.max(totals.totalSpent, 1)) * 100)}%` }} /></div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="addExpenseGrid">
              <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
              <select value={expenseForm.who} onChange={(e) => setExpenseForm({ ...expenseForm, who: e.target.value })}>
                <option>Ashleigh</option><option>Chade</option><option>Joint</option>
              </select>
              <input value={expenseForm.place} onChange={(e) => setExpenseForm({ ...expenseForm, place: e.target.value })} placeholder="Place e.g. Vida e Caffe" />
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {data.categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="Amount" />
              <button onClick={addExpense}>+ Add Expense</button>
            </div>
          </Panel>

          <Panel title="Budget Planned vs Actual" icon={<BarChart3 />}>
            <div className="budgetSummaryGrid">
              <MiniStat title="Planned Budget" value={money(totals.totalBudget)} />
              <MiniStat title="Actual Spent" value={money(totals.totalSpent)} />
              <MiniStat title="Budget Left" value={money(totals.totalBudget - totals.totalSpent)} />
            </div>
            <div className="budgetVisualList scrollBox tall">
              {data.categories.map((cat) => {
                const planned = Number(monthBudgets[cat] || 0);
                const actual = Number(analytics.byCategory[cat] || 0);
                const percent = planned > 0 ? Math.min(140, (actual / planned) * 100) : actual > 0 ? 100 : 0;
                const over = planned > 0 && actual > planned;
                return (
                  <div key={cat} className="budgetLine">
                    <div className="barTop"><span>{cat}</span><strong>{money(actual)} / {money(planned)}</strong></div>
                    <div className="barTrack small"><div className={over ? "barFill danger" : "barFill"} style={{ width: `${Math.min(100, percent)}%` }} /></div>
                    {over && <p className="overText">Overspent by {money(actual - planned)}</p>}
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="grid twoCols" id="analytics">
          <Panel title="Expense Analytics" icon={<BarChart3 />}>
            <div className="analyticsGrid">
              <Insight title="Where you spend the most" text={analytics.topCategory ? `${analytics.topCategory[0]} — ${money(analytics.topCategory[1])}` : "No expenses yet"} />
              <Insight title="Who spent more this month" text={analytics.topPerson ? `${analytics.topPerson[0]} — ${money(analytics.topPerson[1])}` : "No expenses yet"} />
              <Insight title="Coffee runs ☕" text={`Chade: ${analytics.coffeeChade} entries • Ashleigh: ${analytics.coffeeAsh} entries`} />
              <Insight title="Take outs 🍔" text={`Chade: ${analytics.takeoutChade} entries • Ashleigh: ${analytics.takeoutAsh} entries`} />
            </div>
            <div className="topPlaces">
              <h4>Top Places You Spent At</h4>
              {analytics.topPlaces.length === 0 && <p className="muted">Add expenses to see places.</p>}
              {analytics.topPlaces.map(([place, amount]) => (
                <div key={place}><span>{place}</span><strong>{money(amount)}</strong></div>
              ))}
            </div>
            <div className="monthInsight">
              {analytics.topCategory
                ? `This month, your biggest category is ${analytics.topCategory[0]} at ${money(analytics.topCategory[1])}. Use this to decide where to cut back next month.`
                : "Add expenses and your monthly insight will appear here."}
            </div>
          </Panel>

          <Panel title="Top 10 Highest Expenses" icon={<ReceiptText />}>
            <div className="topExpenseList scrollBox tall">
              {analytics.topExpenses.map((e, index) => (
                <div className="topExpenseRow" key={e.id}>
                  <span>{index + 1}</span>
                  <div><strong>{e.place}</strong><p>{e.category} • {e.who} • {e.date}</p></div>
                  <b>{money(e.amount)}</b>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid twoCols" id="history">
          <Panel title="Recent Expenses" icon={<Coffee />}>
            <div className="filtersRow">
              <div className="searchBox"><Search size={16} /><input value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} placeholder="Search place, category, person..." /></div>
              <select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)}>
                <option>All</option>{data.categories.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={expensePersonFilter} onChange={(e) => setExpensePersonFilter(e.target.value)}>
                <option>All</option><option>Ashleigh</option><option>Chade</option><option>Joint</option>
              </select>
            </div>
            <p className="muted"><Filter size={14} /> Showing first 10 of {filteredExpenses.length} matching entries</p>
            <div className="tableWrap limitedTable">
              <table>
                <thead><tr><th>Date</th><th>Place</th><th>Category</th><th>Who</th><th>Amount</th><th></th></tr></thead>
                <tbody>
                  {filteredExpenses.slice(0, 10).map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td><td>{e.place}</td><td>{e.category}</td><td>{e.who}</td><td>{money(e.amount)}</td>
                      <td><button className="trash" onClick={() => deleteExpense(e.id)}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Monthly History" icon={<Calendar />}>
            <div className="tableWrap">
              <table>
                <thead><tr><th>Month</th><th>Income</th><th>Spent</th><th>Manual Deposits</th></tr></thead>
                <tbody>
                  {data.months.map((m) => {
                    const inc = (data.income[m] || []).reduce((s, i) => s + Number(i.amount || 0), 0);
                    const exp = (data.expenses[m] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
                    const dep = data.savingsAccounts.reduce((sum, account) => sum + (account.deposits || []).filter((d) => d.month === m && d.kind !== "balance-edit").reduce((s, d) => s + Number(d.amount || 0), 0), 0);
                    return <tr key={m}><td>{m}</td><td>{money(inc)}</td><td>{money(exp)}</td><td>{money(dep)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>

        <footer className="verseFooter">
          <div><BookOpen size={20} /></div>
          <p className="label">Daily Bible Verse</p>
          <p>{todaysVerse}</p>
        </footer>
      </main>
    </div>
  );
}

function NavIcon({ icon, label, active, onClick }) {
  return <button className={`navIcon ${active ? "active" : ""}`} title={label} onClick={onClick}>{icon}<small>{label}</small></button>;
}

function Panel({ title, icon, children }) {
  return (
    <section className="panel">
      <div className="panelTitle">{icon}<h2>{title}</h2></div>
      {children}
    </section>
  );
}

function MiniStat({ title, value }) {
  return <div className="miniStat"><p>{title}</p><strong>{value}</strong></div>;
}

function Fact({ icon, label, value }) {
  return <div className="fact">{icon}<div><p>{label}</p><strong>{value}</strong></div></div>;
}

function Insight({ title, text }) {
  return <div className="insight"><p>{title}</p><strong>{text}</strong></div>;
}

function SavingsPanel({ title, accounts, onDelete, onAddDeposit, onEditBalance }) {
  const total = accounts.reduce((s, a) => s + Number(a.current || 0), 0);
  const monthly = accounts.reduce((s, a) => s + Number(a.monthly || 0), 0);
  const [depositInputs, setDepositInputs] = useState({});
  const [balanceInputs, setBalanceInputs] = useState({});

  const updateInput = (accountId, value) => {
    setDepositInputs((prev) => ({ ...prev, [accountId]: value }));
  };

  const updateBalanceInput = (accountId, value) => {
    setBalanceInputs((prev) => ({ ...prev, [accountId]: value }));
  };

  const submitDeposit = (accountId) => {
    onAddDeposit(accountId, depositInputs[accountId]);
    setDepositInputs((prev) => ({ ...prev, [accountId]: "" }));
  };

  const submitBalanceEdit = (accountId, currentBalance) => {
    const value = balanceInputs[accountId];
    if (value === undefined || value === "") return alert("Enter the updated balance first.");
    onEditBalance(accountId, value);
    setBalanceInputs((prev) => ({ ...prev, [accountId]: "" }));
  };

  return (
    <Panel title={title} icon={<PiggyBank />}>
      <div className="savingSummary">
        <MiniStat title="Total Balance" value={money(total)} />
        <MiniStat title="Monthly Target" value={money(monthly)} />
      </div>
      <div className="accountsList">
        {accounts.map((a) => {
          const previous = Number(a.previous ?? a.current ?? 0);
          const current = Number(a.current || 0);
          const difference = current - previous;
          const latestMovement = (a.deposits || [])[0];

          return (
            <div className="accountRow expanded" key={a.id}>
              <div className="accountMainLine">
                <div>
                  <strong>{a.name}</strong>
                  <p>{a.type} • Monthly target: {money(a.monthly)}</p>
                </div>
                <div className="accountRight">
                  <b>{money(current)}</b>
                  <button onClick={() => onDelete(a.id)}><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="balanceCompare">
                <div>
                  <span>Previous balance</span>
                  <strong>{money(previous)}</strong>
                </div>
                <div>
                  <span>Current balance</span>
                  <strong>{money(current)}</strong>
                </div>
                <div className={difference >= 0 ? "positiveChange" : "negativeChange"}>
                  <span>Change</span>
                  <strong>{difference >= 0 ? "+" : ""}{money(difference)}</strong>
                </div>
              </div>

              <div className="depositLine">
                <input
                  type="number"
                  placeholder="Add deposit amount"
                  value={depositInputs[a.id] || ""}
                  onChange={(e) => updateInput(a.id, e.target.value)}
                />
                <button onClick={() => submitDeposit(a.id)}>Add Deposit</button>
              </div>

              <div className="depositLine balanceEditLine">
                <input
                  type="number"
                  placeholder="Edit current balance for interest"
                  value={balanceInputs[a.id] || ""}
                  onChange={(e) => updateBalanceInput(a.id, e.target.value)}
                />
                <button onClick={() => submitBalanceEdit(a.id, current)}><Pencil size={14} /> Save Balance</button>
              </div>

              {latestMovement && (
                <div className="latestDeposit">
                  Last update: {latestMovement.kind === "balance-edit" ? "Balance edit" : "Deposit"} of {money(latestMovement.amount)} on {latestMovement.date} • Balance moved from {money(latestMovement.previousBalance)} to {money(latestMovement.newBalance)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const css = `
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f3ee; color: #3b2116; }
button, input, select { font: inherit; }
button { cursor: pointer; border: none; }
select, input { border: 1px solid #dec7b8; border-radius: 16px; padding: 12px 14px; background: #fff; color: #3b2116; outline: none; width: 100%; }
select:focus, input:focus { border-color: #7a3f20; box-shadow: 0 0 0 4px rgba(122,63,32,.12); }
.appShell { min-height: 100vh; background: radial-gradient(circle at top left, #fff 0, #f8f3ee 34%, #f2e6dd 100%); }
.sideNav { position: fixed; inset: 0 auto 0 0; width: 92px; background: linear-gradient(180deg, #3a1709, #6f3518); color: #fff7f0; display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 24px 10px; z-index: 5; box-shadow: 10px 0 25px rgba(87,43,23,.12); }
.sideLogo { width: 52px; height: 52px; border-radius: 20px; display: grid; place-items: center; background: rgba(255,255,255,.08); margin-bottom: 10px; }
.navIcon { width: 70px; min-height: 58px; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #f7e7dc; opacity: .85; background: transparent; }
.navIcon svg { width: 21px; height: 21px; }
.navIcon small { font-size: 10px; font-weight: 700; }
.navIcon.active, .navIcon:hover { background: rgba(255,255,255,.13); opacity: 1; }
.sideBottom { margin-top: auto; font-size: 11px; text-align: center; background: rgba(255,255,255,.09); padding: 12px 8px; border-radius: 16px; }
.mainContent { margin-left: 92px; padding: 28px; max-width: 1500px; }
.topHeader { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; scroll-margin-top: 20px; }
.topHeader h1 { margin: 0; font-size: 30px; letter-spacing: -0.03em; }
.topHeader p { margin: 6px 0 0; color: #7a5845; }
.headerActions { display: flex; gap: 12px; align-items: center; }
.headerActions select { min-width: 210px; }
.headerActions button, .formGrid button, .inlineForm button, .addExpenseGrid button { background: #7a3f20; color: #fff; padding: 12px 18px; border-radius: 16px; font-weight: 800; box-shadow: 0 8px 18px rgba(122,63,32,.18); display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.headerActions button:hover, .formGrid button:hover, .inlineForm button:hover, .addExpenseGrid button:hover { background: #5b2b15; }
.goalCard, .panel { background: rgba(255,255,255,.92); border: 1px solid rgba(222,199,184,.75); border-radius: 28px; padding: 24px; box-shadow: 0 14px 35px rgba(92,49,28,.08); }
.goalCard { margin-bottom: 22px; }
.sectionTitle, .panelTitle { display: flex; align-items: center; gap: 10px; color: #713719; margin-bottom: 20px; }
.sectionTitle span, .panelTitle h2 { font-size: 19px; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
.goalGrid { display: grid; grid-template-columns: 220px 1fr 1.2fr 240px; gap: 24px; align-items: center; }
.progressWrap { display: flex; justify-content: center; }
.progressRing { width: 172px; height: 172px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 1px rgba(122,63,32,.08); }
.progressInner { width: 124px; height: 124px; border-radius: 50%; background: #fff; display: grid; place-items: center; align-content: center; }
.progressInner strong { font-size: 38px; }
.progressInner span { font-size: 12px; text-transform: uppercase; color: #7a5845; font-weight: 800; }
.goalNumbers { display: grid; gap: 12px; }
.miniStat { background: #f7eee8; border: 1px solid #efdfd4; border-radius: 18px; padding: 14px; }
.miniStat p { margin: 0 0 6px; color: #7a5845; font-size: 13px; }
.miniStat strong { font-size: 20px; color: #552713; }
.barTrack { height: 14px; width: 100%; background: #ecdccf; border-radius: 999px; overflow: hidden; }
.barTrack.small { height: 9px; margin-top: 5px; }
.barFill { height: 100%; background: linear-gradient(90deg, #7a3f20, #b77850); border-radius: 999px; }
.barFill.danger { background: linear-gradient(90deg, #a3341e, #d4704f); }
.projectionBox h3 { margin: 0 0 12px; font-size: 15px; color: #5b2b15; }
.fakeChart { height: 190px; border-left: 1px solid #ead9cd; border-bottom: 1px solid #ead9cd; background: repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(122,63,32,.08) 46px); border-radius: 16px; position: relative; overflow: hidden; }
.chartLine { position: absolute; height: 4px; border-radius: 999px; transform-origin: left center; left: 35px; }
.chartLine.dark { width: 78%; background: #7a3f20; top: 120px; transform: rotate(-22deg); }
.chartLine.light { width: 65%; background: #c89d80; top: 145px; transform: rotate(-12deg); }
.chartLabel { position: absolute; right: 12px; font-weight: 900; }
.chartLabel.target { top: 48px; color: #7a3f20; }
.chartLabel.actual { bottom: 45px; color: #b77850; }
.goalFacts { display: grid; gap: 12px; }
.fact { display: flex; align-items: center; gap: 12px; background: #faf3ee; border: 1px solid #efdfd4; border-radius: 18px; padding: 15px; }
.fact svg { color: #7a3f20; width: 21px; }
.fact p { margin: 0 0 3px; color: #7a5845; font-size: 12px; }
.fact strong { font-size: 15px; }
.grid { display: grid; gap: 22px; margin-bottom: 22px; scroll-margin-top: 20px; }
.anchorWrap { scroll-margin-top: 20px; }
.threeCols { grid-template-columns: 1fr 1fr 1fr; }
.twoCols { grid-template-columns: 1fr 1fr; }
.bigNumber { font-size: 35px; font-weight: 950; letter-spacing: -0.04em; color: #552713; }
.muted { color: #7a5845; font-size: 13px; margin: 4px 0 14px; display: flex; align-items: center; gap: 6px; }
.donutAndList { display: flex; gap: 16px; align-items: center; margin: 18px 0; }
.miniDonut { width: 95px; height: 95px; border-radius: 50%; background: conic-gradient(#7a3f20 50%, #be8e6b 50%); border: 16px solid #f5e6dc; }
.smallList { flex: 1; display: grid; gap: 8px; }
.smallList div { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
.incomeRow { display: grid !important; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; }
.formGrid { display: grid; gap: 10px; }
.oneCol { grid-template-columns: 1fr; }
.twoColForm { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.savingSummary, .budgetSummaryGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 14px; }
.budgetSummaryGrid { grid-template-columns: repeat(3, 1fr); }
.accountsList { display: grid; gap: 10px; }
.accountRow { display: flex; justify-content: space-between; align-items: center; gap: 14px; border: 1px solid #ead9cd; border-radius: 18px; padding: 14px; background: #fff; }
.accountRow.expanded { display: block; }
.accountMainLine { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.accountRow p { margin: 4px 0 0; color: #7a5845; font-size: 12px; }
.accountRight { display: flex; align-items: center; gap: 10px; text-align: right; }
.accountRight button, .trash { color: #7a3f20; background: #f7eee8; border-radius: 10px; padding: 8px; display: grid; place-items: center; }
.balanceCompare { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.balanceCompare div { background: #f7eee8; border: 1px solid #efdfd4; border-radius: 14px; padding: 10px; }
.balanceCompare span { display: block; color: #7a5845; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
.balanceCompare strong { font-size: 14px; color: #552713; }
.positiveChange strong { color: #2f7d32; }
.negativeChange strong { color: #b3261e; }
.depositLine { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 12px; }
.depositLine button { background: #7a3f20; color: white; padding: 11px 14px; border-radius: 14px; font-weight: 900; display: inline-flex; align-items: center; gap: 7px; }
.balanceEditLine button { background: #5f3521; }
.latestDeposit { margin-top: 10px; background: #fff8f3; border-left: 4px solid #7a3f20; border-radius: 12px; padding: 10px; color: #6d4b3a; font-size: 12px; font-weight: 700; }
.inlineForm { display: flex; gap: 10px; }
.inlineForm button { min-width: 100px; }
.budgetEditor { margin-top: 16px; display: grid; gap: 10px; max-height: 340px; overflow-y: auto; padding-right: 8px; }
.budgetEditor div { display: grid; grid-template-columns: 1fr 140px; gap: 10px; align-items: center; background: #fff8f3; border: 1px solid #ead9cd; border-radius: 14px; padding: 10px; }
.budgetEditor span { font-weight: 800; color: #5b2b15; }
.expenseOverview { display: grid; grid-template-columns: 230px 1fr; gap: 18px; }
.spentBox { background: #f7eee8; border-radius: 22px; padding: 18px; border: 1px solid #efdfd4; }
.spentBox p { margin: 0; color: #7a5845; font-size: 13px; }
.spentBox h2 { margin: 8px 0 12px; font-size: 34px; letter-spacing: -0.04em; }
.spentBox span { display: block; color: #7a5845; font-size: 13px; margin-bottom: 6px; }
.spentBox .secondSpan { margin-top: 13px; }
.spentBox strong { font-size: 18px; }
.categoryBars { display: grid; gap: 11px; align-content: start; }
.scrollBox { max-height: 280px; overflow-y: auto; padding-right: 8px; }
.scrollBox.tall { max-height: 360px; }
.barTop { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.addExpenseGrid { display: grid; grid-template-columns: 1fr 1fr 1.3fr 1fr 1fr; gap: 10px; margin-top: 18px; }
.addExpenseGrid button { grid-column: 1 / -1; }
.analyticsGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.insight { border: 1px solid #ead9cd; background: #fffaf7; border-radius: 18px; padding: 15px; }
.insight p { margin: 0 0 8px; color: #7a3f20; font-size: 13px; font-weight: 900; }
.insight strong { font-size: 16px; line-height: 1.35; }
.topPlaces { margin-top: 14px; background: #f7eee8; border-radius: 18px; padding: 15px; }
.topPlaces h4 { margin: 0 0 10px; }
.topPlaces div { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #ead9cd; }
.monthInsight { margin-top: 14px; border-left: 4px solid #7a3f20; background: #fff8f3; padding: 14px; border-radius: 16px; color: #5b2b15; font-weight: 700; }
.topExpenseList { display: grid; gap: 10px; }
.topExpenseRow { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 12px; background: #fff8f3; border: 1px solid #ead9cd; border-radius: 16px; padding: 12px; }
.topExpenseRow > span { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 10px; background: #7a3f20; color: white; font-weight: 900; }
.topExpenseRow p { margin: 4px 0 0; color: #7a5845; font-size: 12px; }
.budgetVisualList { display: grid; gap: 13px; }
.budgetLine { background: #fff8f3; border: 1px solid #ead9cd; border-radius: 16px; padding: 12px; }
.overText { color: #a3341e; font-size: 12px; font-weight: 900; margin: 6px 0 0; }
.filtersRow { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.searchBox { display: flex; align-items: center; gap: 8px; border: 1px solid #dec7b8; border-radius: 16px; padding: 0 12px; background: white; }
.searchBox input { border: none; box-shadow: none !important; padding-left: 4px; }
.tableWrap { overflow-x: auto; }
.limitedTable { max-height: 520px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #7a5845; font-size: 12px; padding: 10px; }
td { padding: 12px 10px; border-top: 1px solid #ead9cd; }
tbody tr:hover { background: #fff8f3; }
.verseFooter { background: linear-gradient(90deg, #4b230f, #7a3f20); color: #fff7f0; border-radius: 26px; padding: 22px; text-align: center; box-shadow: 0 14px 30px rgba(75,35,15,.16); margin-bottom: 20px; }
.verseFooter div { width: 38px; height: 38px; border-radius: 14px; display: grid; place-items: center; background: rgba(255,255,255,.12); margin: 0 auto 8px; }
.verseFooter .label { text-transform: uppercase; letter-spacing: .12em; color: #e4cdbd; font-size: 12px; font-weight: 900; margin: 0 0 8px; }
.verseFooter p:last-child { margin: 0; font-size: 17px; font-weight: 800; }
@media (max-width: 1100px) {
  .goalGrid { grid-template-columns: 1fr 1fr; }
  .threeCols, .twoCols { grid-template-columns: 1fr; }
  .addExpenseGrid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 760px) {
  .sideNav { display: none; }
  .mainContent { margin-left: 0; padding: 16px; }
  .topHeader { flex-direction: column; align-items: stretch; }
  .headerActions { flex-direction: column; align-items: stretch; }
  .goalGrid { grid-template-columns: 1fr; }
  .expenseOverview { grid-template-columns: 1fr; }
  .analyticsGrid, .savingSummary, .budgetSummaryGrid, .twoColForm, .addExpenseGrid, .filtersRow, .balanceCompare, .depositLine { grid-template-columns: 1fr; }
}
`;
