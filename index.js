// var Crawler = require("crawler");
// const Crawler = require('crawler');
import * as fs from 'fs';

import Crawler from 'crawler';
import nlp from 'de-compromise'
var allNames = [];
var allURLS = [];
var fullData = [];
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
crawlAllUrls('https://www.schoenbrunn.at/');//https://www.ait.ac.at/en/


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
                // console.log($("p").text());
                // let data = JSON.stringify($("body").text());
                let data = $("body").text();
                // console.log($("body").text());
                let pageTitle = JSON.stringify(`${url}`);
                // console.log(urls[item].attribs.href);
                completeData.push('[[' + pageTitle + '],[' + data + ']]');
                searchForNames(urls[item].attribs.href, data);
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
  let number = doc.match('#Person #Noun').out('array');
  console.log(number);
  let person = doc.match('#Person #Noun').out('array')
  person = person.forEach(function (d, i) {
    // console.log(d.text('reduced'));
    allURLS[i] += `url': `;
    allURLS[i] += "'" + url;

    allNames[i] += `name': `;
    allNames[i] += "'" + d.text('reduced');
    fullData[i, 0] = allURLS[i];
    fullData[i, 1] = allNames[i];
    // allNames[i] = `'name': '`+d.text('reduced')+`'`;

  })
  doc.text()
  // console.log(allNames);
  // console.log(JSON.stringify(allNames));

  setTimeout(() => {
    const file = fs.readFileSync('names.json');
    // fs.writeFileSync('names.json', JSON.stringify(allNames));
    var json = JSON.parse(file.toString());
    // json.push(allURLS);
    json.push(fullData);
    fs.writeFileSync("names.json", JSON.stringify(json))
  }, 1000);

}