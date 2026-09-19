import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  ShieldCheck,
  User,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

export const LoginScreen: React.FC = () => {
  const { login } = useERP();

  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = login(loginId, password);
      if (!result.success) {
        setError(result.error || 'Invalid Login ID or Password. Access Denied.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050811] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-cyan-500 selection:text-slate-950 font-sans">
      
      {/* Dynamic Background Aurora & Grid Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-cyan-600/15 via-blue-600/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-[550px] h-[550px] bg-gradient-to-bl from-indigo-600/15 via-purple-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-500/10 to-emerald-600/5 rounded-full blur-3xl" />
        
        {/* Futuristic Technical Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #38bdf8 1px, transparent 1px),
              linear-gradient(to bottom, #38bdf8 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Ambient Radial Vignette */}
        <div className="absolute inset-0 bg-radial-vignette opacity-70" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-white/[0.07] bg-slate-950/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Logo Badge */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-300" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 via-[#0d162d] to-slate-900 border border-white/10 flex items-center justify-center text-white font-black text-xl tracking-wider shadow-inner">
              <span className="bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-500 bg-clip-text text-transparent">
                RSB
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold tracking-wide text-white">
                RSB INDUSTRIAL ERP
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold tracking-wider">
                v3.5 PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-normal">
              Enterprise Stainless Steel & Heavy Machinery Manufacturing
            </p>
          </div>
        </div>

        {/* Security Indicator Pill */}
        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.08] shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="text-[11px] font-mono text-slate-300 font-medium">
            Terminal Security Locked
          </span>
        </div>
      </header>

      {/* Main Centered Login Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[440px]">
          
          {/* Card Frame with Glowing Gradient Border */}
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-b from-cyan-500/30 via-indigo-500/20 to-cyan-500/30 rounded-3xl blur-[2px] opacity-75" />

            <div className="relative rounded-3xl bg-[#090e1a]/95 border border-white/10 p-7 sm:p-9 shadow-2xl backdrop-blur-2xl space-y-6">
              
              {/* Central Lock Icon & Branding */}
              <div className="text-center space-y-3">
                <div className="relative inline-flex">
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 border border-white/15 text-white flex items-center justify-center shadow-2xl">
                    <Lock className="w-7 h-7 text-cyan-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    RSB PRIVATE LIMITED
                  </h2>
                  <p className="text-xs text-slate-400">
                    Factory Terminal & Production ERP Gateway
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Authorized Personnel Access Only</span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                
                {/* Login ID Input */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold text-slate-300">
                    Login ID / Username / Email:
                  </label>
                  <div className="relative group/input">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within/input:text-cyan-400" />
                    <input
                      autoFocus
                      type="text"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter login ID..."
                      required
                      className="w-full bg-[#050811]/90 border border-white/10 rounded-xl pl-10 pr-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold text-slate-300">
                    Security Password:
                  </label>
                  <div className="relative group/input">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within/input:text-cyan-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter your security password..."
                      required
                      className="w-full bg-[#050811]/90 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full group/btn overflow-hidden rounded-xl p-[1px] focus:outline-none cursor-pointer active:scale-[0.99] transition-transform disabled:opacity-50 mt-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 rounded-xl transition-all duration-300 group-hover/btn:opacity-90" />
                  <div className="relative py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white shadow-lg shadow-cyan-900/30">
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Credentials...
                      </span>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>UNLOCK & ENTER ERP</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </div>
                </button>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-400 font-medium">
                    Direct authentication based on enrolled role authorization.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/[0.07] bg-slate-950/60 backdrop-blur-md px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div>
          © {new Date().getFullYear()} RSB Private Limited. All Rights Reserved.
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>Encrypted Session Terminal</span>
          <span className="text-slate-400">•</span>
          <span>Access Control Matrix</span>
        </div>
      </footer>
    </div>
  );
};
