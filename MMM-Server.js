Module.register("MMM-Server", {
	speakerVolume: 0,
	recordVolume: 0,
	modules: [],

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
		} else if (notification === "EXT_VOLUME-SPEAKER_GET") {
			this.speakerVolume = payload;
			this.sendUpdate({
				'action': 'speaker volume',
				'data': this.speakerVolume
			});
		} else if (notification === "EXT_VOLUME-RECORDER_GET") {
			this.recordVolume = payload;
			this.sendUpdate({
				'action': 'record volume',
				'data': this.recordVolume
			});
		} else if (notification === "DOM_OBJECTS_CREATED") {
			this.modules = [];

			MM.getModules().forEach(module => {
				this.modules.push({
					'identifier': module.identifier,
					'config': module.config
				});
			});
			this.sendUpdate({
				'action': 'all modules',
				'data': this.modules
			})
		}

		console.log(`mmm server receive msg: ${notification} ${payload}`);
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
				'all modules': this.modules
			});
		}
	},

	// system notification your module is being hidden
	// typically you would stop doing UI updates (getDom/updateDom) if the module is hidden
	suspend: function(){

	},

	// system notification your module is being unhidden/shown
	// typically you would resume doing UI updates (getDom/updateDom) if the module is shown
	resume: function(){

	},

	// this is the major worker of the module, it provides the displayable content for this module
	getDom: function() {
		var wrapper = document.createElement("div");

		// if user supplied message text in its module config, use it
		if(this.config.hasOwnProperty("message")){
			// using text from module config block in config.js
			wrapper.innerHTML = this.config.message;
		}
		else{
		// use hard coded text
			wrapper.innerHTML = "Hello world!";
		}

		// pass the created content back to MM to add to DOM.
		return wrapper;
	},

})
