const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { discordBotClientID, discordBotToken } = require('./config.json');

const commands = [
	new SlashCommandBuilder()
    .setName('assignments-channel')
    .setDescription('Sets the channel to receive assignments.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to post assignments'))
    .setDefaultMemberPermissions(0),

    new SlashCommandBuilder()
    .setName('assignments-fetch')
    .setDescription('Fetches the assignments and posts them in the assignments channel.')
    .setDefaultMemberPermissions(0),

	new SlashCommandBuilder()
    .setName('announcements-channel')
    .setDescription('Sets the channel to receive announcements.')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to post announcements'))
    .setDefaultMemberPermissions(0),

    new SlashCommandBuilder()
    .setName('announcements-fetch')
    .setDescription('Fetches the announcements and posts them in the announcements channel.')
    .setDefaultMemberPermissions(0),
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(discordBotToken);

rest.put(Routes.applicationCommands(discordBotClientID), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);