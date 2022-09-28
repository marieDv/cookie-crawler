
import Crawler from 'crawler';
import { Level } from 'level';
import { checkBlacklist, clearDataBases, detectDataLanguage, getCurrentDate, replaceAllNames, saveCurrentDataToFile, saveToSDCard, writeLatestToTerminal, writeToJsonFile } from './functions.js';
import * as fs from 'fs';
import enNlp from 'compromise';
import deNlp from 'de-compromise';
import esNlp from 'es-compromise';
import frNlp from 'fr-compromise';
import itNlp from 'it-compromise';
import { URL } from 'node:url';

const ignoreSelector = `:not([href$=".png"]):not([href$=".jpg"]):not([href$=".mp4"]):not([href$=".mp3"]):not([href$=".gif"])`;
const startURL = ['https://crawlee.dev/api/core/function/enqueueLinks', 'https://www.lemonde.fr/', 'https://elpais.com/america/?ed=ame'];
let alreadyVisited = false;

const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const dbUrlPrecheck = new Level('dbUrlPrecheck', { valueEncoding: 'json' })

let lastProcessedURLs = [];
let countLastProcessedURLs = 0;
let globalID = 0;
let countSavedURLs = 0;
let savedToQueue = retrieveURLs();
savedToQueue = savedToQueue.concat(startURL);
let found = false;
let countcurrentlyProcessedURLS = 0;
let tempSaveNames = [];
var currentDate;
let currentLanguage = "";
let latestData = "";
let inCurrentDataset = 0;
let idForNames = 0;

let i = 0;


clearDataBases([db, dbUrl, dbUrlPrecheck]);
const c = new Crawler({
  maxConnections: 10,
  queueSize: 1000,
  retries: 0,
  rateLimit: 3000,

  callback: async (error, res, done) => {
    if (error) {
    } else {
      const $ = res.$;
      const urls = [];
      if ($ && $('a').length >= 1 && res.headers['content-type'].split(';')[0] === "text/html") {
        let array = $('a').toArray();
        for (const a of array) {
          if (a.attribs.href && a.attribs.href !== '#') {
            let oldWebsite = false;
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
              urls.push(url.href);
              countLastProcessedURLs === 20 ? saveLastSession(globalID + c.queueSize) : countLastProcessedURLs++;
              lastProcessedURLs[countSavedURLs] = url.origin;
              console.log(url)
              extractData($("body").text(), url, (globalID + c.queueSize));
              countSavedURLs++;
              if (countSavedURLs === 100) {
                countSavedURLs = 0;
              }
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


function extractData(mdata, href, id) {
  let countryCode = href.host.split('.').splice(-2);
  if (countryCode[1]) {
    searchForNames(href.href, countryCode[1], mdata);
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
function retrieveURLs() {
  let totalNumberURLs = JSON.parse(fs.readFileSync("./recoverLastSession.json").toString());
  globalID = totalNumberURLs.lastHandled;
  return totalNumberURLs.queued[0].lastProcessedURLs;
}

function searchForNames(url, cc, data) {
  currentLanguage = detectDataLanguage(data.substring(500, 8000));
  switch (currentLanguage) {
    case 'german':
      languageProcessing(deNlp(data), data, url, cc)
      break;
    case 'english':
      languageProcessing(enNlp(data), data, url, cc);
      break;
    case 'french':
      languageProcessing(frNlp(data), data, url, cc);
      break;
    case 'italian':
      languageProcessing(itNlp(data), data, url, cc);
      break;
    case 'spanish':
      languageProcessing(esNlp(data), data, url, cc);
      break;
    case '':
      break;
  }
}
function check_mem() {
  const mem = process.memoryUsage();
  console.log('%f MB used', (mem.heapUsed / 1024 / 1024).toFixed(2))
}
function languageProcessing(doc, data, url, cc) {
  let person = doc.match('#Person #Noun');
  person = person.forEach(function (d, i) {
    let text = d.text('normal');
    let textR = d.text('reduced');
    const matchedNames = text.match(new RegExp('(\s+\S\s)|(=)|(})|(•)|(·)|({)|(")|(ii)|(=)|(’)|(#)|(!)|(&)|(・)|(\\+)|(-)|(@)|(_)|(–)|(,)|(:)|(und)|(©)|(\\))|(\\()|(%)|(&)|(>)|(\\/)|(\\d)|(\\s{2,20})|($\s\S)|(\\b[a-z]{1,2}\\b\\s*)|(\\b[a-z]{20,90}\\b\\s*)|(\\\.)'));//(\/)|(\\)|

    if (matchedNames === null) {
      db.get(textR, function (err) {
        if (err) {
          let obj = {
            person: []
          };
          if (text.includes("’s") || text.includes("'s")) {
            text = d.text().slice(0, -2);
          }
          let uppercaseName = text.split(" ");
          if (uppercaseName[1]) {
            uppercaseName[0] = uppercaseName[0].charAt(0).toUpperCase() + uppercaseName[0].slice(1) + " ";
            uppercaseName[1] = uppercaseName[1].charAt(0).toUpperCase() + uppercaseName[1].slice(1);

            let tempNameString = uppercaseName[0].concat(uppercaseName[1])
            currentDate = getCurrentDate();
            obj.person.push({ name: tempNameString, url: url, countrycode: cc, date: currentDate, language: currentLanguage, id: idForNames });
            // writeToJsonFile(obj.person, 'names.json');
          }
          saveToSDCard(true, obj.person);
          if (data === latestData) {
            tempSaveNames[inCurrentDataset] = text;
            inCurrentDataset++;
          } else {
            replaceAllNames(data, tempSaveNames, 0);
            inCurrentDataset = 0;
            tempSaveNames = [];
          }
          latestData = data;
        }
      })
      db.put(textR, textR);
    } else {
      // console.log(matchedNames)
    }
  })
}