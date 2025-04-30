import * as chalk from 'chalk';
import { EmbedBuilder, GuildMember } from 'discord.js';

import {
	Color,
	EmbedCreatorParameters,
	LogCreatorParameters,
} from '../typings/types';
import { server } from './bot';

const check_permissions = (member: GuildMember) => {
	return member.roles.cache.some(role => role.name === 'mc-admin');
};

const embed = (params: EmbedCreatorParameters): EmbedBuilder => {
	let emoji = getCircleEmoji(params.color);
	return new EmbedBuilder()
		.setDescription(`> ${emoji}  ` + params.description)
		.setColor(params.color);
};

export const log = (params: LogCreatorParameters) => {
	let date = formatDate(new Date());
	let reset = `\x1b[0m`;
	let color = chalk.hex(getHexColor(params.color));
	let msg = `${date}  ${params.prefix} - ${params.message}`;
	server.logs().push(msg);

	if (!params.important)
		console.log(
			`${color('●')} ${date} ${color.bold(params.prefix)}${chalk.reset(' - ' + params.message)}`
		);
	else
		console.log(
			`${color('●')} ${date} ${color.bold(params.prefix + ' - ' + params.message)}${reset}`
		);
};

const formatDate = (date: Date) => {
	const pad = (n: number) => n.toString().padStart(2, '0');

	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1); // months are 0-based
	const year = pad(date.getFullYear() % 100); // get last 2 digits
	const hours = date.getHours();
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());

	return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

const getCircleEmoji = (color: Color) => {
	switch (color.toLowerCase()) {
		case 'red':
			return '🔴';
		case 'orange':
			return '🟠';
		case 'yellow':
			return '🟡';
		case 'green':
			return '🟢';
		case 'blue':
			return '🔵';
		case 'purple':
			return '🟣';
		default:
			return '⚪';
	}
};

const getHexColor = (color: Color) => {
	switch (color.toLowerCase()) {
		case 'red':
			return '#FF0000';
		case 'orange':
			return '#FFA500';
		case 'yellow':
			return '#FFFF00';
		case 'green':
			return '#00FF00';
		case 'blue':
			return '#0000FF';
		case 'purple':
			return '#6C3BAA';
		default:
			return '#FFFFFF';
	}
};
const createTimer = () => {
	const start = Date.now();
	return () => ((Date.now() - start) / 1000).toFixed(2);
};

export const utils = {
	check_permissions,
	embed,
	log,
	formatDate,
	getCircleEmoji,
	getHexColor,
	createTimer,
};
