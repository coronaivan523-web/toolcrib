import React, { useState, useEffect } from 'react'
import { X, Package, ArrowUpRight, ArrowDownLeft, Calendar, FileText, Info, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { materialService } from '../services/materials'

export default function MaterialHistoryModal({ materialId, materialName, onClose }) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [data, setData] = useState(null)

    useEffect(() => {
        const loadHistory = async () => {
            if (!materialId) return
            try {
                setLoading(true)
                // console.log("Fetching history for material:", materialId) 
                const result = await materialService.getHistory(materialId)
                setData(result)
            } catch (err) {
                console.error("Failed to load history:", err)
                // Check if it's a string error or object
                const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err))
                setError(msg || "Could not load material history.")
            } finally {
                setLoading(false)
            }
        }
        loadHistory()
    }, [materialId])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Section */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 text-blue-400 border border-slate-700 rounded-lg">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">{materialName}</h3>
                            <p className="text-xs text-slate-400 font-mono">Reference ID: {materialId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="text-sm">Loading details...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center text-sm font-medium">
                            <AlertCircle size={16} className="inline mr-2" />
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="text-blue-600 text-xs font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <Package size={12} /> Current Stock
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800">
                                        {data?.current_stock ?? 0}
                                        <span className="text-sm font-normal text-slate-500 ml-1">
                                            {data?.material?.unit || 'units'}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-blue-700 font-medium">
                                        Available in inventory
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <FileText size={12} /> Part Number
                                    </div>
                                    <div className="text-lg font-mono font-medium text-slate-700 break-all">
                                        {data?.material?.part_number || 'N/A'}
                                    </div>
                                    <div className="mt-auto pt-2 text-xs text-slate-400">
                                        Internal SKU
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity Table */}
                            <div>
                                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                                    <Calendar size={16} /> Recent Activity
                                </h4>
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-900 text-white font-medium border-b border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Qty</th>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Reference/User</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data?.movements?.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-4 py-8 text-center text-slate-400 text-xs italic">
                                                        No recent movements found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                data?.movements?.map((move) => (
                                                    <tr key={move.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded text-[10px] font-bold border flex w-fit items-center gap-1",
                                                                move.movement_type === 'IN'
                                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            )}>
                                                                {move.movement_type === 'IN' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                                                                {move.movement_type === 'IN' ? 'RECEIPT' : 'USAGE'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-700">
                                                            {move.movement_type === 'OUT' ? '-' : '+'}{move.quantity}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">
                                                            {new Date(move.timestamp).toLocaleDateString()}
                                                            <div className="text-[10px] text-slate-400">
                                                                {new Date(move.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-slate-700 font-medium text-xs truncate max-w-[150px]" title={move.notes}>
                                                                {move.notes || move.reference_type || '-'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                by {move.created_by_user?.full_name || 'System'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
