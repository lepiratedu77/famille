"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const COLORS = [
    { name: 'Violet', code: '#8b5cf6' },
    { name: 'Bleu', code: '#3b82f6' },
    { name: 'Emeraude', code: '#10b981' },
    { name: 'Rose', code: '#ec4899' },
    { name: 'Orange', code: '#f97316' },
    { name: 'Rouge', code: '#ef4444' },
]

export default function SignupPage() {
    const router = useRouter()
    const supabase = createClient()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [selectedColor, setSelectedColor] = useState(COLORS[0].code)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            // Sign up the user - the database trigger will automatically create the profile
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        color_code: selectedColor,
                    }
                }
            })

            if (signUpError) throw signUpError

            if (authData.user) {
                setSuccess(true)
            }
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de l'inscription.")
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    {/* Animation d'enveloppe */}
                    <motion.div
                        initial={{ y: -20 }}
                        animate={{ y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                        }}
                        className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-violet-500/30 to-indigo-500/30 rounded-2xl flex items-center justify-center border border-violet-500/30"
                    >
                        <Mail className="w-12 h-12 text-violet-400" />
                    </motion.div>

                    {/* Titre principal */}
                    <h2 className="text-3xl font-bold text-white mb-3">
                        🎉 Bienvenue dans la Tribu !
                    </h2>

                    {/* Message d'alerte email */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-5 mb-6"
                    >
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-2xl">📧</span>
                            <h3 className="text-lg font-bold text-amber-300">
                                Une dernière étape !
                            </h3>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                            Un email de confirmation a été envoyé à <strong className="text-violet-300">{email}</strong>
                        </p>
                        <p className="text-amber-200 font-semibold mt-2 text-base">
                            👉 Clique sur le lien dans l'email pour activer ton compte !
                        </p>
                    </motion.div>

                    {/* Conseils */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-white/40 text-xs mb-6"
                    >
                        💡 Pense à vérifier tes spams si tu ne vois pas l'email
                    </motion.p>

                    {/* Bouton vers login */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
                        >
                            <ArrowRight className="w-4 h-4" />
                            Aller à la connexion
                        </Link>
                    </motion.div>
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
                    <h1 className="text-3xl font-bold text-white mb-2">Rejoindre la Tribu</h1>
                    <p className="text-white/40">Créez votre compte CADARIO HUB</p>
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                    <form onSubmit={handleSignup}>
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-violet-400" />
                                Inscription
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
                                <label className="text-xs uppercase tracking-widest text-white/40">Prénom</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <Input
                                        type="text"
                                        placeholder="Lucas"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="pl-10 bg-black/30 border-white/10 text-white placeholder:text-white/20 h-12"
                                        required
                                    />
                                </div>
                            </div>

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
                                <label className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                                    <Palette className="w-3 h-3" /> Couleur de profil
                                </label>
                                <div className="flex gap-2 justify-center">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color.code}
                                            type="button"
                                            onClick={() => setSelectedColor(color.code)}
                                            className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === color.code ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            style={{ backgroundColor: color.code }}
                                            title={color.name}
                                        />
                                    ))}
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
                                        Créer mon compte <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>

                            <p className="text-center text-white/40 text-sm">
                                Déjà membre ?{' '}
                                <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                                    Se connecter
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </motion.div>
        </div>
    )
}
