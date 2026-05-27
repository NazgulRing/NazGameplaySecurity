import "../../styles/twitch.css";

function TwitchStreamer({
  setTwitchSettings,
  twitchSettings,
  loadStreamer,
  removeStreamer,
  setEditingStreamer,
}) {

  return (
    <div className="twitch-streamer-list">

      <div className="streamer-header">

  <h4>Active Streamers</h4>

  <button
    className="add-streamer-button"
    onClick={() => {

      setEditingStreamer({
        username: "",
      });

      setTwitchSettings((current) => ({
        ...current,
        username: "",
        message:
          "{streamer} is now live playing {game}",
        mentionRoleID: "",
        channelID: "",
        enabled: true,
      }));

    }}
  >
    + Add Streamer
  </button>

</div>

      {twitchSettings.streamers?.length > 0 ? (

        <ul className="streamer-list">

{twitchSettings.streamers?.map(
  (streamer) => (

    <div
      key={streamer.username || streamer}
      className="saved-streamer-card"
    >
<div className="streamer-main">

  <img
    src={
      streamer.avatar ||
      "https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png"
    }
    alt={streamer.username}
    className="streamer-avatar"
  />

  <div>

    <strong>
      {streamer.username || streamer}
    </strong>

    <p className={
      streamer.enabled ?? true
        ? "status-enabled"
        : "status-disabled"
    }>
      {streamer.enabled ?? true
        ? "Enabled"
        : "Disabled"}
    </p>

  </div>

</div>

      <div className="streamer-actions">

        <button
          className="edit-button"
          onClick={() =>
  loadStreamer(
    typeof streamer === "string"
      ? {
          username: streamer,
          message:
            "{streamer} is now live playing {game}",
          enabled: true,
          channelID: "",
          mentionRoleID: "",
        }
      : streamer
  )
}
        >
          Edit
        </button>

        <button
          className="remove-button"
          onClick={() =>
            removeStreamer(
              streamer.username || streamer
            )
          }
        >
          Remove
        </button>

      </div>

    </div>

))}

        </ul>

      ) : (

        <p>
          Ingen streamere lagt til
        </p>

      )}

    </div>
  );
}

export default TwitchStreamer;