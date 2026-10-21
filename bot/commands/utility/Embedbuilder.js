const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'Utility',
    // Define the slash command data with name and description
    data: new SlashCommandBuilder()
        .setName('createembed')
        .setDescription('Create a fully customized embed message.')
        .addStringOption((option) =>
            option
                .setName('title')
                .setDescription('Enter the main heading for your embed')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('description')
                .setDescription(
                    'Enter the main body text (use \\n for new lines)'
                )
                .setRequired(true)
        )
        // New Field: Optional Image URL (PNG, JPG, GIF)
        .addStringOption((option) =>
            option
                .setName('image')
                .setDescription(
                    'Paste an image URL link (e.g. ends with .png or .jpg)'
                )
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('color')
                .setDescription('Choose the color of the sidebar')
                .setRequired(false)
                .addChoices(
                    { name: 'Blue', value: '#0099FF' },
                    { name: 'Red', value: '#FF0000' },
                    { name: 'Green', value: '#00FF00' },
                    { name: 'Yellow', value: '#FFFF00' },
                    { name: 'Black', value: '#000000' }
                )
        ),

    // This function runs when the command is executed
    async execute(interaction) {
        const titleInput = interaction.options.getString('title');
        const descriptionInput = interaction.options.getString('description');
        const colorInput = interaction.options.getString('color') || '#2F3136';
        // Fetch the image URL if the user provided one
        const imageInput = interaction.options.getString('image');

        // Build the custom embed object
        const customEmbed = new EmbedBuilder()
            .setColor(colorInput)
            .setTitle(titleInput)
            .setDescription(descriptionInput.replace(/\\n/g, '\n'))
            .setTimestamp()
            .setFooter({
                text: `Posted by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        // If the user provided an image URL, add it to the embed
        if (imageInput) {
            customEmbed.setImage(imageInput);
        }

        // Reply to the interaction with the custom embed
        await interaction.reply({ embeds: [customEmbed] });
    },
};
