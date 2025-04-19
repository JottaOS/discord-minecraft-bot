import * as chalk from 'chalk';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { EmbedBuilder, GuildMember } from 'discord.js';

import {
  Color,
  EmbedCreatorParameters,
  LogCreatorParameters,
} from '../typings/types';

const check_permissions = async (member: GuildMember) => {
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

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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
const killProcess = async (process: ChildProcessWithoutNullStreams | null) => {
  return new Promise(resolve => {
    if (!process) return resolve(false);
    process.stdin.write('stop\n');
    process.stdout.on('data', data => {
      if (data.includes('All dimensions are saved')) {
        resolve(true);
      }
    });
  });
};
const createTimer = () => {
  const start = process.hrtime();

  return () => {
    const diff = process.hrtime(start);
    const seconds = diff[0] + diff[1] / 1e9;
    return `${seconds.toFixed(2)}s`;
  };
};

export const utils = {
  check_permissions,
  embed,
  log,
  formatDate,
  getCircleEmoji,
  getHexColor,
  killProcess,
  createTimer,
};
