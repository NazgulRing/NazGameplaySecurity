import React, { useState, useEffect } from "react";

function WelcomeChannel({ guildID }) {
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildID) return;

    const fetchWelcomeChannel = () => {
      setLoading(true);
      setError(null);

      fetch(`/settings/welcomeChannel/${guildID}`)
        .then(res => {
          if (!res.ok) throw new Error("Kunne ikke hente welcome channel");
          return res.json();
        })
        .then(data => {
          setChannel(data.channel || "Ingen welcome channel satt");
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    };

    fetchWelcomeChannel();
  }, [guildID]);

  return (
    <div>
      <h2>Welcome Channel</h2>
      {loading && <p>Laster...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {channel && <p>{channel}</p>}
      <button onClick={() => {
        if (!guildID) return;
        setLoading(true);
        setError(null);
        fetch(`/settings/welcomeChannel/${guildID}`)
          .then(res => {
            if (!res.ok) throw new Error("Kunne ikke hente welcome channel");
            return res.json();
          })
          .then(data => {
            setChannel(data.channel || "Ingen welcome channel satt");
            setLoading(false);
          })
          .catch(err => {
            setError(err.message);
            setLoading(false);
          });
      }} disabled={loading}>
        Oppdater welcome channel
      </button>
    </div>
  );
}

export default WelcomeChannel;
