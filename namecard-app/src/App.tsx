import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NamecardPage from './pages/NamecardPage'
import AdminPage from './pages/AdminPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/bach-nguyen" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/:id" element={<NamecardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

