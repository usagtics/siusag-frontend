import React, { useEffect, useState } from 'react';
import axios from 'axios';

function BackendTest() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/')
      .then(res => setMessage(res.data))
      .catch(err => setMessage('Error conectando al backend'));
  }, []);

  return (
    <div>
      <h1>Prueba de conexión al backend</h1>
      <p>{message}</p>
    </div>
  );
}

export default BackendTest;
