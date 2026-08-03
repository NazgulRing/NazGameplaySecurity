import React from 'react';

function MembersPanel({ members, page, totalPages, setPage }) {
    return (
        <div className="panel member-panel">
            <h3>Members</h3>

            <ul className="member-list">
                {(members || []).map((member) => (
                    <li key={member.id}>
                        <img
                            src={member.avatar}
                            alt={member.username}
                            width={40}
                            height={40}
                        />

                        <span>{member.tag || member.username}</span>
                    </li>
                ))}
            </ul>

            <div className="pagination">
                <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}>
                    Previous
                </button>

                <span>
                    {page} / {totalPages}
                </span>

                <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}>
                    Next
                </button>
            </div>
        </div>
    );
}

export default MembersPanel;
