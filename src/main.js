const { invoke } = window.__TAURI__.tauri;
const { emit, listen } = window.__TAURI__.event;
const { appWindow, WebviewWindow } = window.__TAURI__.window;

let portListEl;
let buadrateListEl;
let messageContainer;
let portStateContainer;
let esd_logo;

let port_status;
let alert_status;
let current_portname = "";

listen("alertData", (event) => {
  if (event.payload.data) {
    alert_status = true;
    messageContainer.innerHTML = `<p>Emergency Shut Down (ESD) initiated by <span style="color: red;">${event.payload.data}</span>.</p>
    <p><u>Press Spacebar</u> to acknowledge and deactivate.</p>`;

    esd_logo.style.filter =
      "drop-shadow(0 0 1em #ffffff81)invert(67%) sepia(89%) saturate(7492%) hue-rotate(346deg) brightness(84%) contrast(146%)";
  } else {
    alert_status = false;
    esd_logo.style.filter =
      "drop-shadow(0 0 1em #ffffff81) invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%)";
    messageContainer.innerHTML = `ESD has been successfully <span style="color: green;">deactivated</span>.`;
    setTimeout(() => {
      messageContainer.innerHTML = ""; //ESD deactivated
    }, 5000);
  }
});

listen("portState", (event) => {
  port_status = event.payload;

  if (port_status == "Connected") {
    portStateContainer.innerHTML = `Connected to Serial Port`;
    esd_logo.style.filter =
      "drop-shadow(0 0 1em #ffffff81) invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%)";
  } else if (port_status == "Port Busy") {
    esd_logo.style.filter = "";
    portStateContainer.innerHTML = `Serial Port is Busy. Please try again later.`;
  } else {
    esd_logo.style.filter = "";
    portStateContainer.innerHTML = `Disconnected`;
  }
});

async function listSerialPorts() {
  const ports = await invoke("list_serial_ports");

  portListEl.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.text = current_portname;
  defaultOption.value = "";
  portListEl.add(defaultOption);
  defaultOption.style.display = "none";
  if (ports.length > 0) {
    for (const port of ports) {
      const option = document.createElement("option");
      option.value = port.port_name;
      option.text = port.port_name;
      option.style.backgroundColor = "#2A2F39";
      portListEl.add(option);
    }
  }
}

async function startSerialCommunication() {
  const selectedPort = portListEl.value;
  const baudRateElement = document.getElementById("baudrate-list");
  const selectedBaudRate = parseInt(baudRateElement.value, 10);
  while (port_status == "Connected") {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try {
    const response = await invoke("start_serial_communication", {
      portName: selectedPort,
      baudRate: selectedBaudRate,
    });
  } catch (error) {
    messageContainer.innerHTML = `<p>Error: ${error}</p>`;
  }
}

async function closeSerialPort() {
  const webview = new WebviewWindow("window");
  webview.emit("stopSerial");
}

async function sendCommandSerialPort() {
  const webview = new WebviewWindow("window");
  webview.emit("sendCommand");
}

async function playAlarmSoundEffect() {
  await invoke("play_alarm_sound_effect");
}
async function loopPlayAlarm() {
  for (var i = 0; ; i++) {
    if (!alert_status) {
      console.log("break");
    } else {
      playAlarmSoundEffect();
    }
  }
}
window.addEventListener("DOMContentLoaded", () => {
  portListEl = document.querySelector("#port-list");
  buadrateListEl = document.querySelector("#baudrate-list");
  alert_status = false;

  messageContainer = document.querySelector("#message-container");
  portStateContainer = document.querySelector("#port-state");
  esd_logo = document.querySelector("#esd-logo");
  portStateContainer.innerHTML = `Disconnected`;

  loopPlayAlarm();

  document.querySelector("#port-list").addEventListener("input", () => {
    closeSerialPort();
    portListEl.blur();
    const selectedPort = portListEl.value;
    current_portname = portListEl.value;
    if (selectedPort) {
      startSerialCommunication();
    }
  });

  document.querySelector("#baudrate-list").addEventListener("change", () => {
    closeSerialPort();
    buadrateListEl.blur();
    const selectedPort = portListEl.value;
    if (selectedPort) {
      startSerialCommunication();
    }
  });

  portListEl.addEventListener("focus", () => {
    listSerialPorts();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === " " || event.code === "Space") {
      if (port_status == "Connected" && alert_status) {
        sendCommandSerialPort();
      }
    }
  });
});
