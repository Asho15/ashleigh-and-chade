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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trash2,
  Wallet,
  Heart,
  Plus,
  TrendingUp,
  PiggyBank,
  LogOut,
  ClipboardList,
  CalendarDays,
  BarChart3,
  Users,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

const categoryColours = {
  Groceries: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Eating Out": "bg-orange-100 text-orange-700 border-orange-200",
  Fuel: "bg-amber-100 text-amber-700 border-amber-200",
  "Rent/Bond": "bg-blue-100 text-blue-700 border-blue-200",
  Utilities: "bg-violet-100 text-violet-700 border-violet-200",
  Subscriptions: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Date Night": "bg-pink-100 text-pink-700 border-pink-200",
  Medical: "bg-red-100 text-red-700 border-red-200",
  Savings: "bg-teal-100 text-teal-700 border-teal-200",
  Other: "bg-slate-100 text-slate-700 border-slate-200",
};

const progressColours = {
  Groceries: "bg-emerald-400",
  "Eating Out": "bg-orange-400",
  Fuel: "bg-amber-400",
  "Rent/Bond": "bg-blue-400",
  Utilities: "bg-violet-400",
  Subscriptions: "bg-indigo-400",
  "Date Night": "bg-pink-400",
  Medical: "bg-red-400",
  Savings: "bg-teal-400",
  Other: "bg-slate-400",
};

const defaultCategories = [
  { name: "Groceries", planned: 3000, temporary: false },
  { name: "Eating Out", planned: 1000, temporary: false },
  { name: "Fuel", planned: 2000, temporary: false },
  { name: "Rent/Bond", planned: 6000, temporary: false },
  { name: "Utilities", planned: 1500, temporary: false },
  { name: "Subscriptions", planned: 500, temporary: false },
  { name: "Date Night", planned: 800, temporary: false },
  { name: "Medical", planned: 500, temporary: false },
  { name: "Savings", planned: 3000, temporary: false },
  { name: "Other", planned: 1200, temporary: false },
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
  const date = new Date(year, month - 2, 1);
  return monthKey(date);
}

function nextMonthKey(key) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month, 1);
  return monthKey(date);
}

function daysInSelectedMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function todayDayForMonth(key) {
  const now = new Date();
  const currentKey = monthKey(now);
  if (key !== currentKey) return daysInSelectedMonth(key);
  return now.getDate();
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, "couples", COUPLE_ID);
    const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPartnerA(data.partnerA || "Ashleigh");
        setPartnerB(data.partnerB || "Chade");
        setAvailableMonths(data.availableMonths?.length ? data.availableMonths : [monthKey()]);
      } else {
        setDoc(settingsRef, {
          partnerA: "Ashleigh",
          partnerB: "Chade",
          availableMonths: [monthKey()],
          updatedAt: serverTimestamp(),
        });
      }
    });
    return unsubSettings;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const monthRef = doc(db, "couples", COUPLE_ID, "months", selectedMonth);
    const previousRef = collection(db, "couples", COUPLE_ID, "months", previousMonthKey(selectedMonth), "expenses");
    const expensesRef = collection(db, "couples", COUPLE_ID, "months", selectedMonth, "expenses");
    const expensesQuery = query(expensesRef, orderBy("createdAt", "desc"));
    const previousQuery = query(previousRef, orderBy("createdAt", "desc"));

    const unsubMonth = onSnapshot(monthRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCategories(data.categories?.length ? data.categories : defaultCategories);
        setSavingsAccounts(data.savingsAccounts?.length ? data.savingsAccounts : defaultSavingsAccounts);
      } else {
        setDoc(monthRef, {
          categories: defaultCategories,
          savingsAccounts: defaultSavingsAccounts,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    const unsubPrevious = onSnapshot(previousQuery, (snapshot) => {
      setPreviousMonthExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return () => {
      unsubMonth();
      unsubExpenses();
      unsubPrevious();
    };
  }, [user, selectedMonth]);

  const saveCoupleSettings = async (updates) => {
    await setDoc(doc(db, "couples", COUPLE_ID), { partnerA, partnerB, availableMonths, ...updates, updatedAt: serverTimestamp() }, { merge: true });
  };

  const saveMonth = async (updates) => {
    await setDoc(doc(db, "couples", COUPLE_ID, "months", selectedMonth), { categories, savingsAccounts, ...updates, updatedAt: serverTimestamp() }, { merge: true });
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

  const updateCategoryPlanned = async (categoryName, planned) => {
    const updated = categories.map((cat) => (cat.name === categoryName ? { ...cat, planned: Number(planned || 0) } : cat));
    setCategories(updated);
    await saveMonth({ categories: updated });
  };

  const addTemporaryCategory = async () => {
    if (!newCategoryName.trim()) return;
    const exists = categories.some((cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (exists) return;
    const newCategory = { name: newCategoryName.trim(), planned: Number(newCategoryPlanned || 0), temporary: true };
    const updated = [...categories, newCategory];
    setCategories(updated);
    setNewCategoryName("");
    setNewCategoryPlanned("");
    await saveMonth({ categories: updated });
  };

  const deleteTemporaryCategory = async (name) => {
    const updated = categories.filter((cat) => cat.name !== name || !cat.temporary);
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

  const categoryNames = categories.map((cat) => cat.name);

  const totals = useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const plannedTotal = categories.reduce((sum, cat) => sum + Number(cat.planned || 0), 0);
    const byCategory = categories
      .map((cat) => ({
        name: cat.name,
        value: expenses.filter((e) => e.category === cat.name).reduce((sum, e) => sum + Number(e.amount || 0), 0),
        planned: Number(cat.planned || 0),
      }))
      .filter((item) => item.value > 0);

    let aPaid = 0;
    let bPaid = 0;
    let aShare = 0;
    let bShare = 0;

    expenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      if (e.paidBy === partnerA) aPaid += amount;
      if (e.paidBy === partnerB) bPaid += amount;
      if (e.split === "50/50") {
        aShare += amount / 2;
        bShare += amount / 2;
      } else if (e.split === partnerA) aShare += amount;
      else if (e.split === partnerB) bShare += amount;
    });

    const currentSavings = savingsAccounts.reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);
    const newSavings = savingsAccounts.reduce((sum, account) => sum + Number(account.newSavingsAdded || 0), 0);
    const updatedSavings = currentSavings + newSavings;

    return {
      totalSpent,
      plannedTotal,
      byCategory,
      budgetLeft: plannedTotal - totalSpent,
      aPaid,
      bPaid,
      aShare,
      bShare,
      aBalance: aPaid - aShare,
      bBalance: bPaid - bShare,
      currentSavings,
      newSavings,
      updatedSavings,
      savingsGrowth: currentSavings > 0 ? (newSavings / currentSavings) * 100 : 0,
    };
  }, [expenses, categories, partnerA, partnerB, savingsAccounts]);

  const insights = useMemo(() => {
    const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const currentTotal = totals.totalSpent;
    const daysInMonth = daysInSelectedMonth(selectedMonth);
    const dayToday = todayDayForMonth(selectedMonth);
    const projectedSpend = dayToday > 0 ? (currentTotal / dayToday) * daysInMonth : currentTotal;
    const projectedOver = projectedSpend - totals.plannedTotal;

    const topCategories = [...totals.byCategory].sort((a, b) => b.value - a.value).slice(0, 3);
    const topCategoriesTotal = topCategories.reduce((sum, cat) => sum + cat.value, 0);
    const topCategoriesPercent = currentTotal > 0 ? (topCategoriesTotal / currentTotal) * 100 : 0;

    const previousByCategory = categories.map((cat) => ({
      name: cat.name,
      value: previousMonthExpenses.filter((e) => e.category === cat.name).reduce((sum, e) => sum + Number(e.amount || 0), 0),
    }));

    const categoryComparisons = totals.byCategory
      .map((cat) => {
        const prev = previousByCategory.find((p) => p.name === cat.name)?.value || 0;
        const change = prev > 0 ? ((cat.value - prev) / prev) * 100 : null;
        return { ...cat, previous: prev, change };
      })
      .filter((cat) => cat.change !== null)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const overspending = categories
      .map((cat) => {
        const actual = expenses.filter((e) => e.category === cat.name).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return { ...cat, actual, over: actual - Number(cat.planned || 0) };
      })
      .filter((cat) => cat.over > 0)
      .sort((a, b) => b.over - a.over);

    return {
      previousTotal,
      projectedSpend,
      projectedOver,
      topCategories,
      topCategoriesPercent,
      categoryComparisons,
      overspending,
    };
  }, [expenses, previousMonthExpenses, totals, categories, selectedMonth]);

  const coupleInsights = useMemo(() => {
    const totalPaid = totals.aPaid + totals.bPaid;
    const aPercent = totalPaid > 0 ? (totals.aPaid / totalPaid) * 100 : 50;
    const bPercent = totalPaid > 0 ? (totals.bPaid / totalPaid) * 100 : 50;

    const categoryByPerson = categories.map((cat) => {
      const a = expenses.filter((e) => e.category === cat.name && e.paidBy === partnerA).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const b = expenses.filter((e) => e.category === cat.name && e.paidBy === partnerB).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { name: cat.name, [partnerA]: a, [partnerB]: b, leader: a > b ? partnerA : b > a ? partnerB : "Even" };
    }).filter((row) => row[partnerA] > 0 || row[partnerB] > 0);

    return { aPercent, bPercent, categoryByPerson };
  }, [totals, categories, expenses, partnerA, partnerB]);

  const amountOwed = Math.abs(totals.aBalance);
  const whoOwes = totals.aBalance > 0 ? partnerB : totals.bBalance > 0 ? partnerA : "Nobody";
  const whoIsOwed = totals.aBalance > 0 ? partnerA : totals.bBalance > 0 ? partnerB : "Nobody";
  const budgetPercent = totals.plannedTotal > 0 ? Math.min((totals.totalSpent / totals.plannedTotal) * 100, 100) : 0;

  if (loading) return <div className="min-h-screen grid place-items-center bg-rose-50 text-slate-600">Loading {APP_NAME}...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 p-4 grid place-items-center">
        <Card className="w-full max-w-md rounded-3xl shadow-lg border-rose-100">
          <CardContent className="p-6 space-y-5">
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-rose-100 grid place-items-center text-rose-500 mb-3">
                <Heart className="h-7 w-7 fill-current" />
              </div>
              <h1 className="text-3xl font-bold">{APP_NAME}</h1>
              <p className="text-slate-500 mt-2">Shared spending tracker for two.</p>
            </div>
            <div className="space-y-3">
              <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl h-12" />
              <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl h-12" />
              {authError && <p className="text-sm text-red-500">{authError}</p>}
              <Button onClick={handleAuth} className="w-full rounded-xl h-12">{authMode === "login" ? "Log in" : "Create shared account"}</Button>
              <button className="w-full text-sm text-slate-500" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
                {authMode === "login" ? "Need an account? Create one" : "Already have an account? Log in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 p-3 md:p-8 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-5">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-semibold"><Heart className="h-5 w-5 fill-current" /> {APP_NAME}</div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-2">Our Budget. Our Future.</h1>
            <p className="text-slate-500 mt-2 max-w-2xl">Monthly budget, savings, spending insights, and couple contribution tracking.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="rounded-xl bg-white"><CalendarDays className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>{availableMonths.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="rounded-xl gap-2" onClick={startNewMonth}><Plus className="h-4 w-4" /> Start New Month</Button>
            <Button variant="outline" className="rounded-xl gap-2" onClick={() => signOut(auth)}><LogOut className="h-4 w-4" /> Log out</Button>
          </div>
        </motion.div>

        <Card className="rounded-2xl shadow-sm border-rose-100">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-500">Partner 1</label><Input value={partnerA} onChange={(e) => setPartnerA(e.target.value)} onBlur={() => saveCoupleSettings({ partnerA })} className="rounded-xl" /></div>
            <div><label className="text-xs text-slate-500">Partner 2</label><Input value={partnerB} onChange={(e) => setPartnerB(e.target.value)} onBlur={() => saveCoupleSettings({ partnerB })} className="rounded-xl" /></div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard icon={<ClipboardList />} label="Planned Budget" value={`R${totals.plannedTotal.toLocaleString()}`} helper={monthLabel(selectedMonth)} />
          <StatCard icon={<Wallet />} label="Actual Spend" value={`R${totals.totalSpent.toLocaleString()}`} helper="This month" />
          <StatCard icon={<TrendingUp />} label="Budget Left / Over" value={`R${Math.abs(totals.budgetLeft).toLocaleString()}`} helper={totals.budgetLeft >= 0 ? "Left to spend" : "Over budget"} />
          <StatCard icon={<PiggyBank />} label="Current Savings" value={`R${totals.updatedSavings.toLocaleString()}`} helper="Across accounts" />
          <StatCard icon={<Sparkles />} label="New Savings Added" value={`R${totals.newSavings.toLocaleString()}`} helper="This month" />
          <StatCard icon={<Heart />} label="Settle Up" value={amountOwed === 0 ? "All square" : `R${amountOwed.toFixed(0)}`} helper={amountOwed === 0 ? "Nobody owes" : `${whoOwes} owes ${whoIsOwed}`} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Planned vs Actual Budget</h2><span className="text-sm text-slate-500">R{totals.totalSpent.toLocaleString()} / R{totals.plannedTotal.toLocaleString()}</span></div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-rose-300 rounded-full transition-all" style={{ width: `${budgetPercent}%` }} /></div>
            <p className={`text-sm ${totals.budgetLeft >= 0 ? "text-slate-500" : "text-red-500"}`}>{totals.budgetLeft >= 0 ? `You have R${totals.budgetLeft.toLocaleString()} left.` : `You are R${Math.abs(totals.budgetLeft).toLocaleString()} over budget.`}</p>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div><h2 className="text-xl font-bold">Category Budget Planner</h2><p className="text-sm text-slate-500">Edit planned amounts. Add temporary categories for this month only.</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input placeholder="New category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="rounded-xl" />
                  <Input placeholder="Planned R" type="number" value={newCategoryPlanned} onChange={(e) => setNewCategoryPlanned(e.target.value)} className="rounded-xl" />
                  <Button onClick={addTemporaryCategory} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Category</th><th>Planned</th><th>Actual</th><th>Left / Over</th><th>Progress</th><th></th></tr></thead>
                  <tbody>
                    {categories.map((cat) => {
                      const actual = expenses.filter((e) => e.category === cat.name).reduce((sum, e) => sum + Number(e.amount || 0), 0);
                      const left = Number(cat.planned || 0) - actual;
                      const percent = cat.planned > 0 ? Math.min((actual / cat.planned) * 100, 100) : actual > 0 ? 100 : 0;
                      return (
                        <tr key={cat.name} className="border-b last:border-0">
                          <td className="py-3"><CategoryBadge name={cat.name} temporary={cat.temporary} /></td>
                          <td><Input type="number" value={cat.planned || 0} onChange={(e) => updateCategoryPlanned(cat.name, e.target.value)} className="rounded-xl w-28" /></td>
                          <td>R{actual.toLocaleString()}</td>
                          <td className={left >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>{left >= 0 ? `R${left.toLocaleString()} left` : `R${Math.abs(left).toLocaleString()} over`}</td>
                          <td><div className="h-3 bg-slate-100 rounded-full overflow-hidden min-w-[120px]"><div className={`h-full rounded-full ${left >= 0 ? progressColours[cat.name] || "bg-purple-400" : "bg-red-400"}`} style={{ width: `${percent}%` }} /></div></td>
                          <td>{cat.temporary && <Button variant="ghost" size="icon" onClick={() => deleteTemporaryCategory(cat.name)}><Trash2 className="h-4 w-4" /></Button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-xl font-bold">Add Expense</h2>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{categoryNames.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
              <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-xl" />
              <Select value={form.paidBy} onValueChange={(value) => setForm({ ...form, paidBy: value })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={partnerA}>{partnerA}</SelectItem><SelectItem value={partnerB}>{partnerB}</SelectItem></SelectContent></Select>
              <Select value={form.split} onValueChange={(value) => setForm({ ...form, split: value })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="50/50">50/50</SelectItem><SelectItem value={partnerA}>{partnerA} only</SelectItem><SelectItem value={partnerB}>{partnerB} only</SelectItem></SelectContent></Select>
              <Button onClick={addExpense} className="w-full rounded-xl gap-2"><Plus className="h-4 w-4" /> Add Expense</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="p-5">
              <h2 className="text-xl font-bold mb-4">Savings & Investments</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Account</th><th>Current Balance</th><th>New Savings Added</th><th>New Total</th></tr></thead>
                  <tbody>
                    {savingsAccounts.map((account) => (
                      <tr key={account.name} className="border-b last:border-0">
                        <td className="py-3 font-medium">{account.name}</td>
                        <td><Input type="number" value={account.currentBalance || 0} onChange={(e) => updateSavings(account.name, "currentBalance", e.target.value)} className="rounded-xl w-32" /></td>
                        <td><Input type="number" value={account.newSavingsAdded || 0} onChange={(e) => updateSavings(account.name, "newSavingsAdded", e.target.value)} className="rounded-xl w-32" /></td>
                        <td className="font-semibold text-emerald-600">R{(Number(account.currentBalance || 0) + Number(account.newSavingsAdded || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="font-bold"><td className="py-3">TOTAL</td><td>R{totals.currentSavings.toLocaleString()}</td><td>R{totals.newSavings.toLocaleString()}</td><td className="text-emerald-600">R{totals.updatedSavings.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h2 className="text-xl font-bold">Savings Comparison</h2>
              <SummaryTile label="Current Savings" value={`R${totals.currentSavings.toLocaleString()}`} />
              <SummaryTile label="New Savings Added" value={`R${totals.newSavings.toLocaleString()}`} />
              <SummaryTile label="Updated Total" value={`R${totals.updatedSavings.toLocaleString()}`} />
              <SummaryTile label="Growth This Month" value={`${totals.savingsGrowth.toFixed(2)}%`} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <InsightsCard insights={insights} totals={totals} selectedMonth={selectedMonth} />
          <CoupleInsightsCard coupleInsights={coupleInsights} totals={totals} partnerA={partnerA} partnerB={partnerB} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="p-5">
              <h2 className="text-xl font-bold mb-4">Recent Expenses</h2>
              <div className="space-y-3 md:hidden">
                {expenses.map((expense) => <ExpenseCard key={expense.id} expense={expense} onDelete={deleteExpense} />)}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b"><th className="py-3">Date</th><th>Description</th><th>Category</th><th>Paid by</th><th>Split</th><th className="text-right">Amount</th><th></th></tr></thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b last:border-0">
                        <td className="py-3 whitespace-nowrap">{expense.date}</td><td className="font-medium">{expense.description}</td><td><CategoryBadge name={expense.category} /></td><td>{expense.paidBy}</td><td>{expense.split}</td><td className="text-right font-semibold">R{Number(expense.amount).toLocaleString()}</td><td className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h2 className="text-xl font-bold">Couple Summary</h2>
              <SummaryRow label={`${partnerA} paid`} value={`R${totals.aPaid.toLocaleString()}`} />
              <SummaryRow label={`${partnerB} paid`} value={`R${totals.bPaid.toLocaleString()}`} />
              <SummaryRow label={`${partnerA}'s fair share`} value={`R${totals.aShare.toLocaleString()}`} />
              <SummaryRow label={`${partnerB}'s fair share`} value={`R${totals.bShare.toLocaleString()}`} />
              <div className="rounded-2xl bg-rose-50 p-4 border border-rose-100"><p className="text-sm text-slate-500">Settlement</p><p className="text-lg font-bold mt-1">{amountOwed === 0 ? "You are even 💕" : `${whoOwes} owes ${whoIsOwed} R${amountOwed.toFixed(0)}`}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Actual Spending by Category" data={totals.byCategory} total={totals.totalSpent} />
          <ChartCard title="Savings Split" data={savingsAccounts.map((a) => ({ name: a.name, value: Number(a.currentBalance || 0) + Number(a.newSavingsAdded || 0) })).filter((a) => a.value > 0)} total={totals.updatedSavings} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, helper }) {
  return <Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><div className="text-slate-400">{icon}</div><p className="text-sm text-slate-500 mt-4">{label}</p><p className="text-2xl font-bold mt-1">{value}</p><p className="text-xs text-slate-400 mt-1">{helper}</p></CardContent></Card>;
}

function SummaryRow({ label, value }) {
  return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-slate-500">{label}</span><span className="font-semibold">{value}</span></div>;
}

function SummaryTile({ label, value }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold mt-1 text-violet-600">{value}</p></div>;
}

function CategoryBadge({ name, temporary }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${categoryColours[name] || "bg-purple-100 text-purple-700 border-purple-200"}`}><span className="h-2 w-2 rounded-full bg-current" />{name}{temporary && <span className="text-[10px] opacity-70">This month</span>}</span>;
}

function ExpenseCard({ expense, onDelete }) {
  return <div className="rounded-2xl border p-4 bg-white"><div className="flex justify-between gap-3"><div><p className="font-bold">{expense.description}</p><p className="text-sm text-slate-500">{expense.date}</p><CategoryBadge name={expense.category} /><p className="text-sm text-slate-500 mt-1">Paid by {expense.paidBy} • Split {expense.split}</p></div><div className="text-right"><p className="font-bold">R{Number(expense.amount).toLocaleString()}</p><Button variant="ghost" size="icon" onClick={() => onDelete(expense.id)} className="rounded-xl mt-2"><Trash2 className="h-4 w-4" /></Button></div></div></div>;
}

function InsightsCard({ insights, totals, selectedMonth }) {
  const firstComparison = insights.categoryComparisons[0];
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-violet-500" /><h2 className="text-xl font-bold">Monthly Spending Insights</h2></div>
        <div className="space-y-3">
          {firstComparison && <InsightLine icon={<TrendingUp />} text={`You spent ${Math.abs(firstComparison.change).toFixed(0)}% ${firstComparison.change >= 0 ? "more" : "less"} on ${firstComparison.name} than last month.`} />}
          <InsightLine icon={<Sparkles />} text={`Your top 3 categories make up ${insights.topCategoriesPercent.toFixed(0)}% of your spending.`} />
          <InsightLine icon={insights.projectedOver > 0 ? <AlertTriangle /> : <TrendingUp />} text={insights.projectedOver > 0 ? `At your current pace, you may overspend by R${insights.projectedOver.toFixed(0)}.` : `At your current pace, you should stay within budget for ${monthLabel(selectedMonth)}.`} />
          {insights.overspending[0] && <InsightLine icon={<AlertTriangle />} text={`${insights.overspending[0].name} is currently over budget by R${insights.overspending[0].over.toLocaleString()}.`} />}
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold mb-2">Top 3 categories</p>
          {insights.topCategories.length === 0 ? <p className="text-sm text-slate-500">No spending yet.</p> : insights.topCategories.map((cat, index) => <SummaryRow key={cat.name} label={`${index + 1}. ${cat.name}`} value={`R${cat.value.toLocaleString()}`} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function CoupleInsightsCard({ coupleInsights, totals, partnerA, partnerB }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-pink-500" /><h2 className="text-xl font-bold">Couple Insights</h2></div>
        <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
          <p className="font-semibold">Contribution split</p>
          <div className="h-4 rounded-full overflow-hidden bg-slate-200 flex"><div className="bg-pink-300" style={{ width: `${coupleInsights.aPercent}%` }} /><div className="bg-blue-300" style={{ width: `${coupleInsights.bPercent}%` }} /></div>
          <div className="flex justify-between text-sm text-slate-600"><span>{partnerA}: {coupleInsights.aPercent.toFixed(0)}%</span><span>{partnerB}: {coupleInsights.bPercent.toFixed(0)}%</span></div>
        </div>
        <InsightLine icon={<Heart />} text={`${totals.aPaid >= totals.bPaid ? partnerA : partnerB} paid more this month.`} />
        <InsightLine icon={<Wallet />} text={`${partnerA} paid R${totals.aPaid.toLocaleString()} and ${partnerB} paid R${totals.bPaid.toLocaleString()}.`} />
        {coupleInsights.categoryByPerson[0] && <InsightLine icon={<BarChart3 />} text={`${coupleInsights.categoryByPerson[0].leader} spent more on ${coupleInsights.categoryByPerson[0].name}.`} />}
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Category</th><th>{partnerA}</th><th>{partnerB}</th><th>More</th></tr></thead><tbody>{coupleInsights.categoryByPerson.map((row) => <tr key={row.name} className="border-b last:border-0"><td className="py-2">{row.name}</td><td>R{row[partnerA].toLocaleString()}</td><td>R{row[partnerB].toLocaleString()}</td><td>{row.leader}</td></tr>)}</tbody></table>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightLine({ icon, text }) {
  return <div className="flex gap-3 rounded-2xl bg-white border p-3"><div className="text-violet-500 mt-0.5">{icon}</div><p className="text-sm text-slate-700">{text}</p></div>;
}

function ChartCard({ title, data, total }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <div className="h-64">
            {data.length === 0 ? <div className="h-full grid place-items-center text-slate-400">No data yet</div> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{data.map((_, index) => <Cell key={index} />)}</Pie><Tooltip formatter={(value) => `R${Number(value).toLocaleString()}`} /></PieChart></ResponsiveContainer>}
          </div>
          <div className="space-y-2">{data.map((item) => <SummaryRow key={item.name} label={item.name} value={`R${Number(item.value).toLocaleString()} (${total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)`} />)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
