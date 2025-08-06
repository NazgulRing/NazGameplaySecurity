const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Define the slash command data with name, description, and required option
  data: new SlashCommandBuilder()
    .setName('reload')                   // Command name: /reload
    .setDescription('Reloads a command.') // Description in Discord UI
    .addStringOption(option =>           // Add a required string option called "command"
      option.setName('command')
        .setDescription('The command to reload.')
        .setRequired(true)
    ),

  // Function executed when the command is triggered
  async execute(interaction) {
    // Get the command name from the options, convert to lowercase for consistency
    const commandName = interaction.options.getString('command', true).toLowerCase();
    // Retrieve the command object from the client's commands collection
    const command = interaction.client.commands.get(commandName);

    // If no command found, reply with an error message
    if (!command) {
      return interaction.reply(`There is no command with name \`${commandName}\`!`);
    }

    // Delete the cached version of the command file to force reload
    delete require.cache[require.resolve(command.filePath)];

    try {
      // Require the command file again to get the updated version
      const newCommand = require(command.filePath);
      // Re-assign the file path property (needed for future reloads)
      newCommand.filePath = command.filePath;
      // Update the command in the client's collection
      interaction.client.commands.set(newCommand.data.name, newCommand);
      // Inform the user the command was successfully reloaded
      await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
    } catch (error) {
      // Log the error and reply to the user indicating reload failed
      console.error(error);
      await interaction.reply(`There was an error reloading the command \`${command.data.name}\`:\n\`${error.message}\``);
    }
  },
};
