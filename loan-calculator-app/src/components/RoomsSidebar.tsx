"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { FiCopy, FiCheck, FiSun, FiMoon, FiGlobe, FiX, FiLogOut, FiXCircle } from 'react-icons/fi';
import Icon from '@mdi/react';
import { mdiKettle } from '@mdi/js';
import { useTheme } from '@/components/ThemeProvider';
import { useLocale } from '@/components/IntlProvider';
import { useSimplifiedLayout } from '@/components/SimplifiedLayoutProvider';
import ConfirmationDialog from './ConfirmationDialog';

interface Room {
    id: number;
    code: string;
}

interface RoomsSidebarProps {
    closeSidebar: () => void;
}

export default function RoomsSidebar({ closeSidebar }: RoomsSidebarProps) {
    const t = useTranslations('Rooms');
    const tAccess = useTranslations('Accessibility');
    const router = useRouter();
    const pathname = usePathname();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();
    const { locale, setLocale } = useLocale();
    const { isSimplified, setIsSimplified } = useSimplifiedLayout();

    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [selectedRoomToLeave, setSelectedRoomToLeave] = useState<Room | null>(null);

    const fetchRooms = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }
        const res = await fetch('/api/user/rooms', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            setRooms(data);
        } else if (res.status === 401) {
            router.push('/');
        }
    }, [router]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms, pathname]);

    const handleCopyToClipboard = (code: string) => {
        setError('');
        const fallbackCopy = (text: string) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setCopiedCode(code);
                    setTimeout(() => setCopiedCode(null), 2000);
                } else {
                     setError(t('copyFailed'));
                }
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                setError(t('copyFailed'));
            }
            document.body.removeChild(textArea);
        }

        if (!navigator.clipboard) {
            fallbackCopy(code);
            return;
        }
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            fallbackCopy(code);
        });
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const token = localStorage.getItem('token');
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ roomCode }),
        });

        if (res.ok) {
            const { roomId } = await res.json();
            setRoomCode('');
            router.push(`/rooms/${roomId}`);
            closeSidebar();
        } else {
            const { message } = await res.json();
            console.error("Join failed:", message);
            setError(t('joinFailed'));
        }
    };

    const handleCreateRoom = async () => {
        setError('');
        const token = localStorage.getItem('token');
        const res = await fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({}),
        });

        if (res.ok) {
            const { roomId } = await res.json();
            router.push(`/rooms/${roomId}`);
            closeSidebar();
        } else {
            const { message } = await res.json();
            console.error("Create failed:", message);
            setError(t('createFailed'));
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/');
    };
    
    const openLeaveDialog = (room: Room) => {
        setSelectedRoomToLeave(room);
        setIsLeaveDialogOpen(true);
    };

    const handleLeaveRoom = async () => {
        if (!selectedRoomToLeave) return;

        setError('');
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/rooms/${selectedRoomToLeave.id}/members`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (res.ok) {
            setIsLeaveDialogOpen(false);
            if (pathname.includes(`/rooms/${selectedRoomToLeave.id}`)) {
                router.push('/rooms');
            }
            fetchRooms();
        } else {
            const { message } = await res.json();
            setError(message || t('leaveRoomFailed'));
            setIsLeaveDialogOpen(false);
        }
        setSelectedRoomToLeave(null);
    };

    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    
    const cycleLanguage = () => {
        const languages = ['en', 'ru', 'he'];
        const currentIndex = languages.indexOf(locale);
        const nextIndex = (currentIndex + 1) % languages.length;
        setLocale(languages[nextIndex]);
    };

    const toggleSimplifiedLayout = () => setIsSimplified(prev => !prev);

    return (
        <>
            <aside className="w-80 bg-card border-e border-card-border h-full p-4 flex flex-col">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h2 className="text-2xl font-bold text-card-foreground">{t('myRooms')}</h2>
                    <button onClick={closeSidebar} className="md:hidden p-1 rounded-md hover:bg-muted text-muted-foreground">
                        <FiX size={24} />
                    </button>
                </div>

                <nav className="flex-grow overflow-y-auto -mx-2 pr-1 animate-fadeIn">
                    <ul>
                        {rooms.map((room, index) => {
                            const isActive = pathname === `/rooms/${room.id}` || pathname.startsWith(`/rooms/${room.id}/`);
                            return (
                                <li key={room.id} style={{ animationDelay: `${index * 50}ms`, opacity: 0 }} className="animate-fadeIn px-2">
                                    <div className={`group flex items-center justify-between rounded-lg transition-colors mb-2 ${isActive ? 'bg-primary text-primary-foreground' : 'text-card-foreground hover:bg-muted'}`}>
                                        <Link href={`/rooms/${room.id}`} className="flex-grow p-3 text-sm font-semibold truncate">
                                            Room #{room.code}
                                        </Link>
                                        <div className="flex items-center">
                                            <button onClick={() => handleCopyToClipboard(room.code)} className={`p-3 rounded-lg transition-all duration-200 ${isActive ? 'hover:bg-primary-hover' : 'hover:bg-card-border'} opacity-50 group-hover:opacity-100`} title={t('copyRoomCode')} >
                                                {copiedCode === room.code ? <FiCheck className="text-success animate-scaleIn" /> : <FiCopy className="group-hover:scale-110 transition-transform" />}
                                            </button>
                                            <button onClick={() => openLeaveDialog(room)} className={`p-3 rounded-lg transition-all duration-200 ${isActive ? 'hover:bg-primary-hover' : 'hover:bg-card-border'} opacity-50 group-hover:opacity-100`} title={t('leaveRoom')} >
                                                <FiXCircle className="group-hover:scale-110 transition-transform text-danger" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="mt-auto pt-4 border-t border-card-border">
                    {error && <p className="text-danger text-sm text-center mb-2">{error}</p>}
                    
                    <form onSubmit={handleJoinRoom} className="mb-4">
                        <input type="text" placeholder={t('roomCode')} value={roomCode} onChange={(e) => setRoomCode(e.target.value)} className="w-full px-3 py-2 rounded-lg mb-2 themed-input" />
                        <button type="submit" className="w-full py-2 rounded-lg btn-primary">{t('joinRoom')}</button>
                    </form>

                    <div className="flex items-center my-2">
                        <div className="flex-grow border-t border-card-border"></div>
                        <span className="flex-shrink mx-2 text-xs text-muted-foreground">{t('or')}</span>
                        <div className="flex-grow border-t border-card-border"></div>
                    </div>
                    
                    <button onClick={handleCreateRoom} className="w-full py-2 rounded-lg btn-secondary mb-4">{t('createRoom')}</button>

                    <div className="space-y-2">
                        <button onClick={handleLogout} className="w-full py-2 px-4 flex items-center justify-center rounded-lg btn-muted" aria-label={t('logout')}>
                            <FiLogOut size={16} className="me-2"/>
                            <span className="font-semibold text-xs">{t('logout')}</span>
                        </button>

                        <div className="flex items-center justify-center space-x-2">
                             <button onClick={toggleTheme} className="flex items-center justify-center w-full p-2 rounded-md btn-muted" aria-label={tAccess('toggleTheme')} >
                                {theme === 'light' ? <FiMoon size={16} /> : <FiSun size={16} />}
                            </button>
                             <button onClick={cycleLanguage} className="flex items-center justify-center w-full p-2 rounded-md btn-muted" aria-label={tAccess('changeLanguage')} >
                                <FiGlobe size={16} className="me-1.5"/>
                                <span className="font-semibold text-xs">{locale.toUpperCase()}</span>
                            </button>
                             <button onClick={toggleSimplifiedLayout} className={`flex items-center justify-center w-full p-2 rounded-md btn-muted transition-colors ${isSimplified ? 'text-primary' : ''}`} aria-label={tAccess('toggleSimplifiedLayout')} >
                                 <Icon path={mdiKettle} size={0.75} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <ConfirmationDialog isOpen={isLeaveDialogOpen} onClose={() => setIsLeaveDialogOpen(false)} onConfirm={handleLeaveRoom} title={t('leaveRoomTitle')}>
                {t('leaveRoomConfirmation', { code: selectedRoomToLeave?.code ?? '' })}
            </ConfirmationDialog>
        </>
    );
}