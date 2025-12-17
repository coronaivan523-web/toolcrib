import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Loader2, AlertCircle } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/')
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-primary-950 px-4 relative overflow-hidden">
            {/* Full Page Background Image */}
            <div className="absolute inset-0 z-0">
                <img src="/login-bg.jpg" alt="Background" className="w-full h-full object-cover" />
            </div>

            {/* Main Login Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
                {/* Corporate Header */}
                <div className="bg-primary-900 px-8 py-8 flex flex-col items-center justify-center text-center border-b border-primary-800">
                    <img src="/wasion_logo_large.png" alt="Wasion Logo" className="h-12 object-contain brightness-0 invert opacity-90 mb-3" />
                    <div className="text-white text-[10px] font-bold tracking-[0.4em] uppercase opacity-60 leading-none">
                        Made in Mexico
                    </div>
                </div>

                <div className="p-8 pb-6">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-primary-800 tracking-tight uppercase mb-2">ToolCrib</h1>
                        <p className="text-xs font-bold text-primary-500 uppercase tracking-widest mb-1">Inventory Control System</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-primary-600 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-5 w-5 text-primary-300 group-focus-within:text-primary-600 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full rounded-lg border border-primary-100 bg-primary-50/50 pl-10 p-3 text-primary-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder:text-primary-300"
                                        placeholder="admin@toolcrib.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-primary-600 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Lock className="h-5 w-5 text-primary-300 group-focus-within:text-primary-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="block w-full rounded-lg border border-primary-100 bg-primary-50/50 pl-10 p-3 text-primary-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all placeholder:text-primary-300"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-lg bg-primary-700 hover:bg-primary-800 px-4 py-3.5 text-sm font-bold text-white transition-all transform active:scale-[0.98] shadow-lg shadow-primary-900/20 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Footer Credits */}
                <div className="bg-primary-50/50 px-8 py-4 border-t border-primary-100 text-center">
                    <p className="text-[10px] text-primary-400 font-medium uppercase tracking-widest leading-relaxed">
                        Software created by <br />
                        <span className="text-primary-700 font-bold">Ing. Ivan Corona</span>
                    </p>
                </div>
            </div>

            {/* Bottom copyright outside card */}
            <div className="absolute bottom-6 text-primary-300/40 text-[10px]">
                &copy; {new Date().getFullYear()} Wasion Mexico. All rights reserved.
            </div>
        </div>
    )
}
