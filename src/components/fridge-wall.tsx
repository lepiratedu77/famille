"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Plus, Trash2, Loader2, StickyNote } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

type FridgeNote = {
    id: string
    content: string
    color: string
    created_at: string
    profile_id: string
    profiles: {
        full_name: string
    }
}

const COLORS = [
    { name: 'Jaune', code: '#fef08a', text: 'text-yellow-900', bg: 'bg-yellow-200' },
    { name: 'Rose', code: '#fbcfe8', text: 'text-pink-900', bg: 'bg-pink-200' },
    { name: 'Bleu', code: '#bfdbfe', text: 'text-blue-900', bg: 'bg-blue-200' },
    { name: 'Vert', code: '#bbf7d0', text: 'text-emerald-900', bg: 'bg-emerald-200' },
]

export default function FridgeWall() {
    const supabase = createClient()
    const [notes, setNotes] = useState<FridgeNote[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newNoteContent, setNewNoteContent] = useState('')
    const [selectedColor, setSelectedColor] = useState(COLORS[0])
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    useEffect(() => {
        const fetchNotes = async () => {
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
                    .from('fridge_notes')
                    .select('*, profiles(full_name)')
                    .eq('family_id', profile.family_id)
                    .order('created_at', { ascending: false })

                if (data) setNotes(data as any)
                setIsLoading(false)

                // REALTIME SUBSCRIPTION
                const channel = supabase
                    .channel('fridge_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'fridge_notes',
                        filter: `family_id=eq.${profile.family_id}`
                    }, async (payload) => {
                        if (payload.eventType === 'INSERT') {
                            // Fetch profile name for the new note
                            const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', payload.new.profile_id).single()
                            const newNote = { ...payload.new, profiles: { full_name: prof?.full_name || 'Inconnu' } }
                            setNotes(prev => [newNote as any, ...prev])
                        } else if (payload.eventType === 'DELETE') {
                            setNotes(prev => prev.filter(n => n.id !== payload.old.id))
                        }
                    })
                    .subscribe()

                return () => {
                    supabase.removeChannel(channel)
                }
            } else {
                setIsLoading(false)
            }
        }
        fetchNotes()
    }, [])


    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return
        setIsAdding(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.id) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('family_id')
                .eq('id', user.id)
                .single()

            if (profile) {
                const { error } = await supabase.from('fridge_notes').insert({
                    family_id: profile.family_id,
                    profile_id: user.id,
                    content: newNoteContent,
                    color: selectedColor.code,
                    type: 'note'
                })

                if (error) throw error

                // Refresh
                const { data: refreshed } = await supabase
                    .from('fridge_notes')
                    .select('*, profiles(full_name)')
                    .eq('family_id', profile.family_id)
                    .order('created_at', { ascending: false })

                if (refreshed) setNotes(refreshed as any)

                setIsDialogOpen(false)
                setNewNoteContent('')
            }
        } catch (error) {
            console.error(error)
            alert("Erreur lors de l'ajout de la note.")
        } finally {
            setIsAdding(false)
        }
    }

    const handleDeleteNote = async (id: string) => {
        try {
            const { error } = await supabase.from('fridge_notes').delete().eq('id', id)
            if (error) throw error
            setNotes(notes.filter(n => n.id !== id))
        } catch (error) {
            console.error(error)
            alert("Erreur lors de la suppression.")
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-violet-300 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6" /> Le Frigo Digital
                    </h2>
                    <p className="text-white/40 text-sm">Petits mots, rappels et humeur de la tribu.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> Laisser une note
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#161617] border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Nouveau Post-it</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2 justify-center">
                                {COLORS.map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => setSelectedColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor.code === c.code ? 'border-white scale-110' : 'border-transparent opacity-50'}`}
                                        style={{ backgroundColor: c.code }}
                                    />
                                ))}
                            </div>
                            <textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                className={`w-full h-32 rounded-xl p-4 text-lg font-medium shadow-inner focus:outline-none transition-colors ${selectedColor.bg} ${selectedColor.text}`}
                                placeholder="Écris ton message ici..."
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddNote} disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 w-full font-bold">
                                {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <StickyNote className="w-4 h-4 mr-2" /> Coller sur le frigo
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[400px]">
                <AnimatePresence>
                    {notes.map((note, i) => {
                        const style = COLORS.find(c => c.code === note.color) || COLORS[0]
                        return (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, scale: 0.8, rotate: i % 2 === 0 ? -2 : 2 }}
                                animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -1 : 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                                className={`relative p-6 aspect-square shadow-xl flex flex-col justify-between ${style.bg} ${style.text} cursor-default`}
                                style={{ boxShadow: '5px 5px 15px rgba(0,0,0,0.3)' }}
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-0 hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-black/10 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xl font-medium leading-snug break-words">
                                    {note.content}
                                </p>
                                <div className="mt-4 border-t border-black/5 pt-2 flex items-center justify-between opacity-50">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{note.profiles?.full_name}</span>
                                    <span className="text-[10px] italic">
                                        {new Date(note.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {notes.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl p-12 text-white/10">
                        <MessageSquare className="w-16 h-16 mb-4" />
                        <p className="text-xl">Le frigo est vide...</p>
                        <p className="text-sm">Soyez le premier à laisser un mot !</p>
                    </div>
                )}
            </div>
        </div>
    )
}
