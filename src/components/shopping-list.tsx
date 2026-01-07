"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Mic, Send, Plus, Trash2, Check, Sparkles, Loader2, Eraser, Users, LayoutList, LayoutGrid, Heart, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { parseShoppingListAI, getRecipeIngredients } from '@/lib/ai-parser'

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
    const [recipeToLoad, setRecipeToLoad] = useState<string | null>(null)
    const [persons, setPersons] = useState(4)
    const [viewMode, setViewMode] = useState<'list' | 'group'>('list')
    const [favoriteItems, setFavoriteItems] = useState<ShoppingItem[]>([])

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

    const groupedItems = useMemo(() => {
        const groups: Record<string, ShoppingItem[]> = {}
        items.forEach(item => {
            if (!groups[item.category]) groups[item.category] = []
            groups[item.category].push(item)
        })
        return groups
    }, [items])

    const fetchFavorites = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
        if (profile?.family_id) {
            const { data } = await supabase
                .from('shopping_items')
                .select('*')
                .eq('family_id', profile.family_id)
                .eq('is_favorite', true)
                .order('name')
            if (data) setFavoriteItems(data)
        }
    }

    useEffect(() => {
        fetchFavorites()
    }, [])


    const handleAddItem = async () => {
        if (!input.trim()) return

        // Check if it looks like a natural language command
        const isNaturalLanguage = input.split(' ').length > 2 || / et | pour | de /.test(input);

        if (isNaturalLanguage) {
            setIsParsing(true)
            try {
                const result = await parseShoppingListAI(input)

                let isRecipe = false
                if (result.recipe) {
                    setRecipeToLoad(result.recipe)
                    isRecipe = true
                }

                const { data: { user } } = await supabase.auth.getUser()
                if (!user || !user.id) return

                const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

                if (profile?.family_id && !isRecipe) {
                    for (const item of result.items) {
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
                if (newItem) {
                    setItems(prev => [newItem, ...prev])
                    // Refresh favorites if it was marked as favorite (simple add case)
                    if (newItem.is_favorite) fetchFavorites()
                }
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

    const toggleFavorite = async (id: string, currentFavorite: boolean) => {
        const newFavorite = !currentFavorite
        setItems(items.map(i => i.id === id ? { ...i, is_favorite: newFavorite } : i))
        await supabase.from('shopping_items').update({ is_favorite: newFavorite }).eq('id', id)
        fetchFavorites()
    }

    const quickAddFromFavorite = async (fav: ShoppingItem) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !user.id) return

        const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

        if (profile?.family_id) {
            const { data: newItem } = await supabase.from('shopping_items').insert({
                family_id: profile.family_id,
                name: fav.name,
                category: fav.category,
                status: 'needed',
                is_favorite: true
            }).select().single()
            if (newItem) setItems(prev => [newItem, ...prev])
        }
    }

    const clearBoughtItems = async () => {
        const boughtIds = items.filter(i => i.status === 'bought').map(i => i.id)
        if (boughtIds.length === 0) return

        setItems(items.filter(i => i.status !== 'bought'))
        await supabase.from('shopping_items').delete().in('id', boughtIds)
    }

    const confirmRecipe = async () => {
        if (!recipeToLoad) return

        const ingredients = getRecipeIngredients(recipeToLoad, persons)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !user.id) return

        const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

        if (profile?.family_id) {
            for (const item of ingredients) {
                const { data: newItem } = await supabase.from('shopping_items').insert({
                    family_id: profile.family_id,
                    name: item.name + (item.quantity ? ` (${item.quantity})` : ''),
                    category: item.category,
                    status: 'needed',
                    is_favorite: false
                }).select().single()

                if (newItem) setItems(prev => [newItem, ...prev])
            }
        }
        setRecipeToLoad(null)
        setInput('')
        setIsParsing(false)
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
                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mr-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('list')}
                            className={`h-8 w-8 rounded-lg ${viewMode === 'list' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <LayoutList className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('group')}
                            className={`h-8 w-8 rounded-lg ${viewMode === 'group' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearBoughtItems}
                        className="border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-500/50"
                    >
                        <Eraser className="w-4 h-4 mr-2" /> Nettoyer
                    </Button>
                </div>
            </div>

            {/* Favorites Quick Add */}
            {favoriteItems.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
                        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">Favoris de la famille</h3>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                        {favoriteItems.map(fav => {
                            const memberMatch = fav.name.match(/\(Pour (\w+)\)/i);
                            const memberName = memberMatch ? memberMatch[1] : null;
                            const displayName = memberName ? fav.name.replace(`(Pour ${memberName})`, '').trim() : fav.name;

                            return (
                                <button
                                    key={`fav-${fav.id}`}
                                    onClick={() => quickAddFromFavorite(fav)}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 rounded-2xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap group/fav"
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white/80 group-hover/fav:text-orange-300">{displayName}</span>
                                            <Plus className="w-3 h-3 text-orange-500 opacity-0 group-hover/fav:opacity-100 transition-opacity" />
                                        </div>
                                        {memberName && (
                                            <span className="text-[9px] text-orange-400 font-bold uppercase flex items-center gap-1">
                                                <User className="w-2 h-2" /> {memberName}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {viewMode === 'list' ? (
                        items.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                            >
                                <Card className={`border-0 flex items-center p-4 group transition-all ${item.status === 'bought' ? 'bg-white/5 opacity-50' : 'bg-[#1c1c1e] hover:bg-white/10 shadow-xl'}`}>
                                    <button
                                        onClick={() => toggleStatus(item.id, item.status)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${item.status === 'bought' ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/30' : 'border-white/20 hover:border-orange-500'}`}
                                    >
                                        {item.status === 'bought' && <Check className="w-3 h-3 text-black" />}
                                    </button>

                                    <div className="grow">
                                        <p className={`font-medium ${item.status === 'bought' ? 'line-through text-white/30' : 'text-white'}`}>
                                            {item.name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-orange-300/60 uppercase tracking-widest">{item.category}</span>
                                            {item.is_favorite && <Heart className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleFavorite(item.id, item.is_favorite)}
                                            className={`h-8 w-8 ${item.is_favorite ? 'text-orange-500' : 'text-white/20 hover:text-orange-500'}`}
                                        >
                                            <Heart className={`w-4 h-4 ${item.is_favorite ? 'fill-orange-500' : ''}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-white/20 hover:text-rose-400 h-8 w-8">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    ) : (
                        Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <div key={category} className="space-y-2">
                                <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    {category}
                                    <span className="ml-auto text-[10px] font-normal lowercase opacity-50">{categoryItems.length} articles</span>
                                </h3>
                                {categoryItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        layout
                                    >
                                        <Card className={`border-0 flex items-center p-3 group transition-all ${item.status === 'bought' ? 'bg-white/5 opacity-50' : 'bg-[#1c1c1e]/50 hover:bg-white/5'}`}>
                                            <button
                                                onClick={() => toggleStatus(item.id, item.status)}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors ${item.status === 'bought' ? 'bg-orange-500 border-orange-500' : 'border-white/20 hover:border-orange-500'}`}
                                            >
                                                {item.status === 'bought' && <Check className="w-2.5 h-2.5 text-black" />}
                                            </button>
                                            <div className="grow">
                                                <p className={`text-sm ${item.status === 'bought' ? 'line-through text-white/20' : 'text-white/80'}`}>
                                                    {item.name}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-white/10 hover:text-rose-400 h-8 w-8 opacity-100 transition-opacity">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        ))
                    )}
                    {items.length === 0 && (
                        <div className="text-center py-12 text-white/20">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Liste vide. Profitez-en !</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Recipe Dialog */}
            <Dialog open={!!recipeToLoad} onOpenChange={(open) => !open && setRecipeToLoad(null)}>
                <DialogContent className="bg-[#1c1c1e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-300">
                            <Sparkles className="w-5 h-5" /> Recette détectée !
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <p className="text-white/70">
                            Voulez-vous ajouter les ingrédients pour le **{recipeToLoad}** ?
                        </p>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-orange-400" />
                                <span className="font-medium">Nombre de personnes</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setPersons(p => Math.max(1, p - 1))}
                                    className="h-8 w-8 text-white/40 hover:text-white"
                                >-</Button>
                                <span className="text-xl font-bold w-4 text-center">{persons}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setPersons(p => p + 1)}
                                    className="h-8 w-8 text-white/40 hover:text-white"
                                >+</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRecipeToLoad(null)}>Annuler</Button>
                        <Button className="bg-orange-500 hover:bg-orange-600" onClick={confirmRecipe}>
                            Ajouter les ingrédients
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
