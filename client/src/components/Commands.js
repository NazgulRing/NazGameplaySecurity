import "../styles/commands.css";
import "../styles/variables.css";
import "../styles/utility.css";

function Commands({ commands }) {

  const groupedCommands = commands.reduce((acc, cmd) => {
    const category = cmd.category || "Other";

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(cmd);

    return acc;
  }, {});

  return (
    <div className="commands-section">
      <h3>Commands</h3>

      <div className="commands-scroll">
        {Object.entries(groupedCommands)
        .sort(([a],[b])=> a.localeCompare(b))
        .map(([category, cmds]) => (
          <div key={category} className="command-category">

            <h4>{category}</h4>

            <ul className="commands-list">
              {cmds.map((cmd) => (
                <li key={cmd.name}>
                  <strong>/{cmd.name}</strong>
                  <span>{cmd.description}</span>
                </li>
              ))}
            </ul>

          </div>
        ))}
      </div>
    </div>
  );
}

export default Commands;