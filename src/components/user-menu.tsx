"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/auth-provider'
import { createClient } from '@/lib/supabase/client'

export default function UserMenu() {
    const router = useRouter()
    const { user, signOut } = useAuth()
    const supabase = createClient()
    const [profile, setProfile] = React.useState<any>(null)

    React.useEffect(() => {
        const fetchProfile = async () => {
            if (user?.id) {
                const { data } = await supabase
                    .from('profiles')
                    .select('full_name, color_code, role, avatar_url')
                    .eq('id', user.id)
                    .single()
                if (data) setProfile(data)
            }
        }
        fetchProfile()
    }, [user])

    const handleSignOut = async () => {
        await signOut()
        router.push('/login')
        router.refresh()
    }

    if (!user) {
        return (
            <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="border-white/10 bg-white/5 hover:bg-white/10 rounded-xl"
            >
                <User className="w-4 h-4 mr-2" />
                Connexion
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-10 px-2 hover:bg-white/10 rounded-xl">
                    <Avatar className="w-8 h-8 border-2 border-white/20">
                        {profile?.avatar_url ? (
                            <AvatarImage src={profile.avatar_url} alt={profile?.full_name || 'Avatar'} />
                        ) : null}
                        <AvatarFallback
                            style={{ backgroundColor: profile?.color_code || '#8b5cf6' }}
                            className="text-white text-xs font-bold"
                        >
                            {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden sm:inline">
                        {profile?.full_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-white/40" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1c1c1e] border-white/10 text-white">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.full_name || 'Utilisateur'}</p>
                        <p className="text-xs text-white/40">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

