Module.register("MMM-Server", {
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

	notificationReceived: function(notification, payload, sender) {
		switch (notification) {
			case "ALL_MODULES_STARTED":
				this.sendSocketNotification("CONFIG",this.config)
				break;
			case "EXT_VOLUME_GET":
				this.sendSocketNotification("UPDATE_VOLUME", payload);
				break;
			case "DOM_OBJECTS_CREATED":
				this.sendSocketNotification("GET_MODULES_CONFIG");
				break;
			case "MMM-Server":
				if (payload['type'] === 'MODULES_UPDATED'
					|| payload['type'] === 'PAGE_CHANGED') {
						this.sendSocketNotification("UPDATE_MODULES_BY_PAGE", payload);
					}
				break;
			default: break;
		}
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "REQUEST_SPEAKER_VOLUME") {
			this.sendNotification("EXT_VOLUME-SPEAKER_SET", payload);
		} else if (notification === "REQUEST_RECORD_VOLUME") {
			this.sendNotification("EXT_VOLUME-RECORDER_SET", payload);
		} else if (notification === "REQUEST_NEXT_PAGE") {
			this.sendNotification("MMM-Screen-Control", {type: "CHANGE_PAGE", cmd: "EXT_PAGES-INCREMENT"});
		} else if (notification === "REQUEST_PREVIOUS_PAGE") {
			this.sendNotification("MMM-Screen-Control", {type: "CHANGE_PAGE", cmd: "EXT_PAGES-DECREMENT"});
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
