"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, CheckCircle2, TrendingUp, Users, Plus, Loader2, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

type Task = {
    id: string
    title: string
    points: number
    category: string
}

type Profile = {
    id: string
    full_name: string
    points: number
    color_code: string
    role: 'admin' | 'member'
}

type KarmaLog = {
    id: string
    task_description: string
    points_awarded: number
    completed_at: string
    profiles: {
        full_name: string
    }
}

export default function KarmaSystem() {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Task[]>([])
    const [leaderboard, setLeaderboard] = useState<Profile[]>([])
    const [logs, setLogs] = useState<KarmaLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isClaiming, setIsClaiming] = useState<string | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskPoints, setNewTaskPoints] = useState(10)
    const [newTaskCategory, setNewTaskCategory] = useState('Ménage')
    const [isAddingTask, setIsAddingTask] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
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
                // Fetch Tasks
                const { data: tasksData } = await supabase
                    .from('tasks')
                    .select('*')
                    .eq('family_id', profile.family_id)

                // Fetch Leaderboard (Profiles in family)
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('family_id', profile.family_id)
                    .order('points', { ascending: false })

                // Fetch Recent Activity
                const { data: logsData } = await supabase
                    .from('karma_logs')
                    .select('*, profiles(full_name)')
                    .eq('family_id', profile.family_id)
                    .order('completed_at', { ascending: false })
                    .limit(10)

                if (tasksData) setTasks(tasksData)
                if (profilesData) setLeaderboard(profilesData)
                if (logsData) setLogs(logsData as any)
                setIsLoading(false)

                // REALTIME SUBSCRIPTION
                const channel = supabase
                    .channel('karma_changes')
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'karma_logs',
                        filter: `family_id=eq.${profile.family_id}`
                    }, async (payload) => {
                        // Refresh leaderboard and logs
                        const { data: logWithProfile } = await supabase.from('karma_logs').select('*, profiles(full_name)').eq('id', payload.new.id).single()
                        if (logWithProfile) setLogs(prev => [logWithProfile as any, ...prev.slice(0, 9)])

                        const { data: updatedLeaderboard } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('family_id', profile.family_id)
                            .order('points', { ascending: false })
                        if (updatedLeaderboard) setLeaderboard(updatedLeaderboard)
                    })
                    .subscribe()

                return () => {
                    supabase.removeChannel(channel)
                }
            } else {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleClaimPoints = async (task: Task) => {
        setIsClaiming(task.id)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.id) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profile) {
                // 1. Log the Karma
                await supabase.from('karma_logs').insert({
                    profile_id: user.id,
                    family_id: profile.family_id,
                    task_description: task.title,
                    points_awarded: task.points
                })

                // 2. Update Profile Points
                const newPoints = (profile.points || 0) + task.points
                await supabase.from('profiles').update({ points: newPoints }).eq('id', user.id)

                // Refresh Data
                const { data: updatedLeaderboard } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('family_id', profile.family_id)
                    .order('points', { ascending: false })

                const { data: updatedLogs } = await supabase
                    .from('karma_logs')
                    .select('*, profiles(full_name)')
                    .eq('family_id', profile.family_id)
                    .order('completed_at', { ascending: false })
                    .limit(10)

                if (updatedLeaderboard) setLeaderboard(updatedLeaderboard)
                if (updatedLogs) setLogs(updatedLogs as any)

                alert(`Bravo ! +${task.points} points pour la tribu.`)
            }
        } catch (error) {
            console.error(error)
            alert("Erreur lors de la réclamation des points.")
        } finally {
            setIsClaiming(null)
        }
    }

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return
        setIsAddingTask(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('family_id')
                .eq('id', user.id)
                .single()

            if (profile?.family_id) {
                const { data: newTask, error } = await supabase
                    .from('tasks')
                    .insert({
                        family_id: profile.family_id,
                        title: newTaskTitle,
                        points: newTaskPoints,
                        category: newTaskCategory
                    })
                    .select()
                    .single()

                if (error) throw error

                if (newTask) {
                    setTasks(prev => [...prev, newTask])
                    setNewTaskTitle('')
                    setNewTaskPoints(10)
                    setIsDialogOpen(false)
                }
            }
        } catch (error) {
            console.error(error)
            alert("Erreur lors de l'ajout de la tâche.")
        } finally {
            setIsAddingTask(false)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        try {
            await supabase.from('tasks').delete().eq('id', taskId)
            setTasks(prev => prev.filter(t => t.id !== taskId))
        } catch (error) {
            console.error(error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Leaderboard */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-6 h-6 text-emerald-400" />
                        <h2 className="text-xl font-bold">Classement Karma</h2>
                    </div>

                    <div className="space-y-4">
                        {leaderboard.map((user, i) => (
                            <motion.div
                                key={user.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
                                        style={{ backgroundColor: user.color_code || '#8b5cf6' }}
                                    >
                                        {user.full_name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{user.full_name || 'Utilisateur'}</h3>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{user.role}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-emerald-400 font-bold">{user.points || 0}</div>
                                    <div className="text-[10px] text-white/20">POINTS</div>
                                </div>
                            </motion.div>
                        ))}
                        {leaderboard.length === 0 && (
                            <p className="text-white/20 text-center text-sm py-4 italic">Aucun profil trouvé.</p>
                        )}
                    </div>
                </div>

                {/* Tasks & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold mb-2">Gagnez du Karma.</h2>
                            <p className="text-white/60 mb-6 max-w-sm">Aidez la tribu et débloquez des privilèges ou de l'argent de poche.</p>
                            <Button onClick={() => setIsDialogOpen(true)} className="bg-white text-black hover:bg-white/90 rounded-xl px-8 py-6 text-lg font-bold">
                                Gérer les tâches <Plus className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                        <TrendingUp className="absolute -right-12 -bottom-12 w-64 h-64 text-white/5 rotate-12" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tasks.map(task => (
                            <Card key={task.id} className="bg-[#161617] border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            disabled={isClaiming === task.id}
                                            onClick={() => handleClaimPoints(task)}
                                            className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors"
                                        >
                                            {isClaiming === task.id ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                        </button>
                                        <div>
                                            <h4 className="font-medium">{task.title}</h4>
                                            <Badge variant="secondary" className="bg-white/5 text-[9px] text-white/40 border-none px-1 h-4">{task.category}</Badge>
                                        </div>
                                    </div>
                                    <div className="text-emerald-400 font-bold">+{task.points}</div>
                                </CardContent>
                            </Card>
                        ))}
                        {tasks.length === 0 && (
                            <div className="col-span-full border-2 border-dashed border-white/5 rounded-2xl p-8 text-center text-white/20">
                                <p>Aucune tâche disponible pour l'instant.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Activity Logs */}
            <div className="bg-[#161617] rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Activité Récente</h3>
                    <Users className="w-4 h-4 text-white/20" />
                </div>
                <ScrollArea className="h-64">
                    <div className="p-6 space-y-6">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-sm">
                                    <span className="font-bold text-white">{log.profiles?.full_name || 'Quelqu\'un'}</span> a terminé <span className="text-white/80">"{log.task_description}"</span>
                                </p>
                                <span className="ml-auto text-[10px] text-white/20 font-mono italic">
                                    {new Date(log.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <p className="text-center text-white/20 py-8">Aucune activité récente.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Task Management Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#1c1c1e] border-white/10 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gérer les Tâches</DialogTitle>
                        <DialogDescription className="text-white/40">
                            Ajoutez ou supprimez des tâches pour gagner des points Karma.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Existing Tasks */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                    <div>
                                        <p className="font-medium">{task.title}</p>
                                        <p className="text-xs text-emerald-400">+{task.points} pts</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {tasks.length === 0 && (
                                <p className="text-center text-white/20 py-4">Aucune tâche. Ajoutez-en une !</p>
                            )}
                        </div>

                        {/* New Task Form */}
                        <div className="border-t border-white/10 pt-4 space-y-3">
                            <Input
                                placeholder="Nom de la tâche (ex: Sortir les poubelles)"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="bg-black/30 border-white/10"
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Points"
                                    value={newTaskPoints}
                                    onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                                    className="bg-black/30 border-white/10 w-24"
                                />
                                <select
                                    value={newTaskCategory}
                                    onChange={(e) => setNewTaskCategory(e.target.value)}
                                    className="flex-1 bg-black/30 border border-white/10 rounded-md px-3 text-sm"
                                >
                                    <option value="Ménage">Ménage</option>
                                    <option value="Cuisine">Cuisine</option>
                                    <option value="Courses">Courses</option>
                                    <option value="Animaux">Animaux</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleAddTask}
                            disabled={isAddingTask || !newTaskTitle.trim()}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isAddingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter la tâche'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
