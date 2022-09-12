import { writeToJsonFile, deleteFileContent, saveCurrentDataToFile, readJsonFile, emptyFile, replaceAllNames, saveToSDCard, detectDataLanguage, checkBlacklist, checkCountryCode, clearDataBases, writeLatestToTerminal, getCurrentDate } from './functions.js';
import { Level } from 'level';
import Crawler from 'crawler';
import enNlp from 'compromise';
import deNlp from 'de-compromise';
import frNlp from 'fr-compromise';
import esNlp from 'es-compromise';
import itNlp from 'it-compromise';
import { convert } from 'html-to-text';


var currentLanguage;
var fullCounter = 0;
var allURLS = [];
let obselete = [];
var currentDate;
var fullCrawledData;
let dataStringWithoutNames = "";
let latestData = "";
let tempSaveNames = [];
let inCurrentDataset = 0;
let countUpID = 0;
let countNames = 0;


const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const blacklist = ["php", "html", "pdf", "%", "/", "jpeg", "back", "zip"];
const blacklistNames = ["ii", "=", "'s", "}", '#', ".", "{", "<", ">", "&", " i ", ",", "–", ":"];

const startURL = 'https://xn--hftgold-n2a.wien/';//https://www.ait.ac.at/en/
let c = new Crawler({
  maxConnections: 2,
  rateLimit: 0,
  retries: 1,
  skipDuplicates: true,
});

init();

function init() {
  // saveToSDCard();
  // replaceAllNames();
  
  countNames = saveCurrentDataToFile();
  clearDataBases([db, dbUrl]); //reset local database that compares entries
  // writeLatestToTerminal(); // write current set of names into terminal
  crawlAllUrls(startURL);
}

//crawl url's and call searchForNames
function crawlAllUrls(url) {
  c.queue({
    uri: url,
    callback: function (err, res, done) {
      if (err) throw err;
      let $ = res.$;
      try {
        let urls = $("a");
        Object.keys(urls).forEach((item) => {
          if (urls[item].type === 'tag') {
            let href = urls[item].attribs.href;
            if (href && !obselete.includes(href)) {
              href = href.trim();
              obselete.push(href);
              setTimeout(function () {
                href.startsWith('http') ? crawlAllUrls(href) : crawlAllUrls(`${url}${href}`)
                let data = $("body").text();
                if (data) {
                  dbUrl.get(href, function (err) {
                    if (err) {
                      fullCrawledData += data;
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
                          searchForNames(href, countryCode, data)
                        }
                      }
                    }
                  })
                }
              }, 1000)
            }
          }
        });
      } catch (e) {
        console.error(`Encountered an error crawling ${url}. Aborting crawl.`);
        done()
      }
      done();
    }
  })
}



function languageProcessing(doc, data, url, cc) {


  console.log("enter with  " + url);
  let person = doc.match('#Person #Noun')
  person = person.forEach(function (d, i) {
    let text = d.text();
    allURLS[i] += `url': `;
    allURLS[i] += "'" + url;

    if (checkBlacklist(blacklistNames, text) === false) {
      db.get(text, function (err, key) {
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
          writeToJsonFile(obj.person, 'names.json');

          // saveToSDCard(d.text('reduced'));

          writeToJsonFile(text, 'namesAsString.json');
          let urlObj = {
            url: []
          };
          urlObj.url.push({ url: url, date: currentDate });
          writeToJsonFile(urlObj, 'fullOutputURLs.json');

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
          writeLatestToTerminal(countNames);
          fullCrawledData = '';
          latestData = data;
        }
      })
      db.put(text, text);
      dbUrl.put(url, url);
    }
  })
  doc.text()
}




// SEARCH FOR NAMES IN THE SAVED TEXT
function searchForNames(url, cc, data) {
  currentLanguage = detectDataLanguage(data);
  let convertedData = convert(data, {
    wordwrap: 130
  });
  switch (detectDataLanguage(data)) {
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