import React from 'react'
import { X, Clock } from 'lucide-react'
import MaterialHistoryView from './MaterialHistoryView'

export default function MaterialHistoryModal({ materialId, materialName, materialsMap, usersMap, onClose }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <MaterialHistoryView materialId={materialId} materialName={materialName} materialsMap={materialsMap} usersMap={usersMap} onClose={onClose} />
            </div>
        </div>
    )
}

