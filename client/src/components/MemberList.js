import "../styles/variables.css";
import "../styles/utility.css";
import "../styles/memberlist.css"; 
import React, { useEffect, useState } from "react"; 


function MemberList({ guildID }){
  const [members, setMembers] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1); 

  const MEMBERS_PER_PAGE = 10;
  useEffect(() => {
    if (!guildID) return;
    
    async function fetchMembers() { 
    try {
      setLoading(true); 
      
      const response = await fetch(
        `http://localhost:3001/api/members/${guildID}`
      ); 

      const data = await response.json(); 

      setMembers(data); 
    } catch (err) { 
      console.error(err);
     } finally { 
      setLoading(false); 
    } 
  } 

  fetchMembers();
}, [guildID]);

  const indexOfLastMember = currentPage * MEMBERS_PER_PAGE; 
  const indexOfFirstMember = indexOfLastMember - MEMBERS_PER_PAGE; 

  const currentMembers = members.slice(
    indexOfFirstMember, indexOfLastMember 
  );

  const totalPages = Math.ceil(
    members.length / MEMBERS_PER_PAGE
  ); 

  if (loading) { 
    return <p>Loading members...</p>;
  }
  
  return (
  <div className="members-section">
    <h3>Members</h3>

    <ul className="member-list"> 
      {currentMembers.map((member) => (
        <li key={member.id} className="member-card">
          <img 
          src={member.avatar} 
          alt={member.username}
          /> 
          <div>
            <strong>{member.username}</strong> 
            <span>{member.tag}</span> 
            </div> 
          </li>
        ))}
        </ul>
        
        <div className="pagination"> 
            <button
            disabled={currentPage === 1}
            onClick={() => 
            setCurrentPage((prev) => prev - 1)
            } 
            > Previous </button> 
            <span>
              Page {currentPage} / {totalPages}
            </span> 
            
            <button disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => prev + 1)
            } 
            > 
            Next
            </button>
            </div>
            </div>
            ); 
} 
  export default MemberList;