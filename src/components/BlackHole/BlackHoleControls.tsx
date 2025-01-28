import React, { useState, useCallback } from 'react';

interface BlackHoleControlsProps {
  onUpdate: (mass: number, spin: number) => void;
}

const BlackHoleControls: React.FC<BlackHoleControlsProps> = ({ onUpdate }) => {
  const [mass, setMass] = useState<number>(5);
  const [spin, setSpin] = useState<number>(0.5);

  const handleMassChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMass(Number(event.target.value));
    onUpdate(Number(event.target.value), spin);
  }, [spin, onUpdate]);

  const handleSpinChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSpin(Number(event.target.value));
    onUpdate(mass, Number(event.target.value));
  }, [mass, onUpdate]);

  return (
    <div style={{ position: 'absolute', zIndex: 1000, padding: '10px', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <label style={{ color: 'white' }}>
        Mass (solar masses): 
        <input type="range" min="1" max="10" step="0.1" value={mass} onChange={handleMassChange} />
        {mass.toFixed(1)}
      </label>
      <br />
      <label style={{ color: 'white' }}>
        Spin (-1 to 1): 
        <input type="range" min="-1" max="1" step="0.1" value={spin} onChange={handleSpinChange} />
        {spin.toFixed(1)}
      </label>
    </div>
  );
};

export default BlackHoleControls;