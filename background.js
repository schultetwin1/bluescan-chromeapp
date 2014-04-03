/* Track locaiton */
var loc = null;
var powered = false;
var device_names = {};

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
    powered = adapter.powered;
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


var updateDeviceName = function(device) {
  if (loc == null) return;

  var opt = {
    type: "basic",
    title: "Scanned BLE Device",
    message: "Found " + device.name,
    iconUrl: "icon.png"
  }
  chrome.notifications.create("", opt, function(id){ console.log(id); });

  var xhr = new XMLHttpRequest();
  var data = new FormData();

  xhr.open("POST", "https://track-dev.schultetwins.com/api/v1.0/spot",true);

  data.append("MAC", device.address.toUpperCase().replace(/-/g, ":"));
  data.append("timestamp", (Math.floor(Date.now() / 1000)).toString());
  data.append("latitude", loc.coords.latitude.toString());
  data.append("longitude", loc.coords.longitude.toString());
  data.append("device", "computer");
  data.append("passcode", "test_site");

  xhr.onload = function () {
    console.log(this.responseText);
  }

  xhr.send(data);
  device_names[device.address] = device.name;
};

var removeDeviceName = function(device) {
  delete device_names[device.address];
}

