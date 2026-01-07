"use client"

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import BentoDashboard from "@/components/bento-dashboard"
import SecureVault from "@/components/secure-vault"
import KarmaSystem from "@/components/karma-system"
import ShoppingList from "@/components/shopping-list"
import FridgeWall from "@/components/fridge-wall"
import PollWidget from "@/components/poll-widget"
import CalendarSync from "@/components/calendar-sync"
import UserMenu from "@/components/user-menu"
import { Grid, Lock, Trophy, ShoppingCart, MessageSquare, Vote, Calendar } from 'lucide-react'

export default function MainInterface() {
    return (
        <div className="min-h-screen bg-[#0a0a0b] text-[#edeff2]">
            <div className="container mx-auto max-w-7xl">
                <Tabs defaultValue="dashboard" className="w-full">
                    <div className="flex items-center justify-between pt-8 pb-4 px-4">
                        <div className="flex-1" />
                        <TabsList className="bg-white/5 border border-white/10 p-1 h-14 rounded-2xl backdrop-blur-xl">
                            <TabsTrigger
                                value="dashboard"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <Grid className="w-4 h-4" /> <span className="hidden sm:inline">Hub</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="agenda"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">Agenda</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="vault"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <Lock className="w-4 h-4" /> <span className="hidden sm:inline">Vault</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="karma"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <Trophy className="w-4 h-4" /> <span className="hidden sm:inline">Karma</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="shopping"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <ShoppingCart className="w-4 h-4" /> <span className="hidden sm:inline">Courses</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="fridge"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Frigo</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="polls"
                                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-6 h-full flex gap-2 transition-all"
                            >
                                <Vote className="w-4 h-4" /> <span className="hidden sm:inline">Votes</span>
                            </TabsTrigger>
                        </TabsList>
                        <div className="flex-1 flex justify-end">
                            <UserMenu />
                        </div>
                    </div>

                    <TabsContent value="dashboard" className="outline-none">
                        <BentoDashboard />
                    </TabsContent>

                    <TabsContent value="agenda" className="p-4 md:p-8 outline-none">
                        <CalendarSync />
                    </TabsContent>

                    <TabsContent value="vault" className="p-4 md:p-8 outline-none">
                        <SecureVault />
                    </TabsContent>

                    <TabsContent value="karma" className="p-4 md:p-8 outline-none">
                        <KarmaSystem />
                    </TabsContent>

                    <TabsContent value="shopping" className="p-4 md:p-8 outline-none">
                        <ShoppingList />
                    </TabsContent>

                    <TabsContent value="fridge" className="p-4 md:p-8 outline-none">
                        <FridgeWall />
                    </TabsContent>

                    <TabsContent value="polls" className="p-4 md:p-8 outline-none">
                        <PollWidget />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
