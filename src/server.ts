import { OmitPartialGroupDMChannel, Message } from "discord.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { utils } from "./utils";
import { EmbedCreatorParameters } from "../typings/types";


let mcProcess: ChildProcessWithoutNullStreams | null = null;
let cache_ip: string | null = null;
let server_open = false;

const getIp = async (): Promise<string | null> => {
	if (cache_ip) return cache_ip;
	try {
		const response = await fetch('https://api.ipify.org?format=json');
		if (!response.ok) {
			utils.log({
				prefix: "[BOT][ERROR]",
				message: `Error al obtener la IP: ${response.statusText}`,
				color: "Red",
				important: true
			});
			return null;
		}
		const data = await response.json();
		cache_ip = data.ip;
		return cache_ip;
	} catch (err) {

		utils.log({
			prefix: "[BOT][ERROR]",
			message: `Error al obtener la IP: ` + err,
			color: "Red",
			important: true
		});

		console.error(err);
	}
	return null;
}

const serverProcess = () => {
	let jar_name = process.env.JAR_NAME;
	let jar_path = process.env.JAR_PATH;
	let mem = process.env.MEMORY;

	if (!jar_path) throw new Error("process.env.JAR_PATH == undefined");
	if (!jar_name) throw new Error("process.env.JAR_NAME == undefined");
	if (!mem) throw new Error("process.env.MEMORY == undefined");

	mcProcess = spawn("java", [`-Xmx${mem}G`, "-jar", jar_name], {
		cwd: jar_path,
		windowsHide: true,
		shell: true,
	});

	mcProcess.on("error", (err) => {
		utils.log({
			prefix: "[BOT][ERROR]",
			message: `El proceso ha tenido un error.`,
			color: "Red",
			important: true
		});

		console.error(err);
		utils.killProcess(mcProcess)
		server_open = false;
		mcProcess = null;
		cache_ip = null;
		return;
	});

	mcProcess.on("exit", async (code, signal) => {
		utils.log({
			prefix: "[BOT]",
			message: `Servidor detenido con código ${code} y señal ${signal}`,
			color: "Red",
			important: true
		});

		server_open = false;
		mcProcess = null;
		cache_ip = null;
	});

	mcProcess.stdout.on("data", (data) => {
		if (!server_open && data.includes("[Server thread/INFO]: Done")) server_open = true;
		utils.log({
			prefix: "[MC]",
			message: data,
			color: "Yellow",
		});

	});

	mcProcess.stderr.on("data", (data) => {
		utils.log({
			prefix: "[MC][ERROR]",
			message: data,
			color: "Red",
		});
	});

	mcProcess.on("spawn", () => {
		utils.log({
			prefix: "[BOT]",
			message: `Servidor iniciado con éxito con PID: ${mcProcess!.pid}`,
			color: "Green",
			important: true
		});
	})
}

const startServer = async () => {
	if (!mcProcess) {
		server_open = false;
		utils.log({
			prefix: "[BOT]",
			message: "Iniciando el servidor...",
			color: "Green",
			important: true
		});
		serverProcess();

		let opened = await waitForTrue(() => server_open);
		if (!opened) {
			utils.log({
				prefix: "[BOT]",
				message: "No se pudo iniciar el servidor. **Revisar logs!**",
				color: "Red",
				important: true
			});
		}
		return opened;
	} else {
		utils.log({
			prefix: "[BOT]",
			message: "El servidor se intentó iniciar pero ya estaba en ejecución.",
			color: "Yellow",
			important: true
		});
		return true;
	}
}

const restartServer = async () => {
	if (mcProcess && !mcProcess.killed) {
		await stopServer();
		utils.log({
			prefix: "[BOT]",
			message: "Reiniciando el servidor...",
			color: "Green",
			important: true
		});
		return await startServer();
	} else {
		utils.log({
			prefix: "[BOT]",
			message: "El servidor se intentó reiniciar pero no estaba en ejecución.",
			color: "Yellow",
			important: true
		});
		return false;
	}
}

const stopServer = async () => {
	if (mcProcess && !mcProcess.killed) {
		server_open = false;

		utils.log({
			prefix: "[BOT]",
			message: "Deteniendo el servidor...",
			color: "Red",
			important: true
		});

		utils.killProcess(mcProcess)
		mcProcess.once('exit', () => {
			utils.log({
				prefix: "[BOT]",
				message: "Servidor detenido.",
				color: "Red",
				important: true
			});
			
			mcProcess = null;
			cache_ip = null;
		});
	} else {
		utils.log({
			prefix: "[BOT]",
			message: "El servidor se intentó detener pero no estaba en ejecución.",
			color: "Yellow",
			important: true
		});
	}
}

const waitForTrue = async (checkFn: () => boolean, timeout = 25000, interval = 500): Promise<boolean> => {
	const start = Date.now();
	return new Promise((resolve) => {
		const check = () => {
			if (checkFn()) return resolve(true);
			if (Date.now() - start > timeout) return resolve(false);
			setTimeout(check, interval);
		};
		check();
	});
}

const start = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (mcProcess) return await message.reply({ embeds: [utils.embed({ description: "El servidor ya está en ejecución.", color: "Yellow" })] });

	let response = await message.reply({ embeds: [utils.embed({ description: "Iniciando servidor...", color: "White" })] });

	let success = await startServer();
	if (!success) return await response.edit({ embeds: [utils.embed({ description: "No se pudo iniciar el servidor. **Revisar logs!**", color: "Red" })] });

	let ip = await getIp();
	const ipExists = ip ? true : false;
	let options: EmbedCreatorParameters = {
		color: ipExists ? "Green" : "Red",
		description: ipExists ? `Servidor iniciado con éxito. \n\n> **・IP:** \`${ip}\`` : "No se pudo obtener la IP del servidor. **Revisar logs!**"
	}

	await response.edit({
		embeds: [utils.embed(options)]
	});
};

const restart = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!utils.check_permissions(message.member!)) return await message.reply({ embeds: [utils.embed({ description: "No tenés permiso para usar este comando.", color: "Red" })] });
	if (!mcProcess) return await message.reply({ embeds: [utils.embed({ description: "El servidor no está en ejecución.", color: "Yellow" })] });
	let response = await message.reply({ embeds: [utils.embed({ description: "Reiniciando servidor...", color: "White" })] });
	server_open = false;
	let success = await restartServer();
	if (!success) return await response.edit({ embeds: [utils.embed({ description: "No se pudo reiniciar el servidor. **Revisar logs!**", color: "Red" })] });

	let ip = await getIp();
	const ipExists = ip ? true : false;
	let options: EmbedCreatorParameters = {
		color: ipExists ? "Green" : "Red",
		description: ipExists ? `Servidor reiniciado con éxito. \n\n> **・IP:** \`${ip}\`` : "No se pudo obtener la IP del servidor. **Revisar logs!**"
	}

	await response.edit({ embeds: [utils.embed(options)] });
};

const stop = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!utils.check_permissions(message.member!)) return await message.reply({ embeds: [utils.embed({ description: "No tenés permiso para usar este comando.", color: "Red" })] });
	if (!mcProcess) return await message.reply({ embeds: [utils.embed({ description: "El servidor no está en ejecución.", color: "Yellow" })] });

	let response = await message.reply({ embeds: [utils.embed({ description: "Deteniendo servidor...", color: "White" })] });
	stopServer();

	response.edit({ embeds: [utils.embed({ description: "Servidor detenido.", color: "Red" })] });
};

const ip = async (message: OmitPartialGroupDMChannel<Message>) => {
	if (!mcProcess) return await message.reply({ embeds: [utils.embed({ description: "El servidor no está en ejecución.", color: "Yellow" })] });
	let response = await message.reply({ embeds: [utils.embed({ description: "Obteniendo IP del servidor...", color: "White" })] });
	let ip = await getIp();
	const ipExists = ip ? true : false;

	let options: EmbedCreatorParameters = {
		color: ipExists ? "Green" : "Red",
		description: ipExists ? `La IP del servidor es: \`${ip}\`` : "No se pudo obtener la IP del servidor. **Revisar logs!**"
	}

	await response.edit({ embeds: [utils.embed(options)] });
};


export const server = { start, restart, stop, ip, mcProcess };