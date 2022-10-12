
import Crawler from 'crawler';
import { Level } from 'level';
import { checkBlacklist, clearDataBases, detectDataLanguage, roundToTwo, getCurrentDate, replaceAllNames, saveCurrentDataToFile, saveToSDCard, writeLatestToTerminal, writeToJsonFile } from './functions.js';
import { open, close, fstat } from 'node:fs';


import df from 'node-df';
import * as fs from 'fs';
import getFolderSize from 'get-folder-size';

import enNlp from 'compromise';
import deNlp from 'de-compromise';
import esNlp from 'es-compromise';
import frNlp from 'fr-compromise';
import itNlp from 'it-compromise';
import { URL } from 'node:url';
import WebSocket from 'ws';
const startURL = ['https://crawlee.dev/api/å', 'https://www.lemonde.fr/', 'https://elpais.com/america/?ed=ame'];

const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const dbUrlPrecheck = new Level('dbUrlPrecheck', { valueEncoding: 'json' })

let lastProcessedURLs = [];
let lastProcessedNames = [];
let countLastProcessedURLs = 0;
let countLastProcessedNames = 0;
let globalID = 0;
let cardFilled = [0, 0];
let cardRemaining = [0, 0];
let countSavedURLs = 0;
let savedToQueue = retrieveURLs();// = retrieveURLs();
savedToQueue = savedToQueue.concat(startURL);
// savedToQueue = ['https://tos885.ç§»å\x8A']
let tempSaveNames = [];
var currentDate;
let currentLanguage = "";
let latestData = "";
let inCurrentDataset = 0;
let linksFound = 0;
let idForNames = 0;
let mQueueSize = 0;
let currentURL = '';
let sendOnLaunch = true;
let needReconnect = false;
// clearDataBases([db, dbUrl, dbUrlPrecheck]);

function heartbeat() {
  clearTimeout(this.pingTimeout);
  this.pingTimeout = setTimeout(() => {
    console.log("!!! terminated !!!")
    this.terminate();
  }, 30000 + 1000);
}
function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

let client;
function connect() {
  // client = new WebSocket('ws://localhost:9898/');
  client = new WebSocket('wss://ait-residency.herokuapp.com/');
  console.log(`...... connect`);
  if (client) {
    client.on('open', function () {
      console.log("CONNECTION IS OPEN")
      needReconnect = false;
      heartbeat
    });
    client.onmessage = function (event) {
      // console.log(event.data);
      if (event.data !== undefined && client && client.readyState === 1 && (isJsonString(event.data) === true)) {
        // console.log(`READY STATE: ${client.readyState}`);
        if (JSON.parse(event.data) === 'REQUESTCURRENTSTATE') {
          let totalNumberNames = JSON.parse(fs.readFileSync("./latest_names.json").toString());
          if (totalNumberNames.queued !== undefined) {
            for (let i = 0; i < totalNumberNames.queued[0].lastProcessedNames.length; i++) {
              if (client && (needReconnect === false)) {
                // client.send(JSON.stringify("SENDFULLFILE"));
                // client.send(JSON.stringify(totalNumberNames.queued[0].lastProcessedNames[i]));
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
      // setTimeout(connect, 30000 + 1000);


    });
  }
}
connect();


function reconnect() {
  try {
    connect()
  } catch (err) {
    console.log('WEBSOCKET_RECONNECT: Error', new Error(err).message)
  }
}

setInterval(() => {

  if (needReconnect === true) {
    console.log(`... trying to reconnect ...`)
    reconnect();
  }

}, 30000);


const c = new Crawler({
  maxConnections: 25,
  queueSize: 1000,
  retries: 0,
  rateLimit: 0,

  callback: async (error, res, done) => {
    if (error) {
    } else {
      const $ = res.$;
      const urls = [];
      if ($ && $('a').length >= 1 && res.headers['content-type'].split(';')[0] === "text/html") {
        let array = $('a').toArray();
        linksFound = array.length;
        currentURL = res.request.uri.href;
        console.log(`\n... ${res.request.uri.href}\n`);






        for (const a of array) {
          if (a.attribs.href && a.attribs.href !== '#') {
            let oldWebsite = false;
            try {
              const url = new URL(a.attribs.href, res.request.uri.href);
              let value = await dbUrlPrecheck.get(url.origin, function (err) {
                if (err) {
                  oldWebsite = true;
                } else {
                  oldWebsite = false;
                }
              });
              await dbUrlPrecheck.put(url.origin, url.origin);
              if (oldWebsite === true) {
                mQueueSize = c.queueSize;
                if (c.queueSize <= 1000) {
                  urls.push(url.href);
                }
                countLastProcessedURLs === 20 ? saveLastSession(globalID + c.queueSize) : countLastProcessedURLs++;
                lastProcessedURLs[countSavedURLs] = url.origin;
                // console.log($("body").text().length + ' ' + check_mem() + 'MB');
                await extractData($("body").text(), url, (globalID + c.queueSize), array.length);
                countSavedURLs++;
                if (countSavedURLs === 100) {
                  countSavedURLs = 0;
                }
              }
            }
            catch (err) {
              console.log(err)
            }


          }
        }
        if (client && client.readyState === 1) {
          let totalURLS = await getabsoluteNumberNames(dbUrlPrecheck)
          client.send(JSON.stringify(`CURRENTURLINFORMATION%${currentURL}%${linksFound}%${totalURLS}%${check_mem()}`));
        }


      }
      c.queue(urls);
    }
    done();
  }
});
c.queue(savedToQueue);


function getSDCardSize(i) {
  // let currentPath = ['./names-output/output/', './full-output/output/'];

  let currentPath = ["/media/process/NAMES/output/", "/media/process/FULL/output/"];

  let options = {
    file: currentPath[i],
    prefixMultiplier: 'GB',
    isDisplayPrefixMultiplier: true,
    precision: 2
  };



  df(options, function (error, response) {
    if (error) { throw error; }
    tempTest = response[0].size;
    console.log(response[0].size)
    cardFilled[i] = tempTest;
    cardRemaining[i] = response[0].available;
  });
  // const size = await getFolderSize.loose(currentPath[i]);
  // cardFilled[i] = (size / 1000 / 1000).toFixed(2);

}

function closeFd(fd) {
  close(fd, (err) => {
    if (err) throw err;
  });
}

async function extractData(mdata, href, id, foundLinks) {
  let countryCode = href.host.split('.').splice(-2);
  if (countryCode[1]) {
    await searchForNames(href.href, countryCode[1], mdata, foundLinks);
  }
}

function saveLastSession(handledNumber) {
  let mData = {
    queued: [],
    lastHandled: handledNumber
  };

  mData.queued.push({ lastProcessedURLs });
  fs.writeFileSync('./recoverLastSession.json', JSON.stringify(mData));
  countLastProcessedURLs = 0
}
function saveLastNames(url) {
  let mData = {
    queued: []
  };
  mData.queued.push({ lastProcessedNames });
  fs.writeFileSync('./latest_names.json', JSON.stringify(mData));
  countLastProcessedNames = 0
}



function retrieveNames() {
  let totalNumberNames = JSON.parse(fs.readFileSync("./latest_names.json").toString());
  return totalNumberNames.queued[0].lastProcessedNames;
}





function retrieveURLs() {
  let totalNumberURLs = JSON.parse(fs.readFileSync("./recoverLastSession.json").toString());
  globalID = totalNumberURLs.lastHandled;
  return totalNumberURLs.queued[0].lastProcessedURLs;
}

async function searchForNames(url, cc, data, foundLinks) {

  currentLanguage = detectDataLanguage(data.substring(500, 8000));
  switch (currentLanguage) {
    case 'german':
      await languageProcessing(deNlp(data), data, url, cc, foundLinks)
      break;
    case 'english':
      await languageProcessing(enNlp(data), data, url, cc, foundLinks);
      break;
    case 'french':
      await languageProcessing(frNlp(data), data, url, cc, foundLinks);
      break;
    case 'italian':
      await languageProcessing(itNlp(data), data, url, cc, foundLinks);
      break;
    case 'spanish':
      await languageProcessing(esNlp(data), data, url, cc, foundLinks);
      break;
    case '':
      break;
  }
}
function check_mem() {
  const mem = process.memoryUsage();
  return (mem.heapUsed / 1024 / 1024).toFixed(2);
  // console.log('%f MB used', (mem.heapUsed / 1024 / 1024).toFixed(2))
}

async function checkNamesDatabase(name) {
  try {
    let value = await db.get(name);
    return true;
  } catch (err) {
    await db.put(name, name);
    return false;
  }

}
async function languageProcessing(doc, data, url, cc, foundLinks) {
  let person = doc.match('#Person #Noun').out('array');
  if (person.length === 0) {
    let dataObj = {
      dataPage: []
    };
    dataObj.dataPage.push({ text: data, id: 0 });
    saveToSDCard(false, dataObj);

  }
  for (const a of person) {
    let text = a;
    const matchedNames = a.match(new RegExp(`(\s+\S\s)|(phd)|(dr)|(Dr)|(ceo)|(Ceo)|(=)|(})|(\\;)|(•)|(·)|(\\:)|({)|(\\")|(\\')|(\\„)|(\\”)|(\\*)|(ii)|(—)|(\\|)|(\\[)|(\\])|(“)|(=)|(®)|(’)|(#)|(!)|(&)|(・)|(\\+)|(-)|(\\?)|(@)|(_)|(–)|(,)|(:)|(und)|(©)|(\\))|(\\()|(%)|(&)|(>)|(\\/)|(\\d)|(\\s{2,20})|($\s\S)|(\\b[a-z]{1,2}\\b\\s*)|(\\b[a-z]{20,90}\\b\\s*)|(\\\.)`));//(\/)|(\\)|
    if (matchedNames === null) {
      if (client && client.readyState === 1) {
        getSDCardSize(0);
        getSDCardSize(1);
        client.send(JSON.stringify(`GETCARDSIZE%${cardFilled[0]}%${cardFilled[1]}%${cardRemaining[0]}%${cardRemaining[1]}`));
      }
      if (text.includes("’s") || text.includes("'s")) {
        text = a.slice(0, -2);
      }
      const checkedDataBase = await checkNamesDatabase(text);
      if (checkedDataBase === false) {
        let obj = {
          person: []
        };
        let uppercaseName = text.split(" ");
        if (uppercaseName[1]) {
          if (uppercaseName[0][1] && uppercaseName[1][1]) {
            uppercaseName[0] = uppercaseName[0].toLowerCase();
            uppercaseName[1] = uppercaseName[1].toLowerCase();



            uppercaseName[0] = uppercaseName[0].charAt(0).toUpperCase() + uppercaseName[0].slice(1) + " ";
            uppercaseName[1] = uppercaseName[1].charAt(0).toUpperCase() + uppercaseName[1].slice(1);
            let tempNameString = uppercaseName[0].concat(uppercaseName[1])
            currentDate = getCurrentDate();
            obj.person.push({ name: tempNameString, url: url, countrycode: cc, date: currentDate, language: currentLanguage, id: idForNames });


            // mData.queued.push({ lastProcessedURLs });
            // fs.writeFileSync("names.json", JSON.stringify(tempNameString, null, 2), function () { });

            saveToSDCard(true, tempNameString);
            const mUrl = new URL(url);
            function returnWithZero(obj) {
              if (obj < 10) {
                return '0' + obj;
              } else {
                return obj;
              }
            }
            let dateObject = new Date();
            let toSend = JSON.stringify(`${tempNameString}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`)// + '............' + currentDate + '............' + cc)//+ mUrl.host);

            if (client && client.readyState === 1) {
              client.send(toSend);
            }
            countLastProcessedNames === 22 ? saveLastNames(url) : countLastProcessedNames++;
            lastProcessedNames[countLastProcessedNames] = (`${tempNameString}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getMinutes())}%${cc}`);//tempNameString;// + '............' + currentDate + '............' + cc)//+ mUrl.host);

            if (data === latestData) {
              tempSaveNames[inCurrentDataset] = text;
              inCurrentDataset++;
            } else {
              replaceAllNames(data, tempSaveNames, 0);
              tempSaveNames = [];
              console.log(`\n\n${getCurrentDate()}`)
              console.log(`${url}\n names found: ${inCurrentDataset} queue size: ${mQueueSize} memory used: ${check_mem()}MB`);


              let totalNumberNames = await getabsoluteNumberNames(db);
              let totalURLS = await getabsoluteNumberNames(dbUrlPrecheck)




              if (client && client.readyState === 1) {
                client.send(JSON.stringify(`METADATA%${mQueueSize}%${totalNumberNames}%${totalURLS}%${check_mem()}%${inCurrentDataset}%${currentURL}%${linksFound}`));
              }
              inCurrentDataset = 0;
            }
            latestData = data;
          }
        }
      }
    }
  }
}

async function getabsoluteNumberNames(mdb) {
  const iterator = mdb.iterator()
  let counter = 0;
  while (true) {
    const entries = await iterator.nextv(100)

    if (entries.length === 0) {
      break
    }

    for (const [key, value] of entries) {
      counter++;
    }
  }

  await iterator.close()
  return counter;
}