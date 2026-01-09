import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Check } from 'lucide-react'
import clsx from 'clsx'

export default function MaterialAutocomplete({ materials, selectedMaterialId, onSelect, error }) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [filteredMaterials, setFilteredMaterials] = useState([])
    const wrapperRef = useRef(null)

    // Memoize the list so it doesn't change reference on every render
    const materialsList = React.useMemo(() => {
        return Array.isArray(materials) ? materials : Object.values(materials || {})
    }, [materials])

    // Sync query with selection ONLY when selection changes
    useEffect(() => {
        if (selectedMaterialId) {
            const mat = materialsList.find(m => m.id === selectedMaterialId)
            if (mat) {
                setQuery(mat.name) // Only set if we found it
            }
        } else {
            // If explicit reset to null from parent, or initial load
            // But we must be careful: if user clears input, selectedId becomes null inside onChange
            // We don't want to force-clear query IF IT WAS USER TYPING
            // However, this effect runs when selectedMaterialId changes.
            // If user types "a" -> onChange -> setQuery("a"), onSelect(null).
            // Parent state updates items with null.
            // Prop selectedMaterialId becomes null.
            // This effect runs. selectedMaterialId is null.
            // It sets query to ''.
            // So "a" disappears.

            // PROBLEM: We are controlled by parent ID but local text query.
            // When user types, we trigger onSelect(null). This bounces back as selectedMaterialId={null}.
            // Then we reset query to ''.

            // To fix: Don't clear query here if it's already "dirty" or match logic?
            // Better: Only sync FROM props when the prop *changes* to something specific, 
            // OR if it's null but we aren't currently editing? 
            // Actually, standard pattern: if selectedMaterialId matches current query, fine. 
            // If selectedMaterialId is null, and we have a query... that means we are searching.
            // We should NOT reset query to empty string just because ID is null.
            // The only time we want to reset query to empty is if the parent forcefully clears it?

            // Let's remove the `else { setQuery('') }` block?
            // If I start fresh, ID is null, query is null.
            // If I click "Clear" X button: handleClear calls setQuery('') and onSelect(null).
            // That works.

            // If I type "Drill", setQuery("Drill"), onSelect(null).
            // ID becomes null. Effect runs.
            // If we remove the else block, query stays "Drill". Correct.

            // What if parent creates a NEW empty line? ID is null. Query should be empty.
            // In that case, `useEffect` runs. Query might be empty or stale?
            // `query` state is local to this component instance. A new line is a new component instance (if key changes).
            // If key is stable (e.g. array index not good, but we use Date.now() for id), then new item = new component = empty state.
            // So we don't need to force clear on null.
        }
    }, [selectedMaterialId, materialsList])

    // ... (rest of filtering logic)
    useEffect(() => {
        if (!isOpen && !query) return

        const lowerQuery = query.toLowerCase()
        const filtered = materialsList.filter(m =>
            m.name.toLowerCase().includes(lowerQuery) ||
            (m.part_number && m.part_number.toLowerCase().includes(lowerQuery))
        ).slice(0, 50)
        setFilteredMaterials(filtered)
    }, [query, isOpen, materialsList])

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
                // If we clicked outside and have a partial query that matches nothing exact... 
                // We should probably revert to valid selection or clear?
                // Requisition app: usually if no match, we clear or leave as custom?
                // For now, revert to last valid ID or clear if none
                if (selectedMaterialId) {
                    const mat = materialsList.find(m => m.id === selectedMaterialId)
                    if (mat && mat.name !== query) setQuery(mat.name) // Revert to official name
                } else {
                    // If nothing selected but text exists...
                    // User might have typed "Screw" but didn't pick one.
                    // If we require selection, we should clear. 
                    // "All items must have a selected material." -> implies selection required.
                    if (query) {
                        setQuery('') // Clear invalid text
                        onSelect(null)
                    }
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [wrapperRef, selectedMaterialId, materialsList, query, onSelect]) // Added onSelect dep

    const handleSelect = (mat) => {
        setQuery(mat.name)
        onSelect(mat.id)
        setIsOpen(false)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        setQuery('')
        onSelect(null)
        setIsOpen(true)
        if (wrapperRef.current) {
            const input = wrapperRef.current.querySelector('input')
            if (input) input.focus()
        }
    }

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                    type="text"
                    autoComplete="off"
                    className={clsx(
                        "pl-9 pr-9 py-2 w-full rounded-lg border text-sm transition-colors",
                        error ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-primary-500 focus:ring-primary-200"
                    )}
                    placeholder="Search Name or Part Number..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                        if (selectedMaterialId && e.target.value !== query) {
                            // User is changing text of confirmed selection -> clear selection
                            onSelect(null)
                        } else if (!selectedMaterialId) {
                            // already null, just typing
                        }
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
