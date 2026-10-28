import React from 'react';
import '../../../styles/rolespanel.css';

function RolesPanel({
    roles,
    totalMembers,
    expandedRoleID,
    roleMembers,
    roleMembersLoading,
    onToggleRole,
}) {
    const roleList = roles || [];

    return (
        <div className="panel roles-panel">
            <div className="roles-header">
                <div>
                    <h3>Roles</h3>
                    <p>
                        {roleList.length} roles in this server
                        {' · '}
                        {totalMembers ?? 0} total members
                    </p>
                </div>
            </div>

            {roleList.length === 0 ? (
                <p className="roles-empty">No roles found.</p>
            ) : (
                <ul className="roles-list">
                    {roleList.map((role) => {
                        const isExpanded = expandedRoleID === role.id;
                        const members = roleMembers?.[role.id] || [];
                        const isLoading =
                            roleMembersLoading?.[role.id] || false;

                        return (
                            <li className="role-card" key={role.id}>
                                <button
                                    type="button"
                                    className="role-card-button"
                                    onClick={() => onToggleRole(role.id)}
                                    aria-expanded={isExpanded}>
                                    <div className="role-info">
                                        <span
                                            className="role-color"
                                            style={{
                                                backgroundColor:
                                                    role.color || '#99AAB5',
                                            }}
                                        />

                                        <span className="role-name">
                                            {role.name}
                                        </span>
                                    </div>

                                    <span className="role-card-right">
                                        <span className="role-member-count">
                                            {role.memberCount ?? 0}{' '}
                                            {(role.memberCount ?? 0) === 1
                                                ? 'member'
                                                : 'members'}
                                        </span>

                                        <span
                                            className={`role-chevron ${
                                                isExpanded ? 'expanded' : ''
                                            }`}
                                            aria-hidden="true">
                                            ⌄
                                        </span>
                                    </span>
                                </button>

                                {isExpanded && (
                                    <div className="role-members">
                                        {isLoading ? (
                                            <p className="roles-empty">
                                                Loading members...
                                            </p>
                                        ) : members.length === 0 ? (
                                            <p className="roles-empty">
                                                No members found for this role.
                                            </p>
                                        ) : (
                                            members.map((member) => (
                                                <div
                                                    className="role-member"
                                                    key={member.id}>
                                                    <img
                                                        className="role-member-avatar"
                                                        src={member.avatar}
                                                        alt=""
                                                    />

                                                    <div className="role-member-info">
                                                        <span className="role-member-name">
                                                            {member.displayName ||
                                                                member.username}
                                                        </span>

                                                        {member.displayName &&
                                                            member.displayName !==
                                                                member.username && (
                                                                <span className="role-member-username">
                                                                    @
                                                                    {
                                                                        member.username
                                                                    }
                                                                </span>
                                                            )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default RolesPanel;
