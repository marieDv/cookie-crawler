import * as fs from 'fs';
import pkg from 'terminal-kit';
import LanguageDetect from 'languagedetect';
import { open, close, fstat } from 'node:fs';
import { convert } from 'html-to-text';
import sizeof from 'object-sizeof';
import { Console } from 'console';

let lastValidLanguage = '';
let fullDataObj = { page: [] };
let fullNamesObj = { name: [] };

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
export function saveToSDCard(names, mData) {
  // let currentPath = ['./names-output/output/', './full-output/output/'];
  let currentPath = ["/media/process/NAMES/output/", "/media/process/FULL/output/"];
  let dateObject = new Date();
  let timestampDate = dateObject.getFullYear() + "_" + dateObject.getMonth() + 1 + "_" + dateObject.getDate() + "_" + dateObject.getHours() + "-" + dateObject.getMinutes() + "-" + dateObject.getSeconds();
  if (names === false) {
    fullDataObj.page.push({ text: mData });
    // console.log(`size full data object: ${sizeof(fullDataObj)}`)
    if (sizeof(fullDataObj) / (1024 * 1024) > 4) {
      let currentFileName = timestampDate + "_full.json";
      currentFileName = timestampDate + ".json"
      let tempPath = currentPath[1] + currentFileName;
      fs.writeFileSync(tempPath, JSON.stringify(fullDataObj, null, 2), function () { });//stringify(json, null, 2)
      fullDataObj = { page: [] }
    }
  } else {
    fullNamesObj.name.push({ mData });
    console.log(sizeof(fullNamesObj))
    if (sizeof(fullNamesObj) > 5000) {
      let currentFileName = timestampDate + "_names.json";
      let tempPath = currentPath[0] + currentFileName;
      fs.writeFileSync(tempPath, JSON.stringify(fullNamesObj, null, 2), function () { });
      fullNamesObj = { name: [] }
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

export function getCurrentDate() {
  let dateObject = new Date();
  return (monthNames[dateObject.getMonth()] + ", " + dateObject.getDate()) + " " + dateObject.getFullYear() + " " + dateObject.getHours() + ":" + dateObject.getMinutes() + ":" + dateObject.getSeconds() + ", " + dateObject.getMilliseconds();
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



export function deleteFileContent(mfile) {
  if (mfile) {
    fs.truncate(mfile, 0, function () { console.log('done') });
    // fs.writeFileSync(mfile, '[]');
  }
}





export function replaceAllNames(mdata, savedNames, save) {

  let replacedNames = '';
  if (safeOneDataset) {
    let dataStringWithoutNames = safeOneDataset.toString();
    for (let q = 0; q < savedNames.length; q++) {
      if (safeOneDataset.includes(savedNames[q])) {
        replacedNames += "" + savedNames[q] + ", ";
        dataStringWithoutNames = dataStringWithoutNames.replaceAll(savedNames[q], " [NAME] ");
      }
    }
    let dataObj = {
      dataPage: []
    };
    dataObj.dataPage.push({ text: dataStringWithoutNames });
    saveToSDCard(false, dataObj);
  }
  if (save !== 2) {
    safeOneDataset = mdata;
  }
}

export function readJsonFile() {
  const file = fs.readFileSync('names.json');
  var json = JSON.parse(file.toString());
  var mydata = JSON.parse(file.toString());
}


export function saveFullFile(data) {
  let dataObj = {
    dataPage: []
  };
  dataObj.dataPage.push({ text: data, id: 0 });
  saveToSDCard(false, dataObj);
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
  // console.log("written to terminal");
}

export function clearDataBases(databases) {
  for (let i = 0; i < databases.length; i++) {
    databases[i].clear();
  }
}

export function roundToTwo(num) {
  return +(Math.round(num + "e+5") + "e-5");
}


export async function getExistingNames(db, random) {
  const iterator = db.iterator()
  let counter = 0;
  let allNames = [];
  let returnValue;
  while (true) {
    const entries = await iterator.nextv(100)

    if (entries.length === 0) {
      break
    }

    for (const [key, value] of entries) {
      allNames[counter] = value;
      counter++;
    }
    returnValue = allNames[random];
  }

  await iterator.close()
  return returnValue;
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