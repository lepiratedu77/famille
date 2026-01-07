"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    MessageSquare,
    ShoppingBag,
    Lock,
    Trophy,
    Clock,
    Calendar,
    Plus,
    ArrowUpRight,
    TrendingUp,
    Settings,
    Bell,
    Loader2,
    Grid,
    ShoppingCart
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'



const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
}

export default function BentoDashboard() {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true)
    const [stats, setStats] = useState({
        profiles: [] as any[],
        fridgeNotes: [] as any[],
        karmaPoints: 0,
        neededShopItems: 0,
        vaultCount: 0,
        nextEvent: null as any
    })

    // Marquer les notifications comme lues quand on ouvre le panneau
    const handleNotificationsClick = () => {
        setShowNotifications(!showNotifications)
        if (!showNotifications) {
            // Quand on ouvre le panneau, marquer comme lu
            setHasUnreadNotifications(false)
        }
    }

    useEffect(() => {
        const fetchDashboardData = async () => {
            console.log("FETCH DASHBOARD DATA START")
            const { data: { user }, error: authError } = await supabase.auth.getUser()

            if (authError || !user || !user.id) {
                console.log("No authenticated user found.")
                setIsLoading(false)
                return
            }

            console.log("Fetching profile for user:", user.id)

            const { data: profile } = await supabase
                .from('profiles')
                .select('family_id, points')
                .eq('id', user.id)
                .single()

            if (profile?.family_id) {
                // Fetch profiles for family
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('full_name, color_code, avatar_url')
                    .eq('family_id', profile.family_id)

                // Fetch last 3 fridge notes
                const { data: notes } = await supabase
                    .from('fridge_notes')
                    .select('content, color')
                    .eq('family_id', profile.family_id)
                    .order('created_at', { ascending: false })
                    .limit(3)

                // Fetch needed shopping items count
                const { count: shopCount } = await supabase
                    .from('shopping_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('family_id', profile.family_id)
                    .eq('status', 'needed')

                // Fetch vault items count
                const { count: vaultCount } = await supabase
                    .from('vault_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('family_id', profile.family_id)

                // Fetch next upcoming event
                const { data: nextEvents } = await supabase
                    .from('events')
                    .select('*')
                    .eq('family_id', profile.family_id)
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(1)

                setStats({
                    profiles: profiles || [],
                    fridgeNotes: notes || [],
                    karmaPoints: profile.points || 0,
                    neededShopItems: shopCount || 0,
                    vaultCount: vaultCount || 0,
                    nextEvent: nextEvents?.[0] || null
                })
            }
            setIsLoading(false)
        }
        fetchDashboardData()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-[#edeff2] p-4 md:p-8 font-sans">
            {/* Header section identical to image */}
            <header className="flex items-center justify-between mb-8 max-w-[1400px] mx-auto">
                <div className="space-y-1">
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-indigo-400">
                            CADARIO HUB
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/40">
                        <Clock className="w-4 h-4" />
                        <span className="capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <span>•</span>
                        <span className="text-emerald-500 font-medium">En direct</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                        {stats.profiles.map((p, i) => (
                            <Avatar key={i} className="border-4 border-black w-10 h-10 ring-1 ring-white/10">
                                {p.avatar_url ? (
                                    <AvatarImage src={p.avatar_url} alt={p.full_name || 'Avatar'} />
                                ) : (
                                    <AvatarFallback className="text-[10px] font-bold text-white" style={{ backgroundColor: p.color_code || '#8b5cf6' }}>
                                        {p.full_name?.[0] || 'U'}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                        ))}
                    </div>

                    <div className="h-8 w-[1px] bg-white/10 mx-2" />

                    <button
                        onClick={handleNotificationsClick}
                        className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors relative"
                    >
                        <Bell className="w-5 h-5 text-white/70" />
                        {hasUnreadNotifications && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full" />
                        )}
                    </button>

                    <Link href="/settings">
                        <div className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <Settings className="w-5 h-5 text-white/70" />
                        </div>
                    </Link>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Section: Main HUB Card (col-span 8) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <Card className="bg-[#151516] border-white/10 rounded-[32px] overflow-hidden flex flex-col h-full border-[1.5px]">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-violet-500/20 rounded-2xl border border-violet-500/30">
                                    <Grid className="w-6 h-6 text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">CADARIO Family Hub</h2>
                                    <p className="text-sm text-white/50">Le nouveau "Système d&apos;Exploitation" de Tribu</p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-8 pt-4 flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Serenity Block */}
                                <div className="bg-[#b4a9e1] rounded-[24px] p-6 text-[#1a1a1c] flex flex-col gap-4 min-h-[200px]">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-black/10 rounded-full">
                                            <div className="w-5 h-5 bg-[#7c6ec7] rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <span className="font-bold tracking-tight uppercase text-sm">SERENITÉ MAX</span>
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium opacity-80">
                                        Toutes les infos clés enfin sorties de WhatsApp. Plus besoin de tout demander à chaque fois.
                                    </p>
                                </div>

                                {/* Shopping mini-block status */}
                                <div className="bg-[#b5dfd0] rounded-[24px] p-6 text-[#1a1a1c] flex flex-col justify-center items-center text-center gap-2 min-h-[200px]">
                                    <p className="text-lg font-bold leading-tight">
                                        {stats.neededShopItems > 0
                                            ? `Attention ! ${stats.neededShopItems} articles à ne pas oublier !`
                                            : "Fini ! Plus rien à prévoir pour le moment."
                                        }
                                    </p>
                                    <Link href="/#shopping" className="text-xs font-bold underline mt-2">Voir la liste</Link>
                                </div>
                            </div>

                            {/* Vault mini-bar */}
                            <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-indigo-500/30 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                        <Lock className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="font-bold tracking-widest uppercase text-xs text-white/90">COFFRE-FORT DOCS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/30">{stats.vaultCount} articles</span>
                                    <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        </CardContent>

                        <div className="mt-auto border-t border-white/5 p-6 bg-black/20 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <Plus className="w-4 h-4 text-yellow-500" />
                            </div>
                            <p className="text-sm font-bold text-white/80 uppercase tracking-tight">POURQUOI VOUS ALLEZ ADORER, MAMAN ?</p>
                        </div>
                    </Card>
                </div>

                {/* Right Section: 2x2 Grid (col-span 4) */}
                <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">

                    {/* IA COURSES */}
                    <Card className="bg-[#1c1c1e] border-white/5 rounded-[28px] p-6 flex flex-col gap-4 border-[1.5px] hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20 group-hover:bg-violet-500/20 transition-all">
                                <ShoppingBag className="w-5 h-5 text-violet-400" />
                            </div>
                            <h3 className="font-bold uppercase tracking-wider text-xs">IA COURSES</h3>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">
                            Fini la liste intelligente. Zéro oublis, photos, ajout de coût ou vocal, elle sait tout.
                        </p>
                    </Card>

                    {/* MENU DU SOIR */}
                    <Card className="bg-[#1c1c1e] border-white/5 rounded-[28px] p-6 flex flex-col gap-4 border-[1.5px] hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                                <ShoppingCart className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="font-bold uppercase tracking-wider text-xs">MENU DU SOIR</h3>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">
                            La liste intelligente. Post-its express, planifier, ce soir c&apos;est la tranquillité totale.
                        </p>
                    </Card>

                    {/* FRIDGE WALL (Kartre Famille style) */}
                    <Card className="bg-[#1c1c1e] border-white/5 rounded-[28px] p-6 flex flex-col gap-4 border-[1.5px] hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 group-hover:bg-rose-500/20 transition-all">
                                <MessageSquare className="w-5 h-5 text-rose-400" />
                            </div>
                            <h3 className="font-bold uppercase tracking-wider text-xs">MUR DE LA TRIBU</h3>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">
                            Post-its, photos... tout est là pour garder le lien et s&apos;organiser en famille.
                        </p>
                    </Card>

                    {/* KARMA FAMILLE */}
                    <Card className="bg-[#1c1c1e] border-white/5 rounded-[28px] p-6 flex flex-col gap-4 border-[1.5px] hover:border-white/10 transition-all group relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                                    <Trophy className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h3 className="font-bold uppercase tracking-wider text-xs">KARMA FAMILLE</h3>
                            </div>
                            <span className="text-xs font-bold text-white/20">{stats.karmaPoints}</span>
                        </div>

                        {stats.neededShopItems > 0 && (
                            <div className="mt-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-white">!</span>
                                </div>
                                <p className="text-[11px] font-bold text-rose-400 leading-snug">
                                    Hop ! {stats.neededShopItems} article{stats.neededShopItems > 1 ? 's' : ''} à ne pas oublier d&apos;acheter !
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            </main>

            {/* Notification Panel (Overlay) */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-start justify-end p-8 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="w-80 bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl p-6 pointer-events-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-white/40">Notifications</h4>
                            <button onClick={() => setShowNotifications(false)} className="text-white/20 hover:text-white transition-colors">
                                <Plus className="w-4 h-4 rotate-45" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <div>
                                    <p className="text-sm font-medium">Liste de courses mise à jour</p>
                                    <p className="text-xs text-white/40 mt-0.5">Il y a 5 min</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-violet-500" />
                                <div>
                                    <p className="text-sm font-medium">Nouveau sondage disponible</p>
                                    <p className="text-xs text-white/40 mt-0.5">Il y a 1 heure</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-white/20 pt-6 uppercase tracking-tighter cursor-default">
                            Notifications en temps réel activées
                        </p>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
