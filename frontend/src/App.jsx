import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layouts/Layout'
import Login from './pages/Login'

import Inventory from './pages/Inventory'
import ErrorBoundary from './components/ErrorBoundary'

import Stock from './pages/Stock'
import Tickets from './pages/Tickets'

import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={
            <ErrorBoundary>
              <Inventory />
            </ErrorBoundary>
          } />
          <Route path="/stock" element={<Stock />} />
          <Route path="/tickets" element={<Tickets />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
