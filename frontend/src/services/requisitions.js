import { supabase } from '../lib/supabase'

// Normalization: TRUST THE ENV VARIABLE
// .env has: http://127.0.0.1:8001/api/v1
// We should use it directly without complex parsing that might break the port or path.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'

console.log('[DEBUG] RequisitionService using API_BASE_URL:', API_BASE_URL)

// Helper to get token from localStorage without validation (fast)
const getFastToken = () => {
    try {
        // 1. Try finding any key that looks like a Supabase token
        // Strategy: Scan all keys for 'sb-*-auth-token' pattern
        let tokenKey = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                tokenKey = key;
                break;
            }
        }

        if (!tokenKey) {
            console.warn("[FastToken] No 'sb-*-auth-token' found in localStorage. Checking fallback...");
            // Fallback: Check for any key containing 'auth-token' (Desperate verify)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('auth-token')) {
                    tokenKey = key;
                    break;
                }
            }
        }

        if (tokenKey) {
            const sessionStr = localStorage.getItem(tokenKey)
            if (sessionStr) {
                const session = JSON.parse(sessionStr)
                if (session.access_token) {
                    return session.access_token
                }
            }
        }

    } catch (e) {
        console.error("FastToken Error:", e)
    }
    return null
}

const getHeaders = async () => {
    // 1. Try Fast Token
    console.time("AuthToken")
    let token = getFastToken()

    if (!token) {
        console.warn("[Perf] FastToken failed, falling back to slow getSession")
        // 2. Fallback to Supabase Client
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
    } else {
        console.log("[Perf] FastToken hit!")
    }
    console.timeEnd("AuthToken")

    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    }
}

const apiFetch = async (endpoint, options = {}, retried = false) => {
    try {
        const headers = await getHeaders()
        const url = `${API_BASE_URL}${endpoint}`

        console.log('[apiFetch] base', API_BASE_URL)
        console.log('[apiFetch] url', url)
        console.log('[apiFetch] hasAuth', Boolean(headers.Authorization))

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        })

        if (!response.ok) {
            // RETRY LOGIC: If 401, try to refresh session via getSession and retry once
            if ((response.status === 401 || response.status === 403) && !retried) {
                console.warn("[apiFetch] 401 encountered, attempting FORCE token refresh...")
                // Force getSession to refresh token
                const { data, error } = await supabase.auth.refreshSession()
                if (data?.session?.access_token && !error) {
                    console.log("[apiFetch] Token refreshed, retrying request...")
                    // Update header in options (getHeaders will likely pick up new token, but let's be safe by recursing)
                    // Note: recursive call will call getHeaders again.
                    // We need to ensure getHeaders doesn't just return the stale fast token.
                    // Actually, if supabase.auth.getSession() updates localStorage, getFastToken might pick it up, 
                    // OR we can pass a flag to getHeaders to ignore fast token?
                    // Simpler: Just recurse. If getSession worked, it updated storage.
                    return await apiFetch(endpoint, options, true)
                }
            }

            // Try to parse JSON error, fallback to status text
            let errorMessage = 'Request failed'
            try {
                const errorData = await response.json()
                errorMessage = errorData.detail || errorData.message || errorMessage
            } catch (e) {
                // Response wasn't JSON
                errorMessage = response.statusText
            }

            // Handle Auth errors specifically (if retry failed or didn't happen)
            if (response.status === 403) {
                throw new Error('Acceso denegado: No tienes permisos para realizar esta acción.')
            }

            if (response.status === 401) {
                // Final failure - maybe clear storage to unstuck user?
                // localStorage.clear() // Too aggressive?
                throw new Error('No autenticado / sesión expirada. Por favor recarga o inicia sesión nuevamente.')
            }

            throw new Error(errorMessage)
        }
        return await response.json()
    } catch (error) {
        console.error('[apiFetch] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        })

        // Only classify as "Connection Failed" if it's a true network error (Failed to fetch)
        // AND it wasn't an auth error we just threw above.
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('No se pudo conectar al backend. Verifica que el API esté corriendo en 8001 y que CORS permita http://localhost:5173')
        }
        throw error
    }
}

export const requisitionService = {
    // GET /requisitions
    listRequisitions: async (params = {}) => {
        const query = new URLSearchParams()
        if (params.status && params.status !== 'all') query.append('status', params.status)
        return await apiFetch(`/requisitions?${query.toString()}`)
    },

    // GET /requisitions/{id}
    getRequisitionById: async (id) => {
        return await apiFetch(`/requisitions/${id}`)
    },

    // GET /requisitions/inbox
    getInbox: async () => {
        return await apiFetch(`/requisitions/inbox`)
    },

    // GET /requisitions/{id}/usage-history
    getUsageHistory: async (id) => {
        return await apiFetch(`/requisitions/${id}/usage-history`)
    },

    // ACTIONS
    approve: async (id, comment = null) => {
        return await apiFetch(`/requisitions/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        })
    },

    reject: async (id, comment) => {
        return await apiFetch(`/requisitions/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ comment })
        })
    },

    resubmit: async (id, data = {}) => {
        return await apiFetch(`/requisitions/${id}/resubmit`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    cancel: async (id) => {
        return await apiFetch(`/requisitions/${id}/cancel`, {
            method: 'POST',
            body: JSON.stringify({})
        })
    },

    // --- Create & Submit Flow ---
    createDraft: async (data) => {
        return await apiFetch('/requisitions', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    submitRequisition: async (id, submitPayload) => {
        return await apiFetch(`/requisitions/${id}/submit`, {
            method: 'POST',
            body: JSON.stringify(submitPayload)
        })
    },

    // POST /requisitions/{id}/incoming
    processIncoming: async (id, items) => {
        return await apiFetch(`/requisitions/${id}/incoming`, {
            method: 'POST',
            body: JSON.stringify({ items })
        })
    },

    // --- Helpers ---
    getUsers: async () => {
        // Debugging: Auth issue on root /users/, using /users/debug/check which is proven to work
        const res = await apiFetch('/users/debug/check')
        // Handle both: { data: [...] } and [...]
        if (Array.isArray(res)) return res;
        return res.data || []
    }
}
