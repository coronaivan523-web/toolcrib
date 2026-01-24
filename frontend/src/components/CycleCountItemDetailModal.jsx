import React, { useState } from 'react'
import { X, History, Image as ImageIcon, MapPin, Factory, AlertTriangle, Package, Settings, Monitor } from 'lucide-react'
import clsx from 'clsx'

export default function CycleCountItemDetailModal({ item, onClose, onViewHistory }) {
    if (!item) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[80vh]">

                {/* LEFT: Image Section (40%) */}
                <div className="w-full md:w-2/5 bg-slate-100 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 p-2 bg-white/50 hover:bg-white rounded-full text-slate-500 hover:text-slate-800 transition-colors md:hidden"
                    >
                        <X size={20} />
                    </button>

                    {item.image_url ? (
                        <img
                            src={item.signed_image_url || item.image_url || item.image}
                            alt={item.name}
                            className="max-h-64 object-contain drop-shadow-lg mix-blend-multiply"
                        />
                    ) : (
                        <div className="flex flex-col items-center text-slate-300">
                            <ImageIcon size={64} strokeWidth={1} />
                            <span className="text-sm font-medium mt-2">No Image Available</span>
                        </div>
                    )}
                </div>

                {/* RIGHT: Details Section (60%) */}
                <div className="w-full md:w-3/5 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flexjustify-between items-start bg-white">
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 block">Item Details</span>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-colors hidden md:block"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 leading-tight">{item.part_number}</h2>
                            <p className="text-slate-500 font-medium mt-1">{item.name}</p>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">

                        {/* Location Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    <MapPin size={12} /> Location
                                </div>
                                <div className="text-lg font-mono font-bold text-slate-700">{item.location || '-'}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    <Factory size={12} /> Plant
                                </div>
                                <div className="text-lg font-bold text-slate-700">{item.plant || '-'}</div>
                            </div>
                        </div>

                        {/* Org Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 border border-slate-100 rounded">
                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                                    <Settings size={10} /> Process
                                </div>
                                <div className="text-xs font-medium text-slate-700 truncate" title={item.process}>{item.process || '-'}</div>
                            </div>
                            <div className="p-2 border border-slate-100 rounded">
                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                                    <Package size={10} /> Area
                                </div>
                                <div className="text-xs font-medium text-slate-700 truncate" title={item.area}>{item.area || '-'}</div>
                            </div>
                            <div className="p-2 border border-slate-100 rounded">
                                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                                    <Monitor size={10} /> Machine
                                </div>
                                <div className="text-xs font-medium text-slate-700 truncate" title={item.machine_asset}>{item.machine_asset || '-'}</div>
                            </div>
                        </div>

                        {/* Stock Status */}
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className={clsx(
                                "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                                (item.current_stock || 0) <= 2 ? "bg-red-100 text-red-500" : "bg-blue-100 text-blue-500"
                            )}>
                                <Package size={24} />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current System Stock</div>
                                <div className={clsx(
                                    "text-3xl font-bold leading-none",
                                    (item.current_stock || 0) <= 2 ? "text-red-600" : "text-slate-800"
                                )}>
                                    {item.current_stock || 0} <span className="text-sm font-medium text-slate-400">units</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-white hover:border-slate-400 transition-all text-sm"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                onClose() // Close this modal
                                onViewHistory(item) // Trigger history view
                            }}
                            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all text-sm flex items-center gap-2"
                        >
                            <History size={18} />
                            View History Log
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
