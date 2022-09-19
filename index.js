import enNlp from 'compromise';
import Crawler from 'crawler';
import deNlp from 'de-compromise';
import esNlp from 'es-compromise';
import frNlp from 'fr-compromise';
import itNlp from 'it-compromise';
import { Level } from 'level';
import { checkBlacklist, clearDataBases, detectDataLanguage, getCurrentDate, replaceAllNames, saveCurrentDataToFile, saveToSDCard, writeLatestToTerminal, writeToJsonFile } from './functions.js';



const ignoreSelector = `:not([href$=".png"]):not([href$=".jpg"]):not([href$=".mp4"]):not([href$=".mp3"]):not([href$=".gif"])`;

const startURL = 'https://www.ait.ac.at/en/';//https://wuerstelstandleo.at';//'https://xn--hftgold-n2a.wien/';//https://www.ait.ac.at/en/
var currentLanguage;
var fullCounter = 0;
var allURLS = [];
var currentDate;
let latestData = "";
let tempSaveNames = [];
let inCurrentDataset = 0;
let countUpID = 0;
let countNames = 0;
let countURLs = 0;
let ready = true;
let alreadyVisited = false;

const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const dbUrlPrecheck = new Level('dbUrlPrecheck', { valueEncoding: 'json' })
const blacklist = ["php", "html", "pdf", "%", "/", "jpeg", "back", "zip", "0&"];
const blockedSites = new RegExp('(google)|(paypal)|(raiffeisen)');


init();



function init() {
  countNames = saveCurrentDataToFile()[0];
  countURLs = saveCurrentDataToFile()[1];
  clearDataBases([db, dbUrl, dbUrlPrecheck]);
  writeLatestToTerminal();
  crawlerTest();

}
function crawlerTest() {
  let counter = 0;
  // const starter = new URL(startURL, startURL)

  // urls.push(starter)
  const c = new Crawler({
    maxConnections: 30,
    queueSize: 100,
    retries: 0,
    // rateLimit: 1000,
    // priorityRange: 5,

    callback: (error, res, done) => {
      if (error) {
      } else {
        const $ = res.$;
        const urls = [];
        if ($ && $('a').length >= 1 && res.headers['content-type'].split(';')[0] === "text/html") {

          $('a').each((i, a) => {
            if (a.attribs.href && a.attribs.href !== '#') {
              dbUrlPrecheck.get(a.attribs.href, function (err) {
                if (err) {
                  alreadyVisited = false;
                  dbUrlPrecheck.put(a.attribs.href, a.attribs.href);
                } else { alreadyVisited = true; }
              });
              if (alreadyVisited === false) {

                const matchedSites = a.attribs.href.match(new RegExp('(google)|(facebook)|(instagram)|(jpeg)|(png)|(js)|(php)|(pdf)|(back)|(zip)|(0&)|(javascript)|(mail)|(tel:)|(#carousel)'));
                if (matchedSites === null) {
                  const url = new URL(a.attribs.href, res.request.uri.href)
                  if (c.queueSize < 1000) {
                    urls.push(url.href);
                  }
                  setTimeout(() => {
                    if (i < 20) {
                      extractData($("body").text(), url.href);
                    }
                  }, 100);

                  counter++;

                } else {

                  let dataObj = {
                    dataPage: []
                  };
                  dataObj.dataPage.push({ text: $("body").text(), id: 0 });
                  saveToSDCard(false, dataObj);
                }
              }

            }


          })
        }

        c.queue(urls);
      }
      done();
    }
  });
  c.queue(startURL);


}

function extractData(mdata, href) {

  let countryCode = href.split('.').splice(-2);
  if (countryCode[1]) {
    countryCode[1] = countryCode[1].substring(-4);
    if (countryCode[1].includes('%')) {
      countryCode = countryCode[1].split('%')[0];
    } else {
      countryCode = countryCode[1].split('/')[0];
    }

    let transferData = true;
    for (let i = 0; i < blacklist.length; i++) {
      if (countryCode.includes(blacklist[i])) {
        transferData = false;
      }
    }
    if (transferData === true) {
      searchForNames(href, countryCode, mdata);
    } else {
    }


  }
}


function languageProcessing(doc, data, url, cc) {
  let person = doc.match('#Person #Noun');
  person = person.forEach(function (d, i) {

    let text = d.text();
    let textR = d.text('reduced');
    allURLS[i] += `url': `;
    allURLS[i] += "'" + url;

    const matchedNames = text.match(new RegExp('(=)|(})|({)|(ii)|(=)|(#)|(&)|(-)|(_)|(–)|(,)|(:)|(und)|(©)|(^[0-9])|(/.)'));//|(})|({)|(ii)|(=)|(#)|(.)|(<)|(>)|(&)|(_)|(–)|(span)
    if (matchedNames === null) {
      db.get(textR, function (err, key) {
        if (err) {
          fullCounter++;
          let obj = {
            person: []
          };
          if (text.includes("’s") || text.includes("'s")) {
            text = d.text().slice(0, -2);
          }
          currentDate = getCurrentDate();
          obj.person.push({ name: text, url: url, countrycode: cc, date: currentDate, language: currentLanguage, id: countUpID });
          writeToJsonFile(obj.person, 'names.json');
          saveToSDCard(true, obj.person);

          let urlObj = {
            url: []
          };
          countURLs++;
          if (data === latestData) {
            tempSaveNames[inCurrentDataset] = text;
            inCurrentDataset++;
            countNames++;
            // console.log("same url");
          } else {
            // console.log("new url")
            replaceAllNames(data, tempSaveNames, countUpID);
            inCurrentDataset = 0;
            tempSaveNames = [];
            countUpID++;
            countNames++;
          }
        //  writeLatestToTerminal(countNames, countURLs);
          latestData = data;
        } else {
        }
      })
      db.put(textR, textR);
    }
  })

  ready = true;
  doc.text()
}

// SEARCH FOR NAMES IN THE SAVED TEXT
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