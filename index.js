
import Crawler from 'crawler';
import level from 'level-party';
import { clearDataBases, rand, retrieveCounter, handleNewEntry, checkDatabase } from './functions.js';
import * as fs from 'fs';
import psl from 'psl';
import { URL } from 'node:url';
//*************************************************** */
// SERIALPORT
//*************************************************** */
import { SerialPort } from "serialport";
import { ReadlineParser } from '@serialport/parser-readline';

// const port = new SerialPort({path: '/dev/cu.usbmodem14201', baudRate: 9600 }, (err) => {
const selectedPort = '/dev/cu.usbmodem14101'; // Adjust this to your actual port

const port = new SerialPort({ path: selectedPort, baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => {
  console.log('Serial port opened');

  port.write('why\n', (err) => {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });

  parser.on('data', (data) => {
    console.log('Received from Arduino: ', data);
  });
  
});

port.on('error', (err) => {
  console.error('Serial port error: ', err.message);
});

const buffer = [];
const sendInterval = 500; // Time interval in milliseconds
let isSending = false;

const startURL = ['https://crawlee.dev/', 'https://www.lemonde.fr/', 'https://elpais.com/america/?ed=ame'];
const emergencyURLS = ['https://youtube.com', 'https://elpais.com/', 'https://www.thelocal.it/', 'https://mariedvorzak.at'];
const dbUrl = level('urlsLevel', { valueEncoding: 'json' })
const dbUrlPrecheck = level('dbUrlPrecheck', { valueEncoding: 'json' })
let lastProcessedURLs = [];
let countLastProcessedURLs = 0;
let globalID = 0;
let countSavedURLs = 0;
let longestName = 0;
let savedToQueue = retrieveURLs();
savedToQueue = savedToQueue.concat(startURL);
let currentURL = '';
let linksFound = 0;
let mQueueSize = 0;
let timeoutURL;
let blacklistedHostUrls = [];
let lastHundredHosts = [];
let countURLS = 0;
let totalURLS = ' ';
let allCookies = [];
clearDataBases([dbUrlPrecheck]);
clearDataBases([dbUrl]);
await initCrawler();
analyzeCookieData();
let values = []


//*************************************************** */
// START CRAWLER
//*************************************************** */
totalURLS = await retrieveCounter(dbUrl);
async function initCrawler() {
  const c = new Crawler({
    maxConnections: 1,
    queueSize: 300,
    retries: 0,
    rateLimit: 500,
    jQuery: {
      name: 'cheerio',
      options: {
        normalizeWhitespace: true,
        xmlMode: true
      }
    },
    preRequest: (options, done) => {
      try {
        done();
      } catch (error) {
        console.log(`prerequest error: ${error}`);

      }
    },
    callback: async (error, res, done) => {
      try {
        if (error) {
        } else {
          const $ = res.$;
          var urls = [];
          const checkedDataBaseURLS = await handleNewEntry(dbUrlPrecheck, res.request.uri.href);
          if ($ && $('a').length >= 1 && res.headers['content-type'].split(';')[0] === "text/html" && checkedDataBaseURLS === false) {
            currentURL = res.request.uri.href;
            clearTimeout(timeoutURL);
            timeoutURL = setTimeout(async function () {
              console.log("abort")
              done();
            }, 10000);
            let array = $('a').toArray();
            linksFound = array.length;
            const url = new URL(res.request.uri.href);
            var pslUrl = psl.parse(url.host);
            lastHundredHosts[countURLS] = pslUrl.domain;
            const allEqual = arr => arr.every(val => val === arr[0]);
            if (allEqual(lastHundredHosts) && lastHundredHosts.length > 1) {
              blacklistedHostUrls.push(lastHundredHosts[0]);
              if (blacklistedHostUrls.length > 100) {
                urls.push(emergencyURLS[rand(0, emergencyURLS.length)]);
                urls = emergencyURLS;
                c.queue(urls);
                blacklistedHostUrls = [];
              }
            }
            countURLS++;
            if (countURLS === 20) {
              countURLS = 0;
            }
            function includesBlacklistedURL(link) {
              for (let i = 0; i < blacklistedHostUrls.length; i++) {
                if (link.includes(blacklistedHostUrls[i])) {
                  return true;
                }
              }
              return false;
            }
            let countCurrentUrls = 0;
            for (const a of array) {
              if (a.attribs.href && a.attribs.href !== '#' && includesBlacklistedURL(a.attribs.href) === false && countCurrentUrls <= 300) {
                countCurrentUrls++;
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
                    let newDomain = url.protocol + '//' + pslUrl.domain;
                    mQueueSize = c.queueSize;
                    let tempString = url.href;
                    if (c.queueSize <= 2000 && (tempString.includes('§') === false && tempString.includes('å') === false) && tempString.includes('.mp3') === false && tempString.includes('.mp4') === false && tempString.includes('.wav') === false && tempString.includes('.ogg') === false && tempString.includes('.mov') === false && tempString.includes('pdf') === false && tempString.includes('javascript') === false) {
                      urls.push(url.href);
                    } else {
                      // console.log("dont save: " + url.href)
                    }
                    if (countLastProcessedURLs === 20) {
                      saveLastSession(globalID + c.queueSize);
                      countLastProcessedURLs = 0;
                    } else if (lastProcessedURLs.includes(newDomain) === false) {
                      lastProcessedURLs[countSavedURLs] = newDomain;
                      countLastProcessedURLs++
                      countSavedURLs++;
                      if (countSavedURLs === 100) {
                        countSavedURLs = 0;
                      }
                    }
                  }
                }
                catch (err) {
                }
              }
            }
            if (await checkDatabase(dbUrl, currentURL) === false) {
              // console.log(res.headers['set-cookie'])
              if (res.headers['set-cookie']) {
                let setCookie = res.headers['set-cookie'].toString();
                /** SET CRITERIA FOR FILTERING THIRD PARTY COOKIES HERE */
                /** name/value pairs containing: analytics or tracking */

                // if (!setCookie.includes("SameSite=strict") || !setCookie.includes("SameSite=Strict") || !setCookie.includes("samesite=strict")) {
                await saveCookies(res.headers['set-cookie'], url);
                // }
              }
              // await extractData($("html").text(), url, (globalID + c.queueSize), array.length, $("html").html());
            }
          }
          c.queue(urls);
        }
        done();
      } catch (error) {
        console.log(error);
      }
    }

  });
  c.queue(savedToQueue);
}

// ************************************************************************************************
// CHECK CRITERIA FOR TRACKING COOKIES AND SAFE THEM
// ************************************************************************************************
async function saveCookies(data, mUrl) {
  let dateTemp = new Date();
  // let date = dateTemp.getFullYear() + "_" + dateTemp.getMonth() + 1 + "_" + dateTemp.getDate() + "_" + dateTemp.getHours() + "-" + dateTemp.getMinutes() + "-" + dateTemp.getSeconds();
  let currentPath = ['./cookies/'];

  let mI = 0;
  data.forEach((e) => {
    let fullPair = e.split(';')[0]
    let mDomain = "";
    let mSameSite = "";
    let mExpires = "";

    if (e.includes("domain=")) {
      mDomain = e.split('domain=')[1];
      mDomain = mDomain.split(';')[0];
    }
    if (e.includes("Domain=")) {
      mDomain = e.split('Domain=')[1];
      mDomain = mDomain.split(';')[0];
    }
    if (e.includes("samesite=")) {
      mSameSite = e.split('samesite=')[1];
      mSameSite = mSameSite.split(';')[0];
    }
    if (e.includes("SameSite=")) {
      mSameSite = e.split('SameSite=')[1];
      mSameSite = mSameSite.split(';')[0];
    }

    if (e.includes("Expires=")) {
      mExpires = e.split('Expires=')[1];
      mExpires = mExpires.split(';')[0];
    }
    if (e.includes("expires=")) {
      mExpires = e.split('expires=')[1];
      mExpires = mExpires.split(';')[0];
    }

    // let tempToBinary = fullPair.split('=')[1];//VALUE
    let tempToBinary = fullPair;//FULLCOOKIE
    let binary = toBinary(tempToBinary);
    let binaryToArduino = mUrl.hostname+"|"+binary+"\n";
    addToBuffer(binaryToArduino);
   /** port.write(binaryToArduino, (err) => {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    }); */
    
    values[mI] = { "binary": binary, "name": fullPair.split('=')[0], "value": fullPair.split('=')[1], "sameSite": mSameSite, "expires": mExpires, "domain": mDomain, "parsedPage": mUrl.hostname };
    mI++;
  });

  let tempdata = { "cookiesPerPage": values };//, "data": data, "url": mUrl 
  allCookies.push(tempdata);
  let tempPath = currentPath[0] + "to-analyze.json";
  fs.appendFileSync(tempPath, JSON.stringify(tempdata, null, 2), function () { });
  allCookies = [];
  mI = 0;
}

function addToBuffer(data) {
  buffer.push(data);
  if (!isSending) {
      isSending = true; // Mark as sending
      sendData(); // Start sending data
  }
}

function sendData() {
  if (buffer.length > 0) {
      const dataToSend = buffer.shift(); // Get the first item from the buffer
      port.write(dataToSend, (err) => {
          if (err) {
              return console.error('Error on write: ', err.message);
          }
      });
  }

  if (buffer.length > 0) {
      setTimeout(sendData, sendInterval); // Schedule the next send
  } else {
      isSending = false; // Reset sending status
  }
}


function toBinary(string) {
  return string.split('').map(function (char) {
    return char.charCodeAt(0).toString(2);
  }).join('');
}

function analyzeCookieData() {
  // let completeData = JSON.parse(fs.readFileSync("./cookies/to-analyze-progress.json").toString());
  // console.log(completeData[0])

}

// ************************************************************************************************
// RETURN LAST SAVED URLS
// ************************************************************************************************
function retrieveURLs() {
  let totalNumberURLs = JSON.parse(fs.readFileSync("./recoverLastSession.json").toString());
  globalID = totalNumberURLs.lastHandled;
  if (totalNumberURLs && totalNumberURLs.longestName > longestName) {
    longestName = totalNumberURLs.longestName;
  }
  return totalNumberURLs.queued[0].lastProcessedURLs;
}
// ************************************************************************************************
// GET LAST SAVED URLS TO PRESUME CRAWLING SESSION AFTER SHUTDOWN/CRASH
// ************************************************************************************************

function saveLastSession(handledNumber) {
  let mData = {
    queued: [],
    lastHandled: handledNumber,
    longestName: longestName,
  };
  mData.queued.push({ lastProcessedURLs });
  fs.writeFileSync('./recoverLastSession.json', JSON.stringify(mData));
  countLastProcessedURLs = 0
}