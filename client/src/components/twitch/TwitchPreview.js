import "../../styles/twitch.css";

function TwitchPreview({ twitchSettings }) {
  return (
    <div className="twitch-preview">
      <div className="preview-header">
        Preview
      </div>

      <div className="preview-content">
        <p>
          {(twitchSettings.message ||
            '{streamer} is now live playing {game}')
            .replace(
              '{streamer}',
              twitchSettings.username || 'shroud'
            )
            .replace(
              '{title}',
              'Ranked grind'
            )
            .replace(
              '{game}',
              'VALORANT'
            )
            .replace(
              '{url}',
              'twitch.tv/shroud'
            )
            .replace(
              '{viewers}',
              '12000'
            )}
        </p>
      </div>
    </div>
  );
}

export default TwitchPreview;