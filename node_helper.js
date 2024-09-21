var NodeHelper = require("node_helper");
const Websocket = require('ws');
var wss = null;
var clients = [];

module.exports = NodeHelper.create({

	init(){
		console.log("init module helper SampleModule");
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
		const port = 9090;
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
					default: break;
				}
			});
		  });
		  
		  console.log(`WebSocket server is running on ws://localhost:${port}`);
	},
});