import { writeToJsonFile, readJsonFile, checkCountryCode, clearDataBases,writeLatestToTerminal } from './functions.js';
import * as fs from 'fs';
import { Level } from 'level';
import Crawler from 'crawler';
import nlp from 'de-compromise'


var fullCounter = 0;
var allNames = [];
var allURLS = [];
var fullData = [];
let obselete = [];
var currentDate;
var fullCrawledData;
var completeData = [];


const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })
const cCConditions = ["php"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const startURL = 'https://www.schoenbrunn.at/';//https://www.ait.ac.at/en/
let c = new Crawler({
  maxConnections: 10,
  rateLimit: 10,
});

init();

function init() {
  clearDataBases([db, dbUrl]);
  writeLatestToTerminal();
  crawlAllUrls(startURL);
}




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
                // href.startsWith(url) ? crawlAllUrls(href) : crawlAllUrls(`${url}${href}`)
                let data = $("body").text();
                let pageTitle = JSON.stringify(`${url}`);
                completeData.push('[[' + pageTitle + '],[' + data + ']]');
                if (data) {


                  dbUrl.get(href, function (err, key) {
                    if (err) {
                      fullCrawledData += data;
                      let countryCode = href.split('.').splice(-2);
                      if (countryCode[1]) {
                        if (countryCode[1].includes('%')) {
                          countryCode = countryCode[1].split('%')[0];
                        } else {
                          countryCode = countryCode[1].split('/')[0];
                        }
                        searchForNames(href, countryCode.substring(-4), data);
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

function setTableCells() {
  const file = fs.readFileSync('names.json');
  var mydata = JSON.parse(file.toString());
  term.setCellContent(1, 1, mydata[mydata.length - 1][0].name);
}




// SEARCH FOR NAMES IN THE SAVED TEXT
function searchForNames(url, cc, data) {
  // console.log("...parse text...")
  let doc = nlp(data);
  let person = doc.match('#Person #Noun')
  person = person.forEach(function (d, i) {
    allURLS[i] += `url': `;
    allURLS[i] += "'" + url;
    db.get(d.text('reduced'), function (err, key) {
      if (err) {
        allNames[fullCounter] = `name': `;
        allNames[fullCounter] += "'" + d.text('reduced');
        fullCounter++;
        if (allNames[fullCounter] !== null) {
          let obj = {
            person: []
          };

          let dateObject = new Date();
          currentDate = (monthNames[dateObject.getMonth()] + ", " + dateObject.getDate()) + " " + dateObject.getFullYear() + " " + dateObject.getHours() + ":" + dateObject.getMinutes() + ":" + dateObject.getSeconds() + ", " + dateObject.getMilliseconds();
          obj.person.push({ name: d.text('reduced'), url: url, countrycode: cc, date: currentDate });
          writeToJsonFile(obj.person, 'names.json');
          console.log("write to file");
          writeLatestToTerminal();


          writeToJsonFile(d.text('reduced'), 'namesAsString.json');

          let urlObj = {
            url: []
          };
          urlObj.url.push({ url: url, date: currentDate });
          writeToJsonFile(urlObj, 'fullOutputURLs.json');


          console.log(fullCrawledData.length);
          if (fullCrawledData.length >= 200000) {
            let dataObj = {
              dataPage: []
            };
            dataObj.dataPage.push({ text: data });
            writeToJsonFile(dataObj, 'fullOutput.json');
            fullCrawledData = '';
          }

        }
      }
    })
    db.put(d.text('reduced'), d.text('reduced'));
    dbUrl.put(url, url);
    fullData[i, 0] = allURLS[i];
    fullData[i, 1] = allNames[i];
  })
  doc.text()
}







