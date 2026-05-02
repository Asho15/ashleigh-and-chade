import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const APP_NAME = "Ashleigh and Chade";
const COUPLE_ID = "ashleigh-and-chade";

const defaultCategories = [
  { name: "Groceries", planned: 3000, temporary: false, color: "#22c55e" },
  { name: "Eating Out", planned: 1000, temporary: false, color: "#f97316" },
  { name: "Fuel", planned: 2000, temporary: false, color: "#f59e0b" },
  { name: "Rent/Bond", planned: 6000, temporary: false, color: "#3b82f6" },
  { name: "Utilities", planned: 1500, temporary: false, color: "#8b5cf6" },
  { name: "Subscriptions", planned: 500, temporary: false, color: "#6366f1" },
  { name: "Date Night", planned: 800, temporary: false, color: "#ec4899" },
  { name: "Medical", planned: 500, temporary: false, color: "#ef4444" },
  { name: "Savings", planned: 3000, temporary: false, color: "#14b8a6" },
  { name: "Other", planned: 1200, temporary: false, color: "#64748b" },
];

const defaultSavingsAccounts = [
  { name: "Fixed Savings", currentBalance: 10000, newSavingsAdded: 0 },
  { name: "32-Day Account", currentBalance: 8000, newSavingsAdded: 0 },
  { name: "Savings Account", currentBalance: 40000, newSavingsAdded: 0 },
  { name: "Chade's Trust Fund", currentBalance: 0, newSavingsAdded: 0 },
  { name: "Ashleigh's Trust Fund", currentBalance: 0, newSavingsAdded: 0 },
  { name: "EasyEquities Investments Total", currentBalance: 3000, newSavingsAdded: 0 },
];

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-ZA", { month: "long", year: "numeric" });
}

function previousMonthKey(key) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 2, 1));
}

function nextMonthKey(key) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month, 1));
}

function daysInMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function activeDayForMonth(key) {
  const today = new Date();
  if (monthKey(today) !== key) return daysInMonth(key);
  return today.getDate();
}

function money(value) {
  return `R${Number(value || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);

  const [partnerA, setPartnerA] = useState("Ashleigh");
  const [partnerB, setPartnerB] = useState("Chade");
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [availableMonths, setAvailableMonths] = useState([monthKey()]);
  const [categories, setCategories] = useState(defaultCategories);
  const [savingsAccounts, setSavingsAccounts] = useState(defaultSavingsAccounts);
  const [expenses, setExpenses] = useState([]);
  const [previousMonthExpenses, setPreviousMonthExpenses] = useState([]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPlanned, setNewCategoryPlanned] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: "Groceries",
    amount: "",
    paidBy: "Ashleigh",
    split: "50/50",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const settingsRef = doc(db, "couples", COUPLE_ID);
    return onSnapshot(settingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPartnerA(data.partnerA || "Ashleigh");
        setPartnerB(data.partnerB || "Chade");
        setAvailableMonths(data.availableMonths?.length ? data.availableMonths : [monthKey()]);
      } else {
        await setDoc(settingsRef, {
          partnerA: "Ashleigh",
          partnerB: "Chade",
          availableMonths: [monthKey()],
          updatedAt: serverTimestamp(),
        });
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    const monthRef = doc(db, "couples", COUPLE_ID, "months", selectedMonth);
    const expensesRef = collection(db, "couples", COUPLE_ID, "months", selectedMonth, "expenses");
    const previousExpensesRef = collection(db, "couples", COUPLE_ID, "months", previousMonthKey(selectedMonth), "expenses");

    const unsubMonth = onSnapshot(monthRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCategories(data.categories?.length ? data.categories : defaultCategories);
        setSavingsAccounts(data.savingsAccounts?.length ? data.savingsAccounts : defaultSavingsAccounts);
      } else {
        await setDoc(monthRef, {
          categories: defaultCategories,
          savingsAccounts: defaultSavingsAccounts,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    const unsubExpenses = onSnapshot(query(expensesRef, orderBy("createdAt", "desc")), (snapshot) => {
      setExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    const unsubPrevious = onSnapshot(query(previousExpensesRef, orderBy("createdAt", "desc")), (snapshot) => {
      setPreviousMonthExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => {
      unsubMonth();
      unsubExpenses();
      unsubPrevious();
    };
  }, [user, selectedMonth]);

  const saveCoupleSettings = async (updates) => {
    await setDoc(
      doc(db, "couples", COUPLE_ID),
      { partnerA, partnerB, availableMonths, ...updates, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  const saveMonth = async (updates) => {
    await setDoc(
      doc(db, "couples", COUPLE_ID, "months", selectedMonth),
      { categories, savingsAccounts, ...updates, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  const handleAuth = async () => {
    setAuthError("");
    try {
      if (authMode === "login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error.message.replace("Firebase: ", ""));
    }
  };

  const addExpense = async () => {
    if (!form.description || !form.amount) return;
    await addDoc(collection(db, "couples", COUPLE_ID, "months", selectedMonth, "expenses"), {
      ...form,
      amount: Number(form.amount),
      createdBy: user.email,
      createdAt: serverTimestamp(),
    });
    setForm({ ...form, description: "", amount: "" });
  };

  const deleteExpense = async (id) => {
    await deleteDoc(doc(db, "couples", COUPLE_ID, "months", selectedMonth, "expenses", id));
  };

  const updateCategory = async (categoryName, planned) => {
    const updated = categories.map((cat) =>
      cat.name === categoryName ? { ...cat, planned: Number(planned || 0) } : cat
    );
    setCategories(updated);
    await saveMonth({ categories: updated });
  };

  const addTemporaryCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || categories.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) return;

    const colours = ["#ec4899", "#06b6d4", "#a855f7", "#f43f5e", "#84cc16"];
    const newCategory = {
      name,
      planned: Number(newCategoryPlanned || 0),
      temporary: true,
      color: colours[categories.length % colours.length],
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    setNewCategoryName("");
    setNewCategoryPlanned("");
    await saveMonth({ categories: updated });
  };

  const deleteTemporaryCategory = async (name) => {
    const updated = categories.filter((cat) => !(cat.name === name && cat.temporary));
    setCategories(updated);
    await saveMonth({ categories: updated });
  };

  const updateSavings = async (accountName, field, value) => {
    const updated = savingsAccounts.map((account) =>
      account.name === accountName ? { ...account, [field]: Number(value || 0) } : account
    );
    setSavingsAccounts(updated);
    await saveMonth({ savingsAccounts: updated });
  };

  const startNewMonth = async () => {
    const newMonth = nextMonthKey(selectedMonth);
    const recurringCategories = categories.filter((cat) => !cat.temporary);
    const resetSavings = savingsAccounts.map((account) => ({
      ...account,
      currentBalance: Number(account.currentBalance || 0) + Number(account.newSavingsAdded || 0),
      newSavingsAdded: 0,
    }));

    await setDoc(doc(db, "couples", COUPLE_ID, "months", newMonth), {
      categories: recurringCategories,
      savingsAccounts: resetSavings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const updatedMonths = Array.from(new Set([...availableMonths, newMonth])).sort();
    setAvailableMonths(updatedMonths);
    await saveCoupleSettings({ availableMonths: updatedMonths });
    setSelectedMonth(newMonth);
  };

  const totals = useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const plannedTotal = categories.reduce((sum, cat) => sum + Number(cat.planned || 0), 0);

    const byCategory = categories.map((cat) => {
      const actual = expenses
        .filter((e) => e.category === cat.name)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { ...cat, actual };
    });

    let aPaid = 0;
    let bPaid = 0;
    let aShare = 0;
    let bShare = 0;

    expenses.forEach((expense) => {
      const amount = Number(expense.amount || 0);
      if (expense.paidBy === partnerA) aPaid += amount;
      if (expense.paidBy === partnerB) bPaid += amount;

      if (expense.split === "50/50") {
        aShare += amount / 2;
        bShare += amount / 2;
      } else if (expense.split === partnerA) {
        aShare += amount;
      } else if (expense.split === partnerB) {
        bShare += amount;
      }
    });

    const currentSavings = savingsAccounts.reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);
    const newSavings = savingsAccounts.reduce((sum, account) => sum + Number(account.newSavingsAdded || 0), 0);

    return {
      totalSpent,
      plannedTotal,
      budgetLeft: plannedTotal - totalSpent,
      byCategory,
      aPaid,
      bPaid,
      aShare,
      bShare,
      aBalance: aPaid - aShare,
      bBalance: bPaid - bShare,
      currentSavings,
      newSavings,
      updatedSavings: currentSavings + newSavings,
      savingsGrowth: currentSavings > 0 ? (newSavings / currentSavings) * 100 : 0,
    };
  }, [expenses, categories, savingsAccounts, partnerA, partnerB]);

  const spendingInsights = useMemo(() => {
    const previousByCategory = categories.map((cat) => ({
      name: cat.name,
      previous: previousMonthExpenses
        .filter((e) => e.category === cat.name)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    }));

    const top3 = [...totals.byCategory]
      .filter((cat) => cat.actual > 0)
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 3);

    const top3Total = top3.reduce((sum, cat) => sum + cat.actual, 0);
    const top3Percent = totals.totalSpent > 0 ? (top3Total / totals.totalSpent) * 100 : 0;

    const comparisons = totals.byCategory
      .map((cat) => {
        const previous = previousByCategory.find((item) => item.name === cat.name)?.previous || 0;
        const change = previous > 0 ? ((cat.actual - previous) / previous) * 100 : null;
        return { ...cat, previous, change };
      })
      .filter((cat) => cat.change !== null)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const overspending = totals.byCategory
      .map((cat) => ({ ...cat, over: cat.actual - Number(cat.planned || 0) }))
      .filter((cat) => cat.over > 0)
      .sort((a, b) => b.over - a.over);

    const projection = activeDayForMonth(selectedMonth) > 0
      ? (totals.totalSpent / activeDayForMonth(selectedMonth)) * daysInMonth(selectedMonth)
      : totals.totalSpent;

    return {
      top3,
      top3Percent,
      comparisons,
      overspending,
      projection,
      projectedOver: projection - totals.plannedTotal,
    };
  }, [categories, previousMonthExpenses, totals, selectedMonth]);

  const coupleInsights = useMemo(() => {
    const totalPaid = totals.aPaid + totals.bPaid;
    const aPercent = totalPaid > 0 ? (totals.aPaid / totalPaid) * 100 : 50;
    const bPercent = totalPaid > 0 ? (totals.bPaid / totalPaid) * 100 : 50;

    const categoryByPerson = categories
      .map((cat) => {
        const a = expenses
          .filter((e) => e.category === cat.name && e.paidBy === partnerA)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const b = expenses
          .filter((e) => e.category === cat.name && e.paidBy === partnerB)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return { name: cat.name, a, b, leader: a > b ? partnerA : b > a ? partnerB : "Even" };
      })
      .filter((row) => row.a > 0 || row.b > 0);

    return { totalPaid, aPercent, bPercent, categoryByPerson };
  }, [totals, categories, expenses, partnerA, partnerB]);

  const amountOwed = Math.abs(totals.aBalance);
  const whoOwes = totals.aBalance > 0 ? partnerB : totals.bBalance > 0 ? partnerA : "Nobody";
  const whoIsOwed = totals.aBalance > 0 ? partnerA : totals.bBalance > 0 ? partnerB : "Nobody";
  const budgetPercent = totals.plannedTotal > 0 ? Math.min((totals.totalSpent / totals.plannedTotal) * 100, 100) : 0;

  if (loading) return <div className="loading">Loading {APP_NAME}...</div>;

  if (!user) {
    return (
      <>
        <AppStyles />
        <main className="auth-page">
          <section className="auth-card">
            <div className="logo">♡</div>
            <h1>{APP_NAME}</h1>
            <p>Shared spending tracker for two.</p>
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {authError && <div className="error">{authError}</div>}
            <button className="primary" onClick={handleAuth}>{authMode === "login" ? "Log in" : "Create shared account"}</button>
            <button className="link-button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Need an account? Create one" : "Already have an account? Log in"}</button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <AppStyles />
      <main className="app-shell">
        <header className="topbar">
          <div>
            <div className="brand"><span>♡</span>{APP_NAME}</div>
            <h1>Our Budget. Our Future.</h1>
            <p>Monthly spending, savings, insights, and contribution tracking.</p>
          </div>
          <div className="top-actions">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {availableMonths.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
            </select>
            <button onClick={startNewMonth}>+ Start New Month</button>
            <button onClick={() => signOut(auth)}>Log out</button>
          </div>
        </header>

        <section className="card partner-card">
          <label>Partner 1<input value={partnerA} onChange={(e) => setPartnerA(e.target.value)} onBlur={() => saveCoupleSettings({ partnerA })} /></label>
          <label>Partner 2<input value={partnerB} onChange={(e) => setPartnerB(e.target.value)} onBlur={() => saveCoupleSettings({ partnerB })} /></label>
        </section>

        <section className="stats-grid">
          <Stat label="Planned Budget" value={money(totals.plannedTotal)} helper={monthLabel(selectedMonth)} />
          <Stat label="Actual Spend" value={money(totals.totalSpent)} helper="This month" />
          <Stat label="Budget Left / Over" value={money(Math.abs(totals.budgetLeft))} helper={totals.budgetLeft >= 0 ? "Left to spend" : "Over budget"} warning={totals.budgetLeft < 0} />
          <Stat label="Current Savings Total" value={money(totals.updatedSavings)} helper="Across accounts" />
          <Stat label="New Savings Added" value={money(totals.newSavings)} helper="This month" />
          <Stat label="Settle Up" value={amountOwed === 0 ? "All square" : money(amountOwed)} helper={amountOwed === 0 ? "Nobody owes" : `${whoOwes} owes ${whoIsOwed}`} />
        </section>

        <section className="card">
          <div className="section-heading"><h2>Planned vs Actual Budget</h2><span>{money(totals.totalSpent)} / {money(totals.plannedTotal)}</span></div>
          <Progress value={budgetPercent} color="#ec4899" />
          <p className={totals.budgetLeft >= 0 ? "muted" : "danger"}>{totals.budgetLeft >= 0 ? `You have ${money(totals.budgetLeft)} left.` : `You are ${money(Math.abs(totals.budgetLeft))} over budget.`}</p>
        </section>

        <section className="two-col wide-left">
          <section className="card">
            <div className="section-heading"><div><h2>Category Budget Planner</h2><p className="muted">Edit planned amounts or add temporary categories for this month.</p></div></div>
            <div className="inline-form">
              <input placeholder="Temporary category e.g. Mom's Car" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <input placeholder="Planned amount" type="number" value={newCategoryPlanned} onChange={(e) => setNewCategoryPlanned(e.target.value)} />
              <button className="primary" onClick={addTemporaryCategory}>+ Add Category</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Category</th><th>Planned</th><th>Actual</th><th>Left / Over</th><th>Progress</th><th></th></tr></thead>
                <tbody>
                  {totals.byCategory.map((cat) => {
                    const left = Number(cat.planned || 0) - cat.actual;
                    const used = cat.planned > 0 ? Math.min((cat.actual / cat.planned) * 100, 100) : cat.actual > 0 ? 100 : 0;
                    return (
                      <tr key={cat.name}>
                        <td><Badge category={cat} /></td>
                        <td><input className="small-input" type="number" value={cat.planned || 0} onChange={(e) => updateCategory(cat.name, e.target.value)} /></td>
                        <td>{money(cat.actual)}</td>
                        <td className={left >= 0 ? "good" : "danger"}>{left >= 0 ? `${money(left)} left` : `${money(Math.abs(left))} over`}</td>
                        <td><Progress value={used} color={left >= 0 ? cat.color : "#ef4444"} /></td>
                        <td>{cat.temporary && <button className="icon-button" onClick={() => deleteTemporaryCategory(cat.name)}>🗑</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>Add Expense</h2>
            <div className="form-grid">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((cat) => <option key={cat.name}>{cat.name}</option>)}</select>
              <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}><option>{partnerA}</option><option>{partnerB}</option></select>
              <select value={form.split} onChange={(e) => setForm({ ...form, split: e.target.value })}><option>50/50</option><option>{partnerA}</option><option>{partnerB}</option></select>
              <button
                type="button"
                className="primary"
                onClick={addExpense}
>
  Add Expense
</button>
            </div>
          </section>
        </section>

        <section className="two-col wide-left">
          <section className="card">
            <h2>Savings & Investments</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Account</th><th>Current Balance</th><th>New Savings Added</th><th>New Total</th></tr></thead>
                <tbody>
                  {savingsAccounts.map((account) => (
                    <tr key={account.name}>
                      <td>{account.name}</td>
                      <td><input className="small-input" type="number" value={account.currentBalance || 0} onChange={(e) => updateSavings(account.name, "currentBalance", e.target.value)} /></td>
                      <td><input className="small-input" type="number" value={account.newSavingsAdded || 0} onChange={(e) => updateSavings(account.name, "newSavingsAdded", e.target.value)} /></td>
                      <td className="good">{money(Number(account.currentBalance || 0) + Number(account.newSavingsAdded || 0))}</td>
                    </tr>
                  ))}
                  <tr className="total-row"><td>TOTAL</td><td>{money(totals.currentSavings)}</td><td>{money(totals.newSavings)}</td><td>{money(totals.updatedSavings)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="card tile-grid">
            <h2>Savings Comparison</h2>
            <MiniTile label="Current Savings" value={money(totals.currentSavings)} />
            <MiniTile label="New Savings Added" value={money(totals.newSavings)} />
            <MiniTile label="Updated Total" value={money(totals.updatedSavings)} />
            <MiniTile label="Growth This Month" value={`${totals.savingsGrowth.toFixed(2)}%`} />
          </section>
        </section>

        <section className="two-col">
          <section className="card">
            <h2>Monthly Spending Insights</h2>
            <Insight text={spendingInsights.comparisons[0] ? `You spent ${Math.abs(spendingInsights.comparisons[0].change).toFixed(0)}% ${spendingInsights.comparisons[0].change >= 0 ? "more" : "less"} on ${spendingInsights.comparisons[0].name} than last month.` : "Add another month to compare spending trends."} />
            <Insight text={`Your top 3 categories make up ${spendingInsights.top3Percent.toFixed(0)}% of your spending.`} />
            <Insight text={spendingInsights.projectedOver > 0 ? `At your current pace, you may overspend by ${money(spendingInsights.projectedOver)}.` : `At your current pace, you should stay within budget.`} />
            {spendingInsights.overspending[0] && <Insight text={`${spendingInsights.overspending[0].name} is over budget by ${money(spendingInsights.overspending[0].over)}.`} warning />}
            <h3>Top 3 categories</h3>
            {spendingInsights.top3.length ? spendingInsights.top3.map((cat, index) => <Row key={cat.name} label={`${index + 1}. ${cat.name}`} value={money(cat.actual)} />) : <p className="muted">No spending yet.</p>}
          </section>

          <section className="card">
            <h2>Couple Insights</h2>
            <div className="split-bar"><div style={{ width: `${coupleInsights.aPercent}%`, background: "#ec4899" }} /><div style={{ width: `${coupleInsights.bPercent}%`, background: "#3b82f6" }} /></div>
            <div className="split-labels"><span>{partnerA}: {percent(coupleInsights.aPercent)}</span><span>{partnerB}: {percent(coupleInsights.bPercent)}</span></div>
            <Insight text={`${totals.aPaid >= totals.bPaid ? partnerA : partnerB} paid more this month.`} />
            <Insight text={`${partnerA} paid ${money(totals.aPaid)} and ${partnerB} paid ${money(totals.bPaid)}.`} />
            {coupleInsights.categoryByPerson[0] && <Insight text={`${coupleInsights.categoryByPerson[0].leader} spends more on ${coupleInsights.categoryByPerson[0].name}.`} />}
            <div className="table-wrap">
              <table><thead><tr><th>Category</th><th>{partnerA}</th><th>{partnerB}</th><th>More</th></tr></thead><tbody>{coupleInsights.categoryByPerson.map((row) => <tr key={row.name}><td>{row.name}</td><td>{money(row.a)}</td><td>{money(row.b)}</td><td>{row.leader}</td></tr>)}</tbody></table>
            </div>
          </section>
        </section>

        <section className="two-col wide-left">
          <section className="card">
            <h2>Recent Expenses</h2>
            <div className="expense-list">
              {expenses.length ? expenses.map((expense) => {
                const cat = categories.find((item) => item.name === expense.category) || { name: expense.category, color: "#64748b" };
                return (
                  <div className="expense-item" key={expense.id}>
                    <div><strong>{expense.description}</strong><p>{expense.date} • Paid by {expense.paidBy} • Split {expense.split}</p><Badge category={cat} /></div>
                    <div className="expense-amount"><strong>{money(expense.amount)}</strong><button onClick={() => deleteExpense(expense.id)}>🗑</button></div>
                  </div>
                );
              }) : <p className="muted">No expenses for this month yet.</p>}
            </div>
          </section>

          <section className="card">
            <h2>Couple Summary</h2>
            <Row label={`${partnerA} paid`} value={money(totals.aPaid)} />
            <Row label={`${partnerB} paid`} value={money(totals.bPaid)} />
            <Row label={`${partnerA}'s fair share`} value={money(totals.aShare)} />
            <Row label={`${partnerB}'s fair share`} value={money(totals.bShare)} />
            <div className="settlement">{amountOwed === 0 ? "You are even 💕" : `${whoOwes} owes ${whoIsOwed} ${money(amountOwed)}`}</div>
          </section>
        </section>

        <section className="two-col">
          <ChartCard title="Actual Spending by Category" data={totals.byCategory.filter((cat) => cat.actual > 0).map((cat) => ({ name: cat.name, value: cat.actual, color: cat.color }))} total={totals.totalSpent} />
          <ChartCard title="Savings Split" data={savingsAccounts.map((account, index) => ({ name: account.name, value: Number(account.currentBalance || 0) + Number(account.newSavingsAdded || 0), color: ["#22c55e", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"][index] })).filter((item) => item.value > 0)} total={totals.updatedSavings} />
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, helper, warning }) {
  return <section className={`card stat ${warning ? "warning-card" : ""}`}><p>{label}</p><h2>{value}</h2><span>{helper}</span></section>;
}

function MiniTile({ label, value }) {
  return <div className="mini-tile"><p>{label}</p><h3>{value}</h3></div>;
}

function Row({ label, value }) {
  return <div className="row"><span>{label}</span><strong>{value}</strong></div>;
}

function Insight({ text, warning }) {
  return <div className={`insight ${warning ? "warning" : ""}`}>{warning ? "⚠️" : "✨"} {text}</div>;
}

function Badge({ category }) {
  return <span className="badge" style={{ background: `${category.color}22`, color: category.color, borderColor: `${category.color}55` }}><span style={{ background: category.color }} />{category.name}{category.temporary ? " • This month" : ""}</span>;
}

function Progress({ value, color }) {
  return <div className="progress"><div style={{ width: `${Math.min(value, 100)}%`, background: color }} /></div>;
}

function ChartCard({ title, data, total }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {data.length ? data.map((item) => <div key={item.name} className="chart-row"><span style={{ background: item.color }} /><p>{item.name}</p><strong>{money(item.value)} ({total > 0 ? percent((item.value / total) * 100) : "0%"})</strong></div>) : <p className="muted">No data yet.</p>}
    </section>
  );
}

function AppStyles() {
  return <style>{`
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #111827; background: linear-gradient(135deg, #fff1f2, #ffffff, #eff6ff); }
    input, select, button { font: inherit; }
    input, select { width: 100%; border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px 14px; background: white; outline: none; }
    input:focus, select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px #8b5cf622; }
    button { border: 1px solid #e5e7eb; background: white; border-radius: 14px; padding: 12px 16px; cursor: pointer; font-weight: 700; }
    button:hover { transform: translateY(-1px); }
    .primary { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; border: none; }
    .link-button { border: none; color: #6b7280; background: transparent; }
    .loading, .auth-page { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .auth-card { width: min(430px, 100%); background: white; border: 1px solid #f3dbe8; border-radius: 28px; padding: 28px; box-shadow: 0 20px 60px #00000010; display: grid; gap: 14px; text-align: center; }
    .logo { width: 56px; height: 56px; border-radius: 50%; background: #ffe4e6; color: #ec4899; margin: auto; display: grid; place-items: center; font-size: 34px; }
    .error { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 14px; font-size: 14px; }
    .app-shell { max-width: 1400px; margin: auto; padding: 24px; display: grid; gap: 18px; }
    .topbar { display: flex; justify-content: space-between; gap: 18px; align-items: center; }
    .brand { color: #7c3aed; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .brand span { font-size: 28px; }
    h1 { font-size: clamp(30px, 5vw, 54px); margin: 8px 0 4px; letter-spacing: -0.04em; }
    h2 { margin: 0 0 14px; font-size: 21px; }
    h3 { margin: 18px 0 8px; }
    p { margin: 0; }
    .muted { color: #64748b; }
    .danger { color: #ef4444; font-weight: 700; }
    .good { color: #059669; font-weight: 700; }
    .top-actions { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; min-width: min(620px, 100%); }
    .card { background: rgba(255,255,255,0.9); border: 1px solid #e5e7eb; border-radius: 24px; padding: 20px; box-shadow: 0 8px 30px #00000008; }
    .partner-card { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    label { color: #64748b; font-size: 12px; display: grid; gap: 6px; }
    .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
    .stat p { color: #64748b; font-size: 13px; font-weight: 700; }
    .stat h2 { font-size: 27px; margin: 12px 0 4px; }
    .stat span { color: #94a3b8; font-size: 12px; }
    .warning-card { background: #fff7ed; border-color: #fed7aa; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
    .wide-left { grid-template-columns: 1.45fr 1fr; }
    .section-heading { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 12px; }
    .inline-form { display: grid; grid-template-columns: 1fr 160px auto; gap: 10px; margin: 14px 0; }
    .form-grid { display: grid; gap: 12px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 650px; }
    th { text-align: left; color: #64748b; font-size: 13px; padding: 12px; border-bottom: 1px solid #e5e7eb; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .small-input { max-width: 130px; padding: 9px 10px; }
    .total-row { font-weight: 800; background: #fafafa; }
    .badge { display: inline-flex; align-items: center; gap: 7px; border: 1px solid; padding: 7px 10px; border-radius: 999px; font-weight: 800; font-size: 12px; white-space: nowrap; }
    .badge span { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .progress { height: 12px; background: #e5e7eb; border-radius: 999px; overflow: hidden; min-width: 120px; }
    .progress div { height: 100%; border-radius: 999px; }
    .icon-button { padding: 8px; border: none; background: transparent; }
    .tile-grid { display: grid; gap: 12px; }
    .mini-tile { background: #f8fafc; border-radius: 18px; padding: 16px; }
    .mini-tile p { color: #64748b; font-size: 13px; }
    .mini-tile h3 { color: #7c3aed; font-size: 22px; margin: 4px 0 0; }
    .insight { background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 12px; margin-bottom: 10px; color: #334155; }
    .insight.warning { background: #fff7ed; border-color: #fed7aa; }
    .split-bar { height: 18px; display: flex; border-radius: 999px; overflow: hidden; background: #e5e7eb; margin-bottom: 8px; }
    .split-labels { display: flex; justify-content: space-between; color: #64748b; font-size: 13px; margin-bottom: 14px; }
    .row { display: flex; justify-content: space-between; gap: 12px; background: #f8fafc; border-radius: 14px; padding: 10px 12px; margin-bottom: 8px; }
    .expense-list { display: grid; gap: 12px; }
    .expense-item { display: flex; justify-content: space-between; gap: 14px; border: 1px solid #e5e7eb; border-radius: 18px; padding: 14px; background: white; }
    .expense-item p { color: #64748b; margin: 4px 0 8px; font-size: 13px; }
    .expense-amount { display: grid; justify-items: end; gap: 8px; }
    .expense-amount button { border: none; padding: 4px; color: #ef4444; }
    .settlement { margin-top: 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 18px; padding: 16px; font-weight: 800; }
    .chart-row { display: grid; grid-template-columns: 12px 1fr auto; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .chart-row span { width: 12px; height: 12px; border-radius: 999px; }
    .chart-row p { color: #334155; }
    @media (max-width: 1050px) { .topbar, .two-col, .wide-left { grid-template-columns: 1fr; display: grid; } .stats-grid { grid-template-columns: repeat(2, 1fr); } .top-actions { grid-template-columns: 1fr; min-width: 0; } }
    @media (max-width: 650px) { .app-shell { padding: 12px; } .stats-grid, .partner-card, .inline-form { grid-template-columns: 1fr; } .card { padding: 16px; border-radius: 20px; } .section-heading { align-items: flex-start; flex-direction: column; } .expense-item { flex-direction: column; } .expense-amount { justify-items: start; } }
  `}</style>;
}
