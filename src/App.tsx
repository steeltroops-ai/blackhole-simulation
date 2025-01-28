// src/App.tsx
import React from 'react';
import { BlackHoleSimulation } from './components/BlackHole/BlackHoleSimulation';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Black Hole Simulation
        </h1>
        <BlackHoleSimulation />
      </div>
    </div>
  );
};

export default App;