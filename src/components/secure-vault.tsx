"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, FileText, Plus, ShieldCheck, Eye, EyeOff, Trash2, Key, Loader2, Share2, Users, User } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { encryptData, decryptData } from '@/lib/encryption'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Type for our Vault Item
type VaultItem = {
    id: string
    title: string
    description_encrypted: string // Stores JSON { encryptedData, salt, iv }
    owner_id: string
    created_at: string
    profiles?: { full_name: string, avatar_url: string }
}

type FamilyMember = {
    id: string
    full_name: string
    avatar_url: string
}

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function SecureVault() {
    const supabase = createClient()
    const [isLocked, setIsLocked] = useState(true)
    const [masterPassword, setMasterPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [myItems, setMyItems] = useState<VaultItem[]>([])
    const [sharedItems, setSharedItems] = useState<VaultItem[]>([])
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [activeTab, setActiveTab] = useState('mine')

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newItemTitle, setNewItemTitle] = useState('')
    const [newItemContent, setNewItemContent] = useState('')

    // Sharing Dialog State
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
    const [itemToShare, setItemToShare] = useState<VaultItem | null>(null)
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])

    // Viewing State
    const [decryptedContent, setDecryptedContent] = useState<string | null>(null)
    const [viewingItemId, setViewingItemId] = useState<string | null>(null)

    // 1. Check Role, Family & Fetch Items
    useEffect(() => {
        const fetchData = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user || !user.id) return

            // Get profile for family_id and role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, family_id')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') setIsAdmin(true)

            if (profile?.family_id) {
                // Fetch family members
                const { data: members } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('family_id', profile.family_id)
                    .neq('id', user.id)

                if (members) setFamilyMembers(members)

                // Fetch My Items - simple query without complex RLS
                try {
                    const { data: myVault, error: myVaultError } = await supabase
                        .from('vault_items')
                        .select('*')
                        .eq('owner_id', user.id)
                        .order('created_at', { ascending: false })

                    if (myVaultError) {
                        console.error("Error fetching my vault items:", myVaultError)
                    } else if (myVault) {
                        setMyItems(myVault)
                    }
                } catch (e) {
                    console.error("Vault fetch error:", e)
                }

                // Fetch Shared Items - simplified query (vault_shares might not exist yet)
                try {
                    const { data: sharedVault, error: sharedError } = await supabase
                        .from('vault_shares')
                        .select('vault_item_id, vault_items(*)')
                        .eq('shared_with', user.id)

                    if (!sharedError && sharedVault) {
                        // Extract vault_items from the join result
                        const items = sharedVault
                            .map((share: any) => share.vault_items)
                            .filter((item: any) => item !== null)
                        setSharedItems(items)
                    }
                } catch (e) {
                    // vault_shares table might not exist - that's okay
                    console.log("Shared vault not available:", e)
                }
            }
        }
        fetchData()
    }, [supabase])

    const handleUnlock = () => {
        if (masterPassword.length > 0) {
            // In a real scenario, we might verify a hash of the password here,
            // but for Zero-Knowledge, we just accept it and try to decrypt with it later.
            // If decryption fails, the password was wrong.
            setIsLocked(false)
        }
    }

    const handleSave = async () => {
        if (!newItemTitle || !newItemContent) return
        setIsLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !user.id) throw new Error("No user")

            // Get family_id from user's profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('family_id')
                .eq('id', user.id)
                .single()

            if (!profile?.family_id) throw new Error("No family found")

            // 1. Encrypt
            const encryptedResult = await encryptData(newItemContent, masterPassword)
            const payload = JSON.stringify(encryptedResult)

            // 2. Insert with family_id
            const { data: insertedItem, error } = await supabase.from('vault_items').insert({
                owner_id: user.id,
                family_id: profile.family_id,
                title: newItemTitle,
                description_encrypted: payload,
                is_locked: true
            }).select().single()

            if (error) throw error

            // Add item to state directly for instant UI update
            if (insertedItem) {
                setMyItems(prev => [insertedItem, ...prev])
            }

            setIsDialogOpen(false)
            setNewItemTitle('')
            setNewItemContent('')

        } catch (e) {
            console.error("Encryption/Save Failed", e)
            alert("Erreur lors de la sauvegarde.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleShare = async () => {
        if (!itemToShare) return
        setIsLoading(true)

        try {
            // Delete existing shares first for this item (to overwrite)
            await supabase.from('vault_shares').delete().eq('vault_item_id', itemToShare.id)

            // Insert new shares
            if (selectedMembers.length > 0) {
                const shares = selectedMembers.map(memberId => ({
                    vault_item_id: itemToShare.id,
                    shared_with: memberId
                }))
                const { error } = await supabase.from('vault_shares').insert(shares)
                if (error) throw error
            }

            setIsShareDialogOpen(false)
            setItemToShare(null)
            setSelectedMembers([])
            alert("Partage mis à jour !")
        } catch (e) {
            console.error("Sharing Failed", e)
            alert("Erreur lors du partage.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDecrypt = async (item: VaultItem) => {
        if (viewingItemId === item.id) {
            setViewingItemId(null)
            setDecryptedContent(null)
            return
        }

        try {
            const payload = JSON.parse(item.description_encrypted)
            const text = await decryptData(payload.encryptedData, masterPassword, payload.salt, payload.iv)
            setDecryptedContent(text)
            setViewingItemId(item.id)
        } catch (e) {
            console.error("Decryption failed", e)
            alert("Même avec le mot de passe maître, le déchiffrement a échoué. Est-ce le bon mot de passe ?")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer ce document ?")) return
        await supabase.from('vault_items').delete().eq('id', id)
        setMyItems(myItems.filter(i => i.id !== id))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-300 flex items-center gap-2">
                        <Lock className="w-6 h-6" /> Coffre-fort Familial
                    </h2>
                    <p className="text-white/40 text-sm">Protection Zero-Knowledge</p>
                </div>
                <Badge variant="outline" className={isLocked ? "border-rose-500/50 text-rose-400" : "border-emerald-500/50 text-emerald-400"}>
                    {isLocked ? "Verrouillé" : "Déverrouillé"}
                </Badge>
            </div>

            <AnimatePresence mode="wait">
                {isLocked ? (
                    <motion.div
                        key="locked"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md"
                    >
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
                            <Key className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Accès Sécurisé</h3>
                        <p className="text-white/40 text-center mb-8 max-w-xs">
                            Entrez le mot de passe maître de la famille pour accéder aux documents.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleUnlock()
                            }}
                            className="flex gap-2 w-full max-w-xs"
                        >
                            <Input
                                type="password"
                                placeholder="Mot de passe Maître"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                className="bg-black/40 border-white/10"
                            />
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                                Ouvrir
                            </Button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="unlocked"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
                                <TabsTrigger value="mine" className="gap-2">
                                    <User className="w-4 h-4" /> Mes Secrets
                                </TabsTrigger>
                                <TabsTrigger value="shared" className="gap-2">
                                    <Users className="w-4 h-4" /> Partagés avec moi
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="mine">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Add New Item */}
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group min-h-[160px]">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                                    <Plus className="w-6 h-6 text-white/40 group-hover:text-indigo-400" />
                                                </div>
                                                <span className="text-sm font-medium text-white/40 group-hover:text-indigo-300">Nouveau Secret</span>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="bg-[#161617] border-white/10 text-white">
                                            <DialogHeader>
                                                <DialogTitle>Mise en coffre sécurisée</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs uppercase tracking-widest text-white/40">Titre</label>
                                                    <Input
                                                        value={newItemTitle}
                                                        onChange={(e) => setNewItemTitle(e.target.value)}
                                                        placeholder="ex: Code Netflix"
                                                        className="bg-black/20 border-white/10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs uppercase tracking-widest text-white/40">Secret (Sera chiffré)</label>
                                                    <textarea
                                                        value={newItemContent}
                                                        onChange={(e) => setNewItemContent(e.target.value)}
                                                        className="w-full h-32 bg-black/20 border-white/10 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        placeholder="Notes, mots de passe, codes..."
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 w-full font-bold">
                                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                    <ShieldCheck className="w-4 h-4 mr-2" /> Chiffrer & Sauvegarder
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {myItems.map((item) => (
                                        <Card key={item.id} className="bg-[#1c1c1e] border-white/5 hover:border-white/20 transition-all group overflow-hidden flex flex-col">
                                            <CardHeader className="p-4 flex flex-row items-center gap-3 space-y-0">
                                                <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                                                    <FileText className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div className="grow min-w-0">
                                                    <CardTitle className="text-sm font-medium truncate">{item.title}</CardTitle>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Badge variant="outline" className="text-[8px] h-3 px-1 border-white/10 text-white/40 uppercase">Personnel</Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            {viewingItemId === item.id && (
                                                <CardContent className="p-4 pt-0 bg-black/20 mx-4 mb-4 rounded-md border border-white/5">
                                                    <p className="text-sm font-mono text-emerald-300 break-all">{decryptedContent}</p>
                                                </CardContent>
                                            )}

                                            <CardFooter className="p-4 pt-0 flex justify-between gap-2 mt-auto">
                                                <Button
                                                    onClick={() => handleDecrypt(item)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-[10px] bg-white/5 hover:bg-white/10 grow"
                                                >
                                                    {viewingItemId === item.id ? <><EyeOff className="w-3 h-3 mr-1" /> Masquer</> : <><Eye className="w-3 h-3 mr-1" /> Révéler</>}
                                                </Button>

                                                <Button
                                                    onClick={() => {
                                                        setItemToShare(item)
                                                        setIsShareDialogOpen(true)
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-[10px] bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                                                >
                                                    <Share2 className="w-3 h-3" />
                                                </Button>

                                                <Button
                                                    onClick={() => handleDelete(item.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 shrink-0"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}

                                    {myItems.length === 0 && (
                                        <div className="col-span-full text-center text-white/30 py-6">
                                            Aucun secret personnel.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="shared">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sharedItems.map((item) => (
                                        <Card key={item.id} className="bg-[#1c1c1e] border-white/5 hover:border-white/20 transition-all group overflow-hidden flex flex-col opacity-80 hover:opacity-100">
                                            <CardHeader className="p-4 flex flex-row items-center gap-3 space-y-0">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                                                    <Users className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div className="grow min-w-0">
                                                    <CardTitle className="text-sm font-medium truncate">{item.title}</CardTitle>
                                                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-tighter">Partagé avec vous</p>
                                                </div>
                                            </CardHeader>

                                            {viewingItemId === item.id && (
                                                <CardContent className="p-4 pt-0 bg-black/20 mx-4 mb-4 rounded-md border border-white/5">
                                                    <p className="text-sm font-mono text-emerald-300 break-all">{decryptedContent}</p>
                                                </CardContent>
                                            )}

                                            <CardFooter className="p-4 pt-0 flex justify-between gap-2 mt-auto">
                                                <Button
                                                    onClick={() => handleDecrypt(item)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-[10px] bg-white/5 hover:bg-white/10 grow"
                                                >
                                                    {viewingItemId === item.id ? <><EyeOff className="w-3 h-3 mr-1" /> Masquer</> : <><Eye className="w-3 h-3 mr-1" /> Révéler</>}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}

                                    {sharedItems.length === 0 && (
                                        <div className="col-span-full text-center text-white/30 py-12">
                                            Aucun secret partagé avec vous.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Sharing Dialog */}
                        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                            <DialogContent className="bg-[#161617] border-white/10 text-white max-w-sm">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Share2 className="w-5 h-5 text-indigo-400" /> Partager "{itemToShare?.title}"
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <p className="text-sm text-white/40">Sélectionnez les membres qui pourront voir ce secret :</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {familyMembers.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <img src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.full_name}`} alt="" className="w-8 h-8 rounded-full bg-white/10" />
                                                    <span className="text-sm font-medium">{member.full_name}</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembers.includes(member.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedMembers([...selectedMembers, member.id])
                                                        } else {
                                                            setSelectedMembers(selectedMembers.filter(id => id !== member.id))
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                                                />
                                            </div>
                                        ))}
                                        {familyMembers.length === 0 && (
                                            <p className="text-xs text-center text-white/20 py-4">Aucun autre membre dans la famille.</p>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-white/5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedMembers(familyMembers.map(m => m.id))}
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300"
                                        >
                                            Tout sélectionner
                                        </Button>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleShare} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold">
                                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Mettre à jour le partage
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-300 leading-relaxed">
                    <strong>Note de sécurité :</strong> Antigravity utilise le module Web Crypto `PBKDF2` pour générer vos clés de déchiffrement. Vos secrets ne partent jamais en clair vers le serveur.
                </p>
            </div>
        </div>
    )
}
