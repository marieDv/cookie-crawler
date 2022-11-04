
//*************************************************** */
// START WEBSOCKET
//*************************************************** */
function heartbeat() {
  clearTimeout(this.pingTimeout);
  this.pingTimeout = setTimeout(() => {
    console.log("!!! terminated !!!")
    this.terminate();
  }, 30000 + 1000);

}

async function connect() {
  // client = new WebSocket('ws://localhost:9898/');
  client = new WebSocket('wss://ait-residency.herokuapp.com/');
  console.log(`...... connect`);
  if (client) {
    client.on('open', function () {
      console.log("CONNECTION IS OPEN")
      if (client.readyState === WebSocket.OPEN) {
        needReconnect = false;
        heartbeat
      }
    });
    client.onmessage = function (event) {

      if (event.data !== undefined && client && client.readyState === WebSocket.OPEN && (isJsonString(event.data) === true)) {
        if (JSON.parse(event.data) === 'REQUESTCURRENTSTATE') {
          let totalNumberName = JSON.parse(fs.readFileSync("./latest_names.json").toString());
          if (totalNumberName.queued !== undefined) {
            for (let i = 0; i < totalNumberName.queued[0].lastProcessedNames.length; i++) {
              if (client && (needReconnect === false)) {
                client.send(JSON.stringify(totalNumberName.queued[0].lastProcessedNames[i]));
              }
            }
          }
        }
      }
    };

    client.on('error', (error) => {
      needReconnect = true;
      console.log(`error: ${error}`)
    })
    client.on('ping', heartbeat);

    client.on('close', function clear() {
      console.log("CONNECTION WAS CLOSED")
      clearTimeout(this.pingTimeout);
      needReconnect = true;
    });
  }
}

async function reconnect() {
  try {
    await connect()
  } catch (err) {
    console.log('WEBSOCKET_RECONNECT: Error', new Error(err).message)
  }
}
// setInterval(() => {

//   if (needReconnect === true) {
//     console.log(`... trying to reconnect ...`)
//     reconnect();
//   }

// }, 30000);


// connect();

// setInterval(() => {
//   if (client.readyState === WebSocket.OPEN) {
//     heartbeat
//   }
// }, 5000);