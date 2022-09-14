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

const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const blacklist = ["php", "html", "pdf", "%", "/", "jpeg", "back", "zip", "0&"];

const blacklistNames = ["ii", "=", "'s", "}", '#', ".", "{", "<", ">", "&", " i ", ",", "–", ":", "+", "|", "“", "span", ")", "(", "\t", "  "];


init();



function init() {
  countNames = saveCurrentDataToFile()[0];
  countURLs = saveCurrentDataToFile()[1];
  clearDataBases([db, dbUrl]);
  writeLatestToTerminal();
  crawlerTest();

}
function crawlerTest() {
  let counter = 0;

  const c = new Crawler({
    maxConnections: 2,
    // rateLimit: 1000,
    priorityRange: 5,
    // timeout: 1500,
    // rateLimit: 1000,
    callback: (error, res, done) => {
      if (error) {
        // console.log(error);
      } else {
        const $ = res.$;
        const urls = [];
        if (ready === true) {
          
          $('a').each((i, a) => {
            if (a.attribs.href && a.attribs.href !== '#' && i <= 50) {
              const matchedSites = a.attribs.href.match(new RegExp('(jpeg)|(png)|(php)|(pdf)|(back)|(zip)|(0&)|(javascript)|(mail)|(tel:)|(#carousel)'));
              if (matchedSites === null) {
                const url = new URL(a.attribs.href, res.request.uri.href)
                urls.push(url.href);
                setTimeout(() => {
                  ready = false;
                  if ($("body").text()) {
                    extractData($("body").text(), url.href);
                  }
                }, 100);
                counter++;
              }
            }
          })
        } else { console.log("waiting to retrieve data") };
        c.queue(urls);
      }
      done();
    }
  });

  c.queue(startURL);
}

function extractData(mdata, href) {

  // if (mdata) {
  dbUrl.get(href, function (err) {
    if (err) {
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
          // console.log("ready to transfer data");
          console.log("found data - wait");
          searchForNames(href, countryCode, mdata);

        } else {
          console.log("search more")
          ready = true;
        }


      }

    } else {
      ready = true;
      console.log("url already visited");
      console.log(href);
      console.log("*********")
      // console.log(href + " already exists");
    }
  });
  dbUrl.put(href, href);
  // }

}


function languageProcessing(doc, data, url, cc) {
  let person = doc.match('#Person #Noun')
  person = person.forEach(function (d, i) {
    let text = d.text();
    let textR = d.text('reduced');
    allURLS[i] += `url': `;
    allURLS[i] += "'" + url;

    const matchedNames = text.match(new RegExp('(=)|(})|({)|(ii)|(=)|(#)|(&)|(-)|(_)|(–)|(,)|(:)|(und)|(©)'));//|(})|({)|(ii)|(=)|(#)|(.)|(<)|(>)|(&)|(_)|(–)|(span)
    if (matchedNames === null) {
      db.get(textR, function (err, key) {
        // console.log("found a new name");
        if (err) {
          fullCounter++;
          let obj = {
            person: []
          };
          if (text.includes("’s")) {
            text = d.text().slice(0, -2);
          }

          currentDate = getCurrentDate();
          obj.person.push({ name: text, url: url, countrycode: cc, date: currentDate, language: currentLanguage, id: countUpID });
          // writeToJsonFile(obj.person, 'names.json');
          saveToSDCard(true, obj.person);


          // writeToJsonFile(text, 'namesAsString.json');
          let urlObj = {
            url: []
          };
          // urlObj.url.push({ url: url, date: currentDate });
          countURLs++;
          // writeToJsonFile(urlObj, 'fullOutputURLs.json');

          if (data === latestData) {
            tempSaveNames[inCurrentDataset] = text;
            inCurrentDataset++;
            countNames++;
          } else {

            replaceAllNames(data, tempSaveNames, countUpID);
            inCurrentDataset = 0;
            tempSaveNames = [];
            countUpID++;
            countNames++;
          }
          writeLatestToTerminal(countNames, countURLs);
          latestData = data;
        } else {
        }
      })
      db.put(textR, textR);
    }
  })
  doc.text()
}

// SEARCH FOR NAMES IN THE SAVED TEXT
function searchForNames(url, cc, data) {
  currentLanguage = detectDataLanguage(data.substring(500, 5000));
  console.log("searching for names " + currentLanguage);
  ready = true;
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
      // languageProcessing(enNlp(data), data, url, cc);
      break;
  }
}