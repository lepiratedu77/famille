"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Trophy,
    Clock,
    Settings,
    Bell,
    Loader2,
    Wifi,
    KeyRound,
    FileText,
    ShoppingCart,
    Crown,
    Sparkles,
    Calendar,
    MessageSquare,
    Lock,
    Vote,
    Plus,
    Pencil,
    Check,
    X,
    Phone,
    Mail,
    Home,
    Car,
    CreditCard,
    Heart,
    Star
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Available icons for shortcuts
const ICON_OPTIONS = {
    Wifi, KeyRound, FileText, ShoppingCart, Phone, Mail, Home, Car, CreditCard, Heart, Star, Lock
}

// Color options
const COLOR_OPTIONS = ['blue', 'emerald', 'violet', 'orange', 'rose', 'amber', 'cyan', 'pink']

type Shortcut = {
    id?: string
    slot: number
    label: string
    value: string
    icon: string
    color: string
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
    { slot: 1, label: 'Wi-Fi', value: 'MOTDEPASSE_WIFI', icon: 'Wifi', color: 'blue' },
    { slot: 2, label: 'Code', value: '1234A', icon: 'KeyRound', color: 'emerald' },
    { slot: 3, label: 'Papiers', value: 'vault', icon: 'FileText', color: 'violet' },
    { slot: 4, label: '+Course', value: 'shopping', icon: 'ShoppingCart', color: 'orange' }
]

export default function BentoDashboard() {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(true)
    const [showNotifications, setShowNotifications] = useState(false)
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true)
    const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS)
    const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [familyId, setFamilyId] = useState<string | null>(null)
    const [copiedShortcut, setCopiedShortcut] = useState<number | null>(null)
    const [stats, setStats] = useState({
        profiles: [] as any[],
        karmaLeader: null as any,
        neededShopItems: 0,
        vaultCount: 0,
        nextEvent: null as any,
        fridgeNotesCount: 0,
        pollsCount: 0
    })

    const handleNotificationsClick = () => {
        setShowNotifications(!showNotifications)
        if (!showNotifications) {
            setHasUnreadNotifications(false)
        }
    }

    // Copy shopping list from database
    const copyShoppingList = async (slot: number) => {
        if (!familyId) return

        const { data: items } = await supabase
            .from('shopping_items')
            .select('name, status')
            .eq('family_id', familyId)
            .eq('status', 'needed')
            .order('created_at', { ascending: false })

        if (!items || items.length === 0) {
            setCopiedShortcut(slot)
            setTimeout(() => setCopiedShortcut(null), 1500)
            return
        }

        let listText = '🛒 LISTE CADARIO :\n'
        items.forEach(item => {
            listText += `- ${item.name}\n`
        })
        listText += `\n(${items.length} article${items.length > 1 ? 's' : ''})`

        navigator.clipboard.writeText(listText)
        setCopiedShortcut(slot)
        setTimeout(() => setCopiedShortcut(null), 1500)
    }

    // Execute shortcut action
    const executeShortcut = async (shortcut: Shortcut) => {
        // Shopping list special case - fetch from DB
        if (shortcut.value === 'shopping' || shortcut.label.toLowerCase().includes('course')) {
            await copyShoppingList(shortcut.slot)
            return
        }
        // Navigation shortcuts
        if (shortcut.value === 'vault') {
            return // Let Link handle it
        }
        // Otherwise, copy value to clipboard
        navigator.clipboard.writeText(shortcut.value)
        setCopiedShortcut(shortcut.slot)
        setTimeout(() => setCopiedShortcut(null), 1500)
    }

    // Open edit dialog
    const openEditDialog = (shortcut: Shortcut, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingShortcut({ ...shortcut })
        setIsEditDialogOpen(true)
    }

    // Save shortcut
    const saveShortcut = async () => {
        if (!editingShortcut || !familyId) return

        try {
            const { error } = await supabase
                .from('family_shortcuts')
                .upsert({
                    family_id: familyId,
                    slot: editingShortcut.slot,
                    label: editingShortcut.label,
                    value: editingShortcut.value,
                    icon: editingShortcut.icon,
                    color: editingShortcut.color
                }, { onConflict: 'family_id,slot' })

            if (error) throw error

            // Update local state
            setShortcuts(prev => prev.map(s => s.slot === editingShortcut.slot ? editingShortcut : s))
            setIsEditDialogOpen(false)
        } catch (e) {
            console.error('Error saving shortcut:', e)
            // Fallback: still update local state
            setShortcuts(prev => prev.map(s => s.slot === editingShortcut.slot ? editingShortcut : s))
            setIsEditDialogOpen(false)
        }
    }

    // Get icon component
    const getIconComponent = (iconName: string) => {
        return ICON_OPTIONS[iconName as keyof typeof ICON_OPTIONS] || KeyRound
    }

    // Get color classes
    const getColorClasses = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400',
            emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400',
            violet: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400',
            orange: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 text-orange-400',
            rose: 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400',
            amber: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400',
            cyan: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-400',
            pink: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20 text-pink-400'
        }
        return colors[color] || colors.blue
    }

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user || !user.id) {
                setIsLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('family_id, points')
                .eq('id', user.id)
                .single()

            if (profile?.family_id) {
                setFamilyId(profile.family_id)

                // Fetch shortcuts
                const { data: shortcutsData } = await supabase
                    .from('family_shortcuts')
                    .select('*')
                    .eq('family_id', profile.family_id)
                    .order('slot')

                if (shortcutsData && shortcutsData.length > 0) {
                    setShortcuts(shortcutsData)
                }

                // Fetch all profiles for family with points
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, color_code, avatar_url, points')
                    .eq('family_id', profile.family_id)
                    .order('points', { ascending: false })

                const leader = profiles?.[0] || null

                const { count: shopCount } = await supabase
                    .from('shopping_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('family_id', profile.family_id)
                    .eq('status', 'needed')

                const { count: vaultCount } = await supabase
                    .from('vault_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('family_id', profile.family_id)

                const { count: fridgeCount } = await supabase
                    .from('fridge_notes')
                    .select('*', { count: 'exact', head: true })
                    .eq('family_id', profile.family_id)

                const { count: pollsCount } = await supabase
                    .from('polls')
                    .select('*', { count: 'exact', head: true })
                    .eq('family_id', profile.family_id)
                    .eq('status', 'open')

                const { data: nextEvents } = await supabase
                    .from('events')
                    .select('*')
                    .eq('family_id', profile.family_id)
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(1)

                setStats({
                    profiles: profiles || [],
                    karmaLeader: leader,
                    neededShopItems: shopCount || 0,
                    vaultCount: vaultCount || 0,
                    nextEvent: nextEvents?.[0] || null,
                    fridgeNotesCount: fridgeCount || 0,
                    pollsCount: pollsCount || 0
                })
            }
            setIsLoading(false)
        }
        fetchDashboardData()
    }, [])

    if (isLoading) {
        return (
            <div className="h-[100svh] bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="h-[100svh] bg-black text-white flex flex-col overflow-hidden">
            {/* HEADER - Ultra Compact */}
            <header className="shrink-0 flex items-center justify-between px-3 py-2 md:px-6 md:py-3 border-b border-white/5">
                <div>
                    <h1 className="text-lg md:text-xl font-bold tracking-tight text-indigo-400">CADARIO HUB</h1>
                    <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-white/40">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
                        <span className="text-emerald-500">• Live</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                        {stats.profiles.slice(0, 3).map((p, i) => (
                            <Avatar key={i} className="border-2 border-black w-6 h-6">
                                {p.avatar_url ? (
                                    <AvatarImage src={p.avatar_url} />
                                ) : (
                                    <AvatarFallback className="text-[7px] font-bold" style={{ backgroundColor: p.color_code || '#8b5cf6' }}>
                                        {p.full_name?.[0] || '?'}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                        ))}
                    </div>
                    <button onClick={handleNotificationsClick} className="p-1.5 rounded-full bg-white/5 relative">
                        <Bell className="w-3.5 h-3.5 text-white/60" />
                        {hasUnreadNotifications && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                    </button>
                    <Link href="/settings" className="p-1.5 rounded-full bg-white/5">
                        <Settings className="w-3.5 h-3.5 text-white/60" />
                    </Link>
                </div>
            </header>

            {/* MAIN GRID - Zero Scroll Mobile: 2 cols x 3 rows */}
            <main className="flex-1 p-1.5 md:p-3 overflow-hidden min-h-0">
                <div className="h-full grid grid-cols-2 md:grid-cols-4 grid-rows-3 md:grid-rows-2 gap-1.5 md:gap-2 max-w-[1400px] mx-auto">

                    {/* HALL OF FAME */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="col-span-2 md:col-span-1 row-span-1 min-h-0">
                        <Card className="h-full bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 border-amber-500/30 rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="absolute top-1 right-1">
                                <Sparkles className="w-3 h-3 text-amber-400/50" />
                            </motion.div>
                            <Crown className="w-4 h-4 md:w-5 md:h-5 text-amber-400 mb-1" />
                            <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-amber-300/70 mb-1">Leader</p>
                            {stats.karmaLeader && (
                                <>
                                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border-2 border-amber-400/50 mb-1">
                                        {stats.karmaLeader.avatar_url ? (
                                            <AvatarImage src={stats.karmaLeader.avatar_url} />
                                        ) : (
                                            <AvatarFallback style={{ backgroundColor: stats.karmaLeader.color_code }} className="text-sm font-bold">
                                                {stats.karmaLeader.full_name?.[0]}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <p className="font-bold text-[10px] md:text-xs text-white truncate max-w-full">{stats.karmaLeader.full_name}</p>
                                    <p className="text-sm md:text-lg font-black text-amber-400">{stats.karmaLeader.points || 0}</p>
                                </>
                            )}
                        </Card>
                    </motion.div>

                    {/* RACCOURCIS EXPRESS - EDITABLE */}
                    <Card className="col-span-2 md:col-span-1 row-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 overflow-hidden min-h-0">
                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-white/40 mb-1.5 text-center">Raccourcis</p>
                        <div className="grid grid-cols-2 gap-1.5 h-[calc(100%-18px)] min-h-0">
                            {shortcuts.map((shortcut) => {
                                const IconComponent = getIconComponent(shortcut.icon)
                                const isNavigation = shortcut.value === 'vault' || shortcut.value === 'shopping'
                                const colorClasses = getColorClasses(shortcut.color)

                                const buttonContent = (
                                    <Button
                                        variant="ghost"
                                        onClick={() => executeShortcut(shortcut)}
                                        className={`h-full w-full ${colorClasses} border rounded-xl flex flex-col items-center justify-center gap-1 relative group`}
                                    >
                                        {copiedShortcut === shortcut.slot ? (
                                            <>
                                                <Check className="w-5 h-5 text-emerald-400" />
                                                <span className="text-[9px] font-bold text-emerald-400">Copié ✅</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconComponent className="w-5 h-5" />
                                                <span className="text-[9px] font-bold">{shortcut.label}</span>
                                            </>
                                        )}
                                        {/* Edit button */}
                                        <button
                                            onClick={(e) => openEditDialog(shortcut, e)}
                                            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Pencil className="w-3 h-3 text-white/60" />
                                        </button>
                                    </Button>
                                )

                                // Only vault is a navigation link now
                                if (shortcut.value === 'vault') {
                                    return (
                                        <Link key={shortcut.slot} href="/#vault" className="contents">
                                            {buttonContent}
                                        </Link>
                                    )
                                }
                                return <div key={shortcut.slot}>{buttonContent}</div>
                            })}
                        </div>
                    </Card>

                    {/* AGENDA */}
                    <Link href="/#agenda" className="contents">
                        <Card className="col-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 hover:border-rose-500/30 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1.5 bg-rose-500/10 rounded-lg"><Calendar className="w-3 h-3 md:w-4 md:h-4 text-rose-400" /></div>
                                <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-white/40">Agenda</span>
                            </div>
                            {stats.nextEvent ? (
                                <div className="min-w-0">
                                    <p className="font-bold text-[10px] md:text-xs text-white truncate">{stats.nextEvent.title}</p>
                                    <p className="text-[8px] md:text-[9px] text-rose-400">{new Date(stats.nextEvent.start_time).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</p>
                                </div>
                            ) : (
                                <p className="text-[9px] text-white/30">Aucun</p>
                            )}
                        </Card>
                    </Link>

                    {/* COURSES */}
                    <Link href="/#shopping" className="contents">
                        <Card className="col-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 hover:border-orange-500/30 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1.5 bg-orange-500/10 rounded-lg"><ShoppingCart className="w-3 h-3 md:w-4 md:h-4 text-orange-400" /></div>
                                <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-white/40">Courses</span>
                            </div>
                            <div>
                                <p className="text-lg md:text-xl font-black text-orange-400">{stats.neededShopItems}</p>
                                <p className="text-[8px] md:text-[9px] text-white/40">article{stats.neededShopItems > 1 ? 's' : ''}</p>
                            </div>
                        </Card>
                    </Link>

                    {/* FRIGO */}
                    <Link href="/#fridge" className="contents">
                        <Card className="col-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 hover:border-yellow-500/30 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1.5 bg-yellow-500/10 rounded-lg"><MessageSquare className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" /></div>
                                <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-white/40">Frigo</span>
                            </div>
                            <div>
                                <p className="text-lg md:text-xl font-black text-yellow-400">{stats.fridgeNotesCount}</p>
                                <p className="text-[8px] md:text-[9px] text-white/40">note{stats.fridgeNotesCount > 1 ? 's' : ''}</p>
                            </div>
                        </Card>
                    </Link>

                    {/* VAULT */}
                    <Link href="/#vault" className="contents">
                        <Card className="col-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1.5 bg-indigo-500/10 rounded-lg"><Lock className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" /></div>
                                <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-white/40">Vault</span>
                            </div>
                            <div>
                                <p className="text-lg md:text-xl font-black text-indigo-400">{stats.vaultCount}</p>
                                <p className="text-[8px] md:text-[9px] text-white/40">doc{stats.vaultCount > 1 ? 's' : ''}</p>
                            </div>
                        </Card>
                    </Link>

                    {/* KARMA */}
                    <Link href="/#karma" className="contents">
                        <Card className="col-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 hover:border-emerald-500/30 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg"><Trophy className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" /></div>
                                <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-white/40">Karma</span>
                            </div>
                            <div>
                                <p className="text-lg md:text-xl font-black text-emerald-400">{stats.profiles.reduce((sum, p) => sum + (p.points || 0), 0)}</p>
                                <p className="text-[8px] md:text-[9px] text-white/40">pts total</p>
                            </div>
                        </Card>
                    </Link>

                    {/* VOTES */}
                    <Link href="/#polls" className="contents">
                        <Card className="col-span-1 bg-[#151516] border-white/10 rounded-xl p-2 md:p-3 hover:border-pink-500/30 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1.5 bg-pink-500/10 rounded-lg"><Vote className="w-3 h-3 md:w-4 md:h-4 text-pink-400" /></div>
                                <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-white/40">Votes</span>
                            </div>
                            <div>
                                <p className="text-lg md:text-xl font-black text-pink-400">{stats.pollsCount}</p>
                                <p className="text-[8px] md:text-[9px] text-white/40">actif{stats.pollsCount > 1 ? 's' : ''}</p>
                            </div>
                        </Card>
                    </Link>
                </div>
            </main>

            {/* EDIT SHORTCUT DIALOG */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-[#1c1c1e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Modifier le raccourci</DialogTitle>
                    </DialogHeader>
                    {editingShortcut && (
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-xs text-white/40 mb-1 block">Nom</label>
                                <Input
                                    value={editingShortcut.label}
                                    onChange={(e) => setEditingShortcut({ ...editingShortcut, label: e.target.value })}
                                    className="bg-black/20 border-white/10"
                                    placeholder="Ex: Wi-Fi Maison"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-white/40 mb-1 block">Valeur à copier</label>
                                <Input
                                    value={editingShortcut.value}
                                    onChange={(e) => setEditingShortcut({ ...editingShortcut, value: e.target.value })}
                                    className="bg-black/20 border-white/10"
                                    placeholder="Ex: MotDePasse123"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-white/40 mb-2 block">Icône</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(ICON_OPTIONS).map((iconName) => {
                                        const Icon = ICON_OPTIONS[iconName as keyof typeof ICON_OPTIONS]
                                        return (
                                            <button
                                                key={iconName}
                                                onClick={() => setEditingShortcut({ ...editingShortcut, icon: iconName })}
                                                className={`p-2 rounded-lg border ${editingShortcut.icon === iconName ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/10 hover:bg-white/5'}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-white/40 mb-2 block">Couleur</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_OPTIONS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setEditingShortcut({ ...editingShortcut, color })}
                                            className={`w-8 h-8 rounded-full border-2 ${editingShortcut.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: `var(--${color}-500, ${color === 'blue' ? '#3b82f6' : color === 'emerald' ? '#10b981' : color === 'violet' ? '#8b5cf6' : color === 'orange' ? '#f97316' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : color === 'cyan' ? '#06b6d4' : '#ec4899'})` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
                        <Button onClick={saveShortcut} className="bg-indigo-600 hover:bg-indigo-700">
                            <Check className="w-4 h-4 mr-2" /> Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* NOTIFICATION PANEL */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pointer-events-none">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-72 bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-4 pointer-events-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-xs uppercase tracking-widest text-white/40">Notifications</h4>
                            <button onClick={() => setShowNotifications(false)} className="text-white/20 hover:text-white">
                                <Plus className="w-4 h-4 rotate-45" />
                            </button>
                        </div>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            <div className="flex items-start gap-2 p-2 rounded-xl bg-white/5">
                                <div className="w-2 h-2 mt-1 rounded-full bg-emerald-500" />
                                <div>
                                    <p className="text-xs font-medium">Liste de courses mise à jour</p>
                                    <p className="text-[10px] text-white/40">Il y a 5 min</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
