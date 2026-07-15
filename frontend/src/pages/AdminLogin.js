import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat, Loader2, Lock } from "lucide-react";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4 relative overflow-hidden">
      <img
        src="https://images.pexels.com/photos/10951145/pexels-photo-10951145.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      />
      <div className="relative w-full max-w-md bg-card border-2 border-black rounded-lg p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 bg-primary flex items-center justify-center rounded border-2 border-black">
            <HardHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight leading-none">Admin Console</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold mt-1">
              Contractor Check-In
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              data-testid="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@techspider.site"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              data-testid="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive font-medium" data-testid="login-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full h-12 font-black uppercase tracking-wide bg-primary text-primary-foreground border-2 border-black"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Lock className="h-4 w-4 mr-2" /> Sign In</>}
          </Button>
        </form>
        <a href="/" className="block text-center mt-4 text-xs uppercase tracking-widest font-bold text-muted-foreground hover:text-primary transition-colors">
          ← Back to check-in
        </a>
      </div>
    </div>
  );
}
