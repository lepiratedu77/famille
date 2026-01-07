"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const supabase = createClient()
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (resetError) throw resetError

            setIsSuccess(true)
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de l'envoi de l'email.")
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
                    <p className="text-white/40">Récupération de mot de passe</p>
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
                                <h2 className="text-xl font-bold text-white mb-2">Email envoyé !</h2>
                                <p className="text-white/60 mb-6">
                                    Un lien de réinitialisation a été envoyé à <span className="text-violet-400">{email}</span>.
                                    Vérifie ta boîte mail (et les spams 😉).
                                </p>
                                <Link href="/login">
                                    <Button className="bg-white/10 hover:bg-white/20 text-white">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Retour à la connexion
                                    </Button>
                                </Link>
                            </motion.div>
                        </CardContent>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <CardHeader>
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-violet-400" />
                                    Mot de passe oublié
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="text-white/60 text-sm">
                                    Pas de panique ! Entre ton adresse email et on t'envoie un lien magique pour réinitialiser ton mot de passe. 🪄
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
                                        <>Envoyer le lien de réinitialisation</>
                                    )}
                                </Button>

                                <Link href="/login" className="w-full">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-white/40 hover:text-white hover:bg-white/5"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Retour à la connexion
                                    </Button>
                                </Link>
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
