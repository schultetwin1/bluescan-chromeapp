/* Track locaiton */
var loc = null;
var powered = false;
var device_names = {};
var queued_requests = [];

/* Open the page */
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    bounds: {
      width: 500,
      height: 309
    }
  });

  chrome.location.watchLocation("", {});
  chrome.location.onLocationUpdate.addListener(function(position) {
    console.log(JSON.stringify(position));
    loc = position;
  });

  /* Resume BT scanning on power cycle */
  chrome.bluetooth.getAdapterState(function(adapter) {
    if (!adapter) {
      console.log("No adapter found");
      powered = false;
    } else {
      powered = adapter.powered;
    }
  });
  chrome.bluetooth.onAdapterStateChanged.addListener(
    function(adapter) {
      if (adapter.discovering == false) {
        chrome.bluetooth.startDiscovery(function() {});
      }
      if (adapter.powered != powered) {
        powered = adapter.powered;
        if (powered) {
          console.log("Adapter radio is on");
        } else {
          console.log("Adapter radio is off");
        }
      }
    }
  );
  // Add listeners to receive newly found devices and updates
  // to the previously known devices.
  chrome.bluetooth.onDeviceAdded.addListener(updateDeviceName);
  chrome.bluetooth.onDeviceChanged.addListener(updateDeviceName);
  chrome.bluetooth.onDeviceRemoved.addListener(removeDeviceName);

  // Now begin the discovery process.
  chrome.bluetooth.startDiscovery(function() {});
});

chrome.runtime.onSuspend.addListener(function() {
  chrome.bluetooth.stopDiscovery(function () {});
});

var queueRequest = function(xhr_data) {
  queued_requests.push(xhr_data);
    console.log("Online");
    while (queued_requests.length != 0) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://track-dev.schultetwins.com/api/v1.0/spot", true);

      data = queued_requests.shift();

      xhr.onload = function () {
        console.log(this.responseText);
      }
      xhr.send(data);
    }
}


var updateDeviceName = function(device) {
  if (loc == null) return;

  var fitbit_names = ["Flex", "Force", "One"];

  // Only uploading fitbits for now....
  // @TODO: Find a better way of filtering. By vendor id or so
  if (fitbit_names.indexOf(device.name) == -1) return;

  var  MAC = device.address.toUpperCase().replace(/-/g, ":");

  var opt = {
    type: "basic",
    title: "Scanned a Fitbit Device",
    message: "Found " + device.name + " (" + MAC + ")",
    iconUrl: "icon.png"
  }
  chrome.notifications.create("", opt, function(id){ console.log(id); });

  var data = new FormData();

  data.append("MAC", MAC);
  data.append("rand_mac", "1");
  data.append("timestamp", (Math.floor(Date.now() / 1000)).toString());
  data.append("latitude", loc.coords.latitude.toString());
  data.append("longitude", loc.coords.longitude.toString());
  data.append("device", "computer");
  data.append("fitbitid", MAC);
  data.append("passcode", "test_site");
  data.append("name", "Matt");


  queueRequest(data);
  device_names[device.address] = device.name;
};

var removeDeviceName = function(device) {
  delete device_names[device.address];
}

