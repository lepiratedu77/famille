"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Plus, BarChart3, Loader2, Users, User, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

type PollVote = {
    option_index: number
    profile_id: string
    profiles?: { full_name: string }
}

type Poll = {
    id: string
    question: string
    options: string[]
    status: 'open' | 'closed'
    profile_id: string
    profiles?: { full_name: string }
    poll_votes: PollVote[]
}

export default function PollWidget() {
    const supabase = createClient()
    const [polls, setPolls] = useState<Poll[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newQuestion, setNewQuestion] = useState('')
    const [newOptions, setNewOptions] = useState(['', ''])
    const [userVotes, setUserVotes] = useState<Record<string, number>>({})
    const [expandedPoll, setExpandedPoll] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        fetchPolls()
    }, [])

    const fetchPolls = async () => {
        setIsLoading(true)
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user || !user.id) {
            setIsLoading(false)
            return
        }
        setCurrentUserId(user.id)

        const { data: profile } = await supabase
            .from('profiles')
            .select('family_id')
            .eq('id', user.id)
            .single()

        if (profile?.family_id) {
            const { data: sqlPolls } = await supabase
                .from('polls')
                .select('*, profiles(full_name), poll_votes(option_index, profile_id, profiles(full_name))')
                .eq('family_id', profile.family_id)
                .order('created_at', { ascending: false })

            if (sqlPolls) {
                setPolls(sqlPolls as any)

                // Track user's own votes
                const votesMap: Record<string, number> = {}
                sqlPolls.forEach(p => {
                    const myVote = (p.poll_votes as any[]).find(v => v.profile_id === user.id)
                    if (myVote) votesMap[p.id] = myVote.option_index
                })
                setUserVotes(votesMap)
                setIsLoading(false)

                // REALTIME SUBSCRIPTION
                const channel = supabase
                    .channel('poll_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'polls',
                        filter: `family_id=eq.${profile.family_id}`
                    }, () => fetchPolls())
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'poll_votes'
                    }, () => fetchPolls())
                    .subscribe()

                return () => {
                    supabase.removeChannel(channel)
                }
            } else {
                setIsLoading(false)
            }
        } else {
            setIsLoading(false)
        }
    }


    const handleVote = async (pollId: string, optionIndex: number) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !user.id) return

        try {
            const { error } = await supabase.from('poll_votes').upsert({
                poll_id: pollId,
                profile_id: user.id,
                option_index: optionIndex
            }, { onConflict: 'poll_id,profile_id' })

            if (error) throw error

            // Refresh local state
            setUserVotes(prev => ({ ...prev, [pollId]: optionIndex }))
            fetchPolls()
        } catch (e) {
            console.error(e)
        }
    }

    const handleCreatePoll = async () => {
        const filteredOptions = newOptions.filter(o => o.trim() !== '')
        if (!newQuestion || filteredOptions.length < 2) return

        setIsCreating(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.id) return

            const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()

            if (profile) {
                await supabase.from('polls').insert({
                    family_id: profile.family_id,
                    profile_id: user?.id,
                    question: newQuestion,
                    options: filteredOptions
                })

                setNewQuestion('')
                setNewOptions(['', ''])
                fetchPolls()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsCreating(false)
        }
    }

    const getVotersForOption = (poll: Poll, optionIndex: number) => {
        return poll.poll_votes
            .filter(v => v.option_index === optionIndex)
            .map(v => v.profiles?.full_name || 'Anonyme')
    }

    const handleDeletePoll = async (pollId: string) => {
        if (!confirm('Supprimer ce sondage ?')) return

        try {
            // D'abord supprimer les votes associés
            await supabase.from('poll_votes').delete().eq('poll_id', pollId)
            // Puis supprimer le sondage
            const { error } = await supabase.from('polls').delete().eq('id', pollId)
            if (error) throw error
            fetchPolls()
        } catch (e) {
            console.error('Erreur suppression:', e)
        }
    }

    if (isLoading) return <div className="p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-pink-400" /></div>

    return (
        <div className="space-y-6">
            <div className="bg-pink-500/5 border border-pink-500/10 p-6 rounded-3xl">
                <h3 className="text-lg font-bold text-pink-300 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Nouveau Sondage
                </h3>
                <div className="space-y-3">
                    <Input
                        value={newQuestion}
                        onChange={e => setNewQuestion(e.target.value)}
                        placeholder="La question..."
                        className="bg-black/20 border-white/10"
                    />
                    {newOptions.map((opt, i) => (
                        <Input
                            key={i}
                            value={opt}
                            onChange={e => {
                                const next = [...newOptions]
                                next[i] = e.target.value
                                setNewOptions(next)
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="bg-black/20 border-white/5 text-sm"
                        />
                    ))}
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setNewOptions([...newOptions, ''])} className="text-[10px] text-white/40">
                            + Ajouter une option
                        </Button>
                        <Button onClick={handleCreatePoll} disabled={isCreating} className="ml-auto bg-pink-600 hover:bg-pink-700 rounded-xl px-6">
                            Lancer le vote
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {polls.map(poll => {
                    const totalVotes = poll.poll_votes.length
                    const isExpanded = expandedPoll === poll.id

                    return (
                        <Card key={poll.id} className="bg-[#161617] border-white/5 overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="w-fit border-pink-500/30 text-pink-400 text-[9px] uppercase tracking-widest">
                                        EN COURS
                                    </Badge>
                                    {/* Bouton supprimer - visible seulement pour le créateur */}
                                    {poll.profile_id === currentUserId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeletePoll(poll.id)}
                                            className="h-6 w-6 text-white/20 hover:text-rose-400 hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                                <CardTitle className="text-base">{poll.question}</CardTitle>
                                {/* Créateur du sondage */}
                                <div className="flex items-center gap-1 text-[10px] text-white/30 mt-1">
                                    <User className="w-3 h-3" />
                                    <span>Créé par <span className="text-pink-300/70">{poll.profiles?.full_name || 'Inconnu'}</span></span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {poll.options.map((opt, idx) => {
                                    const voteCount = poll.poll_votes.filter(v => v.option_index === idx).length
                                    const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
                                    const isSelected = userVotes[poll.id] === idx
                                    const voters = getVotersForOption(poll, idx)

                                    return (
                                        <div key={idx} className="space-y-1">
                                            <button
                                                onClick={() => handleVote(poll.id, idx)}
                                                className={`w-full group relative h-10 rounded-lg overflow-hidden border transition-all ${isSelected ? 'border-pink-500 bg-pink-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                            >
                                                <div
                                                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${isSelected ? 'bg-pink-500/20' : 'bg-white/5'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                                <div className="relative px-4 flex justify-between items-center h-full text-sm">
                                                    <span className={isSelected ? 'font-bold text-pink-200' : 'text-white/70'}>{opt}</span>
                                                    <span className="text-[10px] opacity-40">{voteCount} ({Math.round(percent)}%)</span>
                                                </div>
                                            </button>
                                            {/* Afficher les votants si le panel est ouvert */}
                                            <AnimatePresence>
                                                {isExpanded && voters.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="pl-4 text-[10px] text-white/40 flex flex-wrap gap-1"
                                                    >
                                                        {voters.map((name, i) => (
                                                            <span key={i} className="bg-white/5 px-2 py-0.5 rounded-full">{name}</span>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })}
                            </CardContent>
                            <CardFooter className="pt-0 pb-4 text-[10px] text-white/20 flex justify-between items-center">
                                <div className="flex items-center gap-1">
                                    <BarChart3 className="w-3 h-3" /> {totalVotes} vote{totalVotes > 1 ? 's' : ''}
                                </div>
                                {/* Bouton pour voir les votants */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedPoll(isExpanded ? null : poll.id)}
                                    className="h-6 text-[10px] text-pink-300/60 hover:text-pink-300 hover:bg-pink-500/10 gap-1"
                                >
                                    <Users className="w-3 h-3" />
                                    {isExpanded ? 'Masquer' : 'Voir les votants'}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
