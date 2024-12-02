var NodeHelper = require("node_helper");
const Websocket = require('ws');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os')
const QRCode = require('qrcode')

var wss = null;
var clients = [];
const port = 9090;
const configPath = path.join(__dirname, '../..', 'config/config.js');
const tmpDirPath = path.join(__dirname, 'tmp');
const backupDir = path.join(__dirname, 'backup')
const config = require(configPath)

module.exports = NodeHelper.create({
	speakerVolume: 0,
	recordVolume: 0,
	modules: [],
	page: 0,
	totalPage: 0,
	pageModules: [],
	config: null,

	init(){
		if (!fs.existsSync(tmpDirPath)) {
			fs.mkdirSync(tmpDirPath, { recursive: true });
		}
		if (!fs.existsSync(backupDir)) {
			fs.mkdirSync(backupDir, {recursive: true})
		}
	},

	start() {
	},

	stop(){
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "CONFIG") {
			this.config = payload
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
			}, clients);
		} else if (notification === "GET_MODULES_CONFIG") {
			this.modules = this.getAllModule();

			this.broadcastMsg({
				'action': 'all modules',
				'data': this.modules
			}, clients);
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
			}, clients);
		}

	},

	broadcastMsg(payload, toClients) {
		if (!Array.isArray(toClients)) {
			toClients = Array.from([toClients])
		}

		if (wss === null || toClients.length == 0) return;

		toClients.forEach(ws => {
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
			let isAuthenticated = false

			ws.on('close', () => {
				clients = clients.filter(client => client !== ws);
			});
		  
			ws.on('message', message => {
				msg = null;
				try {
					msg = JSON.parse(message);
					console.log(msg)
				} catch (e) {
					return;
				}
				
				if (msg['action'] === undefined) return;

				if (!isAuthenticated) {
					if (msg['action'] === 'login') {
						const {username, password} = msg
						if (username !== undefined && username === this.config.username && password !== undefined && password === this.config.password) {
							isAuthenticated = true
							clients.push(ws)
							this.broadcastMsg({
								action: "authenticated"
							}, ws)
						} else {
							this.broadcastMsg({
								action: "authentication failure",
								message: "username or password is wrong"
							}, ws)
						}
							
					}
					return;
				}

				switch (msg['action']) {
					case 'request system info':
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
						}, ws);
						break
					case 'request speaker volume':
						this.sendSocketNotification("REQUEST_SPEAKER_VOLUME", msg['data']);
						break;
					case 'request recorder volume':
						this.sendSocketNotification('REQUEST_RECORD_VOLUME', msg['data']);
						break;
					case 'request save config':
						success = this.saveConfig(msg['data']);
						if (success) {
							console.log("success save config");
							this.modules = this.getAllModule();

							this.broadcastMsg({
								'action': 'all modules',
								'data': this.modules
							}, clients);
						}
						
						break;
					case 'request next page':
						this.sendSocketNotification('REQUEST_NEXT_PAGE');
						break;
					case 'request previous page':
						this.sendSocketNotification('REQUEST_PREVIOUS_PAGE');
						break;
					case 'request backup files':
						files = this.getBackupFiles()
						this.broadcastMsg({
							action: "backup files",
							data: files
						}, ws)

						break
					case 'request backup':
						backupFileName = path.join(backupDir, `${Date.now()}`)
						result = fs.copyFileSync(configPath, backupFileName)
						if (result === null) return;

						files = this.getBackupFiles()
						this.broadcastMsg({
							action: "backup files",
							data: files
						}, clients)
						break;
					case 'delete backup files':
						backupFileNames = msg['data']
						if (!Array.isArray(backupFileNames)) {
							backupFileNames = Array.from([backupFileNames])
						}

						backupFileNames.forEach(backupFileName => {
							backupFileName = path.join(backupDir, backupFileName)
							if (!fs.existsSync(backupFileName)) return;

							fs.unlinkSync(backupFileName)
						})

						files = this.getBackupFiles()
						this.broadcastMsg({
							action: "backup files",
							data: files
						}, clients)

						break
					case 'restore backup':
						backupFile = msg['data']
						backupFilePath = path.join(backupDir, backupFile)
						if (!fs.existsSync(backupFilePath)) return;
						
						fs.copyFileSync(backupFilePath, configPath)
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

						break
					case 'request update modules':
						this.sendSocketNotification('REQUEST_UPDATE_MODULES', msg['data']);
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

		ips = this.getIpAddress()
		ip_address = `ws://${ips['Wi-Fi']}:${port}`
		// ip_address = `ws://${ips['wlan0']}:${port}`
		QRCode.toDataURL(ip_address).then((qr) => {
			this.sendSocketNotification('IP_ADDRESS', {
				'ip_address':  ip_address,
				'qr_code': qr
			})
		});

		
	},
	saveConfig: function(requestConfig) {
		isExist = false;

		for (let module of config['modules']) {
			if (module['module'] === requestConfig['module']) {
				if (this.checkField(module['config'], requestConfig['config'])) {
					module['config'] = requestConfig['config'];
				} else {
					console.log("config khong khop");
					return false;
				}
				if (requestConfig['position'] !== undefined) 
					module['position'] = requestConfig['position'];
				isExist = true;
				break;
			}
		}

		console.log("copy config file");

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

	isUnixTime: function (fileName) {
		return /^\d{10}(\d{3})?$/.test(fileName);
	},

	getBackupFiles: function() {
		result = fs.readdirSync(backupDir)

		if (result === null) {
			console.error('Error when reading files in backup folder', error);
			return [];
		} else {
			const unixTimeFiles = result.filter(file => this.isUnixTime(file));
			return unixTimeFiles
		}
	},

	checkField: function(config, newConfig) {
		for (let [key, value] of Object.entries(config)) {
			if (typeof value !== typeof newConfig[key]){
				console.log("not match: " + typeof value + " " + typeof newConfig[key])
				return false;
			}
		}

		return true;
	},

	getIpAddress: function() {
		const nets = networkInterfaces()
		const results = Object.create(null);
	
		for (const name of Object.keys(nets)) {
			for (const net of nets[name]) {
				const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
				if (net.family === familyV4Value && !net.internal) {
					if (!results[name]) {
						results[name] = [];
					}
					results[name].push(net.address);
				}
			}
		}

		return results;
	}

	
});
