import React from 'react';
import BlackHoleSimulation from './components/BlackHole/BlackHoleSimulation';
import BlackHoleControls from './components/BlackHole/BlackHoleControls';
import Container from './components/Layout/Container';

const App: React.FC = () => {
  const [mass, setMass] = React.useState(5);
  const [spin, setSpin] = React.useState(0.5);

  const updateParams = (newMass: number, newSpin: number) => {
    setMass(newMass);
    setSpin(newSpin);
  };

  return (
    <Container>
      <BlackHoleControls onUpdate={updateParams} />
      <BlackHoleSimulation mass={mass} spin={spin} />
    </Container>
  );
};

export default App;