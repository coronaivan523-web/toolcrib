import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layouts/Layout'
import Login from './pages/Login'
import Inventory from './pages/Inventory'

// Placeholders
const Dashboard = () => <div className="p-4 bg-white rounded-lg shadow">Dashboard Content Coming Soon</div>
const Tickets = () => <div className="p-4 bg-white rounded-lg shadow">Ticket System Coming Soon</div>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/tickets" element={<Tickets />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
