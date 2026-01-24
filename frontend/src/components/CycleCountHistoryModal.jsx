import React, { useState, useEffect } from 'react'
import { X, Calendar, User, FileText, Activity, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { materialService } from '../services/materials'

export default function CycleCountHistoryModal({ materialId, materialName, onClose }) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [movements, setMovements] = useState([])

    useEffect(() => {
        const loadHistory = async () => {
            if (!materialId) return
            try {
                setLoading(true)
                const result = await materialService.getHistory(materialId)

                // Filter for Cycle Count relevant events
                const validTypes = ['CYCLE_COUNT', 'INVENTORY_ADJUSTMENT', 'ADJUSTMENT']
                const filtered = (result.movements || []).filter(m => {
                    // Check explicit type
                    if (validTypes.includes(m.reference_type) || validTypes.includes(m.movement_type)) return true
                    // Check notes for keywords if specific type is generic
                    const notes = (m.notes || '').toLowerCase()
                    return notes.includes('cycle') || notes.includes('adjustment') || notes.includes('correction')
                })

                setMovements(filtered)
            } catch (err) {
                console.error("Failed to load history:", err)
                setError("Could not load cycle count history.")
            } finally {
                setLoading(false)
            }
        }
        loadHistory()
    }, [materialId])

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Activity className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-none">Cycle Count History</h3>
                            <p className="text-slate-400 text-xs mt-1 font-mono">{materialName || 'Material Details'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-50 p-6 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/80 z-10">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <span className="text-sm font-medium">Loading history...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-500 gap-2">
                            <AlertCircle size={32} />
                            <p>{error}</p>
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <FileText size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No adjustment history found.</p>
                            <p className="text-xs">Only manual adjustments and cycle counts appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {movements.map((move) => (
                                <div key={move.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg p-3 min-w-[80px] border border-slate-200">
                                        <span className="text-xs font-bold text-slate-500 uppercase">{new Date(move.timestamp).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-2xl font-black text-slate-800">{new Date(move.timestamp).getDate()}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{new Date(move.timestamp).getFullYear()}</span>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                move.reference_type === 'CYCLE_COUNT' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-orange-50 text-orange-700 border-orange-200"
                                            )}>
                                                {move.reference_type?.replace('_', ' ') || 'ADJUSTMENT'}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                                <User size={10} />
                                                {move.created_by_user?.full_name || 'System / Unknown'}
                                            </span>
                                        </div>

                                        <p className="text-slate-600 text-sm italic border-l-2 border-slate-100 pl-3 py-1">
                                            "{move.notes || 'No notes recorded.'}"
                                        </p>
                                    </div>

                                    {/* Qty Change */}
                                    <div className="flex flex-col items-end justify-center self-center pl-4 border-l border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CHANGE</div>
                                        <div className={clsx(
                                            "text-xl font-black font-mono flex items-center",
                                            (move.quantity_change ?? move.quantity ?? 0) > 0 ? "text-blue-600" : (move.quantity_change ?? move.quantity ?? 0) < 0 ? "text-red-500" : "text-slate-400"
                                        )}>
                                            {(move.quantity_change ?? move.quantity ?? 0) > 0 ? '+' : ''}{move.quantity_change ?? move.quantity ?? 0}
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase">UNITS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
