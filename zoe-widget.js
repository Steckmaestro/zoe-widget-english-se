// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: car;

// add your my-renault account data:
let myRenaultUser = "user"; // email
let myRenaultPass = "pass"; // password

// set your ZOE Model (Phase 1 or 2) // bitte eingeben!
let ZOE_Phase = "2"; // "1" or "2"

// should we use apple-maps or google maps?
let mapProvider = "apple"; // "apple" or "google"

// optional:
// enter your VIN / FIN if you have more than 1 vehicle in your account
// or if you get any login-errors
// leave it blank to auto-select it
let VIN = ""; // starts with VF1... enter like this: "VF1XXXXXXXXX"

// do not edit
let kamareonURL = "https://api-wired-prod-1-euw1.wrd-aws.com";
let kamareonAPI = "oF09WnKqvBDcrQzcW1rJNpjIuy7KdGaB";
let gigyaURL = "https://accounts.eu1.gigya.com";
let gigyaAPI = "3_7PLksOyBRkHv126x5WhHb-5pqC1qFR8pQjxSeLB6nhAnPERTUlwnYoznHSxwX668"; // austria: "3__B4KghyeUb0GlpU62ZXKrjSfb7CPzwBS368wioftJUL5qXE0Z_sSy0rX69klXuHy"

const timenow = new Date().toJSON().slice(0, 13).replace(/-/g, "").replace(/T/g, "-"); //20201028-14 (14 = hour)

// clear everything from keychain if we are on an other day
if (Keychain.contains("lastJWTCall") && Keychain.get("lastJWTCall") != timenow) {
  clearKeychain();
  console.log("Keychain cleared");
}

// clear keychain, if script gets called with action parameters (to get new tokens)
if (args.queryParameters.action != "") {
  clearKeychain();
  console.log("Keychain cleared cause of action parameters");
}

function clearKeychain() {
  if (Keychain.contains("VIN")) {
    Keychain.remove("VIN");
  }
  //if(Keychain.contains('carPicture')) { Keychain.remove('carPicture') } // enable if picture is wrong
  if (Keychain.contains("account_id")) {
    Keychain.remove("account_id");
  }
  if (Keychain.contains("gigyaJWTToken")) {
    Keychain.remove("gigyaJWTToken");
  }
  if (Keychain.contains("gigyaCookieValue")) {
    Keychain.remove("gigyaCookieValue");
  }
  if (Keychain.contains("gigyaPersonID")) {
    Keychain.remove("gigyaPersonID");
  }
  if (Keychain.contains("gigyaGigyaDataCenter")) {
    Keychain.remove("gigyaGigyaDataCenter");
  }
}

if (VIN && VIN != "") {
  Keychain.set("VIN", VIN);
}

const widget = new ListWidget();
await createWidget();

// used for debugging if script runs inside the app
if (!config.runsInWidget) {
  await widget.presentMedium();
}
Script.setWidget(widget);
Script.complete();

// build the widget
async function createWidget(items) {
  // get all data in a single variable
  const data = await getData();

  //widget.refreshAfterDate = new Date(Date.now() + 300) // dont know if this works
  widget.setPadding(10, 0, 10, 20);

  const wrap = widget.addStack();
  wrap.layoutHorizontally();
  wrap.topAlignContent();
  wrap.spacing = 15;

  const column0 = wrap.addStack();
  column0.layoutVertically();

  if (data.carPicture) {
    const icon = await getImage("my-renault-car.png", data.carPicture);
    let CarStack = column0.addStack();
    let iconImg = CarStack.addImage(icon);

    // simple hack if we have a phase 1 model (no location data & no hvac-status available) – resize car-image
    // not the smartest solution - but i try to check if the results show only 1 column.
    // if column2 is empty, we have to resizes the car-image for better styling
    if (typeof data.locationStatus == "undefined" && typeof data.hvacStatus == "undefined") {
      iconImg.imageSize = new Size(130, 73);
    }
  }

  column0.addSpacer(8);

  if (typeof data.batteryStatus != "undefined") {
    let plugIcon;
    let plugStateLabel;

    const PlugWrap = column0.addStack();
    PlugWrap.layoutHorizontally();
    //PlugWrap.setPadding(0,15,0,15)

    if (data.batteryStatus.attributes.plugStatus == 0) {
      plugIcon = await getImage("zoe-plug-off.png", "");
      plugStateLabel = "⚫ Disconnected";
    } else {
      plugIcon = await getImage("zoe-plug-on.png", "");
      plugStateLabel = "🟢 Connected";
    }
    if (data.batteryStatus.attributes.chargingStatus == "1.0") {
      plugStateLabel = "⚡ Is being charged …";
    }
    if (data.batteryStatus.attributes.plugStatus == 1 && data.batteryStatus.attributes.chargingStatus == "0") {
      plugStateLabel = "➤ Start charging";
      plugStateLabel.url = `scriptable:///run?scriptName=${scriptName}&action=start_charge`;
    }

    const PlugText = PlugWrap.addStack();
    PlugText.setPadding(0, 10, 0, 0);
    PlugText.layoutVertically();
    plugStateLabel = PlugText.addText(plugStateLabel);
    plugStateLabel.font = Font.regularSystemFont(10);
    PlugText.addSpacer(6);

    if (data.batteryStatus.attributes.chargingStatus == "1.0") {
      let chargingInstantaneousPower = data.batteryStatus.attributes.chargingInstantaneousPower;
      chargingInstantaneousPower = Math.round(chargingInstantaneousPower);

      // check if the numbers are in Watt or kW
      if (chargingInstantaneousPower > 150) {
        // if over 200, we believe the value is in watt :-)
        chargingInstantaneousPower = chargingInstantaneousPower / 1000;
      }

      chargingInstantaneousPower = Math.round(chargingInstantaneousPower).toLocaleString();
      let chargingRemainingTime = time_convert(data.batteryStatus.attributes.chargingRemainingTime);
      chargingRemainingTimeString = " | " + chargingRemainingTime + " h";

      chargeStateLabel = +chargingInstantaneousPower + " kW" + chargingRemainingTimeString;
      chargeStateLabel = PlugText.addText(chargeStateLabel);
      chargeStateLabel.font = Font.regularSystemFont(10);

      PlugText.addSpacer(2);
    }
  }

  const column1 = wrap.addStack();
  column1.layoutVertically();

  //column1.addSpacer(3)

  // simple quota-limit check:
  // (battery status is the first request – if it reports nothing, we can be sure, that there will be no other data available at the moment)
  if (!data.batteryStatus || typeof data.batteryStatus == "undefined") {
    if (config.runsInWidget) {
      // only in widget
      throw new Error("Quota Limit! – Couldn't fetch data right now. Try later or contact Renault.");
    } else {
      console.log("Quota Limit! – Couldn't fetch data right now. Try later or contact Renault.");
    }
  }

  if (typeof data.batteryStatus != "undefined") {
    let BatteryStack = column1.addStack();
    BatteryStack.layoutVertically();
    const batteryStatusLabel = BatteryStack.addText("SOC");
    batteryStatusLabel.font = Font.mediumSystemFont(12);
    const batteryStatusVal = BatteryStack.addText(data.batteryStatus.attributes.batteryLevel.toString() + " %");
    batteryStatusVal.font = Font.boldSystemFont(16);

    column1.addSpacer(10);

    // push Message if maxSoC reachead
    /* under development! */
    /*
			let maxSoC = 62
			// if(batteryStatusVal == maxSoC && data.batteryStatus.attributes.chargingStatus != "-1.0"){
				const delaySeconds = 1;
				let currentDate = new Date;
				let newDate = new Date(currentDate.getTime() + (delaySeconds * 1000));
				chargeFull = new Notification()
				chargeFull.identifier = "maxSoCReached"
				chargeFull.title = "🔋 Geladen"
				chargeFull.body = "Die Batterie Deines Fahrzeugs wurde zu " + maxSoC + " % geladen!"
				chargeFull.sound = "complete"
				chargeFull.setTriggerDate(newDate);
				chargeFull.schedule()
			// } */
  }

  if (typeof data.batteryStatus != "undefined") {
    let RangeStack = column1.addStack();
    RangeStack.layoutVertically();
    const RangeStatusLabel = RangeStack.addText("Range");
    RangeStatusLabel.font = Font.mediumSystemFont(12);
    const RangeStatusVal = RangeStack.addText(data.batteryStatus.attributes.batteryAutonomy.toString() + " km");
    RangeStatusVal.font = Font.boldSystemFont(16);

    column1.addSpacer(10);
  }

  if (ZOE_Phase == 1 && typeof data.batteryStatus != "undefined") {
    if (typeof data.batteryStatus.attributes.batteryTemperature != "undefined") {
      let TempStack = column1.addStack();
      TempStack.layoutVertically();
      const TempStatusLabel = TempStack.addText("Bat. Temp.");
      TempStatusLabel.font = Font.mediumSystemFont(12);
      const TempStatusVal = TempStack.addText(data.batteryStatus.attributes.batteryTemperature.toString() + " °C");
      TempStatusVal.font = Font.boldSystemFont(16);
    }
  }

  if (ZOE_Phase == 2 && typeof data.batteryStatus != "undefined") {
    if (typeof data.batteryStatus.attributes.batteryAvailableEnergy != "undefined") {
      let AvEnergyStack = column1.addStack();
      AvEnergyStack.layoutVertically();
      const AvEnergyStatusLabel = AvEnergyStack.addText("Av. Energy");
      AvEnergyStatusLabel.font = Font.mediumSystemFont(12);
      const AvEnergyStatusVal = AvEnergyStack.addText(
        data.batteryStatus.attributes.batteryAvailableEnergy.toString() + " kWh"
      );
      AvEnergyStatusVal.font = Font.boldSystemFont(16);
    }
  }

  const column2 = wrap.addStack();
  column2.layoutVertically();

  //column2.addSpacer(3)

  if (typeof data.cockpitStatus != "undefined") {
    let MileageStack = column2.addStack();
    MileageStack.layoutVertically();
    const MileageStatusLabel = MileageStack.addText("Odometer");
    MileageStatusLabel.font = Font.mediumSystemFont(12);
    let mileage = Math.round(data.cockpitStatus.attributes.totalMileage).toLocaleString();
    const MileageStatusVal = MileageStack.addText(mileage.toString() + " km");
    MileageStatusVal.font = Font.boldSystemFont(16);

    column2.addSpacer(10);
  }

  if (typeof data.locationStatus != "undefined") {
    let LocationStack = column2.addStack();
    LocationStack.spacing = 2;
    LocationStack.layoutVertically();
    const LocationLabel = LocationStack.addText("Position");
    LocationLabel.font = Font.mediumSystemFont(12);

    const LocationVal = LocationStack.addText("➤ Open Map");
    LocationVal.font = Font.boldSystemFont(12);
    if (mapProvider == "google") {
      // https://www.google.com/maps/search/?api=1&query=58.698017,-152.522067
      LocationVal.url =
        "https://www.google.com/maps/search/?api=1&query=" +
        data.locationStatus.attributes.gpsLatitude +
        "," +
        data.locationStatus.attributes.gpsLongitude;
    } else {
      // fallback to apple…
      // http://maps.apple.com/?ll=50.894967,4.341626
      LocationVal.url =
        "http://maps.apple.com/?q=My+Car&ll=" +
        data.locationStatus.attributes.gpsLatitude +
        "," +
        data.locationStatus.attributes.gpsLongitude;
    }

    //LocationStack.addSpacer(0.5)
    column2.addSpacer(12);
  }

  //if(typeof(data.hvacStatus) != 'undefined'){ // we have to uncomment this later!

  let AcStack = column2.addStack();
  AcStack.spacing = 2;
  AcStack.layoutVertically();
  const AcLabel = AcStack.addText("Pre.Cond.");
  AcLabel.font = Font.mediumSystemFont(12);

  // create a self-opening url to run the start_ac function
  // could be nicer, but seems to work at the moment.
  let scriptName = encodeURIComponent(Script.name());
  let AcVal;
  let ac_url;
  if (args.queryParameters.action == "start_ac") {
    AcVal = AcStack.addText("➤ Stop AC");
    ac_url = `scriptable:///run?scriptName=${scriptName}&action=stop_ac`;
  } else {
    AcVal = AcStack.addText("➤ Start AC");
    ac_url = `scriptable:///run?scriptName=${scriptName}&action=start_ac`;
  }
  AcVal.font = Font.boldSystemFont(12);
  AcVal.url = ac_url;

  //} // we have to uncomment this later!
}

// fetch all data
async function getData() {
  // we are going now a long way through multiple servers to get access to our data
  // 1. fetch session from gigya
  let gigyaCookieValue;
  if (Keychain.contains("gigyaCookieValue") && Keychain.get("gigyaCookieValue") != "") {
    gigyaCookieValue = Keychain.get("gigyaCookieValue");
  }
  console.log("gigyaCookieValue (from keychain): " + gigyaCookieValue);
  if (gigyaCookieValue == "" || typeof gigyaCookieValue == "undefined") {
    let url =
      gigyaURL +
      "/accounts.login?loginID=" +
      encodeURIComponent(myRenaultUser) +
      "&password=" +
      encodeURIComponent(myRenaultPass) +
      "&apiKey=" +
      gigyaAPI;
    let req = new Request(url);
    let apiResult = await req.loadString();
    apiResult = JSON.parse(apiResult);
    console.log("1.: " + apiResult.statusCode);
    if (apiResult.statusCode == "403") {
      let loginMessage = "Login not possible. Check information.";
      throw new Error(loginMessage);
    } else {
      gigyaCookieValue = apiResult.sessionInfo.cookieValue;
      Keychain.set("gigyaCookieValue", gigyaCookieValue);
      console.log("gigyaCookieValue (new generated): " + gigyaCookieValue);
    }
  }

  // 2. fetch user data from gigya
  let gigyaPersonID;
  let gigyaGigyaDataCenter;
  if (Keychain.contains("gigyaPersonID") && Keychain.get("gigyaPersonID") != "") {
    gigyaPersonID = Keychain.get("gigyaPersonID");
  }
  console.log("gigyaPersonID (from keychain): " + gigyaPersonID);
  if (Keychain.contains("gigyaGigyaDataCenter") && Keychain.get("gigyaGigyaDataCenter") != "") {
    gigyaGigyaDataCenter = Keychain.get("gigyaGigyaDataCenter");
  }
  console.log("gigyaGigyaDataCenter (from keychain): " + gigyaGigyaDataCenter);
  if (
    gigyaPersonID == "" ||
    gigyaGigyaDataCenter == "" ||
    typeof gigyaPersonID == "undefined" ||
    typeof gigyaGigyaDataCenter == "undefined"
  ) {
    url = gigyaURL + "/accounts.getAccountInfo?oauth_token=" + Keychain.get("gigyaCookieValue");
    req = new Request(url);
    apiResult = await req.loadString();
    apiResult = JSON.parse(apiResult);
    console.log("2.: " + apiResult.statusCode);
    gigyaPersonID = apiResult.data.personId;
    gigyaGigyaDataCenter = apiResult.data.gigyaDataCenter;
    Keychain.set("gigyaPersonID", gigyaPersonID);
    Keychain.set("gigyaGigyaDataCenter", gigyaGigyaDataCenter);
    console.log("gigyaPersonID (new generated): " + gigyaPersonID);
    console.log("gigyaGigyaDataCenter (new generated): " + gigyaGigyaDataCenter);
  }

  // 3. fetch JWT data from gigya
  // renew gigyaJWTToken once a day

  if (Keychain.contains("lastJWTCall") == false) {
    Keychain.set("lastJWTCall", "never");
  }
  let gigyaJWTToken;

  if (Keychain.contains("gigyaJWTToken")) {
    gigyaJWTToken = Keychain.get("gigyaJWTToken");
  }
  console.log("gigyaJWTToken (from keychain): " + gigyaJWTToken);
  if (gigyaJWTToken == "" || typeof gigyaJWTToken == "undefined") {
    let expiration = 87000;
    url =
      gigyaURL +
      "/accounts.getJWT?oauth_token=" +
      gigyaCookieValue +
      "&login_token=" +
      gigyaCookieValue +
      "&expiration=" +
      expiration +
      "&fields=data.personId,data.gigyaDataCenter&ApiKey=" +
      gigyaAPI;
    req = new Request(url);
    apiResult = await req.loadString();
    apiResult = JSON.parse(apiResult);
    console.log("3.: " + apiResult.statusCode);
    gigyaJWTToken = apiResult.id_token;
    Keychain.set("gigyaJWTToken", gigyaJWTToken);
    console.log("gigyaJWTToken (new generated): " + gigyaJWTToken);

    const callDate = new Date().toJSON().slice(0, 13).replace(/-/g, "").replace(/T/g, "-");
    Keychain.set("lastJWTCall", callDate);
    console.log("lastJWTCall (new generated): " + callDate);
  }

  // 4. fetch data from kamereon (person)
  // if not in Keychain (we try to avoid quota limits here)
  let account_id;
  if (Keychain.contains("account_id")) {
    account_id = Keychain.get("account_id");
  }
  console.log("account_id (from keychain): " + account_id);
  if (account_id == "" || typeof account_id == "undefined") {
    url = kamareonURL + "/commerce/v1/persons/" + gigyaPersonID + "?country=SE";
    req = new Request(url);
    req.method = "GET";
    req.headers = { "x-gigya-id_token": gigyaJWTToken, apikey: kamareonAPI };
    apiResult = await req.loadString();
    apiResult = JSON.parse(apiResult);
    console.log("4.: " + apiResult);
    if (apiResult.type == "FUNCTIONAL") {
      let quotaMessage = apiResult.messages[0].message + " – Login currently not possible try later..";
      throw new Error(quotaMessage);
    } else {
      account_id = apiResult.accounts[0].accountId;
      Keychain.set("account_id", account_id);
      console.log("account_id (new generated): " + account_id);
    }
  }

  // 5. fetch data from kamereon (all vehicles data)
  // we need this only once to get the picture of the car and the VIN!
  let carPicture;
  if (Keychain.contains("carPicture")) {
    carPicture = Keychain.get("carPicture");
  }
  console.log("carPicture (from keychain): " + carPicture);
  if (Keychain.contains("VIN") && Keychain.get("VIN") != "") {
    VIN = Keychain.get("VIN");
  }
  console.log("VIN (from keychain): " + VIN);
  if (carPicture == "" || typeof carPicture == "undefined" || VIN == "" || typeof VIN == "undefined") {
    url = kamareonURL + "/commerce/v1/accounts/" + account_id + "/vehicles?country=SE";
    req = new Request(url);
    req.method = "GET";
    req.headers = { "x-gigya-id_token": gigyaJWTToken, apikey: kamareonAPI };
    apiResult = await req.loadString();
    apiResult = JSON.parse(apiResult);
    // set carPicture
    carPicture = await apiResult.vehicleLinks[0].vehicleDetails.assets[0].renditions[0].url;
    Keychain.set("carPicture", carPicture);
    console.log("carPicture (new): " + carPicture);
    // set VIN
    VIN = apiResult.vehicleLinks[0].vin;
    Keychain.set("VIN", VIN);
    console.log("VIN (new generated): " + VIN);
  }

  // NOW WE CAN READ AND SET EVERYTHING INTO AN OBJECT:

  const allResults = {};

  // real configurator picture of the vehicle
  // old call: let carPicture = allVehicleData.vehicleLinks[0].vehicleDetails.assets[0].renditions[0].url // renditions[0] = large // renditions[1] = small image
  allResults["carPicture"] = carPicture;

  // batteryStatus
  // version: 2
  // batteryLevel = Num (percentage)
  // plugStatus = bolean (0/1)
  // chargeStatus = bolean (0/1) (?)
  let batteryStatus = await getStatus("battery-status", 2, kamareonURL, account_id, VIN, gigyaJWTToken, kamareonAPI);
  allResults["batteryStatus"] = batteryStatus;

  // cockpitStatus
  // version: 2
  //  totalMileage = Num (in Kilometres!)
  let cockpitStatus = await getStatus("cockpit", 2, kamareonURL, account_id, VIN, gigyaJWTToken, kamareonAPI);
  allResults["cockpitStatus"] = cockpitStatus;

  // locationStatus
  // version: 1
  // gpsLatitude
  // gpsLongitude
  // LastUpdateTime
  let locationStatus = await getStatus("location", 1, kamareonURL, account_id, VIN, gigyaJWTToken, kamareonAPI);
  allResults["locationStatus"] = locationStatus;

  // chargeSchedule
  // note: unused at the moment!
  // version: 1
  let chargeSchedule = await getStatus(
    "charging-settings",
    1,
    kamareonURL,
    account_id,
    VIN,
    gigyaJWTToken,
    kamareonAPI
  );
  allResults["chargeSchedule"] = chargeSchedule;

  // hvacStatus
  // version: 1
  let hvacStatus = await getStatus("hvac-status", 1, kamareonURL, account_id, VIN, gigyaJWTToken, kamareonAPI);
  allResults["hvacStatus"] = hvacStatus;
  console.log("hvacStatus: " + hvacStatus);

  // query parameter / args
  // if query action = "start_ac" we start "vorklimatisierung"
  // default temperature will be 21°C

  let query_action = args.queryParameters.action;

  if (query_action == "start_ac") {
    let attr_data = '{"data":{"type":"HvacStart","attributes":{"action":"start","targetTemperature":"21"}}}';
    let action = await postStatus(
      "hvac-start",
      attr_data.toString(),
      1,
      kamareonURL,
      account_id,
      VIN,
      gigyaJWTToken,
      kamareonAPI
    );
    console.log("start_ac_action: " + action);
    //throw new Error(action)
  }

  if (query_action == "stop_ac") {
    let attr_data = '{"data":{"type":"HvacStart","attributes":{"action":"cancel"}}}';
    let action = await postStatus(
      "hvac-start",
      attr_data.toString(),
      1,
      kamareonURL,
      account_id,
      VIN,
      gigyaJWTToken,
      kamareonAPI
    );
    console.log("stop_ac_action: " + action);
  }

  if (query_action == "start_charge") {
    let attr_data = '{"data":{"type":"ChargingStart","attributes":{"action":"start"}}}';
    let action = await postStatus(
      "charging-start",
      attr_data.toString(),
      1,
      kamareonURL,
      account_id,
      VIN,
      gigyaJWTToken,
      kamareonAPI
    );
    console.log("start_charge_action: " + action);
  }

  // return array
  return allResults;
}

// general function to get status-values from our vehicle
async function getStatus(endpoint, version = 1, kamareonURL, account_id, VIN, gigyaJWTToken, kamareonAPI) {
  // fetch data from kamereon (single vehicle)
  url =
    kamareonURL +
    "/commerce/v1/accounts/" +
    account_id +
    "/kamereon/kca/car-adapter/v" +
    version +
    "/cars/" +
    VIN +
    "/" +
    endpoint +
    "?country=SE";
  req = new Request(url);
  req.method = "GET";
  req.headers = { "x-gigya-id_token": gigyaJWTToken, apikey: kamareonAPI, "Content-type": "application/vnd.api+json" };
  apiResult = await req.loadString();
  if (req.response.statusCode == 200) {
    apiResult = JSON.parse(apiResult);
  }
  return apiResult.data;
}

// general function to POST status-values to our vehicle
async function postStatus(endpoint, jsondata, version, kamareonURL, account_id, VIN, gigyaJWTToken, kamareonAPI) {
  url =
    kamareonURL +
    "/commerce/v1/accounts/" +
    account_id +
    "/kamereon/kca/car-adapter/v" +
    version +
    "/cars/" +
    VIN +
    "/actions/" +
    endpoint +
    "?country=SE";
  request = new Request(url);
  request.method = "POST";
  request.body = jsondata;
  request.headers = {
    "x-gigya-id_token": gigyaJWTToken,
    apikey: kamareonAPI,
    "Content-type": "application/vnd.api+json",
  };
  apiResult = await request.loadString();
  console.log(apiResult);

  //debug:
  // throw new Error(url)

  let pushBody;
  let sound;
  if (request.response.statusCode == 200) {
    pushBody = "Sending your request was successful.";
    sound = "piano_success";
  } else {
    pushBody = "Something went wrong trying to send your request. Code:" + request.response.statusCode;
    sound = "piano_error";
  }

  pushMessage = new Notification();
  pushMessage.identifier = "zoePostStatus";
  if (endpoint == "hvac-start") {
    pushMessage.title = "Sent instruction to AC";
  }
  if (endpoint == "charge-start") {
    pushMessage.title = "Sent instruction to charge";
  }
  //pushMessage.title = "Befehl gesendet"
  pushMessage.body = pushBody;
  pushMessage.sound = sound;
  //pushMessage.setTriggerDate(newDate);
  pushMessage.schedule();

  return apiResult;
}

function time_convert(num) {
  var hours = Math.floor(num / 60);
  var minutes = num % 60;
  return hours + ":" + minutes;
}

// get images from local filestore or download them once
// this part is inspired by the dm-toilet-paper widget
// credits: https://gist.github.com/marco79cgn
async function getImage(image, imgUrl) {
  let fm = FileManager.local();
  let dir = fm.documentsDirectory();
  let path = fm.joinPath(dir, image);
  if (fm.fileExists(path)) {
    return fm.readImage(path);
  } else {
    // download once
    let imageUrl;
    switch (image) {
      case "my-renault-car.png":
        imageUrl = imgUrl;
        break;
      default:
        console.log(`Sorry, couldn't find ${image}.`);
    }
    if (imageUrl) {
      let iconImage = await loadImage(imageUrl);
      fm.writeImage(path, iconImage);
      return iconImage;
    }
  }
}

// helper function to download an image from a given url
async function loadImage(imgUrl) {
  const req = new Request(imgUrl);
  return await req.loadImage();
}

// end of script
