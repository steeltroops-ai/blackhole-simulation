import React from 'react';
import { BlackHoleSimulation } from './components/BlackHole/BlackHoleSimulation';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Black Hole Simulation
        </h1>
        <BlackHoleSimulation 
          width={window.innerWidth * 0.8}
          height={window.innerHeight * 0.8}
          schwarzschildRadius={1.0}
        />
      </div>
    </div>
  );
};

export default App;