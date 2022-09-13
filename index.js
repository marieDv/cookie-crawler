import { writeToJsonFile, deleteFileContent, saveCurrentDataToFile, readJsonFile, emptyFile, replaceAllNames, saveToSDCard, detectDataLanguage, checkBlacklist, checkCountryCode, clearDataBases, writeLatestToTerminal, getCurrentDate } from './functions.js';
import { Level } from 'level';
import Crawler from 'crawler';
import enNlp from 'compromise';
import deNlp from 'de-compromise';
import frNlp from 'fr-compromise';
import esNlp from 'es-compromise';
import itNlp from 'it-compromise';
import { convert } from 'html-to-text';
import { CheerioCrawler } from 'crawlee';




const base = "http://www.amazon.at";
const crawledPages = { [base]: true };
const ignoreSelector = `:not([href$=".png"]):not([href$=".jpg"]):not([href$=".mp4"]):not([href$=".mp3"]):not([href$=".gif"])`;


var currentLanguage;
var fullCounter = 0;
var allURLS = [];
let obselete = [];
var currentDate;
let dataStringWithoutNames = "";
let latestData = "";
let tempSaveNames = [];
let inCurrentDataset = 0;
let countUpID = 0;
let countNames = 0;
let countURLs = 0;
let testcount = 0;
const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const blacklist = ["php", "html", "pdf", "%", "/", "jpeg", "back", "zip"];
const blacklistNames = ["ii", "=", "'s", "}", '#', ".", "{", "<", ">", "&", " i ", ",", "–", ":"];

const startURL = 'https://wuerstelstandleo.at';//'https://xn--hftgold-n2a.wien/';//https://www.ait.ac.at/en/
// let c = new Crawler({
//   maxConnections: 30,
//   rateLimit: 0,
//   retries: 1,
//   skipDuplicates: true,
// });

init();



function init() {
  // saveToSDCard();
  // replaceAllNames();

  countNames = saveCurrentDataToFile()[0];
  countURLs = saveCurrentDataToFile()[1];
  clearDataBases([db, dbUrl]);
  writeLatestToTerminal();
  // crawlAllUrls(startURL);
  crawlerTest();

}
function crawlerTest() {
  const c = new Crawler({
    maxConnections: 2,
    skipDuplicates: true,
    rateLimit: 1000,
   
    callback: (error, res, done) => {
      if (error) {
        console.log(error);
      } else {
        const $ = res.$;
        // console.log(res.request.uri.href);
        const urls = [];
        $('a').each((i, a) => {
        // $(`a[href^="/"]${ignoreSelector},a[href^="${base}"]${ignoreSelector}`).each((i, a) => {

          if (a.attribs.href && a.attribs.href !== '#') {
            const url = new URL(a.attribs.href, res.request.uri.href)
            // extractData($("body").text(), url.href);
            // console.log(url.href);
            urls.push(url.href);
            testcount++;
            console.log(testcount)
          }
        });
        // console.log(' -> %i links', urls.length);
        // console.log(' -> %i queued', c.queueSize);
        // console.log(urls[urls.length - 1]);
        // extractData($("body").text(), url.href);
        c.queue(urls);

      }
      done();
    }
  });

  c.queue('http://www.amazon.at');
}

function extractData(mdata, href) {
  if (mdata) {
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
            // console.log("search for names " + testcount);

            // setTimeout(() => {
              // searchForNames(href, countryCode, mdata)
            // }, 100);

          }
        }
      } else {
        // console.log(href + " already exists")
      }
      dbUrl.put(href, href);
    });
  }
}



//crawl url's and call searchForNames
function crawlAllUrls(url) {
  c.queue({
    uri: url,
    callback: function (err, res, done) {

      if (err) { console.log(err.code); done(); return; }
      let $ = res.$;
      try {
        // console.log("TRY")
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
        // console.log(e)
        let sE = e.toString();
        // console.log(sE.includes("Invalid URI"));
        console.log("******");
        // console.log(err);
        console.error(`Encountered an error crawling ${url}. Aborting crawl.`);
        done()
      }
      done();
    }
  })
}



function languageProcessing(doc, data, url, cc) {
  // console.log("enter with  " + url);
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
          saveToSDCard(true, obj.person);


          writeToJsonFile(text, 'namesAsString.json');
          let urlObj = {
            url: []
          };
          urlObj.url.push({ url: url, date: currentDate });
          countURLs++;
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
          writeLatestToTerminal(countNames, countURLs);
          latestData = data;
        }
      })
      db.put(text, text);
      // dbUrl.put(url, url);
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
      console.log("german");
      // languageProcessing(deNlp(data), data, url, cc)
      break;
    case 'english':
      console.log("english");
      // languageProcessing(enNlp(data), data, url, cc);
      break;
    case 'french':
      console.log("french");
      // languageProcessing(frNlp(data), data, url, cc);
      break;
    case 'italian':
      console.log("italian");
      // languageProcessing(itNlp(data), data, url, cc);
      break;
    case 'spanish':
      console.log("spanish");
      // languageProcessing(esNlp(data), data, url, cc);
      break;
    case '':
      // languageProcessing(enNlp(data), data, url, cc);
      break;
  }
}