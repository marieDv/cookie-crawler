
import Crawler from 'crawler';
import { Level } from 'level';
import { clearDataBases, rand, isJsonString, check_mem, retrieveNames, getExistingNames, saveFullFile, detectDataLanguage, returnWithZero, roundToTwo, getCurrentDate, replaceAllNames, saveCurrentDataToFile, saveToSDCard, writeLatestToTerminal } from './functions.js';
import { close } from 'node:fs';
import df from 'node-df';
import * as fs from 'fs';
import nodemailer from 'nodemailer';



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
let savedToQueue = retrieveURLs();
savedToQueue = savedToQueue.concat(startURL);
let tempSaveNames = [];
var currentDate;
let currentLanguage = "";
let latestData = "";
let inCurrentDataset = 0;
let linksFound = 0;
let mQueueSize = 0;
let currentURL = '';
let needReconnect = false;
let startTime = new Date();
let client;
let stopSendingData = 3;
let sdCardToChange = "";
let emailSend = false;
let securityCheckIsCardFull = true;


async function sendEmail() {
  let transporter = nodemailer.createTransport({
    host: "mail.gmx.net",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "ait-crawler@gmx.at", // generated ethereal user
      pass: "9izAYkkqLjWYtQJ", // generated ethereal password
    },
  });
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"AIT CRAWLER" <ait-crawler@gmx.at>', // sender address
    to: "dvorzak.marie@gmx.at", // list of receivers
    subject: "TIME TO CHANGE SD", // Subject line
    text: `${sdCardToChange} card should be changed`, // plain text body
    html: `${sdCardToChange} card should be changed`, // html body
  });
  emailSend = true;
  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

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
          let totalNumberNames = JSON.parse(fs.readFileSync("./latest_names.json").toString());
          if (totalNumberNames.queued !== undefined) {
            for (let i = 0; i < totalNumberNames.queued[0].lastProcessedNames.length; i++) {
              if (client && (needReconnect === false)) {
                client.send(JSON.stringify(totalNumberNames.queued[0].lastProcessedNames[i]));
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
setInterval(() => {

  if (needReconnect === true) {
    console.log(`... trying to reconnect ...`)
    reconnect();
  }

}, 30000);
connect();

//*************************************************** */
// START CRAWLER
//*************************************************** */

// clearDataBases([dbUrl, dbUrlPrecheck]);//db
await getSDCardSize(0);
await getSDCardSize(1);

const c = new Crawler({
  maxConnections: 30,
  queueSize: 500,
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
        let totalURLS = await getabsoluteNumberNames(dbUrlPrecheck)

        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(`CURRENTURLINFORMATION%${currentURL}%${linksFound}%${totalURLS}%${check_mem()}`));
        }
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
      }
      c.queue(urls);
    }
    done();
  }
});
c.queue(savedToQueue);

//*************************************************** */
// NLP STUFF & DATA EXTRACTION
//*************************************************** */

async function extractData(mdata, href, id, foundLinks) {
  let countryCode = href.host.split('.').splice(-2);
  if (countryCode[1]) {
    await searchForNames(href.href, countryCode[1], mdata, foundLinks);
  }
}
/** CHECK LANGUAGE AND REDIRECT DATA TO LANGUAGE PROCESSING WITH FITTING NLP */
/** supports: german, english, french, italian and spanish */
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
      if (stopSendingData !== 1 && securityCheckIsCardFull === false) {
        saveFullFile(data);
      }
      break;
  }
}
/** CHECK INCOMING DATA FOR NAMES AND PROCESS THEM -> TO FILE & WEBSOCKET */
async function languageProcessing(doc, data, url, cc, foundLinks) {
  let person = doc.match('#FirstName #LastName').out('array');
  let endTime = new Date();
  let passedTime = (Math.round((startTime - endTime) / 1000)) * -1;
  if (person.length === 0 && stopSendingData !== 1 && securityCheckIsCardFull === false) {
    saveFullFile(data);
  }

  for (const a of person) {

    let text = a;
    const matchedNames = a.match(new RegExp(`(\s+\S\s)|(phd)|(«)|(Phd)|(™)|(PHD)|(dr)|(Dr)|(DR)|(ceo)|(Ceo)|(CEO)|(=)|(})|(\\;)|(•)|(·)|(\\:)|({)|(\\")|(\\')|(\\„)|(\\”)|(\\*)|(ii)|(—)|(\\|)|(\\[)|(\\])|(“)|(=)|(®)|(’)|(#)|(!)|(&)|(・)|(\\+)|(-)|(\\?)|(@)|(_)|(–)|(,)|(:)|(und)|(©)|(\\))|(\\()|(%)|(&)|(>)|(\\/)|(\\d)|(\\s{2,20})|($\s\S)|(\\b[a-z]{1,2}\\b\\s*)|(\\b[a-z]{20,90}\\b\\s*)|(\\\.)`));//(\/)|(\\)|
    if (matchedNames === null) {
      if (text.includes("’s") || text.includes("'s")) {
        text = a.slice(0, -2);
      }
      const checkedDataBase = await checkNamesDatabase(db, text);
      if (checkedDataBase === false) {
        let obj = {
          person: []
        };
        let uppercaseName = text.split(" ");
        if (uppercaseName[1]) {
          if (uppercaseName[0][2] && uppercaseName[1][2]) {
            uppercaseName[0] = uppercaseName[0].toLowerCase();
            uppercaseName[1] = uppercaseName[1].toLowerCase();
            uppercaseName[0] = uppercaseName[0].charAt(0).toUpperCase() + uppercaseName[0].slice(1) + " ";
            uppercaseName[1] = uppercaseName[1].charAt(0).toUpperCase() + uppercaseName[1].slice(1);
            let tempNameString = uppercaseName[0].concat(uppercaseName[1])
            currentDate = getCurrentDate();


            let totalNumberNames = await getabsoluteNumberNames(db);
            obj.person.push({ name: tempNameString, url: url, countrycode: cc, date: currentDate, language: currentLanguage, id: totalNumberNames });

            let dateObject = new Date();
            let toSend = JSON.stringify(`${tempNameString}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`)// + '............' + currentDate + '............' + cc`)//%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`)// + '............' + currentDate + '............' + cc)//+ mUrl.host);

            if (client && client.readyState === WebSocket.OPEN && passedTime < 59) {
              client.send(toSend);
              startTime = new Date();
            }
            if (client && client.readyState === WebSocket.OPEN) {
              await getSDCardSize(0);
              await getSDCardSize(1);
              client.send(JSON.stringify(`GETCARDSIZE%${cardFilled[0]}%${cardFilled[1]}%${cardRemaining[0]}%${cardRemaining[1]}`));
            }
            if (stopSendingData !== 0 && securityCheckIsCardFull === false) {
              saveToSDCard(true, obj);
            }
            countLastProcessedNames === 22 ? saveLastNames(url) : countLastProcessedNames++;
            lastProcessedNames[countLastProcessedNames] = (`${tempNameString}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getMinutes())}%${cc}`);//tempNameString;// + '............' + currentDate + '............' + cc)//+ mUrl.host);

            if (data === latestData) {
              tempSaveNames[inCurrentDataset] = text;
              inCurrentDataset++;
            } else {
              if (securityCheckIsCardFull === false) {
                replaceAllNames(data, tempSaveNames, stopSendingData);
              }
              tempSaveNames = [];
              // console.log(`\n\n${getCurrentDate()} `)
              // console.log(`${url} \n names found: ${inCurrentDataset} queue size: ${mQueueSize} memory used: ${check_mem()} MB`);
              let totalNumberNames = await getabsoluteNumberNames(db);
              let totalURLS = await getabsoluteNumberNames(dbUrlPrecheck)
              if (client && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(`METADATA % ${mQueueSize}% ${totalNumberNames}% ${totalURLS}% ${check_mem()}% ${inCurrentDataset}% ${currentURL}% ${linksFound} `));
              }
              inCurrentDataset = 0;
            }
            latestData = data;
          }
        } else {
        }
      } else {

        if (stopSendingData !== 1) {
          saveFullFile(data);
        }
      }
    } else {
      if (stopSendingData !== 1) {
        saveFullFile(data);
      }
    }
  }
  console.log(passedTime);
  if (client && client.readyState === WebSocket.OPEN && passedTime > 59) {
    let dateObject = new Date();
    let savedName = await getExistingNames(db, rand(0, (await getabsoluteNumberNames(db))));
    let toSend = JSON.stringify(`recycledName:${savedName}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`);
    client.send(toSend);
    startTime = new Date();
  }
}

//*************************************************** */
// HELPER FUNCTIONS
//*************************************************** */
async function getSDCardSize(i) {
  // let currentPath = ['./names-output/output/', './full-output/output/'];
  let currentPath = ["/media/process/NAMES/output/", "/media/process/FULL/output/"];
  let options = {
    file: currentPath[i],
    prefixMultiplier: 'MB',
    isDisplayPrefixMultiplier: true,
    precision: 4
  };
  df(options, function (error, response) {
    if (error) { throw error; }
    cardFilled[i] = response[0].used;
    cardRemaining[i] = response[0].available;
  });
  console.log(`CARD AVAILABLE ${i} ${cardRemaining[i]}`)
  if (cardRemaining[i]) {
    let numericValue = cardRemaining[i].includes('MB') ? cardRemaining[i].split('MB') : '';
    console.log(numericValue[0] / 1);
    if (((numericValue[0] / 1) < 50.0) && emailSend === false) {
      console.log("!SD CARD ABOUT TO BE FULL!")
      if (i === 0) {
        sdCardToChange = "NAME";
        await sendEmail().catch(console.error);
      } else {
        sdCardToChange = "FULL";
        await sendEmail().catch(console.error)
      }
      securityCheckIsCardFull = false;
      stopSendingData = i;
    } else {
      securityCheckIsCardFull = false;
      stopSendingData = 3;
      emailSend = false;
    }
  }

}
function retrieveURLs() {
  let totalNumberURLs = JSON.parse(fs.readFileSync("./recoverLastSession.json").toString());
  globalID = totalNumberURLs.lastHandled;
  return totalNumberURLs.queued[0].lastProcessedURLs;
}
function saveLastNames(url) {
  let mData = {
    queued: []
  };
  mData.queued.push({ lastProcessedNames });
  fs.writeFileSync('./latest_names.json', JSON.stringify(mData));
  countLastProcessedNames = 0
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
async function checkNamesDatabase(db, name) {
  try {
    let value = await db.get(name);
    return true;
  } catch (err) {
    await db.put(name, name);
    return false;
  }

}
export async function getabsoluteNumberNames(mdb) {
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