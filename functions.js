import * as fs from 'fs';
import pkg from 'terminal-kit';
import LanguageDetect from 'languagedetect';
import { open, close, fstat } from 'node:fs';
import { convert } from 'html-to-text';
import sizeof from 'object-sizeof';
import { Console } from 'console';
import { checkSizeBeforeSendingData } from './index.js';

let lastValidLanguage = '';
let fullDataObj = [];
let fullNamesObj = [];

const { terminal, TextTable } = pkg;
const term = pkg.terminal;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
let cardFilled = 0;
let currentLanguage;
const lngDetector = new LanguageDetect();
let safeOneDataset;
let numberSDcards = 1;
let totalURLs = 0;

export function saveCurrentDataToFile() {
  let data = {
    keydata: []
  };

  numberSDcards = 1;
  // let totalNumberNames = getabsoluteNumberNames;
  data.keydata.push({ totalNames: Object.keys(totalNumberNames).length, totalURLs: Object.keys(totalNumberURLs).length, numberSDcards: 1, });
  fs.writeFileSync('./globalVariables.json', JSON.stringify(data));
  return [Object.keys(totalNumberNames).length, totalURLs];
}
export function rand(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}
export function returnWithZero(obj) {
  if (obj < 10) {
    return '0' + obj;
  } else {
    return obj;
  }
}
export async function saveLastNames(url, lastProcessedNames, countLastProcessedNames) {
  let mData = {
    queued: []
  };
  mData.queued.push({ lastProcessedNames });
  await fs.writeFileSync('./latest_names.json', JSON.stringify(mData));
  countLastProcessedNames = 0
}
export async function returnMostUsed(mdb) {
  let sortedArray = [];
  let entries = [];
  let returnArray = [];
  try {
    for await (const [key, value] of mdb.iterator()) {
      entries.push({ key: key, value: value });
    }
    sortedArray = entries.sort(function (a, b) {
      return b.value - a.value;
    });
    for (let i = 0; i < 10; i++) {
      if (sortedArray[i]) {
        returnArray[i] = sortedArray[i];
      }
    }
  } catch (error) {
    console.log("problem with name database" + error)
  }
  console.log(sortedArray.length)
  return returnArray;
}

export async function findMostUsed(mdb) {
  let sortedArray = [];
  let entries = [];
  let returnArray = [];
  try {
    for await (const [key, value] of mdb.iterator()) {
      entries.push({ key: key, value: value });
    }
    sortedArray = entries.sort(function (a, b) {
      return b.value - a.value;
    });
    for (let i = 0; i < 20; i++) {
      if (sortedArray[i]) {
        returnArray[i] = sortedArray[i];
      }
    }
  } catch (error) {
    console.log("problem with name database" + error)
  }
  return returnArray;

}

export async function getURLId(mdb, MUrl) {
  let entries = [];
  let count = 0;
  for await (const [key, value] of mdb.iterator()) {
    if (MUrl === key) {
      return count;
    } else {
      count++;
    }
  }
  return 0;
  // return entries.length;

}
export async function getabsoluteNumberNames(mdb) {
  let entries = [];
  for await (const [key, value] of mdb.iterator()) {
    entries.push({ key: key });
  }
  return entries.length;
}

export async function checkDatabase(mdb, name) {
  try {
    let value = await mdb.get(name);
    // await mdb.put(name, value += 1);//key value
    return true;
  } catch (err) {
    // await mdb.put(name, 1);//key value
    return false;
  }
}
export async function retrieveCounter(mdb) {
  try {
    let value = await mdb.get("counter");
    return value;
  } catch (error) {
    console.log(error)
  }
}
export async function saveCounter(mdb) {
  try {
    let value = await mdb.get("counter");
    await mdb.put("counter", value += 1);//key value
    return true;
  } catch (err) {
    await mdb.put("counter", 1);//key value
    return false;
  }
}
export async function checkNamesDatabase(mdb, name) {
  try {
    let value = await mdb.get(name);
    await mdb.put(name, value += 1);//key value
    return true;
  } catch (err) {
    await mdb.put(name, 1);//key value
    return false;
  }
}

export async function saveToSDCard(names, mData) {
  let currentPath = ['./names-output/output/', './full-output/output/'];
  // let currentPath = ["/media/process/NAMES/", "/media/process/ALL/"];
  // console.log(`save data ${sizeof(fullDataObj) / (1024 * 1024)}`);
  let dateObject = new Date();
  let timestampDate = dateObject.getFullYear() + "_" + (dateObject.getMonth() + 1) + "_" + dateObject.getDate() + "_" + dateObject.getHours() + "-" + dateObject.getMinutes() + "-" + dateObject.getSeconds();
  if (names === false) {
    let page = mData;
    fullDataObj.push({ page });
    if (sizeof(fullDataObj) / (1024 * 1024) > 5) {//sizeof(fullDataObj) / (1024 * 1024) > 10
      if (await checkSizeBeforeSendingData(1) === true) {
        let currentFileName = timestampDate + "_full.json";
        currentFileName = timestampDate + ".json"
        let tempPath = currentPath[1] + currentFileName;
        await fs.writeFileSync(tempPath, JSON.stringify(fullDataObj, null, 2), function () { });//stringify(json, null, 2)
      }
      fullDataObj = [];
    }
  } else {
    let person = mData;
    fullNamesObj.push({ person });

    if (sizeof(fullNamesObj) > 6000) {//5000+
      if (await checkSizeBeforeSendingData(0) === true) {
        let currentFileName = timestampDate + "_names.json";
        let tempPath = currentPath[0] + currentFileName;
        await fs.writeFileSync(tempPath, JSON.stringify(fullNamesObj, null, 2), function () { });
      }
      fullNamesObj = [];
    }
  }

  /***** READ OUT SIZE OF SD CARD ***/
}


function closeFd(fd) {
  close(fd, (err) => {
    if (err) throw err;
  });
}

export function detectDataLanguage(data) {
  currentLanguage = lngDetector.detect(data, 1)[0] ? lngDetector.detect(data, 1)[0][0] : '';
  if (currentLanguage !== '') {
    lastValidLanguage = currentLanguage;
  }
  return currentLanguage !== '' ? currentLanguage : lastValidLanguage;
}

export async function getCurrentDate() {
  let dateObject = new Date();
  return (monthNames[dateObject.getMonth()] + ", " + dateObject.getDate()) + " " + dateObject.getFullYear() + " " + dateObject.getHours() + ":" + dateObject.getMinutes() + ":" + dateObject.getSeconds();// + ", " + dateObject.getMilliseconds();
}

export function checkCountryCode(countryCode) {
  if (countryCode[1]) {
    if (countryCode[1].includes('%')) {
      countryCode = countryCode[1].split('%')[0];
    } else {
      countryCode = countryCode[1].split('/')[0];
    }
    return true;
  }
}





export async function replaceAllNames(mdata, savedNames, id, url, date, repeatedNames) {
  let replacedNames = '';
  let dataStringWithoutNames = mdata.toString();
  let toReplaceArray = savedNames.concat(repeatedNames);
  for (let q = 0; q < toReplaceArray.length; q++) {
    if (dataStringWithoutNames.includes(toReplaceArray[q])) {
      replacedNames += "" + toReplaceArray[q] + ", ";
      dataStringWithoutNames = await dataStringWithoutNames.replaceAll(toReplaceArray[q], " [NAME] ");
    }
  }
  let dataObj = {
    url: url,
    urlId: id,
    date: date,
    newNames: savedNames,
    oldNames: repeatedNames,
    html: dataStringWithoutNames,
  };
  await saveToSDCard(false, dataObj);
}

export function readJsonFile() {
  const file = fs.readFileSync('names.json');
  var json = JSON.parse(file.toString());
  var mydata = JSON.parse(file.toString());
}


export async function saveFullFile(data) {
  let dataObj = {
    dataPage: []
  };
  dataObj.dataPage.push({ text: data, id: 0 });
  await saveToSDCard(false, dataObj);
}









export function writeLatestToTerminal(id, urls) {
  const file = fs.readFileSync('names.json');
  var mydata = JSON.parse(file.toString());
  term.fullscreen(true);
  term.table([
    ['name', 'countrycode', 'date', 'language'],
    [mydata[mydata.length - 1] ? mydata[mydata.length - 1][0].name : '', mydata[mydata.length - 1] ? mydata[mydata.length - 1][0].countrycode : '', mydata[mydata.length - 1] ? mydata[mydata.length - 1][0].date : '', mydata[mydata.length - 1] ? mydata[mydata.length - 1][0].language : ''],// mydata[mydata.length - 5][0].countrycode, mydata[mydata.length - 9][0].date],
    [mydata[mydata.length - 2] ? mydata[mydata.length - 2][0].name : '', mydata[mydata.length - 2] ? mydata[mydata.length - 2][0].countrycode : '', mydata[mydata.length - 2] ? mydata[mydata.length - 2][0].date : '', mydata[mydata.length - 2] ? mydata[mydata.length - 2][0].language : ''],// mydata[mydata.length - 5][0].countrycode, mydata[mydata.length - 9][0].date],
    [mydata[mydata.length - 3] ? mydata[mydata.length - 3][0].name : '', mydata[mydata.length - 3] ? mydata[mydata.length - 3][0].countrycode : '', mydata[mydata.length - 3] ? mydata[mydata.length - 3][0].date : '', mydata[mydata.length - 3] ? mydata[mydata.length - 3][0].language : ''],// mydata[mydata.length - 5][0].countrycode, mydata[mydata.length - 9][0].date],
    [mydata[mydata.length - 4] ? mydata[mydata.length - 4][0].name : '', mydata[mydata.length - 4] ? mydata[mydata.length - 4][0].countrycode : '', mydata[mydata.length - 4] ? mydata[mydata.length - 4][0].date : '', mydata[mydata.length - 4] ? mydata[mydata.length - 4][0].language : ''],// mydata[mydata.length - 5][0].countrycode, mydata[mydata.length - 9][0].date]
    [mydata[mydata.length - 5] ? mydata[mydata.length - 5][0].name : '', mydata[mydata.length - 5] ? mydata[mydata.length - 5][0].countrycode : '', mydata[mydata.length - 5] ? mydata[mydata.length - 5][0].date : '', mydata[mydata.length - 5] ? mydata[mydata.length - 5][0].language : ''],
    [mydata[mydata.length - 6] ? mydata[mydata.length - 6][0].name : '', mydata[mydata.length - 6] ? mydata[mydata.length - 6][0].countrycode : '', mydata[mydata.length - 6] ? mydata[mydata.length - 6][0].date : '', mydata[mydata.length - 6] ? mydata[mydata.length - 6][0].language : ''],
    [mydata[mydata.length - 7] ? mydata[mydata.length - 7][0].name : '', mydata[mydata.length - 7] ? mydata[mydata.length - 7][0].countrycode : '', mydata[mydata.length - 7] ? mydata[mydata.length - 7][0].date : '', mydata[mydata.length - 7] ? mydata[mydata.length - 7][0].language : ''],
    [mydata[mydata.length - 8] ? mydata[mydata.length - 8][0].name : '', mydata[mydata.length - 8] ? mydata[mydata.length - 8][0].countrycode : '', mydata[mydata.length - 8] ? mydata[mydata.length - 8][0].date : '', mydata[mydata.length - 8] ? mydata[mydata.length - 8][0].language : ''],
    [mydata[mydata.length - 9] ? mydata[mydata.length - 9][0].name : '', mydata[mydata.length - 9] ? mydata[mydata.length - 9][0].countrycode : '', mydata[mydata.length - 9] ? mydata[mydata.length - 9][0].date : '', mydata[mydata.length - 9] ? mydata[mydata.length - 9][0].language : ''],
    [mydata[mydata.length - 10] ? mydata[mydata.length - 10][0].name : '', mydata[mydata.length - 10] ? mydata[mydata.length - 10][0].countrycode : '', mydata[mydata.length - 10] ? mydata[mydata.length - 10][0].date : '', mydata[mydata.length - 10] ? mydata[mydata.length - 10][0].language : ''],
    [mydata[mydata.length - 11] ? mydata[mydata.length - 11][0].name : '', mydata[mydata.length - 11] ? mydata[mydata.length - 11][0].countrycode : '', mydata[mydata.length - 11] ? mydata[mydata.length - 11][0].date : '', mydata[mydata.length - 11] ? mydata[mydata.length - 11][0].language : ''],
    [],
    [cardFilled + "Mb", "Number of names: " + id, "Number of visited URLs: " + urls, "current SD Card: " + numberSDcards]
  ], {
    hasBorder: true,
    contentHasMarkup: true,
    borderAttr: { color: 'white' },
    textAttr: { bgColor: 'default' },
    firstRowTextAttr: { bgColor: 'yellow' },
    width: 130,
    lastCellTextAttr: { bgColor: 'blue' },


  }
  );
}

export function clearDataBases(databases) {
  for (let i = 0; i < databases.length; i++) {
    databases[i].clear();
  }
}

export function roundToTwo(num) {
  return +(Math.round(num + "e+5") + "e-5");
}


export async function getExistingNames(mdb, random, length) {
  let entries = [];
  for await (const [key, value] of mdb.iterator()) {
    entries.push({ key: key, value: value });
  }
  return entries[random].key;
}
export function check_mem() {
  const mem = process.memoryUsage();
  return (mem.heapUsed / 1024 / 1024).toFixed(2);
}

export function retrieveNames() {
  let totalNumberNames = JSON.parse(fs.readFileSync("./latest_names.json").toString());
  return totalNumberNames.queued[0].lastProcessedNames;
}


export function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}