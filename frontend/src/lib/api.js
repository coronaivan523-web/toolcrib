import { supabase } from './supabase'

// Force 8002 to bypass stale environment variables
const API_BASE_URL = 'http://localhost:8002/api/v1'
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api/v1'

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
            let errorMsg = response.statusText;
            try {
                const errData = await response.json();
                if (errData && errData.detail) errorMsg = errData.detail;
            } catch (e) { }

            throw new Error(`Request failed (${response.status}): ${errorMsg}`)
        }
        return await response.json()
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error
    }
}

const api = {
    get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
    post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' })
}

export default api
