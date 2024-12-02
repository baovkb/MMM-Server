Module.register("MMM-Server", {
	qrcode: null,
	ip: null,
	config: null,

	defaults: {
		qr_size: 132,
		username: 'admin',
		password: 'admin'
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
			case "PAGE_CHANGED":
				this.sendSocketNotification("UPDATE_MODULES_BY_PAGE", payload);
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
			this.sendNotification("MMM-Screen-Control", {type: "NEXT_PAGE"});
		} else if (notification === "REQUEST_PREVIOUS_PAGE") {
			this.sendNotification("MMM-Screen-Control", {type: "PREVIOUS_PAGE"});
		} else if (notification === "REQUEST_UPDATE_MODULES") {
			this.sendNotification('MMM-Screen-Control', {
				type: "CHANGE_MODULES",
				data: payload,
			});
		} else if (notification === 'IP_ADDRESS') {
			this.qrcode = payload['qr_code']
			this.ip = payload['ip_address']
			this.updateDom();
		}
	},

	suspend: function(){

	},

	resume: function(){

	},

	getDom: function() {
		var wrapper = document.createElement("div");
		wrapper.style.textAlign = "center"; 

		if (this.qrcode != null && this.ip != null) {
			image_node = document.createElement('img');
			image_node.src = this.qrcode
			image_node.width = this.config.qr_size
			image_node.height = this.config.qr_size
			wrapper.appendChild(image_node)

			ip_node = document.createElement('p');
			ip_node.textContent = this.ip
			wrapper.appendChild(ip_node)

			return wrapper
		}
		return wrapper;
	},
})
