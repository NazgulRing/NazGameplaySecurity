import "../../styles/twitch.css";

import TwitchSettings from "./TwitchSettings";
import TwitchPreview from "./TwitchPreview";
import TwitchStreamer from "./TwitchStreamer";

function TwitchPanel({
  twitchSettings,
  setTwitchSettings,
  channels,
  saveTwitchSettings,
  testTwitchAlert,
  roles,
  loadStreamer,
  removeStreamer,
  editingStreamer,
  setEditingStreamer,
}) {
  return (
    <div className="twitch-panel-wrap">

  {editingStreamer ? (

    <TwitchSettings
      twitchSettings={twitchSettings}
      setTwitchSettings={setTwitchSettings}
      channels={channels}
      saveTwitchSettings={saveTwitchSettings}
      testTwitchAlert={testTwitchAlert}
      roles={roles}
      editingStreamer={editingStreamer}
      setEditingStreamer={setEditingStreamer}
    />

  ) : (

    <TwitchStreamer
      twitchSettings={twitchSettings}
      loadStreamer={loadStreamer}
      removeStreamer={removeStreamer}
      setEditingStreamer={setEditingStreamer}
      setTwitchSettings={setTwitchSettings}
    />

  )}

</div>
  );
}

export default TwitchPanel;