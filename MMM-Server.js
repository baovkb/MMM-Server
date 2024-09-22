Module.register("MMM-Server", {
	speakerVolume: 0,
	recordVolume: 0,
	modules: [],
	page: 0,
	total_page: 0,
	page_modules: [],

	defaults: {
		message: "default message if none supplied in config.js"
	},

	init: function(){
	},

	start: function(){
		Log.log(this.name + " is starting!");
	},

	loaded: function(callback) {
		Log.log(this.name + " is loaded!");
		callback();
	},

	getScripts: function() {
	return	[]
	}, 

	getStyles: function() {
		return 	[]
	},


	getHeader: function() {
	},

	// messages received from other modules and the system (NOT from your node helper)
	// payload is a notification dependent data structure
	notificationReceived: function(notification, payload, sender) {
		// once everybody is loaded up
		if(notification==="ALL_MODULES_STARTED") {
			this.sendSocketNotification("CONFIG",this.config)
		} else if (notification === "EXT_VOLUME_GET") {
			if (this.speakerVolume === payload['Speaker'] 
				&& this.recordVolume === payload['Recorder'])
				return;

			this.speakerVolume = payload['Speaker'];
			this.recordVolume = payload['Recorder'];

			this.sendUpdate({
				'action': 'volume',
				'data': {
					'Speaker': this.speakerVolume,
					'Recorder': this.recordVolume
				}
			});
		} else if (notification === "DOM_OBJECTS_CREATED") {
			this.modules = [];

			MM.getModules().forEach(module => {
				this.modules.push({
					'identifier': module.identifier,
					'name': module.name,
					'config': module.config
				});
			});

			this.sendUpdate({
				'action': 'all modules',
				'data': this.modules
			})
		} else if (notification === "MMM-Server") {
			switch (payload['type']) {
				case 'MODULES_UPDATED':
				case 'PAGE_CHANGED':
					this.page = payload['page'];
					this.total_page = payload['totalPage'];
					this.page_modules = payload['page_modules'];

					this.sendUpdate({
						'action': 'modules by page',
						'data': {
							page: payload['page'],
							total_page: payload['totalPage'],
							page_modules: payload['page_modules']
						}
					});
					break;
				default: return;
			}
		}
	},

	sendUpdate: function(payload) {
		this.sendSocketNotification("SEND_MSG", payload);
	},

	// messages received from from your node helper (NOT other modules or the system)
	// payload is a notification dependent data structure, up to you to design between module and node_helper
	socketNotificationReceived: function(notification, payload) {
		if (notification === "REQUEST_SYS_INFO") {
			this.sendUpdate({
				'action': 'system info',
				'speaker volume': this.speakerVolume,
				'record volume': this.recordVolume,
				'all modules': this.modules,
				'modules by page': {
							page: this.page,
							total_page: this.totalPage,
							page_modules: this.page_modules
						}
			});
		} else if (notification === "REQUEST_SPEAKER_VOLUME") {
			this.sendNotification("EXT_VOLUME-SPEAKER_SET", payload);
		} else if (notification === "REQUEST_RECORD_VOLUME") {
			this.sendNotification("EXT_VOLUME-RECORDER_SET", payload);
		} else if (notification === 'REQUEST_UPDATE_CONFIG_MODULE') {
			
		}
	},

	suspend: function(){

	},

	resume: function(){

	},

	getDom: function() {
		var wrapper = document.createElement("div");
		return wrapper;
	},

})
