## Instalación
```
$ git clone -b floemia-rewrite https://github.com/JottaOS/discord-minecraft-bot.git
$ npm install
$ npm install -g pm2
$ npm install -g typescript
```
## Configuración

Crear archivo `.env` con las siguientes variables

```
DISCORD_TOKEN=el_token_del_papu
JAR_PATH=C:\path\spigot
JAR_NAME=nombre.jar
MEMORY=Integer
```

## Ejecución

```
$ npm run build
$ pm2 start ./dist/bot.js --name "mc-bot"
$ pm2 save
```

(opcionales)

```
$ pm2 logs mc-bot 	# Ver logs
$ pm2 start mc-bot 	# Iniciar bot (si no lo estás ejecutando)
$ pm2 restart mc-bot 	# Reiniciar bot
$ pm2 stop mc-bot 	# Detener bot
$ pm2 delete mc-bot 	# Detener y eliminar bot de pm2
```

## Comandos del bot

| Comando     | Descripción                |
| ----------- | -------------------------- |
| !mc start   | Inicia el servidor         |
| !mc stop    | Detiene el servidor        |
| !mc restart | Reinicia el servidor       |
| !mc ip      | Obtener la IP del servidor |

## Siguientes pasos

Disfrutar!
