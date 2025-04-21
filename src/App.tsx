import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import CreateRoom from './components/CreateRoom'
import JoinRoom from './components/JoinRoom'
import Room from './components/Room'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateRoom />} />
      {/* both a code‑free join page and the one with a URL param */}
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/join/:code" element={<JoinRoom />} />
      <Route path="/room/:code" element={<Room />} />
    </Routes>
  )
}
