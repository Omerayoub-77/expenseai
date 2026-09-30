import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { signIn, signUp } from "@/app/actions";

type LoginProps = {
  searchParams: Promise<{ mode?: string; error?: string; notice?: string }>;
};

export default async function LoginPage({ searchParams }: LoginProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  const params = await searchParams;
  const isSignup = params.mode === "signup";

  return (
    <main className="auth-page">
      <div className="auth-brand"><Link href="/" className="brand-mark"><span className="brand-icon">✳</span> expense<span>ai</span></Link></div>
      <div className="auth-layout">
        <section className="auth-story">
          <div className="eyebrow"><span className="live-dot" /> YOUR MONEY, IN FOCUS</div>
          <h1>Spend with<br /><em>intention.</em></h1>
          <p>A calmer way to understand where your money goes, set a plan, and feel good about what comes next.</p>
          <div className="auth-preview"><div className="preview-top"><span>Monthly overview</span><span className="preview-pill">THIS MONTH</span></div><strong>₹24,680</strong><span className="preview-caption">spent so far</span><div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="preview-footer"><span><b /> On track with your budget</span><span>↗ 12%</span></div></div>
        </section>
        <section className="auth-card">
          <div className="auth-heading"><span className="auth-kicker">YOUR FINANCIAL SPACE</span><h2>{isSignup ? "Create your account" : "Welcome back"}</h2><p>{isSignup ? "A clearer picture of your spending starts here." : "Sign in to pick up where you left off."}</p></div>
          {params.error && <div className="form-alert" role="alert">{params.error}</div>}
          {params.notice && <div className="form-notice" role="status">{params.notice}</div>}
          <form action={isSignup ? signUp : signIn} className="auth-form">
            {isSignup && <label>Your name<input name="name" type="text" autoComplete="name" placeholder="Alex Morgan" required /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label>Password<input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} placeholder={isSignup ? "At least 8 characters" : "Your password"} minLength={isSignup ? 8 : undefined} required /></label>
            <button className="button button-primary auth-submit" type="submit">{isSignup ? "Create account" : "Sign in"}<span>→</span></button>
          </form>
          <div className="auth-switch">{isSignup ? "Already have an account?" : "New to ExpenseAI?"} <Link href={isSignup ? "/login" : "/login?mode=signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></div>
          <p className="auth-security"><span>▣</span> Your financial data stays private and secure.</p>
        </section>
      </div>
      <footer className="auth-foot"><span>© 2026 ExpenseAI</span><span>Made for a little more peace of mind <b>✳</b></span></footer>
    </main>
  );
}
