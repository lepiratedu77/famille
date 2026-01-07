"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, Plus, MapPin, Clock, Loader2, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

type FamilyEvent = {
    id: string
    title: string
    description: string
    start_time: string
    end_time: string
    location: string
    category: string
    profiles: {
        full_name: string
    }
}

export default function CalendarSync() {
    const supabase = createClient()
    const [events, setEvents] = useState<FamilyEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        category: 'Général'
    })

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setIsLoading(true)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user || !user.id) {
            setIsLoading(false)
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('family_id')
            .eq('id', user.id)
            .single()

        if (profile?.family_id) {
            const { data } = await supabase
                .from('events')
                .select('*, profiles(full_name)')
                .eq('family_id', profile.family_id)
                .order('start_time', { ascending: true })

            if (data) setEvents(data as any)
        }
        setIsLoading(false)
    }

    const handleAddEvent = async () => {
        if (!newEvent.title || !newEvent.date || !newEvent.time) return
        setIsAdding(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.id) return

            const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

            if (profile) {
                const start = new Date(`${newEvent.date}T${newEvent.time}`)
                const end = new Date(start.getTime() + 60 * 60 * 1000) // Default 1 hour

                await supabase.from('events').insert({
                    family_id: profile.family_id,
                    profile_id: user?.id,
                    title: newEvent.title,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                    location: newEvent.location,
                    category: newEvent.category
                })

                setNewEvent({ title: '', date: '', time: '', location: '', category: 'Général' })
                fetchEvents()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsAdding(false)
        }
    }

    const deleteEvent = async (id: string) => {
        await supabase.from('events').delete().eq('id', id)
        setEvents(events.filter(e => e.id !== id))
    }

    if (isLoading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold text-rose-300 flex items-center gap-2">
                        <CalendarIcon className="w-8 h-8" /> Agenda de la Tribu
                    </h2>
                    <p className="text-white/40">Tous les rendez-vous, anniversaires et sorties.</p>
                </div>

                <Card className="bg-rose-500/5 border-rose-500/10 p-4 md:w-80">
                    <h4 className="text-sm font-bold text-rose-200 mb-3">Ajout Rapide</h4>
                    <div className="space-y-2">
                        <Input
                            placeholder="Quoi ?"
                            value={newEvent.title}
                            onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                            className="bg-black/20 border-white/5 h-8 text-xs"
                        />
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                className="bg-black/20 border-white/5 h-8 text-xs appearance-none"
                            />
                            <Input
                                type="time"
                                value={newEvent.time}
                                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                className="bg-black/20 border-white/5 h-8 text-xs"
                            />
                        </div>
                        <Button onClick={handleAddEvent} disabled={isAdding} size="sm" className="w-full bg-rose-600 hover:bg-rose-700 text-xs font-bold">
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="grid gap-4">
                {events.map((event) => (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group"
                    >
                        <Card className="bg-[#161617] border-white/5 hover:border-rose-500/30 transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex gap-6 items-center">
                                <div className="text-center min-w-[60px]">
                                    <div className="text-rose-400 font-bold text-2xl">
                                        {new Date(event.start_time).getDate()}
                                    </div>
                                    <div className="text-[10px] uppercase text-white/40 font-bold">
                                        {new Date(event.start_time).toLocaleDateString('fr-FR', { month: 'short' })}
                                    </div>
                                </div>
                                <div className="h-10 w-[1px] bg-white/5 hidden md:block" />
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[8px] h-4 border-rose-500/30 text-rose-300 uppercase">
                                            {event.category}
                                        </Badge>
                                        <h3 className="font-bold text-lg">{event.title}</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs text-white/40">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {event.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {event.location}
                                            </span>
                                        )}
                                        <span className="opacity-60">Ajouté par {event.profiles?.full_name}</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => deleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </Card>
                    </motion.div>
                ))}

                {events.length === 0 && (
                    <div className="text-center py-24 border-2 border-dashed border-white/5 rounded-3xl">
                        <CalendarIcon className="w-12 h-12 mx-auto text-white/10 mb-4" />
                        <p className="text-white/40">Aucun événement prévu.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
