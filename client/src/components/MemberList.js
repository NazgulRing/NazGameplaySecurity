import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

function MemberList() {
  const { guildID } = useParams(); // henter guildID fra URL
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!guildID) return;

    setLoading(true);
    fetch(`/settings/members/${guildID}`)
      .then(res => {
        if (!res.ok) throw new Error("Feil ved henting av medlemmer");
        return res.json();
      })
      .then(data => {
        setMembers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [guildID]);

  if (loading) return <div>Laster medlemmer...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <ul>
      {members.map((member) => (
        <li key={member.id} style={{ marginBottom: "10px", display: 'flex', alignItems: 'center' }}>
          <img
            src={member.avatar}
            alt={member.username}
            style={{ width: 32, height: 32, borderRadius: "50%", marginRight: 8 }}
          />
          {member.username}#{member.tag}
        </li>
      ))}
    </ul>
  );
}

export default MemberList;
