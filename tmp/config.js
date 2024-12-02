let config = {
   "address": "0.0.0.0",
   "port": 8080,
   "basePath": "/",
   "ipWhitelist": [],
   "useHttps": false,
   "httpsPrivateKey": "",
   "httpsCertificate": "",
   "language": "vi",
   "locale": "vi-VN",
   "logLevel": [
      "INFO",
      "LOG",
      "WARN",
      "ERROR"
   ],
   "timeFormat": 24,
   "units": "metric",
   "modules": [
      {
         "module": "alert",
         "config": {}
      },
      {
         "module": "MMM-Server",
         "position": "top_left",
         "config": {}
      },
      {
         "module": "clock",
         "position": "top_left",
         "config": {
            "timeFormat": 24,
            "timezone": "Asia/Ho_Chi_Minh",
            "displaySeconds": true,
            "showPeriod": false
         }
      },
      {
         "module": "weather",
         "position": "top_right",
         "classes": "currentWeather",
         "config": {
            "weatherProvider": "openweathermap",
            "type": "current",
            "location": "Thanh pho Ho Chi Minh",
            "locationID": "1566083",
            "apiKey": "2c2725febb28e6d5995ffb70f07db5c0"
         }
      },
      {
         "module": "weather",
         "classes": "forecastWeather",
         "position": "top_right",
         "header": "Weather Forecast",
         "config": {
            "weatherProvider": "openweathermap",
            "type": "forecast",
            "location": "Thanh pho Ho Chi Minh",
            "locationID": "1566083",
            "apiKey": "2c2725febb28e6d5995ffb70f07db5c0"
         }
      },
      {
         "module": "EXT-Alert",
         "config": {
            "debug": false,
            "ignore": []
         }
      },
      {
         "module": "EXT-Volume",
         "config": {
            "debug": true,
            "startSpeakerVolume": 80,
            "startRecorderVolume": 100,
            "syncVolume": true
         }
      },
      {
         "module": "MMM-Gmail-Feed",
         "position": "top_right",
         "config": {
            "gmail": "magicmirrorbyvk@gmail.com",
            "password": "yqcu bpdg lfqp fhdc",
            "maxMails": 1,
            "test": {
               "key1": 3,
               "key2": "test",
               "key3": {
                  "key31": true
               }
            },
            "fetchInterval": 10000
         }
      }
   ]
}
if (typeof module !== "undefined") { module.exports = config; }