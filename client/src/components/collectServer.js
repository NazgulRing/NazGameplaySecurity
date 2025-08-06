import React, { useState } from 'react';

function GuildsButton() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function fetchGuilds() {
    setLoading(true);
    setError(null);

    fetch('/api/guilds')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch guilds');
        return response.json();
      })
      .then(data => {
        setGuilds(data);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div>
      <button onClick={fetchGuilds} disabled={loading}>
        {loading ? 'Laster...' : 'Hent servere'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {guilds.map(guild => (
          <li key={guild.id}>
            {guild.name} ({guild.memberCount} medlemmer)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GuildsButton;
