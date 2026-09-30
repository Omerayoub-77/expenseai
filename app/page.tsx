import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import Dashboard from "@/app/dashboard";

type ExpenseRow = {
  id: string | number;
  user_id: string;
  amount: number;
  description: string;
  category_id: string | number;
  expense_date: string;
  created_at: string;
};

type CategoryRow = { id: string | number; name: string };
type BudgetRow = { id: string | number; user_id: string; category_id: string | number; amount: number; month: string };

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const [expenseResult, categoryResult, budgetResult, profileResult] = await Promise.all([
    supabase.from("expenses").select("id,user_id,amount,description,category_id,expense_date,created_at").eq("user_id", user.id).order("expense_date", { ascending: false }).limit(100),
    supabase.from("categories").select("id,name").order("name"),
    supabase.from("budgets").select("id,user_id,category_id,amount,month").eq("user_id", user.id).eq("month", currentMonth),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const categories = (categoryResult.data ?? []) as CategoryRow[];
  const errors = [expenseResult.error, categoryResult.error, budgetResult.error, profileResult.error].filter(Boolean);
  const categoryNames = new Map(categories.map((category) => [String(category.id), category.name]));
  const expenses = ((expenseResult.data ?? []) as ExpenseRow[]).map((expense) => ({
    ...expense,
    amount: Number(expense.amount),
    category_name: categoryNames.get(String(expense.category_id)) ?? "Other",
  }));
  const budgets = ((budgetResult.data ?? []) as BudgetRow[]).map((budget) => ({ ...budget, amount: Number(budget.amount) }));
  const name = profileResult.data?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  return <Dashboard userName={String(name)} email={user.email ?? ""} expenses={expenses} categories={categories} budgets={budgets} dataError={errors.length > 0} />;
}
