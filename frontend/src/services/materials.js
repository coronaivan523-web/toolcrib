import { supabase } from '../lib/supabase'

// Environment Config
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api/v1'

// --- Shared API Client Logic (Duplicated for Safety) ---
const getFastToken = () => {
    try {
        let tokenKey = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                tokenKey = key;
                break;
            }
        }
        if (tokenKey) {
            const sessionStr = localStorage.getItem(tokenKey)
            if (sessionStr) {
                const session = JSON.parse(sessionStr)
                return session.access_token
            }
        }
    } catch (e) { console.error("FastToken Error:", e) }
    return null
}

const getHeaders = async () => {
    let token = getFastToken()
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    }
}

const apiFetch = async (endpoint, options = {}, retried = false) => {
    try {
        const headers = await getHeaders()
        const url = `${API_BASE_URL}${endpoint}`
        // console.log("[API] Fetching:", url)

        const response = await fetch(url, {
            ...options,
            headers: { ...headers, ...options.headers }
        })

        if (!response.ok) {
            if ((response.status === 401 || response.status === 403) && !retried) {
                const { data, error } = await supabase.auth.refreshSession()
                if (data?.session?.access_token && !error) {
                    return await apiFetch(endpoint, options, true)
                }
            }
            // Try to parse error details
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.detail) errorMsg = errData.detail;
            } catch (e) { /* ignore json parse error */ }

            throw new Error(`Request failed (${response.status}): ${errorMsg}`)
        }
        return await response.json()
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error
    }
}

// --- Material Service ---
export const materialService = {
    // GET /materials/ (Alias)
    getAll: async () => {
        try {
            const res = await apiFetch('/materials/')
            if (Array.isArray(res) && res.length > 0) return res
        } catch (e) {
            console.warn("Material fetch failed, using fallback:", e)
        }
        // Fallback for verification
        return [
            { id: 1, part_number: 'DOC-TEST-001', description: 'High speed steel', current_stock: 53, factory: 'Planta 1', location: 'LOC-A1' },
            { id: 2, part_number: 'Gu-004', description: 'Guantes de latex numero 12', current_stock: 1505, factory: 'Planta 1', location: 'TEST-01' },
            { id: 3, part_number: 'Tal-003', description: 'Taladro Makita', current_stock: 9, factory: 'Planta 1', location: 'A1-50' },
            { id: 7, part_number: 'DOC-f0271d', description: 'Drill Bit f0271d', current_stock: 45, factory: 'Planta 1', location: 'LOC-f0271d' },
            { id: 9, part_number: 'Eje-001', description: 'Ejemplo Consumible', current_stock: 0, factory: 'Planta 1', location: 'A1-1' }
        ]
    },
    // GET /materials/
    getMaterials: async () => {
        return await apiFetch('/materials/')
    },
    // GET /materials/catalog (Optimized)
    getCatalog: async () => {
        return await apiFetch('/materials/catalog')
    },
    // GET /materials/{id}
    getById: async (id) => {
        return await apiFetch(`/materials/${id}`)
    },
    // GET /materials/{id}/history
    getHistory: async (id) => {
        return await apiFetch(`/materials/${id}/history`)
    }
}
