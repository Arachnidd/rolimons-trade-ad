var app = require("express")()
app.use(require("body-parser").json())
const dotenv = require('dotenv')
dotenv.config()

const fetch = require("node-fetch");

const rolimonsToken = process.env.token
const robloxId = process.env.robloxId
const config = require("./config.json");

let itemValues = {};
let playerInv = {};
let onHold = [];

async function getValues() {
  await fetch(`https://api.rolimons.com/items/v1/itemdetails`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((json) => {
      for (const item in json.items) {
        let type = json.items[item][5] >= 0 ? json.items[item][5] : null;
        itemValues[item] = { value: Math.abs(json.items[item][4]), type: type };
      }
      //console.log(itemValues)
      getInv();
    })
    .catch((err) => {
      console.log(err);
    });
}

async function getInv() {
  await fetch(`https://api.rolimons.com/players/v1/playerassets/${robloxId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  })
    .then((res) => res.json())
    .then((json) => {
      playerInv = json.playerAssets;
      onHold = json.holds;
      console.log(playerInv);
      console.log(onHold);
      generateAd();
    })
    .catch((err) => {
      console.log(err);
    });
}

function findValidPairs(items, min, max) {
  const validPairs = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sum = items[i].value + items[j].value;
      if (sum > min && sum < max) {
        validPairs.push([items[i], items[j]]);
      }
    }
  }

  return validPairs;
}

function generateAd() {
  let availableItems = [];
  for (const asset in playerInv) {
    for (const uaid of playerInv[asset]) {
      if (
        !onHold.includes(uaid) &&
        itemValues[asset].value >= config.minItemValue &&
        config.maxItemValue >= itemValues[asset].value
      ) {
        availableItems.push(asset);
      } else {
      }
    }
  }

  console.log("availableItems", availableItems);

  let sendingSideNum = Math.floor(Math.random() * (config.maxItemsSend - config.minItemsSend) + config.minItemsSend);
  console.log("Total Sending Side", sendingSideNum);
  let sendingSide = [];
  for (let i = 0; i < sendingSideNum; i++) {
    let item = availableItems[Math.floor(Math.random(availableItems.length))];
    sendingSide.push(parseFloat(item));
    availableItems.splice(availableItems.indexOf(item), 1);
  }

  console.log("sending Items", sendingSide);

  if (config.smartAlgo) {
    let receivingSide = [];
    let totalSendValue = 0;
    for (const item of sendingSide) {
      totalSendValue = totalSendValue + itemValues[item].value;
    }
    console.log("Total Send Value", totalSendValue);
    let upgOrDown = Math.floor(Math.random() * 2);
    if (upgOrDown == 1) {
      let requestValue = totalSendValue * (1 - config.RequestPercent / 100);
      let options = [];
      for (const item in itemValues) {
        if (
          itemValues[item].value >= requestValue &&
          itemValues[item].value <= totalSendValue &&
          itemValues[item].type >= config.minDemand
        ) {
          options.push(item);
        } else {
        }
      }

      if (options.length >= 1) {
        let item = options[Math.floor(Math.random(options.length))];
        console.log("upgrade Item", item);
        receivingSide.push(parseFloat(item));
        receivingSide.push("upgrade");
        receivingSide.push("any");
        postAd(sendingSide, receivingSide);
      } else {
        receivingSide.push("any");
        let itemIdValArr = [];
        for (const item in itemValues) {
          if (itemValues[item].type >= config.minDemand) {
            itemIdValArr.push({ id: item, value: itemValues[item].value });
          }
        }
        //console.log(itemIdValArr);
        let validPairs = findValidPairs(
          itemIdValArr,
          totalSendValue * (1 - config.RequestPercent / 100),
          totalSendValue,
        );
        if (validPairs.length > 0) {
          const randomPair = validPairs[Math.floor(Math.random() * validPairs.length)];
          const ids = randomPair.map((item) => item.id);
          console.log(ids);
          for (const id of ids) {
            receivingSide.push(parseFloat(id));
          }
          let maxRId = ids.reduce((maxId, id) => (itemValues[`${id}`].value > (itemValues[`${maxId}`].value || -Infinity) ? id : maxId), ids[0]);
          let maxSId = sendingSide.reduce((maxId, id) => (itemValues[`${id}`].value > (itemValues[`${maxId}`].value || -Infinity) ? id : maxId), ids[0]);
          if (maxSId < maxRId) {
            receivingSide.push("upgrade");
          } else {
            receivingSide.push("downgrade");
          }
          postAd(sendingSide, receivingSide);
        } else {
          console.log("No valid pairs found.");
        }
      }
    } else {
      receivingSide.push("any");
      let itemIdValArr = [];
      for (const item in itemValues) {
        if (itemValues[item].type >= config.minDemand) {
          itemIdValArr.push({ id: item, value: itemValues[item].value });
        }
      }
      //console.log(itemIdValArr);
      let validPairs = findValidPairs(
        itemIdValArr,
        totalSendValue * (1 - config.RequestPercent / 100),
        totalSendValue,
      );
      if (validPairs.length > 0) {
        const randomPair = validPairs[Math.floor(Math.random() * validPairs.length)];
        const ids = randomPair.map((item) => item.id);
        console.log(ids);
        for (const id of ids) {
          receivingSide.push(parseFloat(id));
        }
        let maxRId = ids.reduce((maxId, id) => (itemValues[`${id}`].value > (itemValues[`${maxId}`].value || -Infinity) ? id : maxId), ids[0]);
        let maxSId = sendingSide.reduce((maxId, id) => (itemValues[`${id}`].value > (itemValues[`${maxId}`].value || -Infinity) ? id : maxId), ids[0]);
        if (maxSId < maxRId) {
          receivingSide.push("upgrade");
        } else {
          receivingSide.push("downgrade");
        }
        postAd(sendingSide, receivingSide);
      } else {
        console.log("No valid pairs found.");
      }
    }
  } else {
    //adding soon
  }
}

async function postAd(sending, receiving) {
  let allRTags = [];
  let allRIds = [];

  console.log(receiving)
  for (const tag of receiving) {
    if (typeof tag === "string") {
      allRTags.push(tag);
    } else if (typeof tag === "number") {
      allRIds.push(tag);
    }
  }

  let seenStrings = new Set();

  const result = allRTags.filter(item => {
    if (typeof item === 'string') {
      if (seenStrings.has(item)) {
        return false;
      }
      seenStrings.add(item);
    }
    return true;
  });

  /*{"player_id":55495469,"offer_item_ids":[382881237,2409285794,2409285794,362051899],"request_item_ids":[4390891467],"request_tags":["any","upgrade","downgrade"],"offer_robux":10000}*/
  let reqBody = {
    "player_id": parseFloat(robloxId),
    "offer_item_ids": sending,
    "request_item_ids": allRIds,
    "request_tags": result,
    "offer_robux": 300000
  };
  console.log(reqBody)
  fetch(`https://api.rolimons.com/tradeads/v1/createad`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `${rolimonsToken}`,
    },
    body: JSON.stringify(reqBody),
  })
    .then((res) => res.json())
    .then((json) => {
      console.log(json);
    })
    .catch((err) => {
      console.log(err);
    });
  setTimeout(function () {
    getValues();
  }, 1440000);
}

getValues();

app.get("/", (req, res) => {
  res.json({ message: 'Hello, World!' });
})
app.listen(8080)
