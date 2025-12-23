import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layouts/Layout'
import Login from './pages/Login'

import Inventory from './pages/Inventory'
import ErrorBoundary from './components/ErrorBoundary'

import Stock from './pages/Stock'
import Tickets from './pages/Tickets'

import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedHome from './components/RoleBasedHome'

import Requisitions from './pages/Requisitions'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route path="/" element={<RoleBasedHome />} />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'toolroom_staff']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'toolroom_staff']}>
              <ErrorBoundary>
                <Inventory />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/stock" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'toolroom_staff']}>
              <Stock />
            </ProtectedRoute>
          } />
          <Route path="/requisitions" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician']}>
              <Requisitions />
            </ProtectedRoute>
          } />
          <Route path="/tickets" element={<Tickets />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
