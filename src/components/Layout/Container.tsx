import React from 'react';

const Container: React.FC = ({ children }) => {
  return <div style={{ width: '100%', height: '100vh', position: 'relative' }}>{children}</div>;
};

export default Container;