import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ArtistDetail from './pages/ArtistDetail';
import Events from './pages/Events';
import Login from './pages/Login';
import Register from './pages/Register';
import Orientation from './pages/Orientation';
import ArtistOnboarding from './pages/ArtistOnboarding';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';

export default function App() {
  return (
    <AuthProvider>
      <div className="d-flex flex-column min-vh-100">
        <Navbar />
        <main className="flex-fill container py-3"> 
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/artist/:id" element={<ArtistDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/orientation" element={<Orientation />} />
            <Route path="/onboard" element={
              <RequireAuth>
                <RequireRole roles={["artist","admin"]}>
                  <ArtistOnboarding />
                </RequireRole>
              </RequireAuth>
            } />
            <Route path="/artist/dashboard" element={
              <RequireAuth>
                <RequireRole roles={["artist"]}>
                  {/* TODO: Add ArtistDashboard component */}
                  <div>Artist Dashboard (coming soon)</div>
                </RequireRole>
              </RequireAuth>
            } />
            <Route path="/admin" element={
              <RequireAuth>
                <RequireRole roles={["admin"]}>
                  <AdminDashboard />
                </RequireRole>
              </RequireAuth>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
