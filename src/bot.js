require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { spawn } = require("child_process");
const https = require("https");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let mcProcess = null;

function getPublicIP() {
  return new Promise((resolve, reject) => {
    https
      .get("https://api.ipify.org", (res) => {
        let data = "";

        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

function startMinecraftServer(message) {
  message.reply("🟢 Iniciando servidor...");

  mcProcess = spawn(
    "java",
    ["-Xmx2G", "-Xms2G", "-jar", process.env.JAR_NAME, "nogui"],
    {
      cwd: process.env.JAR_PATH,
      shell: true,
    }
  );
  getPublicIP()
    .then((ip) => {
      message.channel.send(
        `🌐 El servidor está corriendo en la IP pública: \`${ip}\``
      );
    })
    .catch((err) => {
      console.error("Error al obtener IP pública:", err);
      message.channel.send("⚠️ No se pudo obtener la IP pública.");
    });

  mcProcess.stdout.on("data", (data) => {
    console.log(`[MC] ${data}`);
  });

  mcProcess.stderr.on("data", (data) => {
    console.error(`[MC Error] ${data}`);
  });

  mcProcess.on("exit", (code) => {
    console.log(`🛑 Servidor detenido con código ${code}`);
    mcProcess = null;
    message.reply(`🛑 Servidor detenido con código ${code}`);
  });
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!mc") || message.author.bot) return;

  const args = message.content.split(" ");
  const command = args[1];

  if (command === "start") {
    if (mcProcess) {
      message.reply("⚠️ El servidor ya está en ejecución.");
      return;
    }

    startMinecraftServer(message);
  } else if (command === "stop") {
    if (!mcProcess) {
      message.reply("⚠️ El servidor no está en ejecución.");
      return;
    }

    message.reply("🔴 Deteniendo servidor...");
    mcProcess.stdin.write("stop\n");
  } else if (command === "restart") {
    if (!mcProcess) {
      message.reply("⚠️ El servidor no está en ejecución. Iniciando...");
      startMinecraftServer(message);
      return;
    }

    message.reply("♻️ Reiniciando servidor...");

    mcProcess.once("exit", () => {
      startMinecraftServer(message);
    });

    mcProcess.stdin.write("stop\n");
  } else if (command === "getIp") {
    getPublicIP()
      .then((ip) => {
        message.channel.send(
          `🌐 El servidor está corriendo en la IP pública: \`${ip}\``
        );
      })
      .catch((err) => {
        console.error("Error al obtener IP pública:", err);
        message.channel.send("⚠️ No se pudo obtener la IP pública.");
      });
  }
});

client.login(process.env.DISCORD_TOKEN);
