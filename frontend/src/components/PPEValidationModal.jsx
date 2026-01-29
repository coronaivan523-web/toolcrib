import React, { useState, useEffect } from 'react';
import { X, Calendar, User, AlertTriangle } from 'lucide-react';

// Helper for DD/MM/YYYY format display
const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    // Handle YYYY-MM-DD
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateString;
};

export default function PPEValidationModal({ isOpen, onClose, onConfirm, eppItems }) {
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [operatorName, setOperatorName] = useState('');
    const [renewalDates, setRenewalDates] = useState({});
    const [errors, setErrors] = useState({});

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setEmployeeNumber('');
            setOperatorName('');
            setRenewalDates({});
            setErrors({});
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const newErrors = {};

        if (!employeeNumber.trim()) {
            newErrors.employee = "Employee number is required (Scan QR)";
        }

        if (!operatorName.trim()) {
            newErrors.operator = "Operator name is required";
        }

        eppItems.forEach(item => {
            if (!renewalDates[item.material_id]) {
                newErrors[item.material_id] = "Valid renewal date is required";
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm(employeeNumber, operatorName, renewalDates);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-purple-900 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="text-yellow-400" />
                        PPE Delivery Verification
                    </h2>
                    <button onClick={onClose} className="text-purple-200 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
                        <p className="text-sm text-blue-800">
                            You are about to issue Personal Protective Equipment (EPP).
                            Please scan the Employee ID and confirm renewal dates to proceed.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Employee Number Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Employee # (Scan QR) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                autoFocus
                                className={`w-full px-4 py-2 rounded-lg border ${errors.employee ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-purple-500'} focus:outline-none focus:ring-2`}
                                placeholder="Scan ID..."
                                value={employeeNumber}
                                onChange={(e) => setEmployeeNumber(e.target.value)}
                            />
                            {errors.employee && <p className="text-red-500 text-xs mt-1">{errors.employee}</p>}
                        </div>

                        {/* Operator Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Operator Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${errors.operator ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-purple-500'} focus:outline-none focus:ring-2`}
                                    placeholder="Operator Name..."
                                    value={operatorName}
                                    onChange={(e) => setOperatorName(e.target.value)}
                                />
                            </div>
                            {errors.operator && <p className="text-red-500 text-xs mt-1">{errors.operator}</p>}
                        </div>
                    </div>

                    {/* EPP Items Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-slate-700">Material</th>
                                    <th className="px-4 py-3 font-medium text-slate-700 w-48">Renewal Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {eppItems.map((item) => (
                                    <tr key={item.material_id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {item.material.image_url && (
                                                    <img
                                                        src={item.material.image_url}
                                                        alt=""
                                                        className="w-10 h-10 rounded-md object-cover border"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium text-slate-900">{item.material.name}</div>
                                                    <div className="text-xs text-slate-500">{item.material.part_number}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    className={`w-full px-3 py-2 rounded-md border ${errors[item.material_id] ? 'border-red-500' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white`}
                                                    value={renewalDates[item.material_id] || ''}
                                                    onChange={(e) => setRenewalDates({ ...renewalDates, [item.material_id]: e.target.value })}
                                                />
                                            </div>
                                            {errors[item.material_id] && <p className="text-red-500 text-xs mt-1">Required</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-medium shadow-sm shadow-purple-200 transition-colors"
                    >
                        Confirm & Issue Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
