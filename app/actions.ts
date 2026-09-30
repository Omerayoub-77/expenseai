"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function signedInClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signUp(formData: FormData) {
  const name = value(formData, "name");
  const email = value(formData, "email");
  const password = value(formData, "password");
  if (!name || !email || password.length < 8) {
    redirect("/login?mode=signup&error=Add%20your%20name%2C%20a%20valid%20email%2C%20and%20a%20password%20with%208%2B%20characters");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) redirect(`/login?mode=signup&error=${encodeURIComponent(error.message)}`);
  if (!data.session) redirect("/login?notice=Check%20your%20email%20to%20confirm%20your%20account");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function addExpense(formData: FormData) {
  const { supabase, user } = await signedInClient();
  const amount = Number(value(formData, "amount"));
  const description = value(formData, "description");
  const categoryId = value(formData, "category_id");
  const expenseDate = value(formData, "expense_date");
  if (!Number.isFinite(amount) || amount <= 0 || !description || !categoryId || !expenseDate) {
    redirect("/?error=Enter%20a%20description%2C%20category%2C%20date%2C%20and%20positive%20amount");
  }

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    description,
    category_id: categoryId,
    expense_date: expenseDate,
  });
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
}

export async function updateExpense(formData: FormData) {
  const { supabase, user } = await signedInClient();
  const id = value(formData, "id");
  const amount = Number(value(formData, "amount"));
  const description = value(formData, "description");
  const categoryId = value(formData, "category_id");
  const expenseDate = value(formData, "expense_date");
  if (!id || !Number.isFinite(amount) || amount <= 0 || !description || !categoryId || !expenseDate) {
    redirect("/?error=Enter%20a%20description%2C%20category%2C%20date%2C%20and%20positive%20amount");
  }

  const { error } = await supabase.from("expenses").update({
    amount,
    description,
    category_id: categoryId,
    expense_date: expenseDate,
  }).eq("id", id).eq("user_id", user.id);
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
}

export async function deleteExpense(formData: FormData) {
  const { supabase, user } = await signedInClient();
  const id = value(formData, "id");
  if (!id) redirect("/?error=Expense%20not%20found");

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
}

export async function saveBudget(formData: FormData) {
  const { supabase, user } = await signedInClient();
  const categoryId = value(formData, "category_id");
  const amount = Number(value(formData, "amount"));
  const month = `${new Date().toISOString().slice(0, 7)}-01`;
  if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
    redirect("/?error=Choose%20a%20category%20and%20enter%20a%20positive%20budget");
  }

  const existing = await supabase.from("budgets").select("id")
    .eq("user_id", user.id).eq("category_id", categoryId).eq("month", month).maybeSingle();
  if (existing.error) redirect(`/?error=${encodeURIComponent(existing.error.message)}`);

  const result = existing.data
    ? await supabase.from("budgets").update({ amount }).eq("id", existing.data.id).eq("user_id", user.id)
    : await supabase.from("budgets").insert({ user_id: user.id, category_id: categoryId, amount, month });
  if (result.error) redirect(`/?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/");
}

export async function deleteBudget(formData: FormData) {
  const { supabase, user } = await signedInClient();
  const id = value(formData, "id");
  if (!id) redirect("/?error=Budget%20not%20found");
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
}
