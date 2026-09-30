"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addExpense, deleteBudget, deleteExpense, saveBudget, signOut, updateExpense } from "@/app/actions";

type Category = { id: string | number; name: string };
type Expense = { id: string | number; amount: number; description: string; category_id: string | number; category_name: string; expense_date: string; created_at: string };
type Budget = { id: string | number; category_id: string | number; amount: number; month: string };
type Props = { userName: string; email: string; expenses: Expense[]; categories: Category[]; budgets: Budget[]; dataError: boolean };

const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
const compactMoney = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(amount || 0);
const colors = ["#82a895", "#d5a078", "#7788a9", "#d1bc75", "#b18a9f", "#78a5ac", "#bd826d"];
const shortDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7",
    receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2zM8 8h8M8 12h8M8 16h4",
    chart: "M4 19V5m0 14h17M7 15l4-5 3 2 5-7",
    wallet: "M4 6.5h15a2 2 0 0 1 2 2V19H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12M2 7h19v5h-5a2.5 2.5 0 0 0 0 5h5",
    search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    down: "m6 9 6 6 6-6",
    edit: "m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z",
    trash: "M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3",
    close: "M6 6l12 12M18 6 6 18",
    logout: "M10 17l5-5-5-5m5 5H3m10-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6",
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.home} /></svg>;
}

function ExpenseChart({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const groups = new Map<string, number>();
  expenses.forEach((expense) => groups.set(expense.category_name, (groups.get(expense.category_name) ?? 0) + expense.amount));
  const breakdown = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 5);
  let accumulated = 0;
  const gradient = breakdown.length ? breakdown.map(([, amount], index) => {
    const start = accumulated;
    accumulated += total ? amount / total * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${accumulated}%`;
  }).join(", ") : "#edf0ec 0% 100%";

  const now = new Date();
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const values = Array.from({ length: now.getDate() }, () => 0);
  expenses.forEach((expense) => {
    const date = new Date(`${expense.expense_date}T00:00:00`);
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) values[date.getDate() - 1] += expense.amount;
  });
  let running = 0;
  const runningValues = values.map((value) => (running += value));
  const max = Math.max(...runningValues, 1) * 1.15;
  const points = runningValues.map((value, index) => `${index / Math.max(monthDays - 1, 1) * 600},${110 - value / max * 92}`).join(" ");

  return <>
    <div className="spending-chart"><div className="chart-meta"><div><span className="chart-label">TOTAL THIS MONTH</span><strong>{money(total)}</strong></div><span className="chart-period">Daily · {now.toLocaleDateString("en-IN", { month: "long" })}</span></div>
      <div className="line-chart"><div className="chart-y-labels"><span>{compactMoney(max)}</span><span>{compactMoney(max / 2)}</span><span>₹0</span></div><div className="line-chart-inner"><div className="chart-grid"><i /><i /><i /></div><svg viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="Cumulative spending this month"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#719b83" stopOpacity=".2"/><stop offset="100%" stopColor="#719b83" stopOpacity="0"/></linearGradient></defs><polygon points={`0,120 ${points} ${values.length ? `${(values.length - 1) / Math.max(monthDays - 1, 1) * 600},120` : "0,120"}`} fill="url(#areaFill)"/><polyline points={points || "0,110 600,110"} fill="none" stroke="#709880" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg><div className="chart-x-labels"><span>1 {now.toLocaleDateString("en-IN", { month: "short" })}</span><span>10 {now.toLocaleDateString("en-IN", { month: "short" })}</span><span>20 {now.toLocaleDateString("en-IN", { month: "short" })}</span><span>{monthDays} {now.toLocaleDateString("en-IN", { month: "short" })}</span></div></div></div>
    </div>
    <div className="category-chart"><div className="panel-title-row"><div><h3>Spending by category</h3><p>Where your money went</p></div><button className="select-light" type="button">This month <Icon name="down" /></button></div><div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(${gradient})` }}><div><strong>{compactMoney(total)}</strong><span>total spent</span></div></div><div className="legend">{breakdown.length ? breakdown.map(([name, amount], i) => <div className="legend-row" key={name}><span className="legend-name"><i style={{ background: colors[i % colors.length] }} />{name}</span><strong>{total ? Math.round(amount / total * 100) : 0}%</strong></div>) : <p className="muted small">No spending to chart yet.</p>}</div></div></div>
  </>;
}

export default function Dashboard({ userName, email, expenses, categories, budgets, dataError }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | number | null>(null);
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const searchParams = useSearchParams();
  const greetingName = userName.split(/[\s@]/)[0];
  const monthLabel = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const thisMonthExpenses = expenses.filter((expense) => {
    const d = new Date(`${expense.expense_date}T00:00:00`);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const spent = thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetTotal = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const previousMonth = expenses.filter((expense) => {
    const d = new Date(`${expense.expense_date}T00:00:00`);
    const now = new Date();
    return d.getMonth() === (now.getMonth() + 11) % 12 && d.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  }).reduce((sum, expense) => sum + expense.amount, 0);
  const change = previousMonth ? Math.round((spent - previousMonth) / previousMonth * 100) : null;
  const visibleExpenses = useMemo(() => expenses.filter((expense) => `${expense.description} ${expense.category_name}`.toLowerCase().includes(query.toLowerCase())), [expenses, query]);
  const budgetByCategory = new Map(budgets.map((budget) => [String(budget.category_id), budget]));
  const [budgetCategory, setBudgetCategory] = useState("");
  const selectedCategoryBudget = budgetByCategory.get(budgetCategory);

  const openExpenseForm = () => setModalOpen(true);
  const goTo = (nav: string, id: string) => {
    setActiveNav(nav);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand-mark" href="/"><span className="brand-icon">✳</span> expense<span>ai</span></a><div className="workspace"><div className="workspace-avatar">E</div><div><strong>Personal space</strong><span>Free plan</span></div><Icon name="down" /></div><span className="side-label">WORKSPACE</span><nav className="side-nav">
      {[{ label: "Overview", icon: "home", id: "overview" }, { label: "Transactions", icon: "receipt", id: "transactions" }, { label: "Budgets", icon: "wallet", id: "budgets" }, { label: "Insights", icon: "chart", id: "insights" }].map((item) => <button key={item.label} onClick={() => goTo(item.label, item.id)} className={`side-link ${activeNav === item.label ? "active" : ""}`}><Icon name={item.icon} />{item.label}{item.label === "Transactions" && <span className="nav-count">{expenses.length}</span>}</button>)}
    </nav><div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-spark">✳</div><strong>A little more clarity</strong><p>Your spending story gets better with every entry.</p><a href="#transactions">Explore insights <Icon name="arrow" /></a></div><div className="side-help">Questions? <a href="mailto:hello@expenseai.app">We’re here to help</a></div><form action={signOut}><button className="signout side-link" type="submit"><Icon name="logout" />Sign out</button></form></div></aside>

    <main className="main-content" id="overview"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Overview</strong></div><div className="top-actions"><label className="top-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything..." aria-label="Search expenses" /><kbd>⌘ K</kbd></label><button className="icon-button notification" aria-label="Notifications"><Icon name="bell" /><i /></button><div className="top-divider"/><div className="user-chip"><span className="user-avatar">{greetingName.slice(0, 1).toUpperCase()}</span><div><strong>{userName}</strong><span>{email}</span></div><Icon name="down" /></div></div></header>

      <div className="page-wrap"><div className="welcome-row"><div><span className="welcome-date">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {greetingName} <span>✳</span></h1><p>Here’s the story your spending is telling this month.</p></div><button className="button button-primary" onClick={openExpenseForm}><Icon name="plus" /> Add expense</button></div>
      {searchParams.get("error") && <div className="data-alert" role="alert">{searchParams.get("error")}</div>}
      {dataError && <div className="data-alert" role="status">Some account data couldn’t be loaded. Check your Supabase table policies and try again.</div>}

      <section className="stats-grid" aria-label="Monthly summary"><article className="stat-card"><div className="stat-top"><span className="stat-icon sage"><Icon name="receipt" /></span><span className="stat-trend">{change === null ? "THIS MONTH" : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}%`}</span></div><span className="stat-label">TOTAL SPENT</span><strong>{money(spent)}</strong><span className="stat-foot">{change === null ? "Your monthly spending" : `vs. ${money(previousMonth)} last month`}</span><div className="stat-decoration sage-decoration">↗</div></article>
        <article className="stat-card"><div className="stat-top"><span className="stat-icon sand"><Icon name="wallet" /></span><span className="stat-trend neutral">{budgets.length} CATEGORIES</span></div><span className="stat-label">MONTHLY BUDGET</span><strong>{money(budgetTotal)}</strong><span className="stat-foot">{budgetTotal ? `${money(Math.max(budgetTotal - spent, 0))} remaining this month` : "Set a budget to stay on track"}</span><div className="budget-mini"><i style={{ width: `${budgetTotal ? Math.min(spent / budgetTotal * 100, 100) : 0}%` }} /></div></article>
        <article className="stat-card"><div className="stat-top"><span className="stat-icon blue"><Icon name="chart" /></span><span className="stat-trend neutral">{monthLabel.toUpperCase()}</span></div><span className="stat-label">TRANSACTIONS</span><strong>{thisMonthExpenses.length}</strong><span className="stat-foot">{expenses.length} total expense records</span><div className="stat-decoration blue-decoration">↗</div></article>
        <article className="stat-card savings-card"><div className="stat-top"><span className="stat-icon blush">✳</span><span className="stat-trend neutral">A GENTLE NUDGE</span></div><span className="stat-label">A GOOD HABIT</span><strong>{budgetTotal ? `${Math.max(0, Math.round((budgetTotal - spent) / budgetTotal * 100))}%` : "One step"}</strong><span className="stat-foot">{budgetTotal ? "of your budget is still available" : "Add a budget that feels right"}</span><div className="stat-decoration blush-decoration">✳</div></article></section>

      <section className="content-grid" id="insights"><div className="panel spending-panel"><div className="panel-heading"><div><span className="panel-kicker">THE BIG PICTURE</span><h2>Your spending rhythm</h2></div><button className="select-light" type="button">{monthLabel} <Icon name="down" /></button></div><ExpenseChart expenses={thisMonthExpenses} /></div>
        <aside className="right-column"><div className="panel goals-panel" id="budgets"><div className="panel-heading"><div><span className="panel-kicker">PLAN WITH PURPOSE</span><h2>Monthly budgets</h2></div><span className="tiny-icon">✳</span></div><p className="panel-subtitle">Small guardrails, more room to breathe.</p><div className="budget-list">{budgets.length ? budgets.slice(0, 4).map((budget) => { const categoryName = categories.find((category) => String(category.id) === String(budget.category_id))?.name ?? "Category"; const spentInCategory = thisMonthExpenses.filter((expense) => String(expense.category_id) === String(budget.category_id)).reduce((sum, expense) => sum + expense.amount, 0); const progress = Math.min(spentInCategory / budget.amount * 100, 100); return <div className="budget-item" key={budget.id}><div className="budget-item-title"><span><i style={{ background: colors[categories.findIndex((c) => String(c.id) === String(budget.category_id)) % colors.length] }} />{categoryName}</span><strong>{money(spentInCategory)} <small>/ {money(budget.amount)}</small></strong></div><div className="progress-track"><i style={{ width: `${progress}%`, background: progress > 90 ? "#d58d70" : undefined }} /></div><div className="budget-item-foot"><span>{progress > 90 ? "Almost there" : `${money(Math.max(budget.amount - spentInCategory, 0))} left`}</span><form action={deleteBudget}><input type="hidden" name="id" value={budget.id} /><button className="text-icon-button" aria-label={`Delete ${categoryName} budget`}><Icon name="trash" /></button></form></div></div>; }) : <div className="empty-budget"><span className="empty-icon">◎</span><strong>No budgets yet</strong><p>Choose a category and set a monthly limit that works for you.</p></div>}</div>
          <form action={saveBudget} className="budget-form"><div className="budget-form-row"><select name="category_id" value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value)} required aria-label="Budget category"><option value="">Category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><input name="amount" key={`${budgetCategory}-${selectedCategoryBudget?.amount ?? "new"}`} defaultValue={selectedCategoryBudget?.amount ?? ""} inputMode="decimal" type="number" min="1" step="1" placeholder="Monthly limit" required aria-label="Monthly budget amount"/></div><button className="button button-soft" type="submit"><Icon name="plus" />{selectedCategoryBudget ? "Update budget" : "Add a budget"}</button></form>
        </div><div className="note-card"><span className="note-spark">✳</span><div><strong>Progress, not perfection.</strong><p>A little awareness today can make tomorrow easier.</p></div><span className="note-flower">✿</span></div></aside></section>

      <section className="panel transactions-panel" id="transactions"><div className="panel-heading transaction-heading"><div><span className="panel-kicker">YOUR RECENT ACTIVITY</span><h2>Recent transactions <span className="result-count">{visibleExpenses.length}</span></h2></div><div className="transaction-tools"><label className="table-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter transactions" aria-label="Filter transactions"/></label><select className="select-light" aria-label="Filter by category" onChange={(event) => setQuery(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></div></div>
        <div className="transaction-table"><div className="table-header"><span>DESCRIPTION</span><span>CATEGORY</span><span>DATE</span><span>AMOUNT</span><span /></div>
          {visibleExpenses.length ? visibleExpenses.slice(0, 8).map((expense, index) => <div className="transaction-row" key={expense.id}>{editing === expense.id ? <form action={updateExpense} className="edit-expense-form"><input type="hidden" name="id" value={expense.id}/><input name="description" defaultValue={expense.description} required aria-label="Description"/><select name="category_id" defaultValue={expense.category_id} required aria-label="Category">{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><input name="expense_date" type="date" defaultValue={expense.expense_date} required aria-label="Date"/><input name="amount" type="number" min="1" step="1" defaultValue={expense.amount} required aria-label="Amount"/><button className="icon-button" aria-label="Save changes"><Icon name="arrow"/></button></form> : <><div className="transaction-description"><span className="merchant-icon" style={{ color: colors[index % colors.length], background: `${colors[index % colors.length]}18` }}>{expense.category_name.slice(0, 1).toUpperCase()}</span><div><strong>{expense.description}</strong><span>Personal expense</span></div></div><div className="category-cell"><i style={{ background: colors[categories.findIndex((c) => String(c.id) === String(expense.category_id)) % colors.length] }}/>{expense.category_name}</div><span className="date-cell">{shortDate(expense.expense_date)}</span><strong className="amount-cell">−{money(expense.amount)}</strong><div className="row-actions"><button className="text-icon-button" onClick={() => setEditing(expense.id)} aria-label={`Edit ${expense.description}`}><Icon name="edit"/></button><form action={deleteExpense}><input type="hidden" name="id" value={expense.id}/><button className="text-icon-button delete-action" aria-label={`Delete ${expense.description}`}><Icon name="trash"/></button></form></div></>}</div>) : <div className="empty-table"><span className="empty-icon">⌁</span><strong>{query ? "No matching expenses" : "Your story starts here"}</strong><p>{query ? "Try another search or category." : "Add your first expense and start seeing your spending more clearly."}</p>{!query && <button className="button button-soft" onClick={openExpenseForm}><Icon name="plus"/> Add your first expense</button>}</div>}
        </div><div className="table-bottom"><span>Showing {Math.min(visibleExpenses.length, 8)} of {visibleExpenses.length} transactions</span><button onClick={() => goTo("Transactions", "transactions")}>View all <Icon name="arrow"/></button></div>
      </section><footer className="dashboard-footer"><span>Made with care for your financial wellbeing <b>✳</b></span><span>Private by design · Protected by Supabase</span></footer></div>
    </main>

    {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title"><div className="modal-head"><div><span className="panel-kicker">A MOMENT OF AWARENESS</span><h2 id="expense-modal-title">Add an expense</h2></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><Icon name="close"/></button></div><p className="panel-subtitle">Every small entry gives you a clearer picture.</p><form action={addExpense} className="expense-form"><label>What was it for?<input name="description" placeholder="e.g. Coffee with a friend" required maxLength={120}/></label><label>Amount<input name="amount" type="number" min="1" step="1" inputMode="decimal" placeholder="0.00" required/></label><div className="form-row"><label>Category<select name="category_id" defaultValue="" required><option value="" disabled>Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Date<input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required/></label></div><div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setModalOpen(false)}>Cancel</button><button className="button button-primary" type="submit"><Icon name="plus"/> Save expense</button></div></form></section></div>}
  </div>;
}
