"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, Users, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isValidSession, setIsValidSession] = useState(false)
    const [isCheckingSession, setIsCheckingSession] = useState(true)

    useEffect(() => {
        // Vérifier si l'utilisateur a un token de récupération valide
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            // Si l'utilisateur a une session (via le lien de récupération), on peut continuer
            setIsValidSession(!!session)
            setIsCheckingSession(false)
        }
        checkSession()
    }, [supabase])

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation
        if (password.length < 6) {
            setError("Le mot de passe doit contenir au moins 6 caractères.")
            return
        }

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.")
            return
        }

        setIsLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) throw updateError

            setIsSuccess(true)

            // Rediriger vers la page de connexion après 3 secondes
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de la mise à jour du mot de passe.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isCheckingSession) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
                    <p className="text-white/60">Vérification en cours...</p>
                </div>
            </div>
        )
    }

    if (!isValidSession && !isSuccess) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 bg-rose-500/20 rounded-2xl flex items-center justify-center">
                        <Lock className="w-10 h-10 text-rose-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">Lien expiré ou invalide</h1>
                    <p className="text-white/60 mb-6">
                        Ce lien de réinitialisation n'est plus valide.
                        Il a peut-être expiré ou a déjà été utilisé.
                    </p>
                    <Link href="/forgot-password">
                        <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
                            Demander un nouveau lien
                        </Button>
                    </Link>
                </motion.div>
            </div>
        )
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
                    <p className="text-white/40">Nouveau mot de passe</p>
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    {isSuccess ? (
                        <CardContent className="pt-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Mot de passe mis à jour !</h2>
                                <p className="text-white/60 mb-4">
                                    Ton nouveau mot de passe a été enregistré. 🎉
                                </p>
                                <p className="text-white/40 text-sm">
                                    Redirection vers la page de connexion...
                                </p>
                                <Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto mt-4" />
                            </motion.div>
                        </CardContent>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <CardHeader>
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-violet-400" />
                                    Nouveau mot de passe
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="text-white/60 text-sm">
                                    Choisis un nouveau mot de passe sécurisé que tu n'oublieras pas cette fois ! 😄
                                </p>

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
                                    <label className="text-xs uppercase tracking-widest text-white/40">Nouveau mot de passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 bg-black/30 border-white/10 text-white placeholder:text-white/20 h-12"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-widest text-white/40">Confirmer le mot de passe</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <Input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 pr-10 bg-black/30 border-white/10 text-white placeholder:text-white/20 h-12"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Enregistrer le mot de passe <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    )}
                </Card>

                <p className="text-center text-white/20 text-xs mt-8">
                    CADARIO Family Hub © 2026
                </p>
            </motion.div>
        </div>
    )
}
