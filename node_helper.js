var NodeHelper = require("node_helper");
const Websocket = require('ws');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

var wss = null;
var clients = [];
const port = 9090;
const configPath = path.join(__dirname, '../..', 'config/config.js');
const tmpDirPath = path.join(__dirname, 'tmp');
const config = require(configPath)

module.exports = NodeHelper.create({
	speakerVolume: 0,
	recordVolume: 0,
	modules: [],
	page: 0,
	totalPage: 0,
	pageModules: [],

	init(){
		if (!fs.existsSync(tmpDirPath)) {
			fs.mkdirSync(tmpDirPath, { recursive: true });
		}
		  
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
		} else if (notification === "UPDATE_VOLUME") {
			if (this.speakerVolume === payload['Speaker'] 
				&& this.recordVolume === payload['Recorder'])
				return;

			this.speakerVolume = payload['Speaker'];
			this.recordVolume = payload['Recorder'];

			this.broadcastMsg({
				'action': 'volume',
				'data': {
					'speaker': this.speakerVolume,
					'recorder': this.recordVolume
				}
			});
		} else if (notification === "GET_MODULES_CONFIG") {
			this.modules = this.getAllModule();

			this.broadcastMsg({
				'action': 'all modules',
				'data': this.modules
			});
		} else if (notification === "UPDATE_MODULES_BY_PAGE") {
			this.page = payload['page'];
			this.totalPage = payload['totalPage'];
			this.pageModules = payload['pageModules'];
	
			this.broadcastMsg({
				'action': 'modules by page',
				'data': {
					"page": payload['page'],
					"totalPage": payload['totalPage'],
					"pageModules": payload['pageModules']
				}
			});
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

	getAllModule() {
		newConfig = JSON.parse(JSON.stringify(config));

		for (let module of newConfig['modules']) {
			module['position'] = module['position'] === undefined ? "top_left" : module['position'];
			module['config'] = module['config'] === undefined ? {} : module['config'];
		}

		return newConfig['modules'];
	},

	initServer() {
		wss = new Websocket.Server({port: port});

		wss.on('connection', ws => {
			//send all module to client
			clients.push(ws);
			
			this.broadcastMsg({
				'action': 'system info',
				'speaker': this.speakerVolume,
				'recorder': this.recordVolume,
				'allModules': this.modules,
				'modulesByPage': {
							"page": this.page,
							"totalPage": this.totalPage,
							"pageModules": this.pageModules
						}
			});

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
					case 'request recorder volume':
						this.sendSocketNotification('REQUEST_RECORD_VOLUME', msg['data']);
						break;
					case 'request save config':
						success = this.saveConfig(msg['data']);
						if (success) {
							this.modules = this.getAllModule();

							this.broadcastMsg({
								'action': 'all modules',
								'data': this.modules
							});
						}
						
						break;
					case 'request next page':
						this.sendSocketNotification('REQUEST_NEXT_PAGE');
						break;
					case 'request previous page':
						this.sendSocketNotification('REQUEST_PREVIOUS_PAGE');
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
			if (module['module'] === requestConfig['module']) {
				if (this.checkField(module['config'], requestConfig['config'])) {
					module['config'] = requestConfig['config'];
				} else return false;
				if (requestConfig['position'] !== undefined) 
					module['position'] = requestConfig['position'];
				isExist = true;
				break;
			}
		}

		if (isExist) {
			strJson = 'let config = ' 
			+ JSON.stringify(config, null, 3) 
			+ '\nif (typeof module !== "undefined") { module.exports = config; }';

			const tmpConfigPath = path.join(tmpDirPath, 'config.js');
			
			try {
				fs.writeFileSync(tmpConfigPath, strJson);
				fs.copyFileSync(tmpConfigPath, configPath);

				console.log('change config completely');
				return true;
			} catch (e) {
				console.log(e)
				return false;
			}

		} else {
			console.log('config not exist');
			return false;
		};
	},

	checkField: function(config, newConfig) {
		for (let [key, value] of Object.entries(config)) {
			if (typeof value !== typeof newConfig[key]){
				return false;
			}
		}

		return true;
	}
});
