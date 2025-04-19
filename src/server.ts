import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Message, OmitPartialGroupDMChannel } from 'discord.js';

import { EmbedCreatorParameters } from '../typings/types';
import { utils } from './utils';

let mcProcess: ChildProcessWithoutNullStreams | null = null;
let cache_ip: string | null = null;
let server_open = false;

const getIp = async (): Promise<string | null> => {
  if (cache_ip) return cache_ip;
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      utils.log({
        prefix: '[BOT][ERROR]',
        message: `Error al obtener la IP: ${response.statusText}`,
        color: 'Red',
        important: true,
      });
      return null;
    }
    const data = await response.json();
    cache_ip = data.ip;
    return cache_ip;
  } catch (err) {
    utils.log({
      prefix: '[BOT][ERROR]',
      message: `Error al obtener la IP: ` + err,
      color: 'Red',
      important: true,
    });

    console.error(err);
  }
  return null;
};

const serverProcess = () => {
  let jar_name = process.env.JAR_NAME;
  let jar_path = process.env.JAR_PATH;
  let mem = process.env.MEMORY;

  if (!jar_path) throw new Error('process.env.JAR_PATH == undefined');
  if (!jar_name) throw new Error('process.env.JAR_NAME == undefined');
  if (!mem) throw new Error('process.env.MEMORY == undefined');

  mcProcess = spawn('java', [`-Xmx${mem}G`, '-jar', jar_name], {
    cwd: jar_path,
    windowsHide: true,
    shell: true,
  });

  mcProcess.on('error', err => {
    utils.log({
      prefix: '[BOT][ERROR]',
      message: `El proceso ha tenido un error.`,
      color: 'Red',
      important: true,
    });

    console.error(err);
    utils.killProcess(mcProcess);
    server_open = false;
    mcProcess = null;
    cache_ip = null;
    return;
  });

  mcProcess.on('exit', async (code, signal) => {
    utils.log({
      prefix: '[BOT]',
      message: `Proceso detenido con código ${code} y señal ${signal}`,
      color: 'Red',
      important: true,
    });

    server_open = false;
    mcProcess = null;
    cache_ip = null;
  });

  mcProcess.stdout.on('data', data => {
    if (!server_open && data.includes('[Server thread/INFO]: Done'))
      server_open = true;
    let msg = data.toString().trim();
    msg.replace(/^\[\d{2}:\d{2}:\d{2}\] /g, '');
    utils.log({
      prefix: '[MC]',
      message: msg,
      color: 'Yellow',
    });
  });

  mcProcess.stderr.on('data', data => {
    let msg = data.toString().trim();
    msg.replace(/^\[\d{2}:\d{2}:\d{2}\] /g, '');
    utils.log({
      prefix: '[MC][ERROR]',
      message: msg,
      color: 'Red',
    });
  });

  mcProcess.on('spawn', () => {
    utils.log({
      prefix: '[BOT]',
      message: `Proceso iniciado con éxito con PID: ${mcProcess!.pid}`,
      color: 'Green',
      important: true,
    });
  });
};

const startServer = async () => {
  if (!mcProcess) {
    serverProcess();
    server_open = false;
    utils.log({
      prefix: '[BOT]',
      message: 'Iniciando el servidor...',
      color: 'Green',
      important: true,
    });

    let opened = await waitForTrue(() => server_open);
    if (!opened) {
      utils.log({
        prefix: '[BOT]',
        message: 'No se pudo iniciar el servidor. Timeout',
        color: 'Red',
        important: true,
      });
      mcProcess = null;
      cache_ip = null;
    }
    return opened;
  } else {
    utils.log({
      prefix: '[BOT]',
      message: 'El servidor se intentó iniciar pero ya estaba en ejecución.',
      color: 'Yellow',
      important: true,
    });
    return true;
  }
};

const restartServer = async () => {
  if (!mcProcess)
    return utils.log({
      prefix: '[BOT]',
      message: 'El servidor se intentó reiniciar pero no estaba en ejecución.',
      color: 'Yellow',
      important: true,
    });
  utils.log({
    prefix: '[BOT]',
    message: 'Reiniciando el servidor...',
    color: 'Green',
    important: true,
  });

  await stopServer();
  return await startServer();
};

const stopServer = async (): Promise<void> => {
  return new Promise(async resolve => {
    if (!mcProcess) {
      utils.log({
        prefix: '[BOT]',
        message: 'El servidor se intentó detener pero no estaba en ejecución.',
        color: 'Yellow',
        important: true,
      });
      return resolve();
    }

    utils.log({
      prefix: '[BOT]',
      message: 'Deteniendo el servidor...',
      color: 'Red',
      important: true,
    });

    await utils.killProcess(mcProcess);

    mcProcess.once('exit', () => {
      utils.log({
        prefix: '[BOT]',
        message: 'Servidor detenido.',
        color: 'Red',
        important: true,
      });

      server_open = false;
      mcProcess = null;
      cache_ip = null;
      resolve();
    });
    mcProcess.kill();
  });
};

const handleExit = async () => {
  if (mcProcess) {
    await stopServer();
    mcProcess.kill();
  }
  process.exit();
};

const waitForTrue = async (
  checkFn: () => boolean,
  timeout = 120000,
  interval = 200
): Promise<boolean> => {
  const start = Date.now();
  return new Promise(resolve => {
    const check = () => {
      if (checkFn()) return resolve(true);
      if (Date.now() - start > timeout) return resolve(false);
      setTimeout(check, interval);
    };
    check();
  });
};

const start = async (message: OmitPartialGroupDMChannel<Message>) => {
  if (mcProcess)
    return await message.reply({
      allowedMentions: { repliedUser: false },
      embeds: [
        utils.embed({
          description: 'El servidor ya está en ejecución.',
          color: 'Yellow',
        }),
      ],
    });

  let response = await message.reply({
    allowedMentions: { repliedUser: false },
    embeds: [
      utils.embed({ description: 'Iniciando servidor...', color: 'White' }),
    ],
  });
  const timer = utils.createTimer();
  let success = await startServer();
  if (!success) {
    mcProcess = null;
    cache_ip = null;
    return await response.edit({
      embeds: [
        utils.embed({
          description: 'No se pudo iniciar el servidor. **Revisar logs!**',
          color: 'Red',
        }),
      ],
    });
  }

  let ip = await getIp();
  const ipExists = ip ? true : false;
  let options: EmbedCreatorParameters = {
    color: ipExists ? 'Green' : 'Red',
    description:
      ipExists ?
        `Servidor iniciado con éxito en \`${timer()}\`. \n> **・IP:** \`${ip}\``
      : 'No se pudo obtener la IP del servidor . **Revisar logs!**',
  };

  await response.edit({
    embeds: [utils.embed(options)],
  });
};

const restart = async (message: OmitPartialGroupDMChannel<Message>) => {
  if (!utils.check_permissions(message.member!))
    return await message.reply({
      allowedMentions: { repliedUser: false },
      embeds: [
        utils.embed({
          description: 'No tenés permiso para usar este comando.',
          color: 'Red',
        }),
      ],
    });
  if (!mcProcess)
    return await message.reply({
      allowedMentions: { repliedUser: false },
      embeds: [
        utils.embed({
          description: 'El servidor no está en ejecución.',
          color: 'Yellow',
        }),
      ],
    });
  let response = await message.reply({
    allowedMentions: { repliedUser: false },
    embeds: [
      utils.embed({ description: 'Reiniciando servidor...', color: 'White' }),
    ],
  });
  const timer = utils.createTimer();
  let success = await restartServer();
  if (!success)
    return await response.edit({
      embeds: [
        utils.embed({
          description: 'No se pudo reiniciar el servidor. **Revisar logs!**',
          color: 'Red',
        }),
      ],
    });

  let ip = await getIp();
  const ipExists = ip ? true : false;
  let options: EmbedCreatorParameters = {
    color: ipExists ? 'Green' : 'Red',
    description:
      ipExists ?
        `Servidor reiniciado con éxito en \`${timer()}\`.\n> **・IP:** \`${ip}\``
      : 'No se pudo obtener la IP del servidor. **Revisar logs!**',
  };

  await response.edit({ embeds: [utils.embed(options)] });
};

const stop = async (message: OmitPartialGroupDMChannel<Message>) => {
  if (!utils.check_permissions(message.member!))
    return await message.reply({
      allowedMentions: { repliedUser: false },
      embeds: [
        utils.embed({
          description: 'No tenés permiso para usar este comando.',
          color: 'Red',
        }),
      ],
    });
  if (!mcProcess)
    return await message.reply({
      allowedMentions: { repliedUser: false },
      embeds: [
        utils.embed({
          description: 'El servidor no está en ejecución.',
          color: 'Yellow',
        }),
      ],
    });

  let response = await message.reply({
    allowedMentions: { repliedUser: false },
    embeds: [
      utils.embed({ description: 'Deteniendo servidor...', color: 'White' }),
    ],
  });
  const timer = utils.createTimer();
  await stopServer();

  response.edit({
    embeds: [
      utils.embed({
        description: `Servidor detenido en \`${timer()}\`.`,
        color: 'Red',
      }),
    ],
  });
};

const ip = async (message: OmitPartialGroupDMChannel<Message>) => {
  if (!mcProcess)
    return await message.reply({
      allowedMentions: { repliedUser: false },
      embeds: [
        utils.embed({
          description: 'El servidor no está en ejecución.',
          color: 'Yellow',
        }),
      ],
    });
  let response = await message.reply({
    allowedMentions: { repliedUser: false },
    embeds: [
      utils.embed({
        description: 'Obteniendo IP del servidor...',
        color: 'White',
      }),
    ],
  });
  let ip = await getIp();
  const ipExists = ip ? true : false;

  let options: EmbedCreatorParameters = {
    color: ipExists ? 'Green' : 'Red',
    description:
      ipExists ?
        `La IP del servidor es: \`${ip}\``
      : 'No se pudo obtener la IP del servidor. **Revisar logs!**',
  };

  await response.edit({ embeds: [utils.embed(options)] });
};

export const server = { start, restart, stop, ip, mcProcess, handleExit };
