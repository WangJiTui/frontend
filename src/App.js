
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import Summary from './pages/Summary';
import Admin from './pages/Admin';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  );
}

export default App;
