import React, { useState, useEffect } from 'react'
import { X, Package, ArrowUpRight, ArrowDownLeft, Calendar, FileText, Info, AlertCircle, UploadCloud, Check, History } from 'lucide-react'
import clsx from 'clsx'
import { materialService } from '../services/materials'

export default function MaterialHistoryView({ materialId, materialName, onClose }) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [data, setData] = useState(null)
    const [previewImage, setPreviewImage] = useState(null)

    useEffect(() => {
        const loadHistory = async () => {
            if (!materialId) return
            try {
                setLoading(true)
                const result = await materialService.getHistory(materialId)
                setData(result)
            } catch (err) {
                console.error("Failed to load history:", err)
                const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err))
                setError(msg || "Could not load material history.")
            } finally {
                setLoading(false)
            }
        }
        loadHistory()
    }, [materialId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-sm">Loading details...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-center text-sm font-medium">
                    <AlertCircle size={16} className="inline mr-2" />
                    {error}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {/* Header Section (Dark Blue) */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 text-purple-400 border border-slate-700 rounded-lg">
                        <History size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-white">
                                History / {materialName || data?.material?.name || 'Material'}
                                {data?.material?.part_number && (
                                    <span className="ml-2 text-slate-400 font-normal">
                                        / {data.material.part_number}
                                    </span>
                                )}
                                <span className="ml-4 pl-4 border-l border-slate-700 text-blue-400 font-normal text-base">
                                    Current Stock: <span className="text-white font-bold">{data?.current_stock ?? '-'}</span>
                                </span>
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">Reference ID: {materialId}</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Content Scrollable Area */}
            <div className="flex-1 overflow-auto custom-scrollbar p-0">
                {/* Consumption Summary Tables */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 pb-0 mb-6">
                    {/* Plant Summary */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between">
                            <span>Consumption by Plant</span>
                            <span className="text-white">{(data?.movements || []).filter(m => m.movement_type === 'OUT').reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)}</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(
                                        (data?.movements || [])
                                            .filter(m => m.movement_type === 'OUT')
                                            .reduce((acc, m) => {
                                                const key = m.plant || 'Unknown';
                                                acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
                                                return acc;
                                            }, {})
                                    ).length === 0 ? (
                                        <tr><td className="px-3 py-2 text-slate-400 text-xs italic">No consumption data</td></tr>
                                    ) : (
                                        Object.entries(
                                            (data?.movements || [])
                                                .filter(m => m.movement_type === 'OUT')
                                                .reduce((acc, m) => {
                                                    const key = m.plant || 'Unknown';
                                                    acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
                                                    return acc;
                                                }, {})
                                        ).map(([name, qty]) => (
                                            <tr key={name}>
                                                <td className="px-3 py-2 text-slate-600 font-medium">{name}</td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-800">{qty}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Area Summary */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between">
                            <span>Consumption by Area</span>
                            <span className="text-white">{(data?.movements || []).filter(m => m.movement_type === 'OUT').reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)}</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(
                                        (data?.movements || [])
                                            .filter(m => m.movement_type === 'OUT')
                                            .reduce((acc, m) => {
                                                const key = m.area || 'Unknown';
                                                acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
                                                return acc;
                                            }, {})
                                    ).length === 0 ? (
                                        <tr><td className="px-3 py-2 text-slate-400 text-xs italic">No consumption data</td></tr>
                                    ) : (
                                        Object.entries(
                                            (data?.movements || [])
                                                .filter(m => m.movement_type === 'OUT')
                                                .reduce((acc, m) => {
                                                    const key = m.area || 'Unknown';
                                                    acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
                                                    return acc;
                                                }, {})
                                        ).map(([name, qty]) => (
                                            <tr key={name}>
                                                <td className="px-3 py-2 text-slate-600 font-medium">{name}</td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-800">{qty}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Process Summary */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 font-bold text-xs text-white uppercase tracking-wider flex items-center justify-between">
                            <span>Consumption by Process</span>
                            <span className="text-white">{(data?.movements || []).filter(m => m.movement_type === 'OUT').reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)}</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(
                                        (data?.movements || [])
                                            .filter(m => m.movement_type === 'OUT')
                                            .reduce((acc, m) => {
                                                const key = m.process || 'Unknown';
                                                acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
                                                return acc;
                                            }, {})
                                    ).length === 0 ? (
                                        <tr><td className="px-3 py-2 text-slate-400 text-xs italic">No consumption data</td></tr>
                                    ) : (
                                        Object.entries(
                                            (data?.movements || [])
                                                .filter(m => m.movement_type === 'OUT')
                                                .reduce((acc, m) => {
                                                    const key = m.process || 'Unknown';
                                                    acc[key] = (acc[key] || 0) + (Number(m.quantity) || 0);
                                                    return acc;
                                                }, {})
                                        ).map(([name, qty]) => (
                                            <tr key={name}>
                                                <td className="px-3 py-2 text-slate-600 font-medium">{name}</td>
                                                <td className="px-3 py-2 text-right font-bold text-slate-800">{qty}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div>
                    <h4 className="font-bold text-slate-700 mb-0 flex items-center gap-2 text-sm px-6 py-4 bg-white border-b border-slate-100">
                        <Calendar size={16} /> Recent Activity
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-900 text-white font-medium border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Qty</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Reference/User</th>
                                    <th className="px-4 py-3">Requester</th>
                                    <th className="px-4 py-3">Plant</th>
                                    <th className="px-4 py-3">Area</th>
                                    <th className="px-4 py-3">Process</th>
                                    <th className="px-4 py-3">Machine</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data?.movements?.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-4 py-8 text-center text-slate-400 text-xs italic">
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
                                                    {/* Logic to display chips for special notes like 'Min:' 'Max:' etc could go here if needed, keeping it simple for now as requested */}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    by {move.created_by_user?.full_name || 'System'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {move.requester_name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {move.plant || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {move.area || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {move.process || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {move.machine || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Image Preview Modal (Embed logic here if needed, or pass prop, for now simple self-contained) */}
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 p-2 backdrop-blur-md transition-all duration-300"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] h-[95vh] overflow-hidden flex flex-col border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-8 py-5 flex justify-between items-center border-b border-blue-700 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1.5 bg-orange-500 rounded-full"></div>
                                    <div>
                                        <h3 className="text-white font-bold tracking-wider text-2xl">IMAGE VIEWER</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="text-blue-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 bg-slate-900/5 flex items-center justify-center p-4 overflow-hidden relative">
                                <img
                                    src={previewImage}
                                    alt="Detail View"
                                    className="max-w-full max-h-full object-contain shadow-2xl drop-shadow-2xl rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
