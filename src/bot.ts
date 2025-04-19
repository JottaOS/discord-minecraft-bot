require("dotenv").config();
let token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("process.env.DISCORD_TOKEN == undefined");

import { Client, GatewayIntentBits } from "discord.js";
import { server } from "./functions";
import { log } from "./functions";

const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.once("ready", () => {
	log("[BOT]", `${client.user?.username} está online!`, "green", "normal");
});

client.on("messageCreate", async (message) => {
	if (!message.content.startsWith("!mc") || message.author.bot || message.channel.isDMBased()) return;
	const args = message.content.split(" ");
	const command = args[1];
	if (!command) return;
	switch (command.toLowerCase()) {
		case "start":
			await server.start(message);
			break;
		case "stop":
			await server.stop(message);
			break;
		case "restart":
			await server.restart(message);
			break;
		case "ip":
			await server.ip(message);
			break;
	};
});

client.login(token);
