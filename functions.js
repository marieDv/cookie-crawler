const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// ************************************************************************************************
// ***** RETURN COUNTER
// ************************************************************************************************
export async function retrieveCounter(mdb) {
  try {
    let value = await mdb.get("counter");
    return value;
  } catch (error) {
    console.log(error)
  }
}

// ************************************************************************************************
// ***** CHECK IF KEY IS ALREADY IN DATABASE & SAVE KEY VALUE PAIR
// ************************************************************************************************
export async function handleNewEntry(mdb, name) {
  try {
    let value = await mdb.get(name);
    await mdb.put(name, value += 1);//key value
    return true;
  } catch (err) {
    await mdb.put(name, 1);//key value
    return false;
  }
}
// ************************************************************************************************
// ***** CHECK IF KEY IS ALREADY IN DATABASE
// ************************************************************************************************
export async function checkDatabase(mdb, name) {
  try {
    await mdb.get(name);
    return true;
  } catch (err) {
    return false;
  }
}

// ************************************************************************************************
// ***** RETURN CURRENT DATE month, date year hours:minutes:seconds
// ************************************************************************************************
export async function getCurrentDate() {
  let dateObject = new Date();
  return (monthNames[dateObject.getMonth()] + ", " + dateObject.getDate()) + " " + dateObject.getFullYear() + " " + dateObject.getHours() + ":" + dateObject.getMinutes() + ":" + dateObject.getSeconds();// + ", " + dateObject.getMilliseconds();
}


// ************************************************************************************************
// ***** CLEAR LEVEL DATABASE
// ************************************************************************************************
export function clearDataBases(databases) {
  for (let i = 0; i < databases.length; i++) {
    databases[i].clear();
  }
}

// ************************************************************************************************
// ***** CHECK CURRENT CPU USE
// ************************************************************************************************
export function check_mem() {
  const mem = process.memoryUsage();
  return (mem.heapUsed / 1024 / 1024).toFixed(2);
}

// ************************************************************************************************
// ***** FORMATS DATES AND TIME
// ************************************************************************************************
export function returnWithZero(obj) {
  if (obj < 10) {
    return '0' + obj;
  } else {
    return obj;
  }
}
// ************************************************************************************************
// ***** HELPER FUNCTIONS
// ************************************************************************************************
export function roundToTwo(num) {
  return +(Math.round(num + "e+5") + "e-5");
}
export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
export function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
}