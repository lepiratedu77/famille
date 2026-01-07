"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, User, ShieldCheck, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const AVATARS = [
    { id: 'lion', name: 'Lion', path: '/avatars/lion.png' },
    { id: 'fox', name: 'Renard', path: '/avatars/fox.png' },
    { id: 'owl', name: 'Hibou', path: '/avatars/owl.png' },
    { id: 'panda', name: 'Panda', path: '/avatars/panda.png' },
    { id: 'robot', name: 'Robot', path: '/avatars/robot.png' },
    { id: 'unicorn', name: 'Licorne', path: '/avatars/unicorn.png' },
]

export default function SettingsPage() {
    const supabase = createClient()
    const [profile, setProfile] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                setProfile(data)
            }
            setIsLoading(false)
        }
        fetchProfile()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        await supabase.from('profiles').update({
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
        }).eq('id', profile.id)
        setIsSaving(false)
        alert("Profil mis à jour !")
    }

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white">
            <div className="max-w-2xl mx-auto p-8 space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Paramètres Hub</h1>
                </div>

                <Card className="bg-[#161617] border-white/5 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <User className="w-5 h-5 text-violet-400" /> Mon Profil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-white/40 tracking-widest">Nom Complet</label>
                            <Input
                                value={profile?.full_name || ''}
                                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                                className="bg-black/20 border-white/10 h-12 rounded-xl focus:ring-violet-500/50"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase text-white/40 tracking-widest">
                                Choisir ton Avatar
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {AVATARS.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setProfile({ ...profile, avatar_url: avatar.path })}
                                        className={`relative group rounded-2xl overflow-hidden border-4 transition-all duration-300 ${profile?.avatar_url === avatar.path
                                                ? 'border-violet-500 scale-105 shadow-lg shadow-violet-500/30'
                                                : 'border-transparent opacity-60 hover:opacity-100 hover:border-white/20'
                                            }`}
                                    >
                                        <Image
                                            src={avatar.path}
                                            alt={avatar.name}
                                            width={120}
                                            height={120}
                                            className="w-full aspect-square object-cover"
                                        />
                                        {profile?.avatar_url === avatar.path && (
                                            <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                                                <Check className="w-8 h-8 text-white drop-shadow-lg" />
                                            </div>
                                        )}
                                        <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent py-2 text-center text-xs font-bold">
                                            {avatar.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 w-full font-bold h-12 rounded-xl shadow-lg shadow-violet-600/20">
                                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Enregistrer les modifications
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/10">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                            <ShieldCheck className="w-4 h-4" /> Statut Familial
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/60 text-sm italic">
                            Vous êtes identifié comme <span className="text-emerald-400 font-bold uppercase">{profile?.role}</span> de la tribu Cadario.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

