// var Crawler = require("crawler");
// const Crawler = require('crawler');
import * as fs from 'fs';
import { Level } from 'level';
import Crawler from 'crawler';
import nlp from 'de-compromise'
var allNames = [];
var allURLS = [];
var fullData = [];
var fullCounter = 0;
const db = new Level('namesLevel', { valueEncoding: 'json' })
const dbUrl = new Level('urlsLevel', { valueEncoding: 'json' })

//const fs = require('fs');
// const Crawler = require('crawler');
// var fs = require("fs");


var completeData = [];
let obselete = []; // Array of what was crawled already
let c = new Crawler({
  maxConnections: 10,
  rateLimit: 10,
  // encoding: null,
  // jQuery: false,
});

init();


function init() {
  db.clear();
  crawlAllUrls('https://futuress.org/learning/coding-resistance/');//https://www.ait.ac.at/en/
}

function crawlAllUrls(url) {
  // console.log(`Crawling ${url}`);
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
                  dbUrl.get(url, function (err, key) {
                    if (err) {
                      console.log("new url " + url);
                      searchForNames(urls[item].attribs.href, data);
                    } else {
                      // console.log("revisited url: " + key);
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


function searchForNames(url, data) {

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
          writeToJsonFile(d.text('reduced'));
        }

      } else {
        // console.log("already there");
      }
    })

    db.put(d.text('reduced'), d.text('reduced'));
    dbUrl.put(url, url);
    fullData[i, 0] = allURLS[i];
    fullData[i, 1] = allNames[i];


  })
  doc.text()


  // setTimeout(() => {
  // console.log(allNames);
  // }, 1000);

}




///// **** HELPER


function writeToJsonFile(mData) {
  const file = fs.readFileSync('names.json');
  var json = JSON.parse(file.toString());
  json.push(mData);
  fs.writeFileSync("names.json", JSON.stringify(json))

}