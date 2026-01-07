"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Mic, Send, Plus, Trash2, Check, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { parseShoppingListAI } from '@/lib/ai-parser'

type ShoppingItem = {
    id: string
    name: string
    category: string
    status: 'needed' | 'bought'
    is_favorite: boolean
}

export default function ShoppingList() {
    const supabase = createClient()
    const [input, setInput] = useState('')
    const [isParsing, setIsParsing] = useState(false)
    const [items, setItems] = useState<ShoppingItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch items
    useEffect(() => {
        const fetchItems = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user || !user.id) {
                setIsLoading(false)
                return
            }

            const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
            if (profile?.family_id) {
                const { data } = await supabase
                    .from('shopping_items')
                    .select('*')
                    .eq('family_id', profile.family_id)
                    .order('created_at', { ascending: false })
                if (data) setItems(data)
                setIsLoading(false)

                // REALTIME SUBSCRIPTION
                const channel = supabase
                    .channel('shopping_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'shopping_items',
                        filter: `family_id=eq.${profile.family_id}`
                    }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            // Prevent duplicates
                            setItems(prev => {
                                if (prev.some(item => item.id === payload.new.id)) return prev
                                return [payload.new as any, ...prev]
                            })
                        } else if (payload.eventType === 'UPDATE') {
                            setItems(prev => prev.map(item => item.id === payload.new.id ? (payload.new as any) : item))
                        } else if (payload.eventType === 'DELETE') {
                            setItems(prev => prev.filter(item => item.id !== payload.old.id))
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
        fetchItems()
    }, [])


    const handleAddItem = async () => {
        if (!input.trim()) return

        // Check if it looks like a natural language command
        const isNaturalLanguage = input.split(' ').length > 2 || / et | pour | de /.test(input);

        if (isNaturalLanguage) {
            setIsParsing(true)
            try {
                const parsedItems = await parseShoppingListAI(input)

                const { data: { user } } = await supabase.auth.getUser()
                if (!user || !user.id) return

                const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

                if (profile?.family_id) {
                    for (const item of parsedItems) {
                        const { data: newItem } = await supabase.from('shopping_items').insert({
                            family_id: profile.family_id,
                            name: item.name + (item.quantity ? ` (${item.quantity})` : ''),
                            category: item.category,
                            status: 'needed'
                        }).select().single()

                        if (newItem) setItems(prev => [newItem, ...prev])
                    }
                }
            } catch (e) {
                console.error(e)
            } finally {
                setIsParsing(false)
                setInput('')
            }
        } else {
            // Simple Add
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.id) return

            const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

            if (profile?.family_id) {
                const { data: newItem } = await supabase.from('shopping_items').insert({
                    family_id: profile.family_id,
                    name: input,
                    category: 'Divers',
                    status: 'needed'
                }).select().single()
                if (newItem) setItems(prev => [newItem, ...prev])
                setInput('')
            }
        }
    }

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'needed' ? 'bought' : 'needed'
        setItems(items.map(i => i.id === id ? { ...i, status: newStatus } : i))
        await supabase.from('shopping_items').update({ status: newStatus }).eq('id', id)
    }

    const deleteItem = async (id: string) => {
        setItems(items.filter(i => i.id !== id))
        await supabase.from('shopping_items').delete().eq('id', id)
    }

    const startListening = () => {
        alert("Simulation: 'Je vous écoute...' (Tapez votre commande pour tester l'IA)")
        setInput("Prendre du lait et 12 oeufs pour demain")
    }

    if (isLoading) return <div className="p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-orange-300 flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6" /> Courses Intelligentes
                    </h2>
                    <p className="text-white/40 text-sm">Dites ce qu'il vous faut, Gemini s'occupe du reste.</p>
                </div>
            </div>

            {/* Input Zone */}
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    {isParsing ? <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" /> : <Plus className="w-5 h-5 text-white/30" />}
                </div>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="Ex: 'Du lait et des piles' ou 'Ajouter Café'"
                    className="pl-10 pr-24 py-6 bg-white/5 border-white/10 rounded-2xl text-lg backdrop-blur-xl focus:ring-orange-500/50"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="text-white/40 hover:text-orange-400" onClick={startListening}>
                        <Mic className="w-5 h-5" />
                    </Button>
                    <Button size="icon" className="bg-orange-500 hover:bg-orange-600 rounded-xl" onClick={handleAddItem} disabled={isParsing}>
                        {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            layout
                        >
                            <Card className={`border-0 flex items-center p-4 group transition-all ${item.status === 'bought' ? 'bg-white/5 opacity-50' : 'bg-[#1c1c1e] hover:bg-white/10'}`}>
                                <button
                                    onClick={() => toggleStatus(item.id, item.status)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${item.status === 'bought' ? 'bg-orange-500 border-orange-500' : 'border-white/20 hover:border-orange-500'}`}
                                >
                                    {item.status === 'bought' && <Check className="w-3 h-3 text-black" />}
                                </button>

                                <div className="grow">
                                    <p className={`font-medium ${item.status === 'bought' ? 'line-through text-white/30' : 'text-white'}`}>
                                        {item.name}
                                    </p>
                                    <p className="text-[10px] text-orange-300/60 uppercase tracking-widest">{item.category}</p>
                                </div>

                                <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </Card>
                        </motion.div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-12 text-white/20">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Liste vide. Profitez-en !</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
