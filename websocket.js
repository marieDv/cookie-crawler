import { isJsonString } from './functions.js';
import * as fs from 'fs';
import WebSocket from 'ws';
let needReconnect = false;
let client;
//*************************************************** */
// START WEBSOCKET
//*************************************************** */

export class Websocket {
  constructor() {

    // this.width = width;
  }


  returnClient() {
    return client;
  }
  async clientSend(content) {
    client.send(JSON.stringify(content));
  }
  async websocketConnect() {
    // client = new WebSocket('ws://localhost:9898/');
    client = new WebSocket('wss://ait-residency.herokuapp.com/');
    console.log(`...... connect`);
    if (client) {
      client.on('open', function () {
        console.log("CONNECTION IS OPEN")
        if (client.readyState === WebSocket.OPEN) {
          needReconnect = false;
          this.heartbeat;
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
      client.on('ping', this.heartbeat);
      client.on('close', () => {
        console.log("CONNECTION WAS CLOSED")
        clearTimeout(this.pingTimeout);
        needReconnect = true;
      });
    }


    setInterval(() => {

      if (needReconnect === true) {
        console.log(`... trying to reconnect ...`)
        this.reconnect();
      }

    }, 30000);
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      console.log("!!! terminated !!!")
      this.terminate();
    }, 30000 + 1000);
  }

  async reconnect() {
    try {
      await this.websocketConnect()
    } catch (err) {
      console.log('WEBSOCKET_RECONNECT: Error', new Error(err).message)
    }
  }





}





// connect();

// setInterval(() => {
//   if (client.readyState === WebSocket.OPEN) {
//     heartbeat
//   }
// }, 5000);