import { ColorResolvable } from 'discord.js';
class MinecraftServer {
	private cache_ip: String | null;
	private server_online: boolean | null;
	private mcProcess: ChildProcessWithoutNullStreams | null | undefined;
	private ip_check_interval: NodeJS.Timeout | null | undefined;
	constructor();
	public ip(): String | null;
	public online(): boolean;
	public busy(): boolean;
	public logs(): string[];
	public saveLogs(): Promise<string>;
	public start(): Promise<boolean>;
	public stop(): Promise<boolean>;
	public kill(): Promise<boolean>;
	public restart(): Promise<boolean>;
	public handleExit(): Promise<void>;
	public status(): ProcessStatus;
	private fetchIp(): Promise<String>;
	private startLogger(): void;
	private ip
	private logger(): Promise<void>;
	private waitUntilServerIsUp(): Promise<boolean | undefined>;
	private save_and_exit(): Promise<boolean>;
	private shutdown(): void;
	private monitor_ip(): Promise<NodeJS.Timeout | undefined>;
}

interface EmbedCreatorParameters {
	description: string;
	color: Color;
}

interface ProcessStatus {
	server: {
		online: boolean;
		ip: String | null;
	}
	process: {
		online: boolean;
		busy: boolean;
	}
}
interface LogCreatorParameters {
	prefix: string;
	message: string;
	color: Color;
	important?: boolean;
}

type Color =
	| 'Red'
	| 'Orange'
	| 'Yellow'
	| 'Green'
	| 'Blue'
	| 'Purple'
	| 'White';
export type { EmbedCreatorParameters, LogCreatorParameters, Color, ProcessStatus };
