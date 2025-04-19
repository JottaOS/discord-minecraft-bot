import { OmitPartialGroupDMChannel, Message, TextChannel, Role, GuildMember, EmbedBuilder, ColorResolvable } from "discord.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

let mcProcess: ChildProcessWithoutNullStreams | null = null;
let cache_ip: string | null = null;

const log_colors = {
	red: '\x1b[31m ',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	reset: '\x1b[0m',
};


const getIp = async (): Promise<string | null> => {
	if (cache_ip) return cache_ip;
	try {
		const response = await fetch('https://api.ipify.org?format=json');
		if (!response.ok) {
			log("[BOT][ERROR]", `Error al obtener la IP: ${response.statusText}`, "red", "important");
			return null;
		}
		const data = await response.json();
		cache_ip = data.ip;
		return cache_ip;
	} catch (err) {
		log("[BOT][ERROR]", `Error al obtener la IP: ` + err, "red", "important");
	}
	return null;
}

const startServer = () => {
	let jar_name = process.env.JAR_NAME;
	let jar_path = process.env.JAR_PATH;
	let mem = process.env.MEMORY;

	if (!jar_path) throw new Error("process.env.JAR_PATH == undefined");
	if (!jar_name) throw new Error("process.env.JAR_NAME == undefined");
	if (!mem) throw new Error("process.env.MEMORY == undefined");

	log("[BOT]", "Iniciando el servidor...", "green", "important");
	mcProcess = spawn("java", [`-Xmx${mem}G`, "-jar", jar_name], {
		cwd: jar_path,
		shell: true,
	});

	mcProcess.on("error", (err) => {
		log("[BOT][ERROR]", `El proceso ha tenido un error.`, "red", "important");
		console.log(err);
		mcProcess!.kill();
		mcProcess = null;
		cache_ip = null;
		return;
	});

	mcProcess.on("exit", async (code, signal) => {
		log("[BOT]", `Servidor detenido con código ${code} y señal ${signal}`, "red", "important");
		mcProcess = null;
		cache_ip = null;
	});

	mcProcess.stdout.on("data", (data) => {
		log("[MC]", data, "yellow", "normal");
	});

	mcProcess.stderr.on("data", (data) => {
		log("[MC][ERROR]", data, "red", "normal");
	});

	mcProcess.on("spawn", () => {
		log("[BOT]", `Servidor iniciado con éxito con PID: ${mcProcess!.pid}`, "green", "important");
	})
}

const restartServer = async () => {
	if (mcProcess && !mcProcess.killed) {
		stopServer();
		log("[BOT]", "Reiniciando el servidor...", "green", "important");
		startServer();
	}
}

const stopServer = async () => {
	if (mcProcess && !mcProcess.killed) {
		log("[BOT]", "Deteniendo el servidor...", "red", "important");
		mcProcess.kill();
		mcProcess.once('exit', () => {
			log("[BOT]", "Servidor detenido.", "red", "important");
			mcProcess = null;
			cache_ip = null;
		});
	}
}

const start = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (mcProcess && !mcProcess.killed) return await message.reply({ embeds: [embed_response("El servidor ya está en ejecución.", "Yellow", "🟡")] });

	let response = await message.reply({ embeds: [embed_response("Iniciando servidor...", "White", "⚪")] });
	startServer();

	if (!mcProcess?.pid) {
		return await response.edit({ embeds: [embed_response("No se pudo iniciar el servidor. **Revisar logs!**", "Red", "🔴")] });
	}

	let ip = await getIp();
	await response.edit({
		embeds: [
			ip
				? embed_response(`Servidor iniciado con éxito. IP: \`${ip}\``, "Green", "🟢")
				: embed_response("No se pudo obtener la IP del servidor. **Revisar logs!**", "Red", "🔴")
		]
	});
};

const restart = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!check_permissions(message.member!)) return await message.reply({ embeds: [embed_response("No tenés permiso para usar este comando.", "Red", "🔴")] });
	if (!mcProcess) return await message.reply({ embeds: [embed_response("El servidor no está en ejecución.", "Yellow", "🟡")] });

	let response = await message.reply({ embeds: [embed_response("Reiniciando servidor...", "White", "⚪")] });
	restartServer();

	if (!mcProcess.pid) return await response.edit({ embeds: [embed_response("No se pudo reiniciar el servidor. **Revisar logs!**", "Red", "🔴")] });

	let ip = await getIp();
	await response.edit({
		embeds: [
			ip
				? embed_response(`Servidor reiniciado con éxito. IP: \`${ip}\``, "Green", "🟢")
				: embed_response("No se pudo obtener la IP del servidor. **Revisar logs!**", "Red", "🔴")
		]
	});
};

const stop = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!check_permissions(message.member!)) return await message.reply({ embeds: [embed_response("No tenés permiso para usar este comando.", "Red", "🔴")] });
	if (!mcProcess) return await message.reply({ embeds: [embed_response("El servidor no está en ejecución.", "Yellow", "🟡")] });

	let response = await message.reply({ embeds: [embed_response("Deteniendo servidor...", "White", "⚪")] });
	stopServer();

	response.edit({ embeds: [embed_response("Servidor detenido.", "Red", "🔴")] });
};

const ip = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!mcProcess) return await message.reply({ embeds: [embed_response("El servidor no está en ejecución.", "Yellow", "🟡")] });
	let response = await message.reply({ embeds: [embed_response("Obteniendo IP del servidor...", "White", "⚪")] });
	let ip = await getIp();
	await response.edit({
		embeds: [ip
			? embed_response(`La IP del servidor es: \`${ip}\``, "Green", "🟢")
			: embed_response("No se pudo obtener la IP del servidor. **Revisar logs!**", "Red", "🔴")
		]
	});
};
const check_permissions = async (member: GuildMember) => {
	return member.roles.cache.some((role) => role.name === "mc-admin");
}

const embed_response = (description: string, color: ColorResolvable, emoji: string) => {
	return new EmbedBuilder()
		.setDescription(`> ${emoji}  ` + description)
		.setColor(color)
}

export const log = (prefix: string, message: string, color: "green" | "yellow" | "red", type: "normal" | "important") => {
	let emoji = ""
	switch (color) {
		case "green":
			emoji = "🟢";
			break;
		case "yellow":
			emoji = "🟡";
			break;
		case "red":
			emoji = "🔴";
			break;
	}
	let date = formatDate(new Date());
	if (type === "normal") console.log(`${emoji} ${date}${log_colors[color]}${prefix}${log_colors.reset} - ${message}`);
	else console.log(`${emoji} ${date}${log_colors[color]}${prefix} - ${message}${log_colors.reset}`);
}


const formatDate = (date: Date) => {
	const pad = (n: number) => n.toString().padStart(2, '0');
  
	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1); // months are 0-based
	const year = pad(date.getFullYear() % 100); // get last 2 digits
	const hours = date.getHours();
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());
  
	return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
export const server = { start, restart, stop, ip, mcProcess };