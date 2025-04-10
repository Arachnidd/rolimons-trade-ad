/*
Made by @spiderphobias (Arachnid) on discord. -- (Noor)
April 10, 2025
Made for auto posting rolimons trade ad with a smart algorithm. This is smarter and way better then any other bot. 
Open source and completely free. THIS IS NOT TO ABUSE THE SITE ROLIMONS.COM! 
Please don't spam unrealistic trades lowering the trade quality, it doesnt help you or other users!
*/


const fetch = require('node-fetch');
const config = require('./config.json');
const logger = require('signale');


const dotenv = require('dotenv')
dotenv.config()


var app = require("express")()
app.use(require("body-parser").json())


const rolimonsVerificationToken = process.env.token;
const robloxId = parseFloat(process.env.robloxId)
let rolimonsValues = {};

logger.debug("Made by @spiderphobias (on discord)\nThank you for using Empyreus Trade ad Poster ❤️!\nIf You are enjoying the bot, a star on github wouldn't hurt 😉");
logger.fatal("NOTE: If you are using a host like render, rolimons MAY ban it. This is not an issue with the bot!\n\n");
logger.pending("Please wait while rolimons values and items are fetched :)");

async function updateValues() {
    fetch('https://api.rolimons.com/items/v2/itemdetails', {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => {
            if (res.status === 200) {
                res.json().then(json => {
                    for (const item in json.items) {
                        rolimonsValues[item] = {
                            "demand": json.items[item][5],
                            "value": json.items[item][4],
                            "name": json.items[item][0]
                        };
                        if (json.items[item][1].length > 1) {
                            rolimonsValues[item]["name"] = json.items[item][1];
                        }
                    }
                    logger.complete("Updated Rolimons value!");
                }).catch(err => {
                    logger.fatal("Error processing rolimons API. Possibly banned from the site. Not caused by this bot.");
                });
            } else {
                logger.fatal("Error getting rolimons API. Possibly banned from the site. Not caused by this bot.");
            }
        }).catch(err => {
            logger.fatal("Error getting rolimons API. Possibly banned from the site. Not caused by this bot.");
        });
    await sleep(300000);
    updateValues();
}

updateValues();

async function makeAd(sItems, rItems, tags) {
    let sendBody = (tags.length >= 1)
        ? {
            "player_id": robloxId,
            "offer_item_ids": sItems.map(parseFloat),
            "request_item_ids": rItems.map(parseFloat),
            "request_tags": tags
        }
        : {
            "player_id": robloxId,
            "offer_item_ids": sItems.map(parseFloat),
            "request_item_ids": rItems.map(parseFloat)
        };

    console.log(sendBody);
    fetch('https://api.rolimons.com/tradeads/v1/createad', {
        method: "POST",
        headers: {
            'content-type': 'application/json',
            'cookie': '_RoliVerification=' + rolimonsVerificationToken
        },
        body: JSON.stringify(sendBody)
    }).then(res => {
        if (res.status === 201) {
            let stringSend = rolimonsValues[sItems[0]].name + " (" + sItems[0] + ") - " + rolimonsValues[sItems[0]].value;
            let stringReceive = rolimonsValues[rItems[0]].name + " (" + rItems[0] + ") - " + rolimonsValues[rItems[0]].value;
            for (const item of sItems) {
                stringSend = stringSend + ", " + rolimonsValues[item].name + " (" + item + ") - " + rolimonsValues[item].value;
            }
            for (const item of rItems) {
                stringReceive = stringReceive + ", " + rolimonsValues[item].name + " (" + item + ") - " + rolimonsValues[item].value;
            }
            logger.success("Successfully posted ad! Sending:", stringSend, "|| Requesting: ", stringReceive);
        } else {
            logger.fatal("error requesting rolimons trade ad api. Might be banned! This is NOT because of this bot! Status: ", res.status);
        }
    }).catch(err => {
        console.log(err);
    });
}

async function getUserInventory() {
    const url = `https://api.rolimons.com/players/v1/playerassets/${robloxId}`;
    try {
        const res = await fetch(url, {
            method: "GET",
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            logger.fatal("Unable to get Rolimons inventory API. Status:", res.status);
            return null;
        }
        const json = await res.json();
        return json;
    } catch (err) {
        logger.fatal("Unable to get Roblox inventory API", err);
        return null;
    }
}

async function handleFullInventory() {
    let cursor = "";
    let fullData = [];
    const json = await getUserInventory(cursor);
    for (const item in json.playerAssets) {
        for (const uaid of json.playerAssets[item]) {
            if (!json.holds.includes(uaid)) {
                fullData.push(item);
            }
        }
    }
    return fullData;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function chooseRandomSubset(array, size) {
    const shuffled = array.slice();
    shuffleArray(shuffled);
    return shuffled.slice(0, size);
}

function getRandomReceivingCount(smartConfig) {
    const tagsCount = smartConfig.tags ? smartConfig.tags.length : 0;
    const allowedMax = Math.min(smartConfig.maxReceiveItems, 4 - tagsCount);
    const allowedMin = smartConfig.minReceiveItems;
    if (allowedMax < allowedMin) return null;
    return randomInt(allowedMin, allowedMax);
}

function generateUpgradeCombo(availableSendingItemsList, availableReceivingItemsList, numOfItemsSend, rolimonsValues, smartConfig) {
    const maxAttempts = 100000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const sendingCombo = chooseRandomSubset(availableSendingItemsList, numOfItemsSend);
        if (!sendingCombo.every(item => rolimonsValues[item].value >= smartConfig.minItemValueSend)) continue;
        const sendingValues = sendingCombo.map(item => rolimonsValues[item].value);
        const S_total = sendingValues.reduce((a, b) => a + b, 0);
        if (S_total < smartConfig.minTotalSend || S_total > smartConfig.maxTotalSend) continue;
        const receivingCount = getRandomReceivingCount(smartConfig);
        if (!receivingCount) continue;
        const receivingCombo = chooseRandomSubset(availableReceivingItemsList, receivingCount);
        if (!receivingCombo.every(item => rolimonsValues[item].value >= smartConfig.minItemValueRequest)) continue;
        const receivingValues = receivingCombo.map(item => rolimonsValues[item].value);
        const R_total = receivingValues.reduce((a, b) => a + b, 0);
        if (smartConfig.minTotalRequestValue && R_total < smartConfig.minTotalRequestValue) continue;
        if (smartConfig.maxTotalRequestValue && R_total > smartConfig.maxTotalRequestValue) continue;
        const maxSending = Math.max(...sendingValues);
        const maxReceiving = Math.max(...receivingValues);
        if (maxSending >= maxReceiving) continue;
        const lowerBound = R_total * (1 + smartConfig.minUpgPercent / 100);
        const upperBound = R_total * (1 + smartConfig.maxUpgPercent / 100);
        if (S_total < lowerBound || S_total > upperBound) continue;
        return { finalSendingItems: sendingCombo, finalRequestingItems: receivingCombo };
    }
    return null;
}

function generateDowngradeCombo(availableSendingItemsList, availableReceivingItemsList, numOfItemsSend, rolimonsValues, smartConfig) {
    const maxAttempts = 100000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const sendingCombo = chooseRandomSubset(availableSendingItemsList, numOfItemsSend);
        if (!sendingCombo.every(item => rolimonsValues[item].value >= smartConfig.minItemValueSend)) continue;
        const sendingValues = sendingCombo.map(item => rolimonsValues[item].value);
        const S_total = sendingValues.reduce((a, b) => a + b, 0);
        if (S_total < smartConfig.minTotalSend || S_total > smartConfig.maxTotalSend) continue;
        const receivingCount = getRandomReceivingCount(smartConfig);
        if (!receivingCount) continue;
        const receivingCombo = chooseRandomSubset(availableReceivingItemsList, receivingCount);
        if (!receivingCombo.every(item => rolimonsValues[item].value >= smartConfig.minItemValueRequest)) continue;
        const receivingValues = receivingCombo.map(item => rolimonsValues[item].value);
        const R_total = receivingValues.reduce((a, b) => a + b, 0);
        if (smartConfig.minTotalRequestValue && R_total < smartConfig.minTotalRequestValue) continue;
        if (smartConfig.maxTotalRequestValue && R_total > smartConfig.maxTotalRequestValue) continue;
        const maxSending = Math.max(...sendingValues);
        const maxReceiving = Math.max(...receivingValues);
        if (maxSending <= maxReceiving) continue;
        const lowerBound = S_total * (1 + smartConfig.minDgPercent / 100);
        const upperBound = S_total * (1 + smartConfig.maxDgPercent / 100);
        if (R_total < lowerBound || R_total > upperBound) continue;
        return { finalSendingItems: sendingCombo, finalRequestingItems: receivingCombo };
    }
    return null;
}

function generateAnyCombo(availableSendingItemsList, availableReceivingItemsList, rolimonsValues, smartConfig) {
    const maxAttempts = 100000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const numOfItemsSend = randomInt(smartConfig.minSendItems, smartConfig.maxSendItems);
        const modeUpgrade = Math.random() < 0.5;
        const sendingCombo = chooseRandomSubset(availableSendingItemsList, numOfItemsSend);
        const sendingValues = sendingCombo.map(item => rolimonsValues[item]?.value || 0);
        const S_total = sendingValues.reduce((a, b) => a + b, 0);
        const receivingCount = getRandomReceivingCount(smartConfig);
        if (!receivingCount) continue;
        const receivingCombo = chooseRandomSubset(availableReceivingItemsList, receivingCount);
        const receivingValues = receivingCombo.map(item => rolimonsValues[item]?.value || 0);
        const R_total = receivingValues.reduce((a, b) => a + b, 0);
        const maxSending = Math.max(...sendingValues);
        const maxReceiving = Math.max(...receivingValues);
        if (S_total < smartConfig.minTotalSend || S_total > smartConfig.maxTotalSend) continue;
        if (R_total < smartConfig.minTotalRequestValue || R_total > smartConfig.maxTotalRequestValue) continue;
        if (modeUpgrade) {
            const lower = R_total * (1 + smartConfig.minUpgPercent / 100);
            const upper = R_total * (1 + smartConfig.maxUpgPercent / 100);
            if (maxSending >= maxReceiving) continue;
            if (S_total >= lower && S_total <= upper) {
                console.log("✅ Valid Upgrade Combo Found");
                return {
                    finalSendingItems: sendingCombo,
                    finalRequestingItems: receivingCombo,
                    type: "upgrade"
                };
            }
        } else {
            const lower = S_total * (1 + smartConfig.minDgPercent / 100);
            const upper = S_total * (1 + smartConfig.maxDgPercent / 100);
            if (maxSending <= maxReceiving) continue;
            if (R_total >= lower && R_total <= upper) {
                console.log("✅ Valid Downgrade Combo Found");
                return {
                    finalSendingItems: sendingCombo,
                    finalRequestingItems: receivingCombo,
                    type: "downgrade"
                };
            }
        }
    }
    return null;
}

async function getItems() {
    let allItemIds = await handleFullInventory();
    if (!allItemIds || allItemIds.length === 0) {
        logger.fatal("No inventory items found.");
        return;
    }
    if (config.specificItems.enabled) {
        for (const itemId of config.specificItems.sendingItems) {
            if (!allItemIds.includes(itemId)) {
                logger.fatal("Specific sending is on and some items from your inventory are missing!");
                return;
            }
        }
        makeAd(config.specificItems.sendingItems, config.specificItems.receivingItems, config.specificItems.tags);
    } else if (config.smartAlgo.enabled) {
        const modesEnabled = [config.smartAlgo.upgrade, config.smartAlgo.downgrade, config.smartAlgo.any].filter(Boolean).length;
        if (modesEnabled !== 1) {
            logger.fatal("Smart algo is enabled, BUT you can only choose one: upgrading, downgrading, or any!");
            return;
        }
        let availableSendingItemsList = [];
        for (const item of allItemIds) {
            if (!rolimonsValues[item]) {
                console.log("⚠️ Missing value data for", item);
                continue;
            }
            const { value } = rolimonsValues[item];
            if (!config.smartAlgo.blacklisted.includes(item) && value >= config.smartAlgo.minItemValueSend) {
                availableSendingItemsList.push(item);
            }
        }
        let availableReceivingItemsList = [];
        const allCatalogItems = Object.keys(rolimonsValues);
        for (const item of allCatalogItems) {
            const { value, demand } = rolimonsValues[item];
            if (value >= config.smartAlgo.minItemValueRequest && demand >= config.smartAlgo.minDemand) {
                availableReceivingItemsList.push(item);
            }
        }
        console.log("✅ Filtered Sending Items:", availableSendingItemsList.length, availableSendingItemsList);
        console.log("✅ Filtered Receiving Items:", availableReceivingItemsList.length, availableReceivingItemsList);
        if (availableSendingItemsList.length === 0 || availableReceivingItemsList.length === 0) {
            logger.fatal("One of the item lists is empty after filtering. Cannot continue.");
            return;
        }
        const minSend = config.smartAlgo.minSendItems;
        const maxSend = Math.min(config.smartAlgo.maxSendItems, 4);
        const numOfItemsSend = randomInt(minSend, maxSend);
        let combo = null;
        if (config.smartAlgo.upgrade) {
            combo = generateUpgradeCombo(availableSendingItemsList, availableReceivingItemsList, numOfItemsSend, rolimonsValues, config.smartAlgo);
        } else if (config.smartAlgo.downgrade) {
            combo = generateDowngradeCombo(availableSendingItemsList, availableReceivingItemsList, numOfItemsSend, rolimonsValues, config.smartAlgo);
        } else if (config.smartAlgo.any) {
            combo = generateAnyCombo(availableSendingItemsList, availableReceivingItemsList, rolimonsValues, config.smartAlgo);
        }
        if (combo) {
            let tags = config.smartAlgo.tags || [];
            if (combo.type === "upgrade" && !tags.includes("upgrade")) tags.push("upgrade");
            if (combo.type === "downgrade" && !tags.includes("downgrade")) tags.push("downgrade");
            makeAd(combo.finalSendingItems, combo.finalRequestingItems, tags);
        } else {
            logger.fatal("No valid combo found for smart algo configuration.");
        }
    }
    await sleep(1500000);
    getItems();
}

setTimeout(function () {
    getItems();
}, 5000);

app.get("/", (req, res) => {
    res.json({ message: 'https://github.com/Arachnidd/rolimons-trade-ad/tree/main! || Make sure to star the github so i can continue making free things for the community ❤️\nTrade ad bot is up and running!' }); //verifies trade ad bot is up and running
})
app.listen(8080)
