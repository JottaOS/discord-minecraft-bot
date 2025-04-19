## Instalación

- git clone https://github.com/JottaOS/discord-minecraft-bot.git
- npm install
- npm install -g pm2 (si no lo tienes)

## Configuración

Crear archivo `.env` con las siguientes variables

```
DISCORD_TOKEN=el_token_del_papu
JAR_PATH=C:\path\spigot
JAR_NAME=nombre.jar
MEMORY=Integer
```

## Ejecución

- pm2 start src/bot.js --name "mc-bot"
- pm2 save
- pm2 logs mc-bot

(opcionales)

- pm2 stop mc-bot # Detener
- pm2 restart mc-bot # Reiniciar
- pm2 delete mc-bot # Eliminar del monitoreo

## Comandos del bot

| Comando     | Descripción              |
| ----------- | ------------------------ |
| !mc start   | Inicia el servidor       |
| !mc stop    | Detiene el servidor      |
| !mc restart | Reinicia el servidor     |
| !mc ip      | Obtener la ip del server |

## Siguientes pasos

Disfrutar!
