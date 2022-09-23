import { CheerioCrawler, ProxyConfiguration, RequestQueue, Dataset } from 'crawlee';
import { detectDataLanguage, saveToSDCard, clearDataBases, getCurrentDate, replaceAllNames } from './functions.js';
import { Level } from 'level';
import * as fs from 'fs';
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
let lastProcessedURLs = [];
let countLastProcessedURLs = 0;
let i = 0;
// let startingURLs = ['https://cn.chinadaily.com.cn/', 'https://crawlee.dev/api/core/function/enqueueLinks', 'https://www.lemonde.fr/', 'https://elpais.com/america/?ed=ame']
let startingURLs = ['https://www.chinadaily.com.cn/', 'https://www.globaltimes.cn/', 'https://www.cgtn.com/', 'https://www.scmp.com/'];

// clearDataBases([db]);
let savedToQueue = startingURLs;
savedToQueue = savedToQueue.concat(startingURLs);
// console.log(savedToQueue);
if (savedToQueue.length > 5) {
    const crawler = new CheerioCrawler({
        // maxRequestsPerCrawl: 20,
        async requestHandler({ $, request, enqueueLinks }) {
            extractData($("body").text(), new URL(request.loadedUrl));
            const queue = await RequestQueue.open();
            if (i <= 100) {
                let newUrl = new URL(request.loadedUrl);
                // console.log(lastProcessedURLs.includes(newUrl.origin))
                if (newUrl && newUrl.origin && lastProcessedURLs.includes(newUrl.origin) === false && !(newUrl.origin === null)) {
                    // console.log(newUrl)
                    newUrl.origin !== null ? lastProcessedURLs[i] = newUrl.origin : '';
                    i++
                }

            } else {
                i = 0;
            }
            countLastProcessedURLs === 200 ? saveLastSession() : countLastProcessedURLs++;

            await enqueueLinks({
                // urls: queue,
                strategy: 'all'
            });
        },
    });
    await crawler.run(savedToQueue);//, 'https://crawlee.dev/api/core/function/enqueueLinks', 'https://www.lemonde.fr/', 'https://elpais.com/america/?ed=ame',
}

function retrieveURLs() {
    let totalNumberURLs = JSON.parse(fs.readFileSync("./recoverLastSession.json").toString());
    return totalNumberURLs.queued[0].lastProcessedURLs;
}
function saveLastSession() {
    // writeToJsonFile(countLastProcessedURLs, 'recoverLastSession.json');
    let mData = {
        queued: []
    };

    mData.queued.push({ lastProcessedURLs });
    fs.writeFileSync('./recoverLastSession.json', JSON.stringify(mData));
    countLastProcessedURLs = 0
}




// 
function saveSession() {

}


function extractData(mdata, href) {


    let countryCode = href.host.split('.').splice(-2);
    if (countryCode[1]) {
        searchForNames(href.href, countryCode[1], mdata);
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
        let text = d.text('normal');
        let textR = d.text('reduced');
        const matchedNames = text.match(new RegExp('(\s+\S\s)|(=)|(})|({)|(ii)|(=)|(#)|(&)|(・)|(\\+)|(-)|(@)|(_)|(–)|(,)|(:)|(und)|(©)|(\\))|(\\()|(%)|(&)|(>)|(\\/)|(\\d)|(\\s{2,20})|($\s\S)|(\\b[a-z]{1,2}\\b\\s*)|(\\b[a-z]{20,90}\\b\\s*)|(\\\.)'));//(\/)|(\\)|

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
        } else {
            console.log(matchedNames)
        }
    })
    doc.text()
}