function parseMessage(
  template,
  stream
) {

  return template

    .replace(
      /{streamer}/g,
      stream.user_name
    )

    .replace(
      /{title}/g,
      stream.title
    )

    .replace(
      /{game}/g,
      stream.game_name || "Unknown"
    )

    .replace(
      /{url}/g,
      `https://twitch.tv/${stream.user_login}`
    )

    .replace(
      /{viewers}/g,
      `${stream.viewer_count}`
    );
}

module.exports = {
  parseMessage,
};