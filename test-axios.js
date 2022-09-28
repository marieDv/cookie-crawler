
import Crawler from 'crawler';
import { Level } from 'level';
import { checkBlacklist, clearDataBases, detectDataLanguage, getCurrentDate, replaceAllNames, saveCurrentDataToFile, saveToSDCard, writeLatestToTerminal, writeToJsonFile } from './functions.js';
import * as fs from 'fs';


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

// crawlerTest();
// function crawlerTest() {
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
                console.log("old website or error")
              } else {
                oldWebsite = false;
                console.log("new website")

              }
            });
            await dbUrlPrecheck.put(url.origin, url.origin);
            if (oldWebsite === true) {

              // const url = new URL(a.attribs.href, res.request.uri.href);
              urls.push(url.href);
              countLastProcessedURLs === 20 ? saveLastSession(globalID + c.queueSize) : countLastProcessedURLs++;
              lastProcessedURLs[countSavedURLs] = url.origin;
              // extractData($("body").text(), url.href);
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