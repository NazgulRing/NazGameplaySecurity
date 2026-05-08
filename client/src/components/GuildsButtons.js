import React, { useState } from 'react';

function GuildsButton() {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function fetchGuilds() {
    setLoading(true);
    setError(null);

    fetch('/api/guilds') // Merk: backend bruker /api/guilds
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch guilds');
        return response.json();
      })
      .then(data => setGuilds(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function selectGuild(guildID) {
    setLoading(true);
    setError(null);
    setSelectedGuild(guildID);
    setMembers([]);

    fetch(`/api/members/${guildID}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch members');
        return res.json();
      })
      .then(data => setMembers(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <button onClick={fetchGuilds} disabled={loading}>
        {loading ? 'Loading...' : 'Get Servers'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul>
        {guilds.map(guild => (
          <li key={guild.id}>
            <button onClick={() => selectGuild(guild.id)}>
              {guild.name} ({guild.memberCount} medlemmer)
            </button>
          </li>
        ))}
      </ul>

      {selectedGuild && (
        <div>
          <h3>Members:</h3>
          <ul>
            {members.map(member => (
              <li key={member.id}>
                <div class="auto-grid-2 w-1by3"><div><img class="rounded-full"
                  src={member.avatar}
                  alt={member.username}
                  width={64}
                  height={64}
                /></div>
                <div><p>{member.username}#{member.tag.split('#')[1]}</p></div></div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default GuildsButton;