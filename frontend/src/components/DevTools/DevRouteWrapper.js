import React from 'react';
import { useNavigate } from 'react-router-dom';

const DevRouteWrapper = ({ component: Component }) => {
  const navigate = useNavigate();

  const devStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 9999,
    padding: '8px',
    background: '#333',
    borderRadius: '4px',
    color: 'white',
    display: 'flex',
    gap: '8px'
  };

  const buttonStyle = {
    padding: '4px 8px',
    background: '#666',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer'
  };

  return (
    <div>
      <div style={devStyle}>
        <button 
          style={buttonStyle}
          onClick={() => navigate('/dev/onboarding')}
        >
          Onboarding
        </button>
        <button 
          style={buttonStyle}
          onClick={() => navigate('/dev/profile')}
        >
          Profile
        </button>
        <button 
          style={buttonStyle}
          onClick={() => navigate('/dev/home')}
        >
          Home
        </button>
      </div>
      <Component />
    </div>
  );
};

export default DevRouteWrapper;
