
import Crawler from 'crawler';
import level from 'level-party';
import { clearDataBases, rand, check_mem, findMostUsed, getURLId, getabsoluteNumberNames, checkNamesDatabase, checkDatabase, saveLastNames, getExistingNames, detectDataLanguage, returnWithZero, getCurrentDate, replaceAllNames, saveToSDCard } from './functions.js';
// import { websocketConnect, reconnect, heartbeat, returnClient } from './websocket.js';
import * as fs from 'fs';
import * as util from 'util';
import sizeof from 'object-sizeof';
import df_ from 'node-df';

const df = util.promisify(df_);


import nodemailer from 'nodemailer';
import psl from 'psl';
import enNlp from 'compromise';
import deNlp from 'de-compromise';
import esNlp from 'es-compromise';
import frNlp from 'fr-compromise';
import itNlp from 'it-compromise';
import { URL } from 'node:url';
import WebSocket from 'ws';
const startURL = ['https://crawlee.dev/api/å', 'https://www.lemonde.fr/', 'https://elpais.com/america/?ed=ame'];
const emergencyURLS = ['https://youtube.com', 'https://elpais.com/', 'https://www.thelocal.it/', 'https://www.ait.ac.at/'];
const db = level('namesLevel', { valueEncoding: 'json' })
const dbUrl = level('urlsLevel', { valueEncoding: 'json' })
const dbUrlPrecheck = level('dbUrlPrecheck', { valueEncoding: 'json' })
let totalNumberNames = 0;
let lastProcessedURLs = [];
let lastProcessedNames = [];
let countLastProcessedURLs = 0;
let countLastProcessedNames = 0;
let globalID = 0;
let cardFilled = [0, 0];
let cardRemaining = [0, 0];
let countSavedURLs = 0;
let longestName = 0;
let savedToQueue = retrieveURLs();
savedToQueue = savedToQueue.concat(startURL);
var currentDate;
let currentLanguage = "";
let latestData = "";
let inCurrentDataset = 0;
let linksFound = 0;
let mQueueSize = 0;
let currentURL = '';
let startTime = new Date();
var client;
let currentHTML = '';
let timeoutId;
let sdCardToChange = "";
let emailSend = false;
let blacklistedHostUrls = [];
let lastHundredHosts = [];
let countURLS = 0;
let waitForRecycledName = false;
let sdFULLInfo = [];
let sdNAMESInfo = [];
let foundNames = 0;
let isConnected = true;
let lastUrl = '';
let totalURLS = ' ';

let sendEmailOnce = [true, true];

import { Websocket } from './websocket.js';
const websocket = new Websocket();

// clearDataBases([dbUrl, dbUrlPrecheck, db]);//db
clearDataBases([dbUrlPrecheck]);
await checkSizeBeforeSendingData(0);
await checkSizeBeforeSendingData(1);

//*************************************************** */
// START WEBSOCKET IF FLAG 'web' is set
//*************************************************** */
console.log(process.argv);
if (process.argv[2] === "web" || process.argv[3] === "web" || process.argv[4] === "web" || process.argv[5] === "web") {
  await websocket.websocketConnect();
}
if (process.argv[2] === "ranking-snapshot" || process.argv[3] === "ranking-snapshot" || process.argv[4] === "ranking-snapshot" || process.argv[5] === "ranking-snapshot") {
  console.log("NAMES:")
  console.log(await findMostUsed(db));
  console.log("URLS:")
  console.log(await findMostUsed(dbUrl));
} else {
  await initCrawler();
}
if (process.argv[2] === "clear" || process.argv[3] === "clear" || process.argv[4] === "clear" || process.argv[5] === "clear") {
  clearDataBases([dbUrl, db]);
}
//*************************************************** */
// START CRAWLER
//*************************************************** */

totalURLS = await getabsoluteNumberNames(dbUrl);

async function initCrawler() {
  const c = new Crawler({
    maxConnections: 10,
    queueSize: 500,
    retries: 0,
    rateLimit: 0,


    preRequest: (options, done) => {
      try {
        done();
      } catch (error) {
        console.log(`prerequest error: ${error}`);

      }
    },
    callback: async (error, res, done) => {


      if (error) {

      } else {
        const $ = res.$;
        var urls = [];
        const checkedDataBaseURLS = await checkNamesDatabase(dbUrlPrecheck, res.request.uri.href);
        if ($ && $('a').length >= 1 && res.headers['content-type'].split(';')[0] === "text/html" && checkedDataBaseURLS === false) {
          currentURL = res.request.uri.href;
          // console.log(currentURL)
          // if (await checkNamesDatabase(dbUrl, currentURL) === false) {
          // await dbUrl.put(currentURL, currentURL);
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
          if (websocket.returnClient() && websocket.returnClient().readyState === WebSocket.OPEN) {
            await websocket.clientSend(`CURRENTURLINFORMATION%${currentURL}%${linksFound}%${totalURLS}%${check_mem()}`);
            // client.send(JSON.stringify(`CURRENTURLINFORMATION%${currentURL}%${linksFound}%${totalURLS}%${check_mem()}`));
          }
          let countCurrentUrls = 0;
          console.log("new url")
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
                  // console.log(tempString.includes('§'));
                  if (c.queueSize <= 2000 && (tempString.includes('§') === false && tempString.includes('å') === false)) {
                    urls.push(url.href);
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
                // console.log(err)
              }
            }
          }
          if (await checkDatabase(dbUrl, currentURL) === false) {
            // console.log(4294967256 / (1024 * 1024));
            // console.log(sizeof($("html")) / (1024 * 1024));

            currentHTML = $("html").html();
            console.log("extract data " + url)
            await extractData($("html").text(), url, (globalID + c.queueSize), array.length, $("html").html());
          }
        }
        c.queue(urls);
      }
      done();

    }

  });
  c.queue(savedToQueue);
}
//*************************************************** */
// NLP STUFF & DATA EXTRACTION
//*************************************************** */

async function extractData(mdata, href, id, foundLinks, dataHtml) {
  let countryCode = href.host.split('.').splice(-2);
  if (countryCode[1]) {
    await searchForNames(href.href, countryCode[1], mdata, foundLinks, dataHtml);
  }
}
/** CHECK LANGUAGE AND REDIRECT DATA TO LANGUAGE PROCESSING WITH FITTING NLP */
/** supports: german, english, french, italian and spanish */
async function searchForNames(url, cc, data, foundLinks, dataHtml) {
  currentLanguage = detectDataLanguage(data.substring(500, 8000));
  console.log("search for names")
  switch (currentLanguage) {
    case 'german':
      await languageProcessing(deNlp(data), data, url, cc, foundLinks, dataHtml)
      break;
    case 'english':
      await languageProcessing(enNlp(data), data, url, cc, foundLinks, dataHtml);
      break;
    case 'french':
      await languageProcessing(frNlp(data), data, url, cc, foundLinks, dataHtml);
      break;
    case 'italian':
      await languageProcessing(itNlp(data), data, url, cc, foundLinks, dataHtml);
      break;
    case 'spanish':
      await languageProcessing(esNlp(data), data, url, cc, foundLinks, dataHtml);
      break;
    case '':
      break;
  }
  // await printLogs(foundLinks, totalURLS);


}

async function printLogs(foundLinks, totalURLS) {
  await checkSizeBeforeSendingData(1);
  await checkSizeBeforeSendingData(0);
  console.log(`
                                                              
${currentURL}
NEW NAMES: ${foundNames} | URLS: ${foundLinks}(${mQueueSize}) | TOTAL: ${totalNumberNames} NAMES | ${totalURLS} URLS | LONGEST: ${longestName} | ALL ${sdFULLInfo[1]}${sdFULLInfo[0]} | NAMES ${sdNAMESInfo[1]}${sdNAMESInfo[0]}
                                                              
`);
  if (process.argv[2] === "ranking" || process.argv[3] === "ranking" || process.argv[4] === "ranking") {
    let mostUsedNames = await findMostUsed(db);
    let mostUsedURLS = await findMostUsed(dbUrl);
    console.log(`NAME STATS
LONGEST: ${longestName} | MOST FOUND:
1: ${mostUsedNames[0].key}: ${mostUsedNames[0].value}
2: ${mostUsedNames[1].key}: ${mostUsedNames[1].value}
3: ${mostUsedNames[2].key}: ${mostUsedNames[2].value}
4: ${mostUsedNames[3].key}: ${mostUsedNames[3].value}
5: ${mostUsedNames[4].key}: ${mostUsedNames[4].value}

MOST FOUND URLs: 
1: ${mostUsedURLS[0].key}: ${mostUsedURLS[0].value}
2: ${mostUsedURLS[1].key}: ${mostUsedURLS[1].value}
3: ${mostUsedURLS[2].key}: ${mostUsedURLS[2].value}
4: ${mostUsedURLS[3].key}: ${mostUsedURLS[3].value}
5: ${mostUsedURLS[4].key}: ${mostUsedURLS[4].value}
`)
  }
}

/** CHECK INCOMING DATA FOR NAMES AND PROCESS THEM -> TO FILE & WEBSOCKET */
async function languageProcessing(doc, data, url, cc, foundLinks, dataHtml) {
  console.log("language processing")
  foundNames = 0;
  let allCurrentNames = [];
  let repeatedCurrentNames = [];
  totalURLS++;
  await checkNamesDatabase(dbUrl, url);

  let justFound = 0;
  let repeatedFound = 0;
  const tosaveCurrentURl = url;
  const tosaveCurrentId = totalURLS;
  let saveNoNames = false;
  let person = doc.match('#FirstName #LastName').out('array');
  console.log("person length " + person.length)
  let personBind = [];
  let allBind = [data, [], tosaveCurrentId, tosaveCurrentURl, await getCurrentDate()];
  for (let i = 0; i < person.length; i++) {
    personBind[i] = [person[i], tosaveCurrentURl, tosaveCurrentId];
  }
  console.log("found names");
  // console.log(personBind)
  if (person !== undefined) {
    // for await (const [a, pURL, pURLS] of personBind) {
    let saveAtTheEnd = true;
    for (let i = 0; i < personBind.length; i++) {
      let a = personBind[i][0];
      let pURL = personBind[i][1];
      let pURLS = personBind[i][2];
      let text = a;
      const matchedNames = await a.match(new RegExp(`/([\u4e00-\u9fff\u3400-\u4dbf\ufa0e\ufa0f\ufa11\ufa13\ufa14\ufa1f\ufa21\ufa23\ufa24\ufa27\ufa28\ufa29\u3006\u3007]|[\ud840-\ud868\ud86a-\ud879\ud880-\ud887][\udc00-\udfff]|\ud869[\udc00-\udedf\udf00-\udfff]|\ud87a[\udc00-\udfef]|\ud888[\udc00-\udfaf])([\ufe00-\ufe0f]|\udb40[\udd00-\uddef])?/gm|(\s+\S\s)|(、)|(/\\/g)|(phd)|(«)|(Phd)|(™)|(PHD)|(dr)|(Dr)|(DR)|(ceo)|(Ceo)|(CEO)|(=)|(})|(\\;)|(\\；)|(•)|(·)|(\\,)|(\\:)|({)|(\\")|(\\')|(\\„)|(\\”)|(\\*)|(ii)|(—)|(\\|)|(\\[)|(\\])|(“)|(=)|(®)|(’)|(#)|(!)|(&)|(・)|(\\+)|(-)|(\\?)|(@)|(²)|(_)|(–)|(,)|(:)|(und)|(©)|(\\))|(\\()|(%)|(&)|(>)|(\\/)|(\\d)|(\\s{2,20})|($\s\S)|(\\b[a-z]{1,2}\\b\\s*)|(\\b[a-z]{20,90}\\b\\s*)|(\\\.)`));//(\/)|(\\)|
      const checkedDataBase = await checkNamesDatabase(db, text);
      if (matchedNames === null) {
        if (text.includes("’s") || text.includes("'s")) {
          text = a.slice(0, -2);
        }
        let uppercaseName = text.split(" ");
        if (uppercaseName[1]) {
          if (uppercaseName[0][2] && uppercaseName[1][2]) {
            uppercaseName[0] = uppercaseName[0].toLowerCase();
            uppercaseName[1] = uppercaseName[1].toLowerCase();
            uppercaseName[0] = uppercaseName[0].charAt(0).toUpperCase() + uppercaseName[0].slice(1) + " ";
            uppercaseName[1] = uppercaseName[1].charAt(0).toUpperCase() + uppercaseName[1].slice(1);
            let tempNameString = uppercaseName[0].concat(uppercaseName[1])
            currentDate = await getCurrentDate();
            totalNumberNames = await getabsoluteNumberNames(db);

            if (tempNameString.length > longestName) {
              longestName = tempNameString.length;
            }

            let dateObject = new Date();

            // if (websocket.returnClient() && websocket.returnClient().readyState === WebSocket.OPEN) {
            //   let toSend = (`${tempNameString}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`)// + '............' + currentDate + '............' + cc`)//%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`)// + '............' + currentDate + '............' + cc)//+ mUrl.host);
            //   await websocket.clientSend(toSend);
            //   startTime = new Date();
            //   clearTimeout(timeoutId);
            //   //ALL ${sdFULLInfo[1]}/${sdFULLInfo[0]} | NAMES ${sdNAMESInfo[1]}/${sdNAMESInfo[0]
            //   await websocket.clientSend(`GETCARDSIZE%${sdFULLInfo[1]}%${sdNAMESInfo[1]}%${sdFULLInfo[0]}%${sdNAMESInfo[0]}`);
            // }
            if (i < personBind.length - 1) {
              if (tempNameString !== null && tempNameString !== undefined && tempNameString.length > 2) {
                if (checkedDataBase === false) {
                  allCurrentNames[justFound] = tempNameString;
                  inCurrentDataset++;
                  justFound++;
                  countLastProcessedNames === 22 ? await saveLastNames(url, lastProcessedNames, countLastProcessedNames) : countLastProcessedNames++;
                  lastProcessedNames[countLastProcessedNames] = (`${tempNameString}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getMinutes())}%${cc}`);//tempNameString;// + '............' + currentDate + '............' + cc)//+ mUrl.host);
                } else if (repeatedCurrentNames.includes(tempNameString) === false && allCurrentNames.includes(tempNameString) === false) {
                  repeatedCurrentNames[repeatedFound] = tempNameString;
                  repeatedFound++;
                }
              }
            } else {
              saveNoNames = true;
              if (checkedDataBase === false && tempNameString !== null && tempNameString !== undefined && tempNameString.length > 2) {
                allCurrentNames[justFound++] = tempNameString;
              }
              const toSaveCurrentNames = allCurrentNames;

              if (await checkSizeBeforeSendingData(0) === true) {
                // for (let j = 0; j < toSaveCurrentNames.length; j++) {
                if (toSaveCurrentNames !== null && toSaveCurrentNames.length > 0) {
                  for(let j=0; j<toSaveCurrentNames.length; j++){
                    let obj = {
                      name: toSaveCurrentNames[j],//tempNameString,
                      url: pURL,
                      nId: totalNumberNames,
                      urlId: pURLS,
                      date: currentDate,
                      domain: cc,
                      textLanguage: currentLanguage
                    };
  
                    await saveToSDCard(true, obj);

                  }
                  // let obj = {
                  //   name: toSaveCurrentNames,//tempNameString,
                  //   url: pURL,
                  //   nId: totalNumberNames,
                  //   urlId: pURLS,
                  //   date: currentDate,
                  //   domain: cc,
                  //   textLanguage: currentLanguage
                  // };

                  // await saveToSDCard(true, obj);
                }
              }
              if (await checkSizeBeforeSendingData(1) === true) {
                await replaceAllNames(allBind[0], toSaveCurrentNames, allBind[2], allBind[3], allBind[4], repeatedCurrentNames);
              }
              // if (websocket.returnClient() && websocket.returnClient().readyState === WebSocket.OPEN) {
              //   let totalNumberNames = await getabsoluteNumberNames(db);
              //   await websocket.clientSend(`METADATA % ${mQueueSize}% ${totalNumberNames}% ${totalURLS}% ${check_mem()}% ${inCurrentDataset}% ${currentURL}% ${linksFound} `);//ALL ${sdFULLInfo[1]}/${sdFULLInfo[0]} | NAMES ${sdNAMESInfo[1]}/${sdNAMESInfo[0]
              // }
              inCurrentDataset = 0;
              allBind[1] = allCurrentNames;
            }




          }
        }

      }
      latestData = data;
      //IF IT WASNT SAVED ON THE LAST UTERATION SAVE TO FILE
      if (i === personBind.length - 1 && saveNoNames === false) {
        // console.log("save empty")
        // if (await checkSizeBeforeSendingData(1) === true) {
        //   console.log(await getURLId(dbUrl, url));
        //   console.log(`all - url: ${pURL} id: ${pURLS}`);//[data, [], totalURLS, url, await getCurrentDate()]
        //   await replaceAllNames(allBind[0], allBind[1], allBind[2], allBind[3], allBind[4]);
        // }
        if (await checkSizeBeforeSendingData(1) === true) {
          await replaceAllNames(allBind[0], [], allBind[2], allBind[3], allBind[4], []);
        }
      }
    }
    // console.log("allcurrentnames:")
    // console.log(allCurrentNames)
  }
  // console.log(allCurrentNames + " " + totalURLS)
  foundNames = justFound;


  // timeoutId = setTimeout(async function () {
  //   if (websocket.returnClient() && websocket.returnClient().readyState === WebSocket.OPEN) {
  //     let sendRecycledNameVar = await sendRecycledName(cc)
  //     await websocket.clientSend(sendRecycledNameVar);
  //   }
  // }
  //   , 18000);

}

async function sendRecycledName(cc) {
  let dateObject = new Date();
  waitForRecycledName = true;
  // console.log(`absolute number of names ${await getabsoluteNumberNames(db)}`);
  if (await getabsoluteNumberNames(db) > 2) {
    let savedName = await getExistingNames(db, rand(0, (await getabsoluteNumberNames(db))), await getabsoluteNumberNames(db));
    let toSend = (`RECYCLED%${savedName}%${dateObject.getFullYear()}-${returnWithZero(dateObject.getMonth())}-${returnWithZero(dateObject.getDate())}&nbsp;&nbsp;${returnWithZero(dateObject.getHours())}:${returnWithZero(dateObject.getMinutes())}:${returnWithZero(dateObject.getSeconds())}%${cc}`);
    startTime = new Date();
    waitForRecycledName = false;
    return toSend;
  }
}
//*************************************************** */
// HELPER FUNCTIONS
//*************************************************** */

async function checkSizeBeforeSendingData(i) {
  console.log("check size before sending data " + i)
  // let currentPath = ['./names-output/output/', './full-output/output/'];
  let currentPath = ["/media/process/NAMES/", "/media/process/ALL/"];
  let options = {
    file: currentPath[i],
    prefixMultiplier: 'GB',
    isDisplayPrefixMultiplier: true,
    precision: 2
  };
  let numericValue = '0';
  if (fs.existsSync(currentPath[i])) {
    const response = await df(options);
    cardFilled[i] = response[0].used;
    cardRemaining[i] = response[0].available;
    numericValue = response[0].available.includes('GB') ? response[0].available.split('GB') : '';
    if (i === 0) {
      sdNAMESInfo[0] = '/' + response[0].size;
      sdNAMESInfo[1] = response[0].used;
    }
    if (i === 1) {
      sdFULLInfo[0] = '/' + response[0].size;
      sdFULLInfo[1] = response[0].used;
    }
    // console.log(numericValue[0])
    if (numericValue[0] >= 1.0) {
      if (i === 0) {
        sendEmailOnce[0] === true;
      }
      if (i === 1) {
        sendEmailOnce[1] === true;
      }
      return true;
    }
    if (numericValue[0] <= 0.5) {
      if (i === 0 && sendEmailOnce[0] === true) {
        let whichCard = `🤖 People Crawler here 🤖 \n\n The SD card NAMES is already filled with data 🤯 \nPlease change it asap!\n
        Current Stats: 
        TOTAL: ${await getabsoluteNumberNames(db)} NAMES | ${await getabsoluteNumberNames(dbUrl)} URLS
        ALL ${sdFULLInfo[1]}/${sdFULLInfo[0]} | NAMES ${sdNAMESInfo[1]}/${sdNAMESInfo[0]}\n`;

        await sendEmail(whichCard)
        sendEmailOnce[0] = false;
      }
      if (i === 1 && sendEmailOnce[1] === true) {
        console.log("time to change card");
        let whichCard = `🤖 People Crawler here 🤖 \n\n The SD card ALL is already filled with data 🤯 \nPlease change it asap!\n
        Current Stats: 
        TOTAL: ${await getabsoluteNumberNames(db)} NAMES | ${await getabsoluteNumberNames(dbUrl)} URLS
        ALL ${sdFULLInfo[1]}/${sdFULLInfo[0]} | NAMES ${sdNAMESInfo[1]}/${sdNAMESInfo[0]}\n`;
        await sendEmail(whichCard)
        sendEmailOnce[1] = false;
      }
      return false;
    }
  } else {
    // console.log("no path")
    if (i === 0) {
      sdNAMESInfo[0] = ``;
      sdNAMESInfo[1] = `path doesn't exist`;
    }
    if (i === 1) {
      sdFULLInfo[0] = ``;
      sdFULLInfo[1] = `path doesn't exist`;
    }

    return false;
  }
}
function retrieveURLs() {
  let totalNumberURLs = JSON.parse(fs.readFileSync("./recoverLastSession.json").toString());
  globalID = totalNumberURLs.lastHandled;
  if (totalNumberURLs && totalNumberURLs.longestName > longestName) {
    longestName = totalNumberURLs.longestName;
  }
  return totalNumberURLs.queued[0].lastProcessedURLs;
}


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
async function sendEmail(mText) {
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
    to: "mariedvorzak@gmail.com", // list of receivers
    // cc: "hello@process.studio",
    subject: "TIME TO CHANGE SD", // Subject line
    text: `${mText}`, // plain text body
    // html: `${mText}`, // html body
  });
  emailSend = true;
  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

