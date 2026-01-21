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
import RequisitionPrintView from './pages/RequisitionPrintView'
import Users from './pages/Users'
import Profile from './pages/Profile'
import CycleCountsIndex from './pages/CycleCounts/CycleCountsIndex'
import CycleCountDetail from './pages/CycleCounts/CycleCountDetail'

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/print/requisition/:id" element={<RequisitionPrintView />} />

        <Route element={<Layout />}>
          <Route path="/" element={<RoleBasedHome />} />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'staff_level_1']}>
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
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'supervisor_tool', 'toolroom_staff', 'toolroom_technician', 'staff_level_1', 'staff_level_2']}>
              <Requisitions />
            </ProtectedRoute>
          } />

          <Route path="/cycle-counts" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'toolroom_staff']}>
              <CycleCountsIndex />
            </ProtectedRoute>
          } />
          <Route path="/cycle-counts/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'supervisor', 'toolroom_staff']}>
              <CycleCountDetail />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
