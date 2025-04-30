import { AttachmentBuilder, Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';
import { MinecraftServer } from './MinecraftServer';
import { utils } from './utils';
import * as fs from 'fs';
import { basename } from 'path';

require('dotenv').config();
let token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('process.env.DISCORD_TOKEN == undefined');
const server = new MinecraftServer();
export { server };
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
		case 'start': {
			if (server.busy()) {
				const embed = utils.embed({
					description: 'El proceso está ocupado. Esperá a que termine de ejecutarse el comando anterior.',
					color: 'Yellow',
				});
				return await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
			}
			if (server.online()) {
				const embed = utils.embed({
					description: 'El servidor ya está en ejecución.\n> **・IP:** \`' + server.ip() + '\`',
					color: 'Yellow',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}
			const embed = utils.embed({
				description: 'Iniciando el servidor...',
				color: 'White',
			});
			const response = await message.reply({
				embeds: [embed],
				allowedMentions: { repliedUser: false },
			})
			let start = utils.createTimer()
			const success = await server.start();
			if (success) {
				const embed = utils.embed({
					description: 'El servidor se inició con éxito en \`' + start() + 's\`.\n> **・IP:** \`' + server.ip() + '\`',
					color: 'Green',
				});
				await response.edit({
					embeds: [embed],
				});
			} else {
				const embed = utils.embed({
					description: 'Ocurrió un error al iniciar el servidor. **Revisar logs!**',
					color: 'Red',
				});
				await response.edit({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
			}
			break
		}
		case 'stop': {
			if (server.busy()) {
				const embed = utils.embed({
					description: 'El proceso está ocupado. Esperá a que termine de ejecutarse el comando anterior.',
					color: 'Yellow',
				});
				return await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
			}
			let permissions = utils.check_permissions(message.member!);
			if (!permissions) {
				const embed = utils.embed({
					description: 'No tenés permiso para usar este comando.',
					color: 'Red',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}
			if (!server.online()) {
				const embed = utils.embed({
					description: 'El servidor no está en ejecución.',
					color: 'Yellow',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}

			const embed = utils.embed({
				description: 'Deteniendo el servidor...',
				color: 'White',
			});
			const response = await message.reply({
				allowedMentions: { repliedUser: false },
				embeds: [embed],
			});
			let start = utils.createTimer();
			const success = await server.stop();
			if (success) {
				const embed = utils.embed({
					description: 'El servidor se detuvo con éxito en \`' + start() + 's\`.',
					color: 'Red',
				});
				await response.edit({ embeds: [embed] });
			} else {
				const embed = utils.embed({
					description: 'Ocurrió un error al detener el servidor. **Revisar logs!**',
					color: 'Red',
				});
				await response.edit({ embeds: [embed] });
			}
			break
		}
		case 'restart': {
			if (server.busy()) {
				const embed = utils.embed({
					description: 'El proceso está ocupado. Esperá a que termine de ejecutarse el comando anterior.',
					color: 'Yellow',
				});
				return await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
			}
			let permissions = utils.check_permissions(message.member!);
			if (!permissions) {
				const embed = utils.embed({
					description: 'No tenés permiso para usar este comando.',
					color: 'Red',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}
			const embed = utils.embed({
				description: 'Reiniciando el servidor...',
				color: 'White',
			});
			const response = await message.reply({
				allowedMentions: { repliedUser: false },
				embeds: [embed],
			});
			let start = utils.createTimer();
			const success = await server.restart();
			if (success) {
				const embed = utils.embed({
					description: 'El servidor se reinició con éxito en \`' + start() + 's\`.',
					color: 'Green',
				});
				await response.edit({ embeds: [embed] });
			} else {
				const embed = utils.embed({
					description: 'Ocurrió un error al reiniciar el servidor. **Revisar logs!**',
					color: 'Red',
				});
				await response.edit({ embeds: [embed] });
			}
			break;
		}
		case 'ip': {
			if (!server.online()) {
				const embed = utils.embed({
					description: 'El servidor no está en ejecución.',
					color: 'Yellow',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}
			const embed = utils.embed({
				description: 'La IP del servidor es: \`' + server.ip() + '\`',
				color: 'White',
			});
			await message.reply({
				embeds: [embed],
				allowedMentions: { repliedUser: false },
			});
			break;
		}
		case 'status': {

			const data = server.status();
			const embed = new EmbedBuilder().setColor("Green")
				.addFields(
					{ name: `**Estado del servidor**`, value: `**・Online:** \`${data.server.online}\`\n**・IP:** \`${data.server.ip}\`` },
				)
				.addFields(
					{ name: `**Estado del proceso**`, value: `**・Online:** \`${data.process.online}\`\n**・Ocupado:** \`${data.process.busy}\`` },
				)
			await message.reply({
				embeds: [embed],
				allowedMentions: { repliedUser: false },
			});
			break;
		}
		case "kill": {
			let permissions = utils.check_permissions(message.member!);
			if (!permissions) {
				const embed = utils.embed({
					description: 'No tenés permiso para usar este comando.',
					color: 'Red',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}
			let data = server.status();
			if (!data.process.online) {
				const embed = utils.embed({
					description: 'El proceso no está en ejecución.',
					color: 'Yellow',
				});
				return await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
			}
			let timer = utils.createTimer();
			const embed_sigkill = utils.embed({
				description: 'Enviando señal \`SIGKILL\` al proceso...',
				color: 'Red',
			});
			const response = await message.reply({
				embeds: [embed_sigkill],
				allowedMentions: { repliedUser: false },
			});
			await server.kill();
			const embed = utils.embed({
				description: `El proceso se detuvo forzosamente con éxito en \`${timer()}\`.`,
				color: 'Red',
			});
			await response.edit({
				embeds: [embed],
			});
			break
		}
		case "logs": {
			const permissions = utils.check_permissions(message.member!);
			if (!permissions) {
				const embed = utils.embed({
					description: 'No tenés permiso para usar este comando.',
					color: 'Red',
				});
				await message.reply({
					embeds: [embed],
					allowedMentions: { repliedUser: false },
				});
				return;
			}
			const filePath = await server.saveLogs();
			const file = fs.readFileSync(filePath);
			const attachment = new AttachmentBuilder(file, {name: basename(filePath)});
			const embed = utils.embed({
				description: 'Logs guardados con éxito, revisa el DM.',
				color: 'Green',
			});
			try {
				await message.member?.user.send({
					embeds: [utils.embed({ description: 'Los logs que pediste.', color: 'Green' })],
					files: [attachment],
				})
			} catch (err) {
				console.error(err);
			}
			await message.reply({
				embeds: [embed],
				allowedMentions: { repliedUser: false },
			});
			break;
		}
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
export { client };
process.on('SIGINT', server.handleExit); // Ctrl+C
process.on('SIGTERM', server.handleExit); // kill command
process.on('exit', server.handleExit); // any other exit
process.on('uncaughtException', server.handleCrash);
process.on('unhandledRejection', server.handleCrash);
