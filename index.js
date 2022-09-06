import { writeToJsonFile, readJsonFile, checkCountryCode, clearDataBases, writeLatestToTerminal, getCurrentDate } from './functions.js';
import { Level } from 'level';
import Crawler from 'crawler';
import nlp from 'de-compromise'

var fullCounter = 0;
var allNames = [];
var allURLS = [];
let obselete = [];
var currentDate;
var fullCrawledData;

const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const blacklist = ["php", "html", "pdf", "%", "/", "jpeg", "back", "zip"];

const startURL = 'https://www.schoenbrunn.at/';//https://www.ait.ac.at/en/
let c = new Crawler({
  maxConnections: 2,
  rateLimit: 0,
  retries: 1,
  skipDuplicates: true,
});

init();

function init() {
  clearDataBases([db, dbUrl]); //reset local database that compares entries
  writeLatestToTerminal(); // write current set of names into terminal
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
                        for (let i=0; i<blacklist.length; i++) {
                          if (countryCode.includes(blacklist[i])) {
                            console.log(blacklist[i]);
                            transferData = false;
                          }
                        }
                        console.log(transferData);
                        if(transferData === true){
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

// SEARCH FOR NAMES IN THE SAVED TEXT
function searchForNames(url, cc, data) {
  console.log("searching for names     " + cc);
  let doc = nlp(data);
  let person = doc.match('#Person #Noun')
  person = person.forEach(function (d, i) {
    allURLS[i] += `url': `;
    allURLS[i] += "'" + url;
    db.get(d.text('reduced'), function (err, key) {
      if (err) {
        fullCounter++;
        let obj = {
          person: []
        };
        currentDate = getCurrentDate();
        obj.person.push({ name: d.text('reduced'), url: url, countrycode: cc, date: currentDate });
        writeToJsonFile(obj.person, 'names.json');
        // writeLatestToTerminal();
        writeToJsonFile(d.text('reduced'), 'namesAsString.json');
        let urlObj = {
          url: []
        };
        urlObj.url.push({ url: url, date: currentDate });
        writeToJsonFile(urlObj, 'fullOutputURLs.json');
        if (fullCrawledData.length >= 200000) {
          let dataObj = {
            dataPage: []
          };
          dataObj.dataPage.push({ text: data });
          writeToJsonFile(dataObj, 'fullOutput.json');
          fullCrawledData = '';
        }
      }
    })
    db.put(d.text('reduced'), d.text('reduced'));
    dbUrl.put(url, url);
  })
  doc.text()
}