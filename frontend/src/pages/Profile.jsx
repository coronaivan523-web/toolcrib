
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { User, Upload, Save, AlertCircle, CheckCircle, Image as ImageIcon, Mail, MessageSquare, Send, Paperclip, X, Reply, CornerUpLeft, Trash2, MoreVertical, Search, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'

// Message Service (inline for now)
const messageService = {
    getMyMessages: async () => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/my`, {
            headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch messages');
        return response.json();
    },
    getSentMessages: async () => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/sent`, {
            headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch sent messages');
        return response.json();
    },
    sendMessage: async (data) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to send message');
        return response.json();
    },
    markRead: async (id) => {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/messages/${id}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
        });
    }
}

export default function Profile() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState(null)
    const [activeTab, setActiveTab] = useState('info') // 'info', 'inbox', 'report'

    // Signature/Avatar State
    const [signatureFile, setSignatureFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)

    // Messaging State
    const [messages, setMessages] = useState([]);
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [replyBody, setReplyBody] = useState('');

    // Reporting
    const [reportForm, setReportForm] = useState({ subject: '', body: '', image: null });
    const [reportImagePreview, setReportImagePreview] = useState(null);

    const [message, setMessage] = useState(null) // { type: 'success'|'error', text: '' }

    useEffect(() => {
        loadProfile();
        loadMessages(); // Load messages immediately to show unread count
    }, [])

    useEffect(() => {
        if (activeTab === 'inbox') {
            loadMessages();
        }
    }, [activeTab]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [message])

    const loadProfile = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error
            setProfile(data)
            if (data.signature_url) setPreviewUrl(data.signature_url)
            if (data.avatar_url) setAvatarPreview(data.avatar_url)
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Error loading profile' })
        } finally {
            setLoading(false)
        }
    }

    const loadMessages = async () => {
        try {
            const [received, sent] = await Promise.all([
                messageService.getMyMessages(),
                messageService.getSentMessages()
            ]);

            // Merge and Sort
            const allMsgs = [...received, ...sent].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setMessages(allMsgs);

            // Group by Thread (Star Topology: parent_id -> root)
            const threadMap = {};

            allMsgs.forEach(msg => {
                const rootId = msg.parent_id || msg.id;
                if (!threadMap[rootId]) {
                    threadMap[rootId] = {
                        rootId,
                        subject: msg.parent_id ? (msg.subject.replace(/^(Re: )+/i, '')) : msg.subject, // Clean subject
                        messages: [],
                        lastMessage: null,
                        participants: new Set()
                    };
                }
                threadMap[rootId].messages.push(msg);

                // Add name to particpants
                const name = msg.sender_details?.full_name || 'Unknown';
                threadMap[rootId].participants.add(name);

                // Track last message for sorting threads
                if (!threadMap[rootId].lastMessage || new Date(msg.created_at) > new Date(threadMap[rootId].lastMessage.created_at)) {
                    threadMap[rootId].lastMessage = msg;
                }
            });

            // Convert map to array and sort by last message date
            const threadArray = Object.values(threadMap).sort((a, b) =>
                new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
            );

            // Re-sort messages within threads (Oldest first for conversation view)
            threadArray.forEach(t => {
                t.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });

            setThreads(threadArray);

            // Re-select selected thread if open (to show new messages)
            if (selectedThread) {
                const updated = threadArray.find(t => t.rootId === selectedThread.rootId);
                if (updated) setSelectedThread(updated);
            }

        } catch (err) {
            console.error(err);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyBody.trim() || !selectedThread) return;

        setSaving(true);
        try {
            const lastMsg = selectedThread.lastMessage;

            const myId = profile.id;
            // If I am sender of last message, I reply to recipient.
            // If I am recipient of last message, I reply to sender.
            let recipientId = lastMsg.sender_id === myId ? lastMsg.recipient_id : lastMsg.sender_id;

            // Fallback: If system message or weird state, try to find the "other" person in the thread.
            if (lastMsg.sender_id === myId && lastMsg.recipient_id === myId) {
                // Talking to self?
                recipientId = myId;
            }

            if (!recipientId) throw new Error('Cannot determine recipient');

            await messageService.sendMessage({
                recipient_id: recipientId,
                subject: `Re: ${selectedThread.subject}`,
                body: replyBody,
                type: 'support', // Keep generic
                parent_id: selectedThread.rootId
            });

            setReplyBody('');
            await loadMessages(); // Refresh to show new message
            setMessage({ type: 'success', text: 'Reply sent' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to send reply' });
        } finally {
            setSaving(false);
        }
    }

    const handleFileChange = (e, type) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setMessage({ type: 'error', text: 'Max file size is 5MB' })
            return
        }

        const objectUrl = URL.createObjectURL(file)

        if (type === 'signature') {
            setSignatureFile(file)
            setPreviewUrl(objectUrl)
        } else if (type === 'avatar') {
            setAvatarFile(file)
            setAvatarPreview(objectUrl)
        } else if (type === 'report') {
            setReportForm({ ...reportForm, image: file });
            setReportImagePreview(objectUrl);
        }
    }

    const handleSaveProfile = async (type) => {
        const file = type === 'signature' ? signatureFile : avatarFile
        if (!file) return

        setSaving(true)
        setMessage(null)

        try {
            const userId = profile.id
            const fileExt = file.name.split('.').pop()
            const bucket = type === 'signature' ? 'signatures' : 'avatars'
            const column = type === 'signature' ? 'signature_url' : 'avatar_url'
            const fileName = `${userId}/${Date.now()}.${fileExt}`

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            // 2. Get URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName)

            // 3. Update DB
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ [column]: publicUrl })
                .eq('id', userId)

            if (dbError) throw dbError

            setProfile({ ...profile, [column]: publicUrl })
            setMessage({ type: 'success', text: `${type === 'signature' ? 'Signature' : 'Avatar'} updated successfully!` })

            if (type === 'signature') setSignatureFile(null)
            else setAvatarFile(null)

        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Error saving: ' + err.message })
        } finally {
            setSaving(false)
        }
    }

    const handleDownloadAttachment = async (path) => {
        try {
            const { data, error } = await supabase.storage
                .from('messages')
                .createSignedUrl(path, 60); // Valid for 60 seconds

            if (error) throw error;
            window.open(data.signedUrl, '_blank');
        } catch (err) {
            console.error('Error downloading attachment:', err);
            setMessage({ type: 'error', text: 'Failed to open attachment' });
        }
    }

    const handleSendReport = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            let imageUrl = null;
            if (reportForm.image) {
                const userId = profile.id;
                const fileExt = reportForm.image.name.split('.').pop();
                const fileName = `${userId}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('messages').upload(fileName, reportForm.image);
                if (uploadError) throw uploadError;
                // Save the path, not the public URL, because bucket is private
                imageUrl = fileName;
            }

            // Find Admin ID Logic (Simple assumption or fetch)
            // For now, let's assume filtering or backend routing handles it if recipient is specific.
            // But the user asked to send TO admin.
            // We can fetch the 'admin' user or hardcode Ivan's email check in backend?
            // Better: Fetch user by email 'ivan.corona@wasion.cn'
            const { data: adminUser } = await supabase
                .from('profiles')
                .select('id')
                .or('email.eq.ivan.corona@wasion.cn,email.eq.ivan.corona@wasion.com')
                .maybeSingle(); // Use maybeSingle to avoid 406 if multiple matches (should replace with .limit(1).single() or similar)

            // Fallback to first admin if Ivan not found
            let recipientId = adminUser?.id;
            if (!recipientId) {
                const { data: anyAdmin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle();
                recipientId = anyAdmin?.id;
            }

            if (!recipientId) throw new Error('Admin not found to send report.');

            await messageService.sendMessage({
                recipient_id: recipientId,
                subject: reportForm.subject,
                body: reportForm.body,
                type: 'support',
                attachment_url: imageUrl
            });

            setMessage({ type: 'success', text: 'Report sent successfully!' });
            setReportForm({ subject: '', body: '', image: null });
            setReportImagePreview(null);
            // setActiveTab('info'); // Stay on report tab intentionally or switch? user said "ya me llego el mensaje" implying they checked inbox.

        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Error sending report: ' + err.message })
        } finally {
            setSaving(false);
        }
    }

    const handleMarkRead = async (msgId) => {
        setMessages(messages.map(m => m.id === msgId ? { ...m, is_read: true } : m));
        await messageService.markRead(msgId);
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="text-slate-400 font-medium">Loading profile...</span>
            </div>
        </div>
    )

    return (

        <div className="min-h-screen bg-slate-50 flex flex-col">
            <PageHeader
                title="Profile & Support"
                subtitle="Manage account, messages, and support"
                profile={profile}
                bgColor="#0f172a" // Slate-900
            />

            {/* Tabs Toolbar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 md:px-6">
                    <div className="flex gap-6 -mb-px overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            My Information
                        </button>
                        <button
                            onClick={() => setActiveTab('inbox')}
                            className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'inbox' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Inbox
                            {messages.some(m => !m.is_read && m.recipient_id === profile?.id) && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {messages.filter(m => !m.is_read && m.recipient_id === profile?.id).length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('report')}
                            className={`py-4 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'report' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            Report Issue
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-6">

                    {message && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm border animate-in slide-in-from-top-2 duration-300 ${message.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    )}

                    {/* INFO TAB */}
                    {activeTab === 'info' && (
                        <div className="grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Identity Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="h-32 bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center text-center">
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                    <div className="relative z-10 -mt-8">
                                        <h2 className="text-xl font-bold text-white tracking-tight mb-1">My Information</h2>
                                    </div>
                                </div>

                                <div className="px-8 pb-8 relative">
                                    <div className="flex justify-between items-end -mt-20 mb-8">
                                        <div className="relative group">
                                            <div className="w-48 h-48 rounded-full border-[6px] border-white shadow-lg bg-teal-50 overflow-hidden flex items-center justify-center text-teal-800">
                                                {avatarPreview ? (
                                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-4xl font-bold">{profile?.full_name?.[0] || 'U'}</span>
                                                )}
                                            </div>
                                            <label className="absolute inset-0 top-0 left-0 w-48 h-48 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 text-white backdrop-blur-sm">
                                                <Upload size={24} />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                                            </label>
                                        </div>
                                        {avatarFile && (
                                            <button
                                                onClick={() => handleSaveProfile('avatar')}
                                                disabled={saving}
                                                className="mb-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                            >
                                                <Save size={16} />
                                                Save New Avatar
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-6 mt-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                            <div className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{profile?.full_name || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                                            <div>
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">
                                                    {profile?.role || 'User'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                                            <div className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{profile?.department || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Position</label>
                                            <div className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{profile?.position || 'N/A'}</div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                            <div className="text-slate-700 font-mono text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-3">
                                                <Mail size={16} className="text-slate-400" />
                                                {profile?.email || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Signature Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            Digital Signature
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">Upload your official signature for documents.</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${profile?.signature_url ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                        {profile?.signature_url ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                        {profile?.signature_url ? 'Active' : 'Missing'}
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 p-8 flex flex-col items-center justify-center">
                                    <div className="w-full max-w-lg bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center transition-all hover:border-blue-400 hover:bg-blue-50/10 group">
                                        {previewUrl ? (
                                            <div className="w-64 aspect-[3/1] mb-6 bg-white rounded border border-slate-100 p-4 shadow-sm flex items-center justify-center relative">
                                                <img src={previewUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="text-center mb-6">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 border border-slate-200 group-hover:scale-110 transition-transform">
                                                    <ImageIcon size={24} className="text-slate-400" />
                                                </div>
                                                <span className="text-slate-600 font-medium text-sm block">No signature uploaded</span>
                                                <span className="text-slate-400 text-xs">PNG or JPG (transparent recommended)</span>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 shadow-sm px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                                                <Upload size={14} />
                                                <span>{previewUrl ? 'Change File' : 'Select File'}</span>
                                                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'signature')} />
                                            </label>

                                            {signatureFile && (
                                                <button
                                                    onClick={() => handleSaveProfile('signature')}
                                                    disabled={saving}
                                                    className="bg-blue-600 text-white hover:bg-blue-700 hover:shadow shadow-sm px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {saving ? 'Saving...' : 'Save Signature'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INBOX TAB */}
                    {activeTab === 'inbox' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* LEFT SIDEBAR - LIST */}
                            <div className={`w-full md:w-1/3 border-r border-slate-200 flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Mail size={18} /> Inbox
                                    </h3>
                                    <button onClick={loadMessages} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Refresh">
                                        <Search size={16} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                                    {threads.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">No messages</div>
                                    ) : (
                                        threads.map(thread => {
                                            const isSelected = selectedThread?.rootId === thread.rootId;
                                            const lastMsg = thread.lastMessage;
                                            // Check if thread has unread messages for me
                                            const hasUnread = thread.messages.some(m => !m.is_read && m.recipient_id === profile?.id);

                                            // Filter out my own name from participants to show only "others"
                                            const otherParticipants = Array.from(thread.participants).filter(name => name !== profile?.full_name);
                                            const displayNames = otherParticipants.length > 0 ? otherParticipants.join(', ') : 'Me';

                                            // Status Logic
                                            const isMeSender = lastMsg.sender_id === profile?.id;
                                            // A thread is "Replied" if I sent the last message.
                                            // A thread is "Read" if I didn't send the last message but I have no unread messages.
                                            const isReplied = isMeSender;

                                            // Determine Status Icon
                                            let StatusIcon = Mail;
                                            let iconColor = "text-slate-400";
                                            let statusTooltip = "Read";

                                            if (hasUnread) {
                                                StatusIcon = Mail; // We will use a dot for unread, but keep logic cleanly separate
                                            } else if (isReplied) {
                                                StatusIcon = Reply;
                                                iconColor = "text-emerald-500";
                                                statusTooltip = "You replied";
                                            } else {
                                                StatusIcon = Mail; // Open mail styling or generic
                                                iconColor = "text-slate-400"; // Lighter gray for read
                                                statusTooltip = "Read";
                                            }

                                            // Format List Item
                                            return (
                                                <div
                                                    key={thread.rootId}
                                                    onClick={() => { setSelectedThread(thread); handleMarkRead(lastMsg.id); }}
                                                    className={`p-4 cursor-pointer transition-all border-b border-slate-100 group relative
                                                        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent hover:bg-slate-50'} 
                                                        ${hasUnread && !isSelected ? 'bg-indigo-50/40' : ''}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-1 h-6">
                                                        <div className={`text-sm truncate pr-2 flex-1 flex items-center gap-2 ${hasUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                            {/* Status Indicator */}
                                                            <div className="shrink-0 flex items-center justify-center w-5" title={statusTooltip}>
                                                                {hasUnread ? (
                                                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-sm ring-2 ring-blue-100"></div>
                                                                ) : isReplied ? (
                                                                    <StatusIcon size={16} className={iconColor} />
                                                                ) : (
                                                                    <StatusIcon size={16} className={iconColor} strokeWidth={1.5} />
                                                                )}
                                                            </div>
                                                            {displayNames}
                                                        </div>
                                                        <span className={`text-[10px] whitespace-nowrap ${hasUnread ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>{format(new Date(lastMsg.created_at), 'MMM d')}</span>
                                                    </div>
                                                    <div className={`text-sm mb-1 truncate pl-7 ${hasUnread ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                                        {thread.subject}
                                                    </div>
                                                    <div className={`text-xs truncate flex items-center gap-1 pl-7 ${hasUnread ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                                                        {isReplied && <span className="text-emerald-600 font-medium text-[10px] bg-emerald-50 px-1 rounded uppercase tracking-wider">Replied</span>}
                                                        {lastMsg.body}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            {/* RIGHT CONTENT - DETAIL */}
                            <div className={`w-full md:w-2/3 flex flex-col bg-slate-50/30 ${!selectedThread ? 'hidden md:flex' : 'flex'}`}>
                                {!selectedThread ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                        <Mail size={48} className="mb-4 text-slate-200" />
                                        <p>Select a message to read</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full">
                                        {/* Header */}
                                        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 md:justify-start gap-4">
                                            <button onClick={() => setSelectedThread(null)} className="md:hidden text-slate-500 hover:text-slate-800">
                                                <ChevronLeft size={24} />
                                            </button>
                                            <h2 className="text-lg font-bold text-slate-800 truncate flex-1 leading-tight">
                                                {selectedThread.subject}
                                            </h2>
                                            <div className="flex gap-2">
                                                <button className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" title="Delete (Mock)">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Thread Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                            {selectedThread.messages.map((msg, idx) => {
                                                const isMe = msg.sender_id === profile?.id;
                                                return (
                                                    <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        {/* Avatar */}
                                                        <div className="shrink-0 flex flex-col items-center">
                                                            {msg.sender_details?.avatar_url ? (
                                                                <img src={msg.sender_details.avatar_url} className="w-10 h-10 rounded-full border border-slate-200 object-cover" />
                                                            ) : (
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${isMe ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}>
                                                                    {msg.sender_details?.full_name?.[0] || (isMe ? profile?.full_name?.[0] : '?')}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content Bubble */}
                                                        <div className={`flex-1 max-w-[85%] rounded-2xl p-5 shadow-sm border ${isMe ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none' : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'}`}>
                                                            <div className="flex justify-between items-baseline mb-2">
                                                                <span className={`text-sm font-bold ${isMe ? 'text-blue-100' : 'text-slate-900'}`}>
                                                                    {msg.sender_details?.full_name || (isMe ? 'Me' : 'Unknown')}
                                                                </span>
                                                                <span className={`text-xs font-mono ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                                                    {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                                                </span>
                                                            </div>
                                                            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isMe ? 'text-blue-50' : 'text-slate-600'}`}>
                                                                {msg.body}
                                                            </div>
                                                            {msg.attachment_url && (
                                                                <div className="mt-4 pt-4 border-t border-white/20">
                                                                    <button
                                                                        onClick={() => handleDownloadAttachment(msg.attachment_url)}
                                                                        className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${isMe ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                                                    >
                                                                        <Paperclip size={14} />
                                                                        Attachment
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Reply Box */}
                                        <div className="p-4 bg-white border-t border-slate-200">
                                            <form onSubmit={handleReply} className="relative">
                                                <textarea
                                                    value={replyBody}
                                                    onChange={(e) => setReplyBody(e.target.value)}
                                                    placeholder="Write a reply..."
                                                    className="w-full text-sm p-4 pr-12 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none bg-slate-50 focus:bg-white transition-colors"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={saving || !replyBody.trim()}
                                                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-sm"
                                                >
                                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={16} />}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* REPORT TAB */}
                    {activeTab === 'report' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-slate-900 px-6 py-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertCircle size={20} className="text-red-400" /> Report an Issue
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Found a bug? Let us know so we can fix it.</p>
                            </div>

                            <form onSubmit={handleSendReport} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Brief description of the issue..."
                                        className="w-full px-4 py-2.5 rounded-lg border-slate-300 focus:ring-slate-500 focus:border-slate-500 bg-slate-50 focus:bg-white transition-colors"
                                        value={reportForm.subject}
                                        onChange={e => setReportForm({ ...reportForm, subject: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Detailed Description</label>
                                    <textarea
                                        required
                                        rows={6}
                                        placeholder="Please provide details about what happened..."
                                        className="w-full px-4 py-3 rounded-lg border-slate-300 focus:ring-slate-500 focus:border-slate-500 bg-slate-50 focus:bg-white transition-colors resize-none"
                                        value={reportForm.body}
                                        onChange={e => setReportForm({ ...reportForm, body: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Screenshot / Evidence (Optional)</label>
                                    <div className="flex items-start gap-6">
                                        <div className="flex-1">
                                            <label className="flex flex-col items-center justify-center h-32 px-4 bg-slate-50 text-slate-400 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:bg-white hover:border-blue-400 hover:text-blue-500 transition-all group">
                                                <Upload size={24} className="group-hover:scale-110 transition-transform mb-2" />
                                                <span className="text-sm font-medium">Click to upload image</span>
                                                <input type='file' className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'report')} />
                                            </label>
                                        </div>
                                        {reportImagePreview && (
                                            <div className="w-32 h-32 relative border border-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0">
                                                <img src={reportImagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setReportImagePreview(null); setReportForm({ ...reportForm, image: null }); }}
                                                    className="absolute top-1 right-1 bg-white/90 text-slate-500 hover:text-red-500 rounded-full p-1 shadow-sm backdrop-blur-sm transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                                    >
                                        {saving ? 'Sending Report...' : <><Send size={18} /> Submit Report</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
