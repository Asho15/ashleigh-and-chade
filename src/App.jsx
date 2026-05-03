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
} from "lucide-react";

const currency = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const STORAGE_KEY = "ten-year-plan-dashboard-v1";

const bibleVerses = [
  "Proverbs 16:3 — Commit to the Lord whatever you do, and he will establish your plans.",
  "Jeremiah 29:11 — For I know the plans I have for you, declares the Lord.",
  "Proverbs 21:5 — The plans of the diligent lead to profit as surely as haste leads to poverty.",
  "Matthew 6:21 — For where your treasure is, there your heart will be also.",
  "Philippians 4:19 — And my God will meet all your needs according to the riches of his glory.",
  "Luke 14:28 — Suppose one of you wants to build a tower. Won’t you first sit down and estimate the cost?",
  "Psalm 37:5 — Commit your way to the Lord; trust in him and he will do this.",
];

const defaultData = {
  selectedMonth: "May 2026",
  months: ["May 2026"],
  income: {
    "May 2026": [
      { id: 1, who: "Ashleigh", source: "Salary", amount: 22000 },
      { id: 2, who: "Chade", source: "Salary", amount: 22000 },
    ],
  },
  categories: ["Rent", "Groceries", "Fuel", "Utilities", "Insurance", "Subscriptions", "Coffee", "Take Out", "Medical", "Other"],
  expenses: {
    "May 2026": [
      { id: 1, date: "2026-05-01", who: "Joint", place: "Rent", category: "Rent", amount: 8000 },
      { id: 2, date: "2026-05-03", who: "Ashleigh", place: "Woolworths", category: "Groceries", amount: 356 },
      { id: 3, date: "2026-05-04", who: "Chade", place: "Vida e Caffè", category: "Coffee", amount: 72 },
      { id: 4, date: "2026-05-05", who: "Ashleigh", place: "Uber Eats", category: "Take Out", amount: 210 },
      { id: 5, date: "2026-05-06", who: "Chade", place: "Shell", category: "Fuel", amount: 600 },
    ],
  },
  savingsAccounts: [
    { id: 1, owner: "Ashleigh", name: "TFSA - Allan Gray", type: "TFSA", current: 4000, monthly: 3000 },
    { id: 2, owner: "Ashleigh", name: "FNB 32-Day Account", type: "Deposit", current: 8000, monthly: 2500 },
    { id: 3, owner: "Ashleigh", name: "FNB 1-Year Fixed Deposit", type: "Deposit", current: 10000, monthly: 2500 },
    { id: 4, owner: "Chade", name: "TFSA - FNB", type: "TFSA", current: 909, monthly: 3000 },
    { id: 5, owner: "Chade", name: "FNB 32-Day Account", type: "Deposit", current: 0, monthly: 2500 },
    { id: 6, owner: "Chade", name: "FNB 1-Year Fixed Deposit", type: "Deposit", current: 0, monthly: 2500 },
  ],
  targetNetWorth: 2830000,
  monthlySavingsTarget: 16000,
};

export default function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultData;
  });

  const [expenseForm, setExpenseForm] = useState({ who: "Ashleigh", place: "", category: "Coffee", amount: "", date: new Date().toISOString().slice(0, 10) });
  const [incomeForm, setIncomeForm] = useState({ who: "Ashleigh", source: "Salary", amount: "" });
  const [accountForm, setAccountForm] = useState({ owner: "Ashleigh", name: "", type: "Deposit", current: "", monthly: "" });
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const month = data.selectedMonth;
  const monthExpenses = data.expenses[month] || [];
  const monthIncome = data.income[month] || [];

  const totals = useMemo(() => {
    const totalIncome = monthIncome.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalSpent = monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalSavingsMonthly = data.savingsAccounts.reduce((sum, acc) => sum + Number(acc.monthly || 0), 0);
    const currentNetWorth = data.savingsAccounts.reduce((sum, acc) => sum + Number(acc.current || 0), 0);
    const progress = Math.min(100, Math.round((currentNetWorth / data.targetNetWorth) * 100));
    return { totalIncome, totalSpent, totalSavingsMonthly, currentNetWorth, progress };
  }, [monthIncome, monthExpenses, data.savingsAccounts, data.targetNetWorth]);

  const expenseAnalytics = useMemo(() => {
    const byCategory = {};
    const byPlace = {};
    const byPersonPlace = {};

    monthExpenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0);
      byPlace[e.place] = (byPlace[e.place] || 0) + Number(e.amount || 0);
      const key = `${e.who}|${e.place}`;
      byPersonPlace[key] = (byPersonPlace[key] || 0) + 1;
    });

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const topPlaces = Object.entries(byPlace).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const coffeeEntries = monthExpenses.filter((e) => e.category === "Coffee");
    const takeOutEntries = monthExpenses.filter((e) => e.category === "Take Out");

    const countByWho = (items) =>
      items.reduce((acc, item) => {
        acc[item.who] = (acc[item.who] || 0) + 1;
        return acc;
      }, {});

    return {
      topCategory,
      topPlaces,
      coffeeCounts: countByWho(coffeeEntries),
      takeOutCounts: countByWho(takeOutEntries),
      byCategory,
    };
  }, [monthExpenses]);

  const todaysVerse = bibleVerses[Math.floor(Date.now() / 86400000) % bibleVerses.length];

  const updateData = (patch) => setData((prev) => ({ ...prev, ...patch }));

  const addExpense = () => {
    if (!expenseForm.place || !expenseForm.amount) return;
    const newExpense = { ...expenseForm, id: Date.now(), amount: Number(expenseForm.amount) };
    updateData({
      expenses: {
        ...data.expenses,
        [month]: [...monthExpenses, newExpense],
      },
    });
    setExpenseForm({ ...expenseForm, place: "", amount: "" });
  };

  const addIncome = () => {
    if (!incomeForm.source || !incomeForm.amount) return;
    const newIncome = { ...incomeForm, id: Date.now(), amount: Number(incomeForm.amount) };
    updateData({
      income: {
        ...data.income,
        [month]: [...monthIncome, newIncome],
      },
    });
    setIncomeForm({ ...incomeForm, amount: "" });
  };

  const addSavingsAccount = () => {
    if (!accountForm.name) return;
    updateData({
      savingsAccounts: [
        ...data.savingsAccounts,
        {
          ...accountForm,
          id: Date.now(),
          current: Number(accountForm.current || 0),
          monthly: Number(accountForm.monthly || 0),
        },
      ],
    });
    setAccountForm({ owner: "Ashleigh", name: "", type: "Deposit", current: "", monthly: "" });
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    updateData({ categories: [...data.categories, newCategory.trim()] });
    setNewCategory("");
  };

  const createNewMonth = () => {
    const name = prompt("Enter new month, e.g. June 2026");
    if (!name) return;
    updateData({
      selectedMonth: name,
      months: data.months.includes(name) ? data.months : [...data.months, name],
      expenses: { ...data.expenses, [name]: data.expenses[name] || [] },
      income: { ...data.income, [name]: data.income[name] || [] },
    });
  };

  const deleteExpense = (id) => {
    updateData({
      expenses: {
        ...data.expenses,
        [month]: monthExpenses.filter((e) => e.id !== id),
      },
    });
  };

  const deleteAccount = (id) => {
    updateData({ savingsAccounts: data.savingsAccounts.filter((a) => a.id !== id) });
  };

  const accountsByOwner = (owner) => data.savingsAccounts.filter((acc) => acc.owner === owner);

  return (
    <div className="min-h-screen bg-[#f8f3ee] text-[#3b2116]">
      <aside className="fixed left-0 top-0 hidden h-full w-24 flex-col items-center gap-6 bg-[#4b230f] py-6 text-[#f5e7dc] lg:flex">
        <Heart className="h-8 w-8" />
        {[Home, PiggyBank, Wallet, BarChart3, Calendar, Settings].map((Icon, index) => (
          <div key={index} className="rounded-2xl p-3 hover:bg-[#7a4325]">
            <Icon className="h-6 w-6" />
          </div>
        ))}
      </aside>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6 lg:ml-24">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Our 10 Year Plan</h1>
            <p className="text-[#7b5a48]">Building our future together 🤎</p>
          </div>
          <div className="flex gap-3">
            <select
              value={month}
              onChange={(e) => updateData({ selectedMonth: e.target.value })}
              className="rounded-2xl border border-[#dec7b8] bg-white px-4 py-3"
            >
              {data.months.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <button onClick={createNewMonth} className="rounded-2xl bg-[#7a3f20] px-5 py-3 font-bold text-white shadow">
              + New Month
            </button>
          </div>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <Target className="text-[#8a4b2a]" />
            <h2 className="text-xl font-black">10 Year Goal Tracker</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-[260px_1fr_220px]">
            <div className="flex items-center gap-5">
              <div className="grid h-40 w-40 place-items-center rounded-full border-[18px] border-[#8a4b2a] bg-[#f4e8df]">
                <div className="text-center">
                  <p className="text-4xl font-black">{totals.progress}%</p>
                  <p className="text-xs font-bold uppercase">complete</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Stat title="Target Amount" value={currency(data.targetNetWorth)} />
                <Stat title="Current Amount" value={currency(totals.currentNetWorth)} />
                <Stat title="Monthly Saving Target" value={currency(totals.totalSavingsMonthly)} />
              </div>
              <div className="h-5 overflow-hidden rounded-full bg-[#ead9cd]">
                <div className="h-full bg-[#7a3f20]" style={{ width: `${totals.progress}%` }} />
              </div>
              <p className="text-sm text-[#7b5a48]">Projected goal includes TFSA wealth building and house/flat deposit savings.</p>
            </div>
            <div className="rounded-2xl bg-[#f7eee8] p-5">
              <p className="text-sm text-[#7b5a48]">Target Date</p>
              <p className="text-xl font-black">May 2036</p>
              <p className="mt-4 text-sm text-[#7b5a48]">Years to go</p>
              <p className="text-xl font-black">10 years</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card title="Income / Salary">
            <p className="text-3xl font-black">{currency(totals.totalIncome)}</p>
            <p className="mb-4 text-sm text-[#7b5a48]">Total income for {month}</p>
            <div className="space-y-2">
              {monthIncome.map((i) => (
                <div key={i.id} className="flex justify-between rounded-xl bg-[#f7eee8] p-3 text-sm">
                  <span>{i.who} - {i.source}</span>
                  <b>{currency(i.amount)}</b>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2">
              <select className="input" value={incomeForm.who} onChange={(e) => setIncomeForm({ ...incomeForm, who: e.target.value })}>
                <option>Ashleigh</option><option>Chade</option><option>Joint</option>
              </select>
              <input className="input" placeholder="Income source" value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })} />
              <input className="input" placeholder="Amount" type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} />
              <button onClick={addIncome} className="button">Add Income</button>
            </div>
          </Card>

          <SavingsCard owner="Ashleigh" accounts={accountsByOwner("Ashleigh")} onDelete={deleteAccount} />
          <SavingsCard owner="Chade" accounts={accountsByOwner("Chade")} onDelete={deleteAccount} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card title="Add New Savings Account">
            <div className="grid gap-3 md:grid-cols-2">
              <select className="input" value={accountForm.owner} onChange={(e) => setAccountForm({ ...accountForm, owner: e.target.value })}>
                <option>Ashleigh</option><option>Chade</option>
              </select>
              <select className="input" value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}>
                <option>TFSA</option><option>Deposit</option><option>Fixed Deposit</option><option>32-Day</option><option>Other</option>
              </select>
              <input className="input" placeholder="Account name" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
              <input className="input" placeholder="Current balance" type="number" value={accountForm.current} onChange={(e) => setAccountForm({ ...accountForm, current: e.target.value })} />
              <input className="input" placeholder="Monthly contribution" type="number" value={accountForm.monthly} onChange={(e) => setAccountForm({ ...accountForm, monthly: e.target.value })} />
              <button onClick={addSavingsAccount} className="button flex items-center justify-center gap-2"><Plus size={18} /> Add Account</button>
            </div>
          </Card>

          <Card title="Add New Expense Category">
            <div className="flex gap-3">
              <input className="input flex-1" placeholder="e.g. Beauty, Padel, Date Night" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              <button onClick={addCategory} className="button">Add</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.categories.map((cat) => <span key={cat} className="rounded-full bg-[#f1e1d5] px-3 py-1 text-sm">{cat}</span>)}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card title="Expenses Overview">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#f7eee8] p-5">
                <p className="text-sm text-[#7b5a48]">Total Spent</p>
                <p className="text-3xl font-black">{currency(totals.totalSpent)}</p>
                <p className="mt-2 text-sm">Remaining after income, savings and spending:</p>
                <p className="text-xl font-bold">{currency(totals.totalIncome - totals.totalSpent - totals.totalSavingsMonthly)}</p>
              </div>
              <div className="space-y-2">
                {Object.entries(expenseAnalytics.byCategory).map(([cat, value]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm"><span>{cat}</span><b>{currency(value)}</b></div>
                    <div className="h-2 rounded-full bg-[#ead9cd]"><div className="h-2 rounded-full bg-[#8a4b2a]" style={{ width: `${Math.min(100, (value / Math.max(totals.totalSpent, 1)) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-5">
              <input className="input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
              <select className="input" value={expenseForm.who} onChange={(e) => setExpenseForm({ ...expenseForm, who: e.target.value })}>
                <option>Ashleigh</option><option>Chade</option><option>Joint</option>
              </select>
              <input className="input" placeholder="Place e.g. Vida" value={expenseForm.place} onChange={(e) => setExpenseForm({ ...expenseForm, place: e.target.value })} />
              <select className="input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                {data.categories.map((cat) => <option key={cat}>{cat}</option>)}
              </select>
              <input className="input" type="number" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>
            <button onClick={addExpense} className="button mt-3">Add Expense</button>
          </Card>

          <Card title="Expense Analytics">
            <div className="grid gap-4 md:grid-cols-2">
              <Insight title="Where you spend the most" value={expenseAnalytics.topCategory ? `${expenseAnalytics.topCategory[0]} - ${currency(expenseAnalytics.topCategory[1])}` : "No data yet"} />
              <Insight title="Top places" value={expenseAnalytics.topPlaces.map(([p, v]) => `${p}: ${currency(v)}`).join(" • ") || "No data yet"} />
              <Insight title="Coffee runs ☕" value={`Chade: ${expenseAnalytics.coffeeCounts.Chade || 0} entries • Ashleigh: ${expenseAnalytics.coffeeCounts.Ashleigh || 0} entries`} />
              <Insight title="Take outs 🍔" value={`Chade: ${expenseAnalytics.takeOutCounts.Chade || 0} entries • Ashleigh: ${expenseAnalytics.takeOutCounts.Ashleigh || 0} entries`} />
            </div>
            <div className="mt-4 rounded-2xl bg-[#f7eee8] p-4 text-sm">
              <b>This month’s insight:</b> {expenseAnalytics.topCategory ? `Your highest category is ${expenseAnalytics.topCategory[0]} at ${currency(expenseAnalytics.topCategory[1])}.` : "Add expenses to generate insights."}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card title="Recent Expenses">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#7b5a48]"><th>Date</th><th>Place</th><th>Category</th><th>Who</th><th>Amount</th><th></th></tr>
                </thead>
                <tbody>
                  {monthExpenses.map((e) => (
                    <tr key={e.id} className="border-t border-[#ead9cd]">
                      <td className="py-3">{e.date}</td><td>{e.place}</td><td>{e.category}</td><td>{e.who}</td><td>{currency(e.amount)}</td>
                      <td><button onClick={() => deleteExpense(e.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Monthly History">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[#7b5a48]"><th>Month</th><th>Income</th><th>Spent</th><th>Saved</th></tr></thead>
              <tbody>
                {data.months.map((m) => {
                  const income = (data.income[m] || []).reduce((s, i) => s + Number(i.amount || 0), 0);
                  const spent = (data.expenses[m] || []).reduce((s, e) => s + Number(e.amount || 0), 0);
                  return (
                    <tr key={m} className="border-t border-[#ead9cd]">
                      <td className="py-3 font-bold">{m}</td><td>{currency(income)}</td><td>{currency(spent)}</td><td>{currency(totals.totalSavingsMonthly)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>

        <footer className="rounded-3xl bg-[#4b230f] p-5 text-center text-[#f9eee7] shadow">
          <p className="text-sm uppercase tracking-wide text-[#d6b69f]">Daily Bible Verse</p>
          <p className="mt-2 text-lg font-semibold">{todaysVerse}</p>
        </footer>
      </main>

      <style>{`
        .input { border: 1px solid #dec7b8; background: white; border-radius: 14px; padding: 12px; outline: none; width: 100%; }
        .input:focus { border-color: #8a4b2a; box-shadow: 0 0 0 3px rgba(138, 75, 42, 0.15); }
        .button { background: #7a3f20; color: white; border-radius: 14px; padding: 12px 16px; font-weight: 800; }
        .button:hover { background: #5f2e17; }
      `}</style>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-[#5a2b16]">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl bg-[#f7eee8] p-4">
      <p className="text-sm text-[#7b5a48]">{title}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function Insight({ title, value }) {
  return (
    <div className="rounded-2xl border border-[#ead9cd] bg-white p-4">
      <p className="text-sm font-bold text-[#7a3f20]">{title}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function SavingsCard({ owner, accounts, onDelete }) {
  const total = accounts.reduce((sum, acc) => sum + Number(acc.current || 0), 0);
  const monthly = accounts.reduce((sum, acc) => sum + Number(acc.monthly || 0), 0);

  return (
    <Card title={owner === "Ashleigh" ? "Her Savings" : "His Savings"}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat title="Total Balance" value={currency(total)} />
        <Stat title="Monthly Contribution" value={currency(monthly)} />
      </div>
      <div className="space-y-3">
        {accounts.map((acc) => (
          <div key={acc.id} className="flex items-center justify-between rounded-2xl border border-[#ead9cd] p-4">
            <div>
              <p className="font-bold">{acc.name}</p>
              <p className="text-sm text-[#7b5a48]">{acc.type} • Monthly: {currency(acc.monthly)}</p>
            </div>
            <div className="flex items-center gap-3">
              <b>{currency(acc.current)}</b>
              <button onClick={() => onDelete(acc.id)} className="text-[#8a4b2a]"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
