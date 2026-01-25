import React, { useState } from 'react'
import { X, History, Image as ImageIcon, MapPin, Factory, AlertTriangle, Package, Settings, Monitor } from 'lucide-react'
import clsx from 'clsx'

export default function CycleCountItemDetailModal({ item, onClose, onViewHistory }) {
    if (!item) return null

    const [isZoomed, setIsZoomed] = useState(false)

    // Construct Image URL
    const getImageUrl = (path) => {
        if (!path) return null
        // DB often stores full URL now, so check for http first
        if (path.startsWith('http')) return path

        // Hardcoded fallback to ensure it works even if env var has issues
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bykumuizmxsclsazeych.supabase.co'

        // Correction: Bucket is 'material-images', NOT 'materials'
        return `${supabaseUrl}/storage/v1/object/public/material-images/${path}`
    }

    const displayImage = item.signed_image_url || getImageUrl(item.image_url) || item.image

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* ZOOM OVERLAY */}
            {isZoomed && displayImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setIsZoomed(false)}
                >
                    <button
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={() => setIsZoomed(false)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={displayImage}
                        alt={item.name}
                        className="max-h-[90vh] max-w-[90vw] object-contain drop-shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                    />
                </div>
            )}

            <div className="relative bg-white rounded-2xl shadow-2xl shadow-blue-900/20 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

                {/* HEADER: Dark Style */}
                <div className="px-8 py-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <Package className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    Item Details
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white leading-none tracking-tight">{item.part_number}</h3>
                            <p className="text-slate-400 text-sm mt-1 font-medium">{item.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* BODY: Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50 relative">

                    {/* LEFT: Image Section (35%) */}
                    <div className="w-full md:w-[35%] bg-white p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 relative group overflow-hidden">
                        {/* Decorative Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white opacity-60"></div>

                        {displayImage ? (
                            <div
                                className="relative z-10 transform transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                                onClick={() => setIsZoomed(true)}
                            >
                                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <img
                                    src={displayImage}
                                    alt={item.name}
                                    className="relative max-h-64 w-full object-contain drop-shadow-xl mix-blend-multiply"
                                />
                                <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full shadow-sm">
                                    Click to Zoom
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-300 relative z-10">
                                <div className="p-6 bg-slate-50 rounded-full mb-4 ring-1 ring-slate-100">
                                    <ImageIcon size={48} strokeWidth={1.5} className="text-slate-400" />
                                </div>
                                <span className="text-sm font-semibold text-slate-400">No Image Available</span>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Details Section (65%) */}
                    <div className="w-full md:w-[65%] flex flex-col h-full bg-slate-50/50">

                        {/* Scrollable Details */}
                        <div className="p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar">

                            {/* Location Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all duration-300">
                                    <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-2">
                                        <MapPin size={12} /> Location
                                    </div>
                                    <div className="text-xl font-mono font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{item.location || '-'}</div>
                                </div>
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm group hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all duration-300">
                                    <div className="flex items-center gap-2 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-2">
                                        <Factory size={12} /> Plant
                                    </div>
                                    <div className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{item.plant || '-'}</div>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: Settings, label: 'Process', value: item.process },
                                    { icon: Package, label: 'Area', value: item.area },
                                    { icon: Monitor, label: 'Machine', value: item.machine_asset }
                                ].map((meta, i) => (
                                    <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors">
                                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase mb-1.5">
                                            <meta.icon size={10} /> {meta.label}
                                        </div>
                                        <div className="text-xs font-semibold text-slate-700 truncate" title={meta.value}>{meta.value || '-'}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Stock Display */}
                            <div className="relative overflow-hidden p-6 rounded-2xl bg-white border border-slate-200 shadow-sm group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Package size={80} className="text-blue-600" />
                                </div>

                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={clsx(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 duration-500",
                                        item.current_stock <= 0 ? "bg-red-50 text-red-500 shadow-red-500/20" :
                                            item.current_stock < (item.min_stock || 0) ? "bg-amber-50 text-amber-500 shadow-amber-500/20" :
                                                "bg-emerald-50 text-emerald-500 shadow-emerald-500/20"
                                    )}>
                                        {item.current_stock <= 0 ? <AlertTriangle size={32} /> : <Package size={32} />}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current System Stock</div>
                                        <div className="flex items-baseline gap-2">
                                            <span className={clsx(
                                                "text-5xl font-black tracking-tighter",
                                                item.current_stock <= 0 ? "text-red-600" :
                                                    item.current_stock < (item.min_stock || 0) ? "text-amber-600" :
                                                        "text-emerald-600"
                                            )}>
                                                {item.current_stock}
                                            </span>
                                            <span className="text-sm font-bold text-slate-400">units</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 rounded-br-2xl">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-800 transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    onViewHistory && onViewHistory(item)
                                }}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-600/40 flex items-center gap-2 group"
                            >
                                <History size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                View History Log
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}
