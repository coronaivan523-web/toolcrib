import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar, CheckSquare, Square, Filter } from 'lucide-react';

// Helper for DD/MM/YYYY format
const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Handle YYYY-MM-DD directly to avoid timezone shifts
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    // Fallback for full timestamps
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-GB', { // es-GB uses DD/MM/YYYY
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function PPEBlockModal({ isOpen, onClose, blockedItems, employeeNumber, operatorName, history, onRestock, newRenewalDates }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [showBlockedOnly, setShowBlockedOnly] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        date: '',
        folio: '',
        security: '',
        material: '',
        renewal: ''
    });

    // Reset selection when modal opens/closes or items change
    useEffect(() => {
        if (isOpen) {
            setSelectedItems([]);
            setHistoryFilters({ date: '', folio: '', security: '', material: '', renewal: '' });
        }
    }, [isOpen, blockedItems]);

    const toggleSelection = (item) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.material_id === item.material_id);
            if (exists) {
                return prev.filter(i => i.material_id !== item.material_id);
            } else {
                return [...prev, item];
            }
        });
    };

    const handleBulkRestock = () => {
        if (selectedItems.length > 0 && onRestock) {
            // Automatically inherit the renewal date logic:
            // 1. If user JUST entered a date (newRenewalDates), use that.
            // 2. Otherwise use the existing blocked item's expiration date.
            const inheritedRenewalDates = {};
            selectedItems.forEach(item => {
                if (newRenewalDates && newRenewalDates[item.material_id]) {
                    inheritedRenewalDates[item.material_id] = newRenewalDates[item.material_id];
                } else if (item.renewal_date) {
                    inheritedRenewalDates[item.material_id] = item.renewal_date;
                }
            });

            onRestock(selectedItems, employeeNumber, operatorName, inheritedRenewalDates);
        }
    };

    const filteredHistory = history.filter(record => {
        const dateStr = formatDate(record.ticket_created_at || record.created_at).toLowerCase();
        const folioStr = (record.ticket_folio || '').toString().toLowerCase();
        const securityStr = (record.requester_name || '').toLowerCase();
        const materialStr = (record.material_name || '').toLowerCase() + ' ' + (record.part_number || '').toLowerCase();
        const renewalStr = record.renewal_date ? formatDate(record.renewal_date).toLowerCase() : '';

        // Filter: Show only materials that are currently blocking the request
        // Filter: Show ONLY the specific MATERIAL+TICKET causing the block (True 1-to-1)
        if (showBlockedOnly) {
            const isExactMatch = blockedItems.some(item =>
                String(item.ticket_folio) === String(record.ticket_folio || record.folio) &&
                (item.material_name || '').trim().toLowerCase() === (record.material_name || '').trim().toLowerCase()
            );
            if (!isExactMatch) return false;
        }

        // Active Check (for highlighting logic later, not filtering here unless requested)
        // User asked to filter "materials like the ones above".
        // This implies showing the HISTORY for those materials.

        return dateStr.includes(historyFilters.date.toLowerCase()) &&
            folioStr.includes(historyFilters.folio.toLowerCase()) &&
            securityStr.includes(historyFilters.security.toLowerCase()) &&
            materialStr.includes(historyFilters.material.toLowerCase()) &&
            renewalStr.includes(historyFilters.renewal.toLowerCase());
    }).sort((a, b) => {
        // Custom Sort: Active Blocking items FIRST
        const isABlocking = blockedItems.some(item =>
            (item.ticket_folio && (item.ticket_folio == a.ticket_folio)) ||
            (item.material_name && a.material_name && item.material_name.trim().toLowerCase() === a.material_name.trim().toLowerCase() && a.renewal_date)
        );
        const isBBlocking = blockedItems.some(item =>
            (item.ticket_folio && (item.ticket_folio == b.ticket_folio)) ||
            (item.material_name && b.material_name && item.material_name.trim().toLowerCase() === b.material_name.trim().toLowerCase() && b.renewal_date)
        );

        if (isABlocking && !isBBlocking) return -1;
        if (!isABlocking && isBBlocking) return 1;

        // Secondary Sort: Date Descending
        return new Date(b.ticket_created_at || b.created_at) - new Date(a.ticket_created_at || a.created_at);
    });

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
                        <div className="flex justify-between items-end">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                Items Currently Valid (Blocking Request)
                            </h3>
                            <div className="text-sm text-slate-500">
                                Select items to force restock (charge applies)
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-red-100/50 text-red-800 font-semibold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 w-[50px] text-center">Select</th>
                                        <th className="px-4 py-3">Material</th>
                                        <th className="px-4 py-3">Ticket Posterior</th>
                                        <th className="px-4 py-3">Fecha Entrega</th>
                                        <th className="px-4 py-3">Vence</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100">
                                    {blockedItems.map((item, idx) => {
                                        const isSelected = selectedItems.some(i => i.material_id === item.material_id);
                                        return (
                                            <tr
                                                key={idx}
                                                className={`transition-colors cursor-pointer ${isSelected ? 'bg-red-100/60' : 'hover:bg-red-100/30'}`}
                                                onClick={() => toggleSelection(item)}
                                            >
                                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => toggleSelection(item)}
                                                        className={`p-1 rounded transition-colors ${isSelected ? 'text-red-600' : 'text-slate-400 hover:text-red-400'}`}
                                                    >
                                                        {isSelected ? <CheckSquare size={20} fill="currentColor" className="text-red-100" /> : <Square size={20} />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {item.material_name}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    #{item.ticket_folio}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {formatDate(item.last_delivery_date)}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-red-700">
                                                    {formatDate(newRenewalDates?.[item.material_id] || item.renewal_date)}
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs sticky top-0 shadow-sm z-20">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    Folio
                                                    <button
                                                        onClick={() => setShowBlockedOnly(!showBlockedOnly)}
                                                        className={`p-1 rounded-md border transition-all ${showBlockedOnly
                                                            ? 'bg-red-100 border-red-200 text-red-600'
                                                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                                                            }`}
                                                        title={showBlockedOnly ? "Show all history" : "Show relevant history"}
                                                    >
                                                        <Filter size={14} />
                                                    </button>
                                                </div>
                                            </th>
                                            <th className="px-4 py-3">Security Personnel</th>
                                            <th className="px-4 py-3">Material</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-4 py-3">Renewal</th>
                                        </tr>
                                        {/* Filter Row - No top border to fuse with above */}
                                        <tr className="border-slate-200">
                                            <th className="px-2 py-1">
                                                <input
                                                    type="text"
                                                    placeholder="Filter..."
                                                    className="w-full px-2 py-1 text-xs border rounded font-normal focus:outline-none focus:border-purple-400"
                                                    value={historyFilters.date}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, date: e.target.value }))}
                                                />
                                            </th>
                                            <th className="px-2 py-1">
                                                <input
                                                    type="text"
                                                    placeholder="Filter..."
                                                    className="w-full px-2 py-1 text-xs border rounded font-normal focus:outline-none focus:border-purple-400"
                                                    value={historyFilters.folio}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, folio: e.target.value }))}
                                                />
                                            </th>
                                            <th className="px-2 py-1">
                                                <input
                                                    type="text"
                                                    placeholder="Filter..."
                                                    className="w-full px-2 py-1 text-xs border rounded font-normal focus:outline-none focus:border-purple-400"
                                                    value={historyFilters.security}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, security: e.target.value }))}
                                                />
                                            </th>
                                            <th className="px-2 py-1">
                                                <input
                                                    type="text"
                                                    placeholder="Filter..."
                                                    className="w-full px-2 py-1 text-xs border rounded font-normal focus:outline-none focus:border-purple-400"
                                                    value={historyFilters.material}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, material: e.target.value }))}
                                                />
                                            </th>
                                            <th className="px-2 py-1"></th>
                                            <th className="px-2 py-1">
                                                <input
                                                    type="text"
                                                    placeholder="Filter..."
                                                    className="w-full px-2 py-1 text-xs border rounded font-normal focus:outline-none focus:border-purple-400"
                                                    value={historyFilters.renewal}
                                                    onChange={e => setHistoryFilters(prev => ({ ...prev, renewal: e.target.value }))}
                                                />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                                                    No history found matching filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistory.map((record) => {
                                                const recordDateRaw = record.ticket_created_at || record.created_at;
                                                const recordDate = new Date(recordDateRaw);

                                                // Check if active: has renewal date AND renewal date is today or future
                                                // Check if active: has renewal date AND renewal date is today or future
                                                let isUnexpired = false;
                                                if (record.renewal_date) {
                                                    const renewalStrRaw = record.renewal_date.split('T')[0];
                                                    const todayStr = new Date().toISOString().split('T')[0];
                                                    isUnexpired = renewalStrRaw >= todayStr;
                                                }

                                                // Only valid if it matches an item currently causing a block
                                                const isBlockingItem = blockedItems.some(item =>
                                                    (item.material_id && item.material_id === record.material_id) ||
                                                    (item.material_name && item.material_name === record.material_name)
                                                );

                                                const isActive = isUnexpired && isBlockingItem;

                                                return (
                                                    <tr key={record.id} className={`transition-colors border-b border-slate-100 last:border-0 ${isActive ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
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
                                                        <td className={`px-4 py-3 ${isActive ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                                                            {record.renewal_date ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={12} className={isActive ? "text-red-500" : "text-slate-400"} />
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

                <div className="bg-slate-50 px-6 py-4 flex justify-between shrink-0 border-t items-center">
                    <p className="text-xs text-slate-400 italic">
                        * Selected items will be marked as "Restock" and charged to employee.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBulkRestock}
                            disabled={selectedItems.length === 0}
                            className={`px-6 py-2 rounded-lg font-bold shadow transition-all flex items-center gap-2
                                ${selectedItems.length > 0
                                    ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            Resurtir ({selectedItems.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
