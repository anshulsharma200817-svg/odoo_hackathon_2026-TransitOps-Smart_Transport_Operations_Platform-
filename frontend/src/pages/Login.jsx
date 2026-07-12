import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { login, storeSession } from "../api/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      storeSession(data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Log in" subtitle="Welcome back to TransitOps">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="animate-fade-in-up [animation-delay:60ms]">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="animate-fade-in-up [animation-delay:120ms]">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="mt-2 animate-fade-in-up [animation-delay:180ms]">
          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </div>
      </form>
      <p className="mt-6 text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-medium text-brand-600 transition-colors hover:text-brand-700">
          Sign up
        </Link>
      </p>
      <p className="mt-4 text-xs text-slate-400">Demo: admin@transitops.dev / password123</p>
    </AuthLayout>
  );
}
