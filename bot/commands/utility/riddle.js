const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Array of riddle objects, each with a question and its answer
const riddles = [
  { question: "What has roots as nobody sees, Is taller than trees, Up, up it goes, And yet never grows.", answer: "mountains" },
  { question: "Thirty white horses on a red hill, First they champ, Then they stamp, Then they stand still.", answer: "teeth" },
  { question: "Voiceless it cries, Wingless flutters, Toothless bites, Mouthless mutters.", answer: "wind" },
  { question: "An eye in a blue face, Saw an eye in a green face. That eye is like to this eye, said the first eye, But in low place not in high place", answer: "sun on the daisies" },
  { question: "It cannot be seen, cannot be felt, Cannot be heard, cannot be smelt. It lies behind stars and under hills, And empty holes it fills. It comes first and follows after, Ends life, kills laughter.", answer: "dark" },
  { question: "A box without hinges, key or lid, Yet golden treasure inside is hid.", answer: "eggs" },
  { question: "Alive without breath, As cold as death, Never thirsty, ever drinking, All in mail never clinking.", answer: "fish" },
  { question: "This thing all things devours: Birds, beasts, trees, flowers; Gnaws iron, bites steel; Grinds hard stones to meal; Slays kings, ruins towns, And beats high mountain down.", answer: "time" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('riddle')          // Command name: /riddle
    .setDescription('Random riddle'), // Command description

  async execute(interaction) {
    // Recursive async function to ask riddles, takes a reply method to send messages
    const askRiddle = async (replyMethod) => {
      // Select a random riddle from the array
      const riddle = riddles[Math.floor(Math.random() * riddles.length)];

      // Create an embed message to show the riddle question
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('Riddle')
        .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
        .setDescription(riddle.question)
        .setFooter({ text: 'You got 10 seconds' })
        .setTimestamp();

      // Send the riddle embed using the passed reply method (reply or followUp)
      await replyMethod({ embeds: [embed] });

      // Filter to ensure only the user who triggered the command can respond
      const filter = (response) => response.author.id === interaction.user.id;

      // Create a message collector to wait for the user's answer for 10 seconds, max 1 message
      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 10000,
        max: 1,
      });

      // Event handler for when a message is collected (user answered)
      collector.on('collect', (message) => {
        const userAnswer = message.content.toLowerCase().trim(); // User's answer normalized
        const correct = userAnswer === riddle.answer.toLowerCase(); // Check if correct

        // Create an embed to show whether the user was correct or not
        const resultEmbed = new EmbedBuilder()
          .setColor(correct ? 'Green' : 'Red')
          .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
          .setTitle(correct ? 'Correct!' : 'Mmmm more food!')
          .setDescription(
            correct
              ? 'Nice One! No food for meee'
              : `Now we eats them hole!: **${riddle.answer}**`
          )
          .setTimestamp();

        // Send the result embed as a follow-up message
        interaction.followUp({ embeds: [resultEmbed] });

        // Ask if the user wants to try another riddle
        const askAgainEmbed = new EmbedBuilder()
          .setColor('Blue')
          .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
          .setTitle('Another chance?')
          .setDescription('Write **yes** for new or **no** to stop.')
          .setTimestamp();

        // Send the embed asking if the user wants another riddle
        interaction.followUp({ embeds: [askAgainEmbed] });

        // Create another collector for the yes/no response with 15 seconds timeout
        const collectorResponse = interaction.channel.createMessageCollector({
          filter: (response) => response.author.id === interaction.user.id,
          time: 15000,
          max: 1,
        });

        // Handle the yes/no response to either continue or stop
        collectorResponse.on('collect', async (response) => {
          const userResponse = response.content.toLowerCase().trim();

          if (userResponse === 'yes') {
            // If yes, recursively call askRiddle again, using followUp to send message
            await askRiddle(interaction.followUp.bind(interaction));
          } else {
            // If no or anything else, send a goodbye embed message
            const byeEmbed = new EmbedBuilder()
              .setColor('Purple')
              .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
              .setTitle('Goodbye! We have the precious!')
              .setDescription('Thanks for playing!')
              .setTimestamp();

            await interaction.followUp({ embeds: [byeEmbed] });
          }
        });
      });

      // Handle case when time runs out without any answer
      collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor('Yellow')
            .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('Time\'s up!')
            .setDescription(`Times up! The correct answer was: **${riddle.answer}**`)
            .setTimestamp();

          interaction.followUp({ embeds: [timeoutEmbed] });
        }
      });
    };

    // Start by asking the first riddle using interaction.reply
    await askRiddle(interaction.reply.bind(interaction));
  },
};
