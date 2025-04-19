import { OmitPartialGroupDMChannel, Message, TextChannel, Role, GuildMember } from "discord.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

let mcProcess: ChildProcessWithoutNullStreams | null = null;
let cache_ip: string | null = null;

const getIp = async (): Promise<string | null> => {
	if (cache_ip) return cache_ip;
	try {
		const response = await fetch('https://api.ipify.org?format=json');
		if (!response.ok) {
			console.error("[BOT][ERROR] - Error al obtener la IP:", response.statusText);
			return null;
		}
		const data = await response.json();
		cache_ip = data.ip;
		return cache_ip;
	} catch (err) {
		console.error("[BOT][ERROR] - Error al obtener la IP:", err);
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

	console.log(`[BOT] - Iniciando el servidor...`);
	mcProcess = spawn("java", [`-Xmx${mem}G`, "-jar", jar_name], {
		cwd: jar_path,
		shell: true,
	});
	console.log("[BOT] - Servidor iniciado con éxito.");

	mcProcess.stdout.on("data", (data) => {
		console.log(`[MC] ${data}`);
	});

	mcProcess.stderr.on("data", (data) => {
		console.error(`[MC][ERROR] ${data}`);
	});

	mcProcess.on("exit", async (code, signal) => {
		console.log(`[BOT] - 🛑 Servidor detenido con código ${code} y señal ${signal}`);
		mcProcess = null;
	});
}

const restartServer = async () => {
	if (mcProcess && !mcProcess.killed) {
		stopServer();
		console.log('[BOT] - Reiniciando el servidor...');
		startServer();
	}
}

const stopServer = async () => {
	if (mcProcess && !mcProcess.killed) {
		console.log('[BOT] - Deteniendo el servidor...');
		mcProcess.kill();
		mcProcess.once('exit', () => {
			console.log('[BOT] - Servidor detenido.');
			mcProcess = null;
		});
	}
}

const start = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (mcProcess) return await message.reply("⚠️ El servidor ya está en ejecución.");
	let response = await message.reply("🟢 Iniciando servidor...");
	startServer();

	if (mcProcess) {
		let ip = await getIp();
		if (ip) {
			await response.edit(`✅ Servidor iniciado con éxito. IP: \`${ip}\``);
		} else {
			await response.edit("⚠️ No se pudo obtener la IP pública. Revisar logs!");
		}
		await response.edit("✅ Servidor iniciado con éxito.");
	} else {
		await response.edit("⚠️ No se pudo iniciar el servidor. Revisar logs!");
	}
};

const restart = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!check_permissions(message.member!)) {
		return await message.reply("⛔ No tenés permiso para usar este comando.");
	}
	if (!mcProcess) return await message.reply("⚠️ El servidor no está en ejecución.");

	let response = await message.reply("♻️ Reiniciando servidor...");

	restartServer();
	if (mcProcess) {
		let ip = await getIp();
		if (ip) {
			await response.edit(`✅ Servidor reiniciado con éxito. IP: \`${ip}\``);
		} else {
			await response.edit("⚠️ No se pudo obtener la IP pública. Revisar logs!");
		}
		await response.edit("✅ Servidor reiniciado con éxito.");
	} else {
		await response.edit("⚠️ No se pudo reiniciar el servidor. Revisar logs!");
	}
};

const stop = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!check_permissions(message.member!)) {
		return await message.reply("⛔ No tenés permiso para usar este comando.");
	}
	if (!mcProcess) return await message.reply("⚠️ El servidor no está en ejecución.");

	let response = await message.reply("🔴 Deteniendo servidor...");
	stopServer();
	response.edit("🔴 Servidor detenido.");
};

const ip = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!mcProcess) return await message.reply("⚠️ El servidor no está en ejecución.");

	let response = await message.reply("🔎 Obteniendo IP pública...");
	let ip = await getIp();

	if (ip) {
		await response.edit(`🌐 La IP del servidor es: \`${ip}\``);
	} else {
		await response.edit("⚠️ No se pudo obtener la IP pública. Revisar logs!");
	}
};
const check_permissions = async (member: GuildMember) => {
	return member.roles.cache.some((role) => role.name === "mc-admin");
}

export const server = { start, restart, stop, ip, mcProcess };