import { Client, GatewayIntentBits } from 'discord.js';

import { server } from './server';
import { utils } from './utils';

require('dotenv').config();
let token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('process.env.DISCORD_TOKEN == undefined');

utils.log({
	prefix: '[BOT]',
	message: 'Variables de entorno cargadas. Iniciando...',
	important: true,
	color: 'Green',
});

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.once('ready', () => {
	utils.log({
		prefix: '[BOT]',
		message: `${client.user?.username} está online!`,
		color: 'Green',
	});
});

client.on('messageCreate', async message => {
	if (
		!message.content.startsWith('!mc') ||
		message.author.bot ||
		message.channel.isDMBased()
	)
		return;
	const args = message.content.split(' ');
	const command = args[1];
	if (!command) return;
	switch (command.toLowerCase()) {
		case 'start':
			await server.start(message);
			break;
		case 'stop':
			await server.stop(message);
			break;
		case 'restart':
			await server.restart(message);
			break;
		case 'ip':
			await server.ip(message);
			break;
	}
});

client.on('error', err => {
	utils.log({
		prefix: '[BOT][ERROR]',
		message: `Error en el cliente: ${err}`,
		color: 'Red',
		important: true,
	});
});

client.login(token);

process.on('SIGINT', server.handleExit);     // Ctrl+C
process.on('SIGTERM', server.handleExit);    // kill command
process.on('exit', server.handleExit);       // any other exit
