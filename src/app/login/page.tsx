"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff, Loader2, ArrowRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            router.push('/')
            router.refresh()
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de la connexion.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/20"
                    >
                        <Users className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-white mb-2">CADARIO HUB</h1>
                    <p className="text-white/40">Connexion à l'espace famille</p>
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <form onSubmit={handleLogin}>
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <Lock className="w-5 h-5 text-violet-400" />
                                Connexion
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-white/40">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <Input
                                        type="email"
                                        placeholder="vous@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-black/30 border-white/10 text-white placeholder:text-white/20 h-12"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-widest text-white/40">Mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 bg-black/30 border-white/10 text-white placeholder:text-white/20 h-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="text-right">
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                        Mot de passe oublié ?
                                    </Link>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Entrer <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>

                            <p className="text-center text-white/40 text-sm">
                                Pas encore de compte ?{' '}
                                <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium">
                                    Créer un compte
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-white/20 text-xs mt-8">
                    CADARIO Family Hub © 2026
                </p>
            </motion.div>
        </div>
    )
}
