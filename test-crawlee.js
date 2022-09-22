import { CheerioCrawler, ProxyConfiguration } from 'crawlee';
import { detectDataLanguage, saveToSDCard, clearDataBases, getCurrentDate, replaceAllNames } from './functions.js';
import { Level } from 'level';
import enNlp from 'compromise';
import deNlp from 'de-compromise';
import esNlp from 'es-compromise';
import frNlp from 'fr-compromise';
import itNlp from 'it-compromise';

 
let tempSaveNames = [];
const db = new Level('namesLevel', { valueEncoding: 'json' })
var currentDate;
let currentLanguage = "";
let latestData = "";
let inCurrentDataset = 0;

clearDataBases([db]);
const crawler = new CheerioCrawler({
    // maxRequestsPerCrawl: 20,
    async requestHandler({ $, request, enqueueLinks }) {
        const title = $('title').text();
        extractData($("body").text(), request.loadedUrl);
        await enqueueLinks({
            strategy: 'all',
        });
    },
});

await crawler.run(['https://altkatholische-heilandskirche-wien.at/']);




function extractData(mdata, href) {
    let countryCode = href.split('.').splice(-2);
    if (countryCode[1]) {
        countryCode[1] = countryCode[1].substring(-4);
        if (countryCode[1].includes('%')) {
            countryCode = countryCode[1].split('%')[0];
        } else {
            countryCode = countryCode[1].split('/')[0];
        }
        searchForNames(href, countryCode, mdata);
    }
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

function languageProcessing(doc, data, url, cc) {
    let person = doc.match('#Person #Noun');
    person = person.forEach(function (d, i) {

        let text = d.text();
        let textR = d.text('reduced');


        const matchedNames = text.match(new RegExp('(=)|(})|({)|(ii)|(=)|(#)|(&)|(-)|(_)|(–)|(,)|(:)|(und)|(©)|(\\))|(\\()|(%)|(&)|(>)|(^[0-9])'));
        if (matchedNames === null) {
            db.get(textR, function (err) {
                if (err) {
                    let obj = {
                        person: []
                    };
                    if (text.includes("’s") || text.includes("'s")) {
                        text = d.text().slice(0, -2);
                    }
                    currentDate = getCurrentDate();
                    obj.person.push({ name: text, url: url, countrycode: cc, date: currentDate, language: currentLanguage, id: 0 });
                    // writeToJsonFile(obj.person, 'names.json');
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
        }
    })
    doc.text()
}