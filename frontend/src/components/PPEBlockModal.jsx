import React from 'react';
import { X, AlertTriangle, Calendar } from 'lucide-react';

// Helper for DD/MM/YYYY format
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-GB', { // es-GB uses DD/MM/YYYY
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function PPEBlockModal({ isOpen, onClose, blockedItems, employeeNumber, operatorName, history, onRestock }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[70] backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header - Red Error Style */}
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <AlertTriangle className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">Delivery Denied</h2>
                            <p className="text-red-100 text-sm">Active items found for Employee #{employeeNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-red-100 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Section 1: The Conflicts (Why it was blocked) */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                            Items Currently Valid (Blocking Request)
                        </h3>
                        <div className="bg-red-50 border border-red-100 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-red-100/50 text-red-800 font-semibold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Material</th>
                                        <th className="px-4 py-3">Reference Ticket</th>
                                        <th className="px-4 py-3">Security Personnel</th>
                                        <th className="px-4 py-3">Delivered On</th>
                                        <th className="px-4 py-3">Valid Until</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                    {blockedItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-red-100/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {item.material_name}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                #{item.ticket_folio}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {item.requester_name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatDate(item.last_delivery_date)}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-red-700">
                                                {formatDate(item.renewal_date)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => onRestock && onRestock(item, employeeNumber, operatorName)}
                                                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors shadow-sm"
                                                >
                                                    Resurtir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Historical Evidence */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-1 h-6 bg-slate-500 rounded-full"></span>
                                Full History for: {operatorName} <span className="text-slate-400 font-normal">#{employeeNumber}</span>
                            </h3>
                            <div className="text-xs text-slate-500">
                                Displaying last 50 transactions
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Folio</th>
                                            <th className="px-4 py-3">Security Personnel</th>
                                            <th className="px-4 py-3">Material</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-4 py-3">Renewal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                                                    No history found.
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((record) => {
                                                const recordDateRaw = record.ticket_created_at || record.created_at;
                                                const recordDate = new Date(recordDateRaw);

                                                return (
                                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {formatDate(recordDateRaw)}
                                                            <div className="text-xs text-slate-400">
                                                                {!isNaN(recordDate.getTime())
                                                                    ? recordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                    : ''}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-purple-600 font-medium">
                                                            #{record.ticket_folio || 'N/A'}
                                                            {/* Restock Badge */}
                                                            {record.is_restock && (
                                                                <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded border border-orange-200 uppercase tracking-wide">
                                                                    Resurtido
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {record.requester_name || 'System/Admin'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-800">{record.material_name}</div>
                                                            <div className="text-xs text-slate-500">{record.part_number}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-slate-700">
                                                            {record.quantity}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            {record.renewal_date ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={12} className="text-slate-400" />
                                                                    {formatDate(record.renewal_date)}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end shrink-0 border-t">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium shadow transition-colors"
                    >
                        Close & Review Request
                    </button>
                </div>
            </div>
        </div>
    );
}
