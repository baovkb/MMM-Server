var NodeHelper = require("node_helper");
const Websocket = require('ws');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

var wss = null;
var clients = [];
const port = 9090;
const configPath = path.join(__dirname, '../..', 'config/config.js');
const config = require(configPath)

module.exports = NodeHelper.create({

	init(){
	},

	start() {
		console.log('Starting module helper:' +this.name);
	},

	stop(){
		console.log('Stopping module helper: ' +this.name);
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "CONFIG") {
			this.initServer();
		} else if (notification === "SEND_MSG") {
			this.broadcastMsg(payload)
		}

	},

	broadcastMsg(payload) {
		if (wss === null || clients.length == 0) return;

		clients.forEach(ws => {
			if (ws.readyState === ws.OPEN) { 
				ws.send(JSON.stringify(payload));
			}
		});
	},

	initServer() {
		wss = new Websocket.Server({port: port});

		wss.on('connection', ws => {
			//send all module to client
			clients.push(ws);
			this.sendSocketNotification("REQUEST_SYS_INFO");

			ws.on('close', () => {
				clients = clients.filter(client => client !== ws);
			});
		  
			ws.on('message', message => {
				msg = JSON.parse(message);
				if (msg['action'] === undefined) return;

				switch (msg['action']) {
					case 'request speaker volume':
						this.sendSocketNotification("REQUEST_SPEAKER_VOLUME", msg['data']);
						break;
					case 'request record volume':
						this.sendSocketNotification('REQUEST_RECORD_VOLUME', msg['data']);
						break;
					case 'request update config module':
						this.sendSocketNotification('REQUEST_UPDATE_CONFIG_MODULE', msg['data']);
						break;
					case 'request save config':
						this.saveConfig(msg['data']);
						break;
					case 'request backup':
						break;
					case 'get backup files':
						break;
					case 'reboot magic mirror':
						exec('pm2 restart mm', (error, stdout, stderr) => {
							if (error) {
								console.error(`Error: ${error.message}`);
								return;
							}
							if (stderr) {
								console.error(`stderr: ${stderr}`);
								return;
							}
							console.log(`stdout: ${stdout}`);
						});
						break;
					case 'reboot system':
						exec('pm2 stop mm && sudo reboot', (error, stdout, stderr) => {
							if (error) {
								console.error(`Error: ${error.message}`);
								return;
							}
							if (stderr) {
								console.error(`stderr: ${stderr}`);
								return;
							}
							console.log(`stdout: ${stdout}`);
						});
						break;
					default: break;
				}
			});
		  });
		  
		  console.log(`WebSocket server is running on ws://localhost:${port}`);
	},
	saveConfig: function(requestConfig) {
		isExist = false;

		for (let module of config['modules']) {
			if (module['module'] === requestConfig['name']) {
				module['config'] = requestConfig['config'];
				isExist = true;
				break;
			}
		}

		if (isExist) {
			strJson = 'let config = ' 
			+ JSON.stringify(config, null, 3) 
			+ '\nif (typeof module !== "undefined") { module.exports = config; }';

			const tmpConfigPath = path.join(__dirname, 'tmp/config.js');
			
			fs.writeFileSync(tmpConfigPath, strJson, (err) => {
				if (err) {
					return false;
				  }
				  try {
					fs.renameSync(tmpConfigPath, path.dirname(configPath));

					console.log('change config completely');
					return true;
				  } catch (e) {
					return false;
				  }
			});

		} else return false;
	}
});