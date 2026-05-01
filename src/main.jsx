import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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
import { Trash2, Wallet, Heart, Plus, TrendingUp, PiggyBank, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import "./styles.css";

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
const categories = ["Groceries", "Eating Out", "Fuel", "Rent/Bond", "Utilities", "Subscriptions", "Date Night", "Medical", "Savings", "Other"];

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [partnerA, setPartnerA] = useState("Ashleigh");
  const [partnerB, setPartnerB] = useState("Chade");
  const [monthlyBudget, setMonthlyBudget] = useState(12000);
  const [savingsGoal, setSavingsGoal] = useState(3000);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", category: "Groceries", amount: "", paidBy: "Ashleigh", split: "50/50" });

  useEffect(() => onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); }), []);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, "couples", COUPLE_ID);
    const expensesRef = collection(db, "couples", COUPLE_ID, "expenses");
    const expensesQuery = query(expensesRef, orderBy("createdAt", "desc"));

    const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPartnerA(data.partnerA || "Ashleigh");
        setPartnerB(data.partnerB || "Chade");
        setMonthlyBudget(data.monthlyBudget || 12000);
        setSavingsGoal(data.savingsGoal || 3000);
      } else {
        setDoc(settingsRef, { partnerA: "Ashleigh", partnerB: "Chade", monthlyBudget: 12000, savingsGoal: 3000, updatedAt: serverTimestamp() });
      }
    });

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => setExpenses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    return () => { unsubSettings(); unsubExpenses(); };
  }, [user]);

  const saveSettings = async (updates) => {
    await setDoc(doc(db, "couples", COUPLE_ID), { partnerA, partnerB, monthlyBudget, savingsGoal, ...updates, updatedAt: serverTimestamp() }, { merge: true });
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

  const totals = useMemo(() => {
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const byCategory = categories.map((cat) => ({ name: cat, value: expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + Number(e.amount || 0), 0) })).filter((item) => item.value > 0);
    let aPaid = 0, bPaid = 0, aShare = 0, bShare = 0;
    expenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      if (e.paidBy === partnerA) aPaid += amount;
      if (e.paidBy === partnerB) bPaid += amount;
      if (e.split === "50/50") { aShare += amount / 2; bShare += amount / 2; }
      else if (e.split === partnerA) aShare += amount;
      else if (e.split === partnerB) bShare += amount;
    });
    return { totalSpent, byCategory, aPaid, bPaid, aShare, bShare, aBalance: aPaid - aShare, bBalance: bPaid - bShare };
  }, [expenses, partnerA, partnerB]);

  const budgetLeft = monthlyBudget - totals.totalSpent;
  const budgetPercent = monthlyBudget > 0 ? Math.min((totals.totalSpent / monthlyBudget) * 100, 100) : 0;
  const amountOwed = Math.abs(totals.aBalance);
  const whoOwes = totals.aBalance > 0 ? partnerB : totals.bBalance > 0 ? partnerA : "Nobody";
  const whoIsOwed = totals.aBalance > 0 ? partnerA : totals.bBalance > 0 ? partnerB : "Nobody";

  const addExpense = async () => {
    if (!form.description || !form.amount) return;
    await addDoc(collection(db, "couples", COUPLE_ID, "expenses"), { ...form, amount: Number(form.amount), createdBy: user.email, createdAt: serverTimestamp() });
    setForm({ ...form, description: "", amount: "" });
  };
  const deleteExpense = async (id) => await deleteDoc(doc(db, "couples", COUPLE_ID, "expenses", id));

  if (loading) return <div className="screen center">Loading {APP_NAME}...</div>;

  if (!user) return <LoginScreen authMode={authMode} setAuthMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} authError={authError} handleAuth={handleAuth} />;

  return (
    <div className="app-shell">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="hero">
          <div><div className="brand"><Heart size={20} fill="currentColor" /> {APP_NAME}</div><h1>Track your money together</h1><p>Shared budget, split expenses, autosave, and live syncing.</p></div>
          <button className="btn secondary" onClick={() => signOut(auth)}><LogOut size={16} /> Log out</button>
        </motion.div>

        <section className="card settings-grid">
          <Field label="Partner 1"><input value={partnerA} onChange={(e) => setPartnerA(e.target.value)} onBlur={() => saveSettings({ partnerA })} /></Field>
          <Field label="Partner 2"><input value={partnerB} onChange={(e) => setPartnerB(e.target.value)} onBlur={() => saveSettings({ partnerB })} /></Field>
          <Field label="Monthly budget"><input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(Number(e.target.value))} onBlur={() => saveSettings({ monthlyBudget })} /></Field>
          <Field label="Savings goal"><input type="number" value={savingsGoal} onChange={(e) => setSavingsGoal(Number(e.target.value))} onBlur={() => saveSettings({ savingsGoal })} /></Field>
        </section>

        <section className="stat-grid">
          <Stat icon={<Wallet />} label="Total spent" value={`R${totals.totalSpent.toLocaleString()}`} helper="This month" />
          <Stat icon={<TrendingUp />} label="Budget left" value={`R${budgetLeft.toLocaleString()}`} helper={`${budgetPercent.toFixed(0)}% used`} />
          <Stat icon={<PiggyBank />} label="Savings goal" value={`R${Number(savingsGoal).toLocaleString()}`} helper="Monthly target" />
          <Stat icon={<Heart />} label="Settle up" value={amountOwed === 0 ? "All square" : `R${amountOwed.toFixed(0)}`} helper={amountOwed === 0 ? "Nobody owes" : `${whoOwes} owes ${whoIsOwed}`} />
        </section>

        <section className="card"><div className="budget-head"><h2>Monthly budget</h2><span>R{totals.totalSpent.toLocaleString()} / R{Number(monthlyBudget).toLocaleString()}</span></div><div className="bar"><div style={{ width: `${budgetPercent}%` }} /></div><p className="muted">You have R{budgetLeft.toLocaleString()} left this month.</p></section>

        <section className="main-grid">
          <div className="card add-card"><h2>Add expense</h2><div className="form-grid"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select><button className="btn" onClick={addExpense}><Plus size={16} /> Add</button></div><div className="split-grid"><Field label="Paid by"><select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}><option>{partnerA}</option><option>{partnerB}</option></select></Field><Field label="Split"><select value={form.split} onChange={(e) => setForm({ ...form, split: e.target.value })}><option value="50/50">50/50</option><option value={partnerA}>{partnerA} only</option><option value={partnerB}>{partnerB} only</option></select></Field></div></div>
          <div className="card chart-card"><h2>Categories</h2><div className="chart-wrap">{totals.byCategory.length === 0 ? <div className="empty">No spending yet</div> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={totals.byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>{totals.byCategory.map((_, index) => <Cell key={index} />)}</Pie><Tooltip formatter={(value) => `R${Number(value).toLocaleString()}`} /></PieChart></ResponsiveContainer>}</div></div>
        </section>

        <section className="bottom-grid">
          <div className="card"><h2>Recent expenses</h2><div className="expense-list">{expenses.map((expense) => <div key={expense.id} className="expense-card"><div><strong>{expense.description}</strong><p>{expense.date} • {expense.category}</p><p>Paid by {expense.paidBy} • Split {expense.split}</p></div><div className="expense-amount"><strong>R{Number(expense.amount).toLocaleString()}</strong><button className="icon-btn" onClick={() => deleteExpense(expense.id)}><Trash2 size={16} /></button></div></div>)}</div></div>
          <div className="card"><h2>Couple summary</h2><Summary label={`${partnerA} paid`} value={`R${totals.aPaid.toLocaleString()}`} /><Summary label={`${partnerB} paid`} value={`R${totals.bPaid.toLocaleString()}`} /><Summary label={`${partnerA}'s share`} value={`R${totals.aShare.toLocaleString()}`} /><Summary label={`${partnerB}'s share`} value={`R${totals.bShare.toLocaleString()}`} /><div className="settlement"><p>Settlement</p><strong>{amountOwed === 0 ? "You are even 💕" : `${whoOwes} owes ${whoIsOwed} R${amountOwed.toFixed(0)}`}</strong></div></div>
        </section>
      </div>
    </div>
  );
}

function LoginScreen({ authMode, setAuthMode, email, setEmail, password, setPassword, authError, handleAuth }) {
  return <div className="screen login-bg"><div className="login-card"><div className="heart"><Heart fill="currentColor" /></div><h1>{APP_NAME}</h1><p>Shared spending tracker for two.</p><input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /><input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />{authError && <p className="error">{authError}</p>}<button className="btn full" onClick={handleAuth}>{authMode === "login" ? "Log in" : "Create shared account"}</button><button className="link-btn" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Need an account? Create one" : "Already have an account? Log in"}</button></div></div>;
}
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Stat({ icon, label, value, helper }) { return <div className="card stat"><div className="stat-icon">{icon}</div><p>{label}</p><h3>{value}</h3><small>{helper}</small></div>; }
function Summary({ label, value }) { return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>; }

createRoot(document.getElementById("root")).render(<App />);
