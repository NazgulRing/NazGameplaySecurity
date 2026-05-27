import "../../styles/twitch.css";

function TwitchSettings({
  twitchSettings,
  setTwitchSettings,
  channels,
  saveTwitchSettings,
  testTwitchAlert,
  roles,
  editingStreamer,
  setEditingStreamer,
}) {
  return (
    <>
      <div className="twitch-panel-header">
        <div>
          <p className="twitch-kicker">
            Integration
          </p>

          <h3>Twitch Alerts</h3>
        </div>

        <label className="twitch-toggle">
          <input
            type="checkbox"
            checked={twitchSettings.enabled}
            onChange={(e) =>
              setTwitchSettings((current) => ({
                ...current,
                enabled: e.target.checked,
              }))
            }
          />

          <span className="twitch-slider"></span>

          <span className="toggle-label">
            Enabled
          </span>
        </label>
      </div>

      <div className="twitch-form-group">
        <label>
  {editingStreamer?.username
    ? 'Update Streamer'
    : 'Add Streamer'}
</label>

        <input
          type="text"
          placeholder="shroud"
          className="twitch-input"
          disabled={
            editingStreamer?.username &&
            editingStreamer.username !== ""
          }
          value={twitchSettings.username}
          onChange={(e) =>
            setTwitchSettings((current) => ({
              ...current,
              username: e.target.value,
            }))
          }
        />
      </div>

      <div className="twitch-form-group">
        <label>Discord Channel</label>

        <select
          className="twitch-select"
          value={twitchSettings.channelID}
          onChange={(e) =>
            setTwitchSettings((current) => ({
              ...current,
              channelID: e.target.value,
            }))
          }
        >
          <option value="">
            Velg kanal
          </option>

          {channels.map((channel) => (
            <option
              key={channel.id}
              value={channel.id}
            >
              #{channel.name}
            </option>
          ))}
        </select>
      </div>

      <div className="twitch-form-group">

  <label>
    Mention Role
  </label>

  <select
    className="twitch-select"

    value={
      twitchSettings.mentionRoleID || ""
    }

    onChange={(e) =>
      setTwitchSettings((current) => ({
        ...current,
        mentionRoleID:
          e.target.value,
      }))
    }
  >

    <option value="">
      Ingen mention
    </option>

    <option value="everyone">
      @everyone
    </option>

    {roles.map((role) => (

      <option
        key={role.id}
        value={role.id}
      >
        @{role.name}
      </option>

    ))}

  </select>

</div>

      <div className="twitch-form-group">
        <label>Live Message</label>

        <textarea
          className="twitch-textarea"
          placeholder="🔴 {streamer} gikk live!"
          value={twitchSettings.message}
          onChange={(e) =>
            setTwitchSettings((current) => ({
              ...current,
              message: e.target.value,
            }))
          }
        />
      </div>

      <div className="twitch-variables">
        <h4>Variables</h4>

        <div className="variable-list">
          <span>{'{streamer}'}</span>
          <span>{'{title}'}</span>
          <span>{'{game}'}</span>
          <span>{'{url}'}</span>
          <span>{'{viewers}'}</span>
        </div>
      </div>

      {editingStreamer && (

  <div className="editing-banner">

    Editing:
    <strong>
      {editingStreamer.username}
    </strong>

  </div>

)}

      <div className="twitch-actions">
        {editingStreamer && (

<button
  className="twitch-button cancel"
  onClick={() =>
    setEditingStreamer(null)
  }
>
  Cancel
</button>

)}
        <button
        className="twitch-button secondary"
        onClick={testTwitchAlert}>
          Test Alert
          </button>

        <button
          className="twitch-button primary"
          onClick={saveTwitchSettings}
        >
          {editingStreamer
  ? 'Update Streamer'
  : 'Add Streamer'}
        </button>
      </div>
    </>
  );
}

export default TwitchSettings;