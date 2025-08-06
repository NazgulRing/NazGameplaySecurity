const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seteventchannel')
    .setDescription('Velg hvilken kanal som skal motta eventmeldinger.')
    .addChannelOption(option => 
      option
        .setName('kanal')
        .setDescription('Velg en kanal for eventmeldinger')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Kun admin

  async execute(interaction) {
    const channel = interaction.options.getChannel('kanal');

    // Sjekk at det er en tekstkanal
    if (channel.type !== 0) { // ChannelType.GuildText === 0
      return interaction.reply({ content: 'Kanalen må være en tekstkanal.', ephemeral: true });
    }

    await db.set(`eventchannel_${interaction.guild.id}`, channel.id);
    return interaction.reply({ content: `Eventkanal er satt til ${channel}`, ephemeral: true });
  }
};
