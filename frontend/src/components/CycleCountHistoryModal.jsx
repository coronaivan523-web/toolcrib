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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">

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
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-900 text-white text-xs uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4 text-center">Prev Stock</th>
                                        <th className="px-6 py-4 text-center">Adjustment</th>
                                        <th className="px-6 py-4 text-center bg-blue-900/40">Real Qty</th>
                                        <th className="px-6 py-4 text-center">Current Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {movements.map((move) => {
                                        // Calculate or derive stock values
                                        // Ideally backend provides 'previous_stock_level' and 'new_stock_level'
                                        // Fallback: If new_stock_level missing, assuming it's current running total? No, that's hard.
                                        // We will try to use the direct fields first.

                                        const adj = Number(move.quantity) || 0
                                        const prev = move.previous_stock_level ?? '-'
                                        const curr = move.new_stock_level ?? '-'
                                        const real = move.new_stock_level ?? '-' // Real Qty usually matches ending stock for cycle counts

                                        return (
                                            <tr key={move.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">
                                                            {new Date(move.timestamp).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-200">
                                                            {move.created_by_user?.full_name?.[0] || 'U'}
                                                        </div>
                                                        <span className="text-slate-600 font-medium text-xs">
                                                            {move.created_by_user?.full_name || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-400 font-mono">
                                                    {prev}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                                                        adj > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                            adj < 0 ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                "bg-slate-50 text-slate-500 border-slate-200"
                                                    )}>
                                                        {adj > 0 ? '+' : ''}{adj}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center bg-blue-50/30 font-bold text-blue-700 font-mono text-base border-x border-slate-100">
                                                    {real}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">
                                                    {curr}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
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
