import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { utils } from './utils';
import { ProcessStatus } from '../typings/types';
import { promises as fs } from 'fs';
import { basename, join } from 'path';
import { client } from './bot';
import { AttachmentBuilder, TextChannel } from 'discord.js';

export class MinecraftServer {

	private cache_ip: String | null;
	private server_online: boolean; private process_busy: boolean;
	private mcProcess: ChildProcessWithoutNullStreams | null;
	private ip_check_interval: NodeJS.Timeout | null;
	private logServer: string[];

	constructor() {
		this.cache_ip = null;
		this.server_online = false;
		this.mcProcess = null;
		this.process_busy = false;
		this.ip_check_interval = null;
		this.logServer = [];
	}

	public ip = (): String | null => { return this.cache_ip }
	public online = (): boolean => { return this.server_online }
	public busy = (): boolean => { return this.process_busy }
	public logs = (): string[] => { return this.logServer }
	public saveLogs = async (): Promise<string> => {
		const lines = this.logs();
		const date = new Date().toISOString().replace(/[:.]/g, '-')
		const logDir = join(__dirname, "..", 'logs');
		const filePath = join(logDir, `${date}.log`);
		await fs.mkdir(logDir, { recursive: true });
		const content = lines.join('\n');
		await fs.writeFile(filePath, content, 'utf-8');
		return filePath;
	}

	public start = async (): Promise<boolean> => {
		if (this.busy() || (this.mcProcess && this.online())) return false;

		this.process_busy = true;
		let jar_name = process.env.JAR_NAME;
		let jar_path = process.env.JAR_PATH;
		let mem = process.env.MEMORY;
		if (!jar_path) throw new Error('process.env.JAR_PATH == undefined');
		if (!jar_name) throw new Error('process.env.JAR_NAME == undefined');
		if (!mem) throw new Error('process.env.MEMORY == undefined');
		this.mcProcess = spawn('java', [`-Xmx${mem}G`, '-jar', jar_name], {
			cwd: jar_path,
			windowsHide: true,
		});
		utils.log({
			prefix: '[PROCESS]',
			message: 'Iniciando el servidor...',
			color: 'Green',
			important: true,
		});

		this.startLogger();
		let isOpen = await this.waitUntilServerIsUp();
		if (isOpen) {
			this.cache_ip = await this.fetchIp();
			utils.log({
				prefix: '[PROCESS]',
				message: 'El servidor se inició con éxito. IP = ' + this.cache_ip,
				color: 'Green',
				important: true,
			});
			this.server_online = true;
			this.process_busy = false;
			this.ip_check_interval = (await this.monitor_ip())!;
			return true;
		} else {
			utils.log({
				prefix: '[PRCESS][ERROR]',
				message: 'Ocurrió un error al iniciar el servidor.',
				color: 'Red',
				important: true,
			});
			this.process_busy = false;
			return false;
		}
	}
	public stop = async (): Promise<boolean> => {
		if (this.busy()) return false;
		if (!this.mcProcess || !this.server_online) return false;
		return new Promise(async (resolve) => {
			this.process_busy = true;
			utils.log({
				prefix: '[PROCESS]',
				message: 'Deteniendo el servidor...',
				color: 'Red',
				important: true,
			});
			await this.save_and_exit();
			this.mcProcess!.once('exit', () => {
				utils.log({
					prefix: '[PROCESS][EXIT]',
					message: 'Servidor detenido.',
					color: 'Red',
					important: true,
				});
				resolve(true);
			});
		});
	}
	public restart = async (): Promise<boolean> => {
		if (this.busy()) return false;
		utils.log({
			prefix: '[PROCESS]',
			message: 'Reiniciando el servidor...',
			color: 'Green',
			important: true,
		});
		if (this.mcProcess && this.online()) {
			const stop_success = await this.stop();
			if (!stop_success) return false;
		}
		return await this.start();
	}

	public handleExit = async () => {
		utils.log({
			prefix: '[BOT]',
			message: 'Bot detenido con SIGINT o SIGTERM.',
			color: 'Red',
		})
		if (this.mcProcess) await this.stop()
		await this.saveLogs();
	}
	public handleCrash = async (err: Error) => {
		utils.log({
			prefix: '[BOT][ERROR]',
			message: `Error en el bot: ${err}`,
			color: 'Red',
			important: true,
		});
		console.error(err);
		await this.saveLogs();
	}
	public status = (): ProcessStatus => {
		return {
			server: {
				online: this.online(),
				ip: this.ip(),
			},
			process: {
				online: this.mcProcess != null,
				busy: this.busy(),
			},
		}
	}
	public kill = async (): Promise<boolean> => {
		if (!this.mcProcess) return false;
		return new Promise(async (resolve) => {
			if (this.mcProcess) {
				this.process_busy = true;
				utils.log({
					prefix: '[PROCESS]',
					message: 'Deteniendo el servidor forzosamente...',
					color: 'Red',
					important: true,
				});
				this.mcProcess.once('exit', () => {
					utils.log({
						prefix: '[PROCESS][EXIT]',
						message: 'Servidor detenido forzosamente.',
						color: 'Red',
						important: true,
					});
					resolve(true);
				});
				this.mcProcess.kill('SIGKILL');
			} else resolve(false);
		});
	}
	private shutdown = (): void => {
		if (this.mcProcess && !this.mcProcess.killed) this.mcProcess.kill();
		this.cache_ip = null;
		this.server_online = false;
		this.mcProcess = null;
		this.process_busy = false;
		clearInterval(this.ip_check_interval!);
		return;
	}

	private fetchIp = async (): Promise<String> => {
		const response = await fetch('https://api.ipify.org?format=json');
		const data = await response.json() as { ip: string };
		return data.ip;
	}
	private startLogger = (): void => {
		this.logger();
	}
	private logger = async (): Promise<void> => {
		return new Promise((resolve) => {
			if (!this.mcProcess) resolve();
			this.mcProcess!.on('error', async (err) => {
				utils.log({
					prefix: '[PROCESS][ERROR]',
					message: `El proceso ha tenido un error.`,
					color: 'Red',
					important: true,
				});
				console.error(err);
				await this.stop();
				resolve();
			});

			this.mcProcess!.on('exit', async (code: Number | null, signal: String | null) => {
				utils.log({
					prefix: '[PROCESS][EXIT]',
					message: `Proceso detenido con código ${code} y señal ${signal}`,
					color: 'Red',
					important: true,
				});
				this.shutdown();
				resolve();
			});

			this.mcProcess!.on('close', (code) => {
				utils.log({
					prefix: '[PROCESS][CLOSE]',
					message: `Proceso cerrado con código ${code}`,
					color: 'Red',
					important: true,
				});
				this.shutdown();
				resolve();
			});

			this.mcProcess!.stdout.on('data', (data: Buffer) => {
				let raw = data.toString()
				raw.split('\n').forEach((line) => {
					const cleaned = line.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, '')
					if (line.trim()) {
						utils.log({
							prefix: '[MC]',
							message: cleaned,
							color: 'Yellow',
						});
					}
				});
			});

			this.mcProcess!.stderr.on('data', (data: Buffer) => {
				let raw = data.toString()
				raw.split('\n').forEach((line) => {
					const cleaned = line.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/g, '')
					if (line.trim()) {
						utils.log({
							prefix: '[MC]',
							message: cleaned,
							color: 'Red',
							important: true,
						});
					}
				});
			});

			this.mcProcess!.on('spawn', () => {
				utils.log({
					prefix: '[PROCESS][SPAWN]',
					message: `Proceso iniciado con éxito con PID: ${this.mcProcess!.pid}`,
					color: 'Green',
					important: true,
				});
			});
		});
	}
	private waitUntilServerIsUp = async (): Promise<boolean> => {
		if (!this.mcProcess) return false
		return new Promise((resolve) => {
			let resolved = false;
			const timeout = setTimeout(() => {
				if (!resolved) {
					utils.log({
						prefix: '[PROCESS][ERROR]',
						message: 'Se ha agotado el tiempo de espera para iniciar el servidor (120s).',
						color: 'Red',
						important: true,
					})
					this.mcProcess!.kill('SIGKILL');
					resolved = true;
					resolve(false);
				}
			}, 120 * 1000);

			const onOutput = (data: Buffer) => {
				const text = data.toString();
				if (text.includes("[Server thread/INFO]: Done")) {
					if (!resolved) {
						clearTimeout(timeout);
						resolved = true;
						resolve(true);
					}
				}
			};

			this.mcProcess!.stdout?.on('data', onOutput);
			this.mcProcess!.stderr?.on('data', onOutput);

			this.mcProcess!.on('exit', () => {
				if (!resolved) {
					clearTimeout(timeout);
					resolved = true;
					resolve(false);
				}
			});
		});
	}
	private save_and_exit = async (): Promise<boolean> => {
		if (!this.mcProcess) return false;

		return new Promise((resolve) => {
			let resolved = false;
			const timeout = setTimeout(() => {
				if (!resolved) {
					utils.log({
						prefix: '[BOT]',
						message: 'Se ha agotado el tiempo de espera para detener el servidor (120s).',
						color: 'Red',
						important: true,
					})
					this.mcProcess!.kill('SIGKILL');
					resolved = true;
					resolve(false);
				}
			}, 120 * 1000);

			this.mcProcess!.stdin.write("stop\n");
			this.mcProcess!.stdout.on('data', data => {
				if (data.includes('All dimensions are saved')) {
					if (!resolved) {
						clearTimeout(timeout);
						resolved = true;
						resolve(true);
					}
				};
			});
		});

	}
	private monitor_ip = async (): Promise<NodeJS.Timeout | undefined> => {
		if (!this.mcProcess || !this.cache_ip || !this.online()) return;
		return setInterval(async () => {
			const ip = await this.fetchIp();
			if (ip !== this.cache_ip) {
				this.cache_ip = ip;
				utils.log({
					prefix: '[PROCESS]',
					message: `La IP ha cambiado. Reiniciando servidor...`,
					color: 'Yellow',
					important: true,
				});
				await this.restart();
			}
		}, (1000 * 60) * 30);
	}
}