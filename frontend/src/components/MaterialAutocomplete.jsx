import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Check } from 'lucide-react'
import clsx from 'clsx'

export default function MaterialAutocomplete({ materials, selectedMaterialId, onSelect, error }) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [filteredMaterials, setFilteredMaterials] = useState([])
    const wrapperRef = useRef(null)

    // Convert object map to array if necessary, or assume array
    const materialsList = Array.isArray(materials) ? materials : Object.values(materials)

    useEffect(() => {
        if (selectedMaterialId) {
            const mat = materialsList.find(m => m.id === selectedMaterialId)
            if (mat) setQuery(mat.name)
        } else {
            setQuery('')
        }
    }, [selectedMaterialId, materialsList])

    useEffect(() => {
        if (!isOpen) return

        const lowerQuery = query.toLowerCase()
        const filtered = materialsList.filter(m =>
            m.name.toLowerCase().includes(lowerQuery) ||
            (m.part_number && m.part_number.toLowerCase().includes(lowerQuery))
        ).slice(0, 50) // Limit results

        setFilteredMaterials(filtered)
    }, [query, isOpen, materialsList])

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
                // Reset query to selected name if invalid
                if (selectedMaterialId) {
                    const mat = materialsList.find(m => m.id === selectedMaterialId)
                    if (mat) setQuery(mat.name)
                } else if (query !== '') {
                    // Start over if nothing selected
                    setQuery('')
                    onSelect(null)
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef, selectedMaterialId, materialsList, query])

    const handleSelect = (mat) => {
        setQuery(mat.name)
        onSelect(mat.id)
        setIsOpen(false)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        setQuery('')
        onSelect(null)
        setIsOpen(true) // Keep open to search again
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                    type="text"
                    className={clsx(
                        "pl-9 pr-9 py-2 w-full rounded-lg border text-sm transition-colors",
                        error ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-primary-500 focus:ring-primary-200"
                    )}
                    placeholder="Search Name or Part Number..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                        if (!e.target.value) onSelect(null)
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {(query || selectedMaterialId) && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                    {filteredMaterials.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                            No materials found
                        </div>
                    ) : (
                        <ul className="py-1">
                            {filteredMaterials.map(mat => (
                                <li
                                    key={mat.id}
                                    onClick={() => handleSelect(mat)}
                                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-none"
                                >
                                    <span className="text-sm font-medium text-slate-700">{mat.name}</span>
                                    {mat.part_number && (
                                        <span className="text-xs text-slate-400">Part #: {mat.part_number}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
