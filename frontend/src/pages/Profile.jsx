
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { User, Upload, Save, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react'

export default function Profile() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState(null)

    // Signature State
    const [signatureFile, setSignatureFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)

    // Avatar State
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)

    const [message, setMessage] = useState(null) // { type: 'success'|'error', text: '' }

    useEffect(() => {
        loadProfile()
    }, [])

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

    const handleFileChange = (e, type) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Max file size is 2MB' })
            return
        }

        const objectUrl = URL.createObjectURL(file)

        if (type === 'signature') {
            setSignatureFile(file)
            setPreviewUrl(objectUrl)
        } else if (type === 'avatar') {
            setAvatarFile(file)
            setAvatarPreview(objectUrl)
        }
    }

    const handleSave = async (type) => {
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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="text-slate-400 font-medium">Loading profile...</span>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-8">

                {message && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm border animate-in slide-in-from-top-2 duration-300 ${message.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                        {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <span className="font-medium">{message.text}</span>
                    </div>
                )}

                <div className="grid gap-8">
                    {/* Identity Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Blue Header with Title */}
                        <div className="h-32 bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                            <div className="relative z-10 -mt-8">
                                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Profile Settings</h1>
                                <p className="text-slate-300 text-sm">Manage your personal information and digital credentials</p>
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
                                        onClick={() => handleSave('avatar')}
                                        disabled={saving}
                                        className="mb-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={16} />
                                        Save New Avatar
                                    </button>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 mt-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600/80 uppercase tracking-wider mb-1">Full Name</label>
                                    <div className="text-sm font-semibold text-slate-700 border-b border-blue-100 pb-1">{profile?.full_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-blue-600/80 uppercase tracking-wider mb-1">Role</label>
                                    <div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                                            {profile?.role || 'User'}
                                        </span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-blue-600/80 uppercase tracking-wider mb-1">Email Address</label>
                                    <div className="text-slate-600 font-mono text-xs bg-blue-50/30 p-1.5 rounded border border-blue-100 flex items-center gap-2">
                                        <User size={12} className="text-blue-400" />
                                        {profile?.email || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signature Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    Digital Signature
                                </h3>
                                <p className="text-xs text-slate-400">Upload your official signature.</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${profile?.signature_url ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                {profile?.signature_url ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                {profile?.signature_url ? 'Active' : 'Missing'}
                            </div>
                        </div>

                        <div className="bg-slate-50/50 p-6 flex flex-col items-center justify-center">
                            <div className="w-full max-w-lg bg-white rounded-xl border-2 border-dashed border-blue-200 p-6 flex flex-col items-center justify-center transition-all hover:border-blue-400 hover:bg-blue-50/20 group">
                                {previewUrl ? (
                                    <div className="w-48 aspect-[3/1] mb-4 bg-white rounded border border-blue-100 p-2 shadow-sm flex items-center justify-center relative">
                                        <img src={previewUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="text-center mb-4">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-200 border border-blue-100 group-hover:scale-110 transition-transform">
                                            <ImageIcon size={20} className="text-blue-500" />
                                        </div>
                                        <span className="text-blue-600/70 font-medium text-xs block">No signature uploaded</span>
                                        <span className="text-blue-400/50 text-[10px]">PNG or JPG (transparent)</span>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <label className="cursor-pointer bg-white border border-blue-200 text-blue-600 hover:border-blue-400 hover:text-blue-700 shadow-sm px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5">
                                        <Upload size={14} />
                                        <span>{previewUrl ? 'Change' : 'Select File'}</span>
                                        <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'signature')} />
                                    </label>

                                    {signatureFile && (
                                        <button
                                            onClick={() => handleSave('signature')}
                                            disabled={saving}
                                            className="bg-blue-600 text-white hover:bg-blue-700 hover:shadow shadow-sm px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={14} />
                                                    Save
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )
}
