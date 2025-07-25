// FLAGS //////////////////////////////////////////////////////////////////
let teamFlags = [
    "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
    "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
    "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
    "DE", "DJ", "DK", "DM", "DO", "DZ",
    "EC", "EE", "EG", "EH", "ER", "ES", "ET",
    "FI", "FJ", "FM", "FO", "FR",
    "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GT", "GU", "GW", "GY",
    "HK", "HM", "HN", "HR", "HT", "HU",
    "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
    "JE", "JM", "JO", "JP",
    "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
    "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
    "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
    "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
    "OM",
    "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
    "QA",
    "RE", "RO", "RS", "RU", "RW",
    "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
    "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
    "UA", "UG", "UM", "US", "UY", "UZ",
    "VA", "VC", "VE", "VG", "VI", "VN", "VU",
    "WF", "WS",
    "YE", "YT",
    "ZA", "ZM", "ZW"
];

// SOCKET /////////////////////////////////////////////////////////////////
let socket = new ReconnectingWebSocket("ws://localhost:24050/ws");
socket.onopen = () => {
    console.log("Successfully Connected");
};
socket.onclose = event => {
    console.log("Socket Closed Connection: ", event);
    socket.send("Client Closed!");
};
socket.onerror = error => {
    console.log("Socket Error: ", error);
};

// BEATMAP DATA /////////////////////////////////////////////////////////////////
let beatmapSet = [];
let beatmapsIds = [];
let stages = [];
let seedData = [];
let addFlags = [];
let currentStage;
(async () => {
    try {
        const jsonData = await $.getJSON("../../../_data/beatmaps_igts.json");
        jsonData.map((beatmap) => {
            beatmapSet.push(beatmap);
        });
        const jsonData_2 = await $.getJSON("../../../_data/seeding_igts.json");
        jsonData_2.Teams.map((seed) => {
            seedData.push(seed);
        });
        const jsonData_3 = await $.getJSON("../../../_data/stage_igts.json");
        jsonData_3.map((stage, index) => {
            if (index == 0) {
                currentStage = stage.currentStage;
            } else {
                stages.push(stage);
            }
        });
        const jsonData4 = await $.getJSON("../../../_data/additional_flags.json");
        jsonData4.map((flags) => {
            addFlags.push(flags);
        });
        initialized = true;
    } catch (error) {
        console.error("Could not read JSON file", error);
    }
    for (index = 0; index < beatmapSet.length; index++) {
        beatmapsIds.push(beatmapSet[index]["beatmapId"]);
    }
})();
console.log(beatmapSet);
console.log(stages);
console.log(currentStage);

// API /////////////////////////////////////////////////////////////////
const BASE = "https://lous-gts-proxy.louscmh.workers.dev";

// CLASSES ///////////////////////////////////////////////////////////////
class ScoreTracker {
    constructor() {
        this.currentState = 0;
        this.leftClients = [];
        this.rightClients = [];
    }
    addClient(client,isLeft) {
        if (isLeft) {
            this.leftClients.push(client);
        } else {
            this.rightClients.push(client);
        }
    }
    updateClients(data) {
        data.map(async(clientData,index) => {
            // console.log(index);
            const client = index < 4 ? this.leftClients[index] : this.rightClients[index-4];
            if (client) {
                client.updateMiss(clientData.gameplay.hits["0"]);
                client.updateGood(clientData.gameplay.hits["100"]);
                client.updateUr(clientData.gameplay.hits.unstableRate);
                client.updateScore(clientData.gameplay.score);
                client.updateCombo(clientData.gameplay.combo.current);
                client.updatePlayer(clientData.spectating.name);
            }
        })
    }
    getScores() {
        if (this.currentState != 3) return null,null;
        let left = 0;
        let right = 0;
        this.leftClients.map(async(client) => {
            left += client.score ?? 0;
        })
        this.rightClients.map(async(client) => {
            right += client.score ?? 0;
        })
        return [left,right];
    }
    updateState(state) {
        this.currentState = state;
    }
    reset() {
        this.leftClients.map(client => {
            client.reset();
        })
        this.rightClients.map(client => {
            client.reset();
        })
    }
    resultHide() {
        this.leftClients.map(client => {
            client.hideAllButUr();
        })
        this.rightClients.map(client => {
            client.hideAllButUr();
        })
    }
}

class Client {
    constructor(clientNumber) {
        this.animationScore;
        this.clientNumber = clientNumber;
        this.miss;
        this.good;
        this.ur;
        this.combo;
        this.player;
    }
    generate() {

        this.matchClientDetails = document.createElement("div");
        this.matchClientMissGlow = document.createElement("div");
        this.matchClientLeft = document.createElement("div");
        this.matchClientRight = document.createElement("div");
        this.matchClient100Container = document.createElement("div");
        this.matchClient100Text = document.createElement("div");
        this.matchClient100 = document.createElement("div");
        this.matchClientMissContainer = document.createElement("div");
        this.matchClientMissText = document.createElement("div");
        this.matchClientMiss = document.createElement("div");
        this.matchClientUrContainer = document.createElement("div");
        this.matchClientUrText = document.createElement("div");
        this.matchClientUr = document.createElement("div");
        this.matchClientNameContainer = document.createElement("div");
        this.matchClientName = document.createElement("div");
        
        this.matchClientDetails.id = `${this.clientNumber}CLIENTDETAILS`;
        this.matchClientMissGlow.id = `${this.clientNumber}CLIENTMISSGLOW`;
        this.matchClientLeft.id = `${this.clientNumber}CLIENTLEFT`;
        this.matchClientRight.id = `${this.clientNumber}CLIENTRIGHT`;
        this.matchClient100Container.id = `${this.clientNumber}CLIENT100CONT`;
        this.matchClient100Text.id = `${this.clientNumber}CLIENT100TEXT`;
        this.matchClient100.id = `${this.clientNumber}CLIENT100`;
        this.matchClientMissContainer.id = `${this.clientNumber}CLIENTMISSCONT`;
        this.matchClientMissText.id = `${this.clientNumber}CLIENTMISSTEXT`;
        this.matchClientMiss.id = `${this.clientNumber}CLIENTMISS`;
        this.matchClientUrContainer.id = `${this.clientNumber}CLIENTURCONT`;
        this.matchClientUrText.id = `${this.clientNumber}CLIENTURTEXT`;
        this.matchClientUr.id = `${this.clientNumber}CLIENTUR`;
        this.matchClientNameContainer.id = `${this.clientNumber}CLIENTNAMECONT`;
        this.matchClientName.id = `${this.clientNumber}CLIENTNAME`;

        this.matchClientDetails.setAttribute("class", "matchClientDetails");
        this.matchClientMissGlow.setAttribute("class", "matchClientMissGlow");
        this.matchClientLeft.setAttribute("class", "matchClientLeft");
        this.matchClientRight.setAttribute("class", "matchClientRight");
        this.matchClient100Container.setAttribute("class", "matchClient100");
        this.matchClient100Text.setAttribute("class", "matchClient100Text");
        this.matchClient100.setAttribute("class", "matchClientText");
        this.matchClientMissContainer.setAttribute("class", "matchClientMiss");
        this.matchClientMissText.setAttribute("class", "matchClientMissText");
        this.matchClientMiss.setAttribute("class", "matchClientText");
        this.matchClientUrContainer.setAttribute("class", "matchClientUr");
        this.matchClientUrText.setAttribute("class", "matchClientUrText");
        this.matchClientUr.setAttribute("class", "matchClientText");
        this.matchClientNameContainer.setAttribute("class", "matchClientName");

        this.matchClient100Text.innerHTML = "100";
        this.matchClientMissText.innerHTML = "MISS";
        this.matchClientUrText.innerHTML = "UR";
        this.matchClientName.innerHTML = "PLAYER";

        document.getElementById(`matchClient${this.clientNumber}`).appendChild(this.matchClientDetails);

        document.getElementById(this.matchClientDetails.id).appendChild(this.matchClientMissGlow);
        document.getElementById(this.matchClientDetails.id).appendChild(this.matchClientLeft);
        document.getElementById(this.matchClientDetails.id).appendChild(this.matchClientRight);
        
        document.getElementById(`${this.matchClientLeft.id}`).appendChild(this.matchClient100Container);
        document.getElementById(`${this.matchClientLeft.id}`).appendChild(this.matchClientMissContainer);
        document.getElementById(this.matchClientRight.id).appendChild(this.matchClientUrContainer);
        document.getElementById(this.matchClientRight.id).appendChild(this.matchClientNameContainer);

        document.getElementById(`${this.matchClient100Container.id}`).appendChild(this.matchClient100Text);
        document.getElementById(`${this.matchClient100Container.id}`).appendChild(this.matchClient100);

        document.getElementById(`${this.matchClientMissContainer.id}`).appendChild(this.matchClientMissText);
        document.getElementById(`${this.matchClientMissContainer.id}`).appendChild(this.matchClientMiss);

        document.getElementById(`${this.matchClientUrContainer.id}`).appendChild(this.matchClientUrText);
        document.getElementById(`${this.matchClientUrContainer.id}`).appendChild(this.matchClientUr);

        document.getElementById(`${this.matchClientNameContainer.id}`).appendChild(this.matchClientName);

        this.animationScore = {
            matchClient100: new CountUp(`${this.clientNumber}CLIENT100`, 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientMiss: new CountUp(`${this.clientNumber}CLIENTMISS`, 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientUr: new CountUp(`${this.clientNumber}CLIENTUR`, 0, 0, 2, 2, { useEasing: true, useGrouping: true, separator: "", decimal: "." })
        }
    }
    grayedOut() {
        this.overlay.style.opacity = '1';
    }
    updateScore(score) {
        if (score == this.score) return;
        this.score = score;
    }
    updateMiss(miss) {
        if (miss == this.miss) return;
        this.miss = miss;
        this.animationScore.matchClientMiss.update(this.miss);
    }
    updateGood(good) {
        if (good == this.good) return;
        this.good = good;
        this.animationScore.matchClient100.update(this.good);
    }
    updateUr(ur) {
        if (ur == this.ur) return;
        this.ur = ur;
        this.animationScore.matchClientUr.update(Number(ur) > 999.99 ? 999.99 : ur);
    }
    updateCombo(combo) {
        if (combo == this.combo) return;
        if (this.combo > 29 && combo < this.combo) this.flashMiss();
        this.combo = combo;
    }
    flashMiss() {
        let missFlash = document.getElementById(this.matchClientMissGlow.id);
        missFlash.style.animation = "glow 1.5s ease-in-out";
        setTimeout(function () {
            missFlash.style.animation = "none";
        }.bind(this), 1500);
    }
    updatePlayer(name) {
        if (name == this.player) return;
        const element = document.getElementById(this.matchClientName.id)
        element.innerHTML = name;
        adjustFont(element, 140, 24);
        this.player = name;
    }
    hideAllButUr() {
        this.matchClient100Container.style.opacity = 0;
        this.matchClientMissContainer.style.opacity = 0;
        this.matchClientUrContainer.style.opacity = 0;
        this.matchClientNameContainer.style.opacity = 1;
    }
    reset() {
        this.updateScore(0);
        this.updateMiss(0);
        this.updateGood(0);
        this.updateUr(0);
        this.updateCombo(0);
        this.matchClient100Container.style.opacity = 1;
        this.matchClientMissContainer.style.opacity = 1;
        this.matchClientUrContainer.style.opacity = 1;
        this.matchClientNameContainer.style.opacity = 1;
    }
}

// PLACEHOLDER VARS /////////////////////////////////////////////////////////////////
let generated = false;
let hasSetupBeatmaps = false;
let hasSetupPlayers = false;
let initialized = false;
let playersSetup = false;
let matchManager;
let tempLeft;
let leftTeam = "placeholder";
let preLoading = document.getElementById("preLoading");
const beatmapsStore = new Set(); // Store beatmapID;

// MAIN LOOP ////////////////////////////////////////////////////////////////////
socket.onmessage = async event => {
    if (!initialized) { return };
    let data = JSON.parse(event.data);

    if (!hasSetupBeatmaps) {
        setupBeatmaps();
        hasSetupBeatmaps = true;
    }

    if (!hasSetupBeatmaps) { return };

    // NORMAL CODE

    // tempLeft = data.tourney.manager.teamName.left;
    tempLeft = "MCD";

    if (tempLeft != leftTeam && tempLeft != "" && !playersSetup) {
        leftTeam = tempLeft;
        playersSetup = true;
        setTimeout(function (event) {
            // matchManager.updatePlayerId([data.tourney.manager.teamName.left, data.tourney.manager.teamName.right])
            matchManager.updatePlayerId(["MCD", "UTD"]);
        }, 150);
    }

    if (!hasSetupPlayers) { return };

    matchManager.checkState(data.tourney.manager.ipcState);
    matchManager.gameplayManager.updateProgress(data);
    matchManager.gameplayManager.updateClients(data, data.tourney.manager.bools.scoreVisible, data.tourney.manager.ipcState);
    matchManager.updateScores(data);
    matchManager.updateChat(data);
    matchManager.debug();

    let tempStats = [data.menu.bm.id, data.menu.bm.stats.memoryOD, data.menu.bm.stats.fullSR, data.menu.bm.stats.BPM.min, data.menu.bm.stats.BPM.max];
    if (matchManager.currentFile != data.menu.bm.path.file || !arraysEqual(matchManager.currentStats, tempStats)) {
        matchManager.currentFile = data.menu.bm.path.file;
        matchManager.currentStats = tempStats;
        matchManager.updateMatchSong(data);
    };


}

// CLASSES ////////////////////////////////////////////////////////////////////
class Beatmap {
    constructor(mods, beatmapID, layerName) {
        this.mods = mods;
        this.beatmapID = beatmapID;
        this.layerName = layerName;
        this.isBan = false;
        this.isPick = false;
        this.isWin = false;
        this.isWinPlayerOne;
        this.pickIndex;
        this.mapData;
        this.isPlayerOne;
    }
    generateOverview() {
        let mappoolContainer = document.getElementById(`overview${this.mods}`);

        this.clicker = document.createElement("div");
        this.clicker.id = `${this.layerName}Clicker`;
        this.clicker.setAttribute("class", "clickerOverview");

        mappoolContainer.appendChild(this.clicker);
        let clickerObj = document.getElementById(this.clicker.id);

        this.mapDetails = document.createElement("div");
        this.mapTitleContainer = document.createElement("div");
        this.mapTitle = document.createElement("div");
        this.mapArtistContainer = document.createElement("div");
        this.mapArtist = document.createElement("div");
        this.mapBottom = document.createElement("div");
        this.mapMapperContainer = document.createElement("div");
        this.mapMapperTitle = document.createElement("div");
        this.mapMapper = document.createElement("div");
        this.mapDifficultyContainer = document.createElement("div");
        this.mapDifficultyTitle = document.createElement("div");
        this.mapDifficulty = document.createElement("div");
        this.mapModpool = document.createElement("div");
        this.mapOverlay = document.createElement("div");
        this.mapSource = document.createElement("img");
        this.mapWinT1 = document.createElement("div");
        this.mapPlayerTextT1 = document.createElement("div");
        this.mapWinTextT1 = document.createElement("div");
        this.mapWinT2 = document.createElement("div");
        this.mapPlayerTextT2 = document.createElement("div");
        this.mapWinTextT2 = document.createElement("div");
        this.mapPickIcon = document.createElement("img");
        this.mapBanContainer = document.createElement("div");
        this.mapBanPlayer = document.createElement("img");
        this.mapBanText = document.createElement("div");
        this.mapPickText = document.createElement("div");

        this.mapDetails.id = `${this.layerName}mapDetailsOverview`;
        this.mapTitleContainer.id = `${this.layerName}mapTitleContainerOverview`;
        this.mapTitle.id = `${this.layerName}mapTitleOverview`;
        this.mapArtistContainer.id = `${this.layerName}mapArtistContainerOverview`;
        this.mapArtist.id = `${this.layerName}mapArtistOverview`;
        this.mapBottom.id = `${this.layerName}mapBottomOverview`;
        this.mapMapperContainer.id = `${this.layerName}mapMapperContainerOverview`;
        this.mapMapperTitle.id = `${this.layerName}mapMapperTitleOverview`;
        this.mapMapper.id = `${this.layerName}mapMapperOverview`;
        this.mapDifficultyContainer.id = `${this.layerName}mapDifficultyContainerOverview`;
        this.mapDifficultyTitle.id = `${this.layerName}mapDifficultyTitleOverview`;
        this.mapDifficulty.id = `${this.layerName}mapDifficultyOverview`;
        this.mapModpool.id = `${this.layerName}mapModpoolOverview`;
        this.mapOverlay.id = `${this.layerName}mapOverlayOverview`;
        this.mapSource.id = `${this.layerName}mapSourceOverview`;
        this.mapWinT1.id = `${this.layerName}mapWinT1`;
        this.mapPlayerTextT1.id = `${this.layerName}mapPlayerTextT1`;
        this.mapWinTextT1.id = `${this.layerName}mapWinTextT1`;
        this.mapWinT2.id = `${this.layerName}mapWinT2`;
        this.mapPlayerTextT2.id = `${this.layerName}mapPlayerTextT2`;
        this.mapWinTextT2.id = `${this.layerName}mapWinTextT2`;
        this.mapPickIcon.id = `${this.layerName}mapPickIcon`;
        this.mapBanContainer.id = `${this.layerName}mapBanContainer`;
        this.mapBanPlayer.id = `${this.layerName}mapBanPlayer`;
        this.mapBanText.id = `${this.layerName}mapBanText`;
        this.mapPickText.id = `${this.layerName}mapPickText`;

        this.mapDetails.setAttribute("class", "mapDetailsOverview");
        this.mapTitleContainer.setAttribute("class", "mapTitleContainerOverview");
        this.mapTitle.setAttribute("class", "mapTitleOverview");
        this.mapArtistContainer.setAttribute("class", "mapArtistContainerOverview");
        this.mapArtist.setAttribute("class", "mapArtistOverview");
        this.mapBottom.setAttribute("class", "mapBottomOverview");
        this.mapMapperContainer.setAttribute("class", "mapMapperContainerOverview");
        this.mapMapperTitle.setAttribute("class", "mapMapperTitleOverview");
        this.mapMapper.setAttribute("class", "mapMapperOverview");
        this.mapDifficultyContainer.setAttribute("class", "mapDifficultyContainerOverview");
        this.mapDifficultyTitle.setAttribute("class", "mapDifficultyTitleOverview");
        this.mapDifficulty.setAttribute("class", "mapDifficultyOverview");
        this.mapModpool.setAttribute("class", "mapModpoolOverview");
        this.mapOverlay.setAttribute("class", "mapOverlayOverview");
        this.mapSource.setAttribute("class", "mapSourceOverview");
        this.mapWinT1.setAttribute("class", "mapWin");
        this.mapPlayerTextT1.setAttribute("class", "mapPlayerText");
        this.mapWinTextT1.setAttribute("class", "mapWinText");
        this.mapWinT2.setAttribute("class", "mapWin");
        this.mapPlayerTextT2.setAttribute("class", "mapPlayerText");
        this.mapWinTextT2.setAttribute("class", "mapWinText");
        this.mapPickIcon.setAttribute("class", "mapPickIcon");
        this.mapBanContainer.setAttribute("class", "mapBanContainer");
        this.mapBanPlayer.setAttribute("class", "mapBanPlayer");
        this.mapBanText.setAttribute("class", "mapBanText");
        this.mapPickText.setAttribute("class", "mapPickText");

        this.mapModpool.innerHTML = this.mods;
        this.mapMapperTitle.innerHTML = "MAPPED BY";
        this.mapDifficultyTitle.innerHTML = "DIFFICULTY";
        this.mapPlayerTextT1.innerHTML = "T1";
        this.mapPlayerTextT2.innerHTML = "T2";
        this.mapWinT1.innerHTML = "WIN";
        this.mapWinT2.innerHTML = "WIN";
        this.mapBanText.innerHTML = "BAN";
        this.mapPickText.innerHTML = "PICK";
        this.mapSource.setAttribute('src', "../../../_shared_assets/design/igts/main_banner.png");
        this.mapPickIcon.setAttribute('src', "../../../_shared_assets/design/igts/pick_arrow_overview.png");
        this.mapBanPlayer.setAttribute('src', "../../../_shared_assets/design/igts/main_banner.png");

        clickerObj.appendChild(this.mapPickText);
        clickerObj.appendChild(this.mapBanContainer);
        clickerObj.appendChild(this.mapDetails);
        clickerObj.appendChild(this.mapWinT1);
        clickerObj.appendChild(this.mapWinT2);
        clickerObj.appendChild(this.mapModpool);
        clickerObj.appendChild(this.mapOverlay);
        clickerObj.appendChild(this.mapSource);
        clickerObj.appendChild(this.mapPickIcon);

        document.getElementById(this.mapBanContainer.id).appendChild(this.mapBanPlayer);
        document.getElementById(this.mapBanContainer.id).appendChild(this.mapBanText);

        document.getElementById(this.mapWinT1.id).appendChild(this.mapPlayerTextT1);
        document.getElementById(this.mapWinT1.id).appendChild(this.mapWinTextT1);
        document.getElementById(this.mapWinT2.id).appendChild(this.mapPlayerTextT2);
        document.getElementById(this.mapWinT2.id).appendChild(this.mapWinTextT2);

        document.getElementById(this.mapDetails.id).appendChild(this.mapTitleContainer);
        document.getElementById(this.mapDetails.id).appendChild(this.mapArtistContainer);
        document.getElementById(this.mapDetails.id).appendChild(this.mapBottom);

        document.getElementById(this.mapTitleContainer.id).appendChild(this.mapTitle);
        document.getElementById(this.mapArtistContainer.id).appendChild(this.mapArtist);

        document.getElementById(this.mapBottom.id).appendChild(this.mapMapperContainer);
        document.getElementById(this.mapBottom.id).appendChild(this.mapDifficultyContainer);
        document.getElementById(this.mapMapperContainer.id).appendChild(this.mapMapperTitle);
        document.getElementById(this.mapMapperContainer.id).appendChild(this.mapMapper);
        document.getElementById(this.mapDifficultyContainer.id).appendChild(this.mapDifficultyTitle);
        document.getElementById(this.mapDifficultyContainer.id).appendChild(this.mapDifficulty);
    }
    generateQueue(isPlayerOne, isBan = false) {
        let player = isPlayerOne ? "playerOne" : "playerTwo";
        let queueContainer = this.mods == "TB" ? document.getElementById("tbQueue") : document.getElementById(`${player}${isBan ? "Ban" : "Queue"}`);

        this.clickerQueue = document.createElement("div");
        this.clickerQueue.id = `${this.layerName}ClickerQueue`;
        this.clickerQueue.setAttribute("class", "clickerQueue");

        queueContainer.appendChild(this.clickerQueue);
        let clickerObjQueue = document.getElementById(this.clickerQueue.id);

        this.mapDetailsQueue = document.createElement("div");
        this.mapTitleContainerQueue = document.createElement("div");
        this.mapTitleQueue = document.createElement("div");
        this.mapArtistContainerQueue = document.createElement("div");
        this.mapArtistQueue = document.createElement("div");
        this.mapBottomQueue = document.createElement("div");
        this.mapMapperContainerQueue = document.createElement("div");
        this.mapMapperTitleQueue = document.createElement("div");
        this.mapMapperQueue = document.createElement("div");
        this.mapDifficultyContainerQueue = document.createElement("div");
        this.mapDifficultyTitleQueue = document.createElement("div");
        this.mapDifficultyQueue = document.createElement("div");
        this.mapModpoolQueue = document.createElement("div");
        this.mapOverlayQueue = document.createElement("div");
        this.mapSourceQueue = document.createElement("img");
        this.mapWinT1Queue = document.createElement("div");
        this.mapPlayerTextT1Queue = document.createElement("div");
        this.mapWinTextT1Queue = document.createElement("div");
        this.mapWinT2Queue = document.createElement("div");
        this.mapPlayerTextT2Queue = document.createElement("div");
        this.mapWinTextT2Queue = document.createElement("div");
        this.mapPickQueue = document.createElement("img");

        this.mapDetailsQueue.id = `${this.layerName}mapDetailsOverviewQueue`;
        this.mapTitleContainerQueue.id = `${this.layerName}mapTitleContainerOverviewQueue`;
        this.mapTitleQueue.id = `${this.layerName}mapTitleOverviewQueue`;
        this.mapArtistContainerQueue.id = `${this.layerName}mapArtistContainerOverviewQueue`;
        this.mapArtistQueue.id = `${this.layerName}mapArtistOverviewQueue`;
        this.mapBottomQueue.id = `${this.layerName}mapBottomOverviewQueue`;
        this.mapMapperContainerQueue.id = `${this.layerName}mapMapperContainerOverviewQueue`;
        this.mapMapperTitleQueue.id = `${this.layerName}mapMapperTitleOverviewQueue`;
        this.mapMapperQueue.id = `${this.layerName}mapMapperOverviewQueue`;
        this.mapDifficultyContainerQueue.id = `${this.layerName}mapDifficultyContainerOverviewQueue`;
        this.mapDifficultyTitleQueue.id = `${this.layerName}mapDifficultyTitleOverviewQueue`;
        this.mapDifficultyQueue.id = `${this.layerName}mapDifficultyOverviewQueue`;
        this.mapModpoolQueue.id = `${this.layerName}mapModpoolOverviewQueue`;
        this.mapOverlayQueue.id = `${this.layerName}mapOverlayOverviewQueue`;
        this.mapSourceQueue.id = `${this.layerName}mapSourceOverviewQueue`;
        this.mapWinT1Queue.id = `${this.layerName}mapWinT1Queue`;
        this.mapPlayerTextT1Queue.id = `${this.layerName}mapPlayerTextT1Queue`;
        this.mapWinTextT1Queue.id = `${this.layerName}mapWinTextT1Queue`;
        this.mapWinT2Queue.id = `${this.layerName}mapWinT2Queue`;
        this.mapPlayerTextT2Queue.id = `${this.layerName}mapPlayerTextT2Queue`;
        this.mapWinTextT2Queue.id = `${this.layerName}mapWinTextT2Queue`;
        this.mapPickQueue.id = `${this.layerName}mapPickQueue`;

        this.mapDetailsQueue.setAttribute("class", "mapDetailsOverview");
        this.mapTitleContainerQueue.setAttribute("class", "mapTitleContainerOverview");
        this.mapTitleQueue.setAttribute("class", "mapTitleOverview");
        this.mapArtistContainerQueue.setAttribute("class", "mapArtistContainerOverview");
        this.mapArtistQueue.setAttribute("class", "mapArtistOverview");
        this.mapBottomQueue.setAttribute("class", "mapBottomOverview");
        this.mapMapperContainerQueue.setAttribute("class", "mapMapperContainerOverview");
        this.mapMapperTitleQueue.setAttribute("class", "mapMapperTitleOverview");
        this.mapMapperQueue.setAttribute("class", "mapMapperOverview");
        this.mapDifficultyContainerQueue.setAttribute("class", "mapDifficultyContainerOverview");
        this.mapDifficultyTitleQueue.setAttribute("class", "mapDifficultyTitleOverview");
        this.mapDifficultyQueue.setAttribute("class", "mapDifficultyOverview");
        this.mapModpoolQueue.setAttribute("class", "mapModpoolOverview");
        this.mapOverlayQueue.setAttribute("class", "mapOverlayOverview");
        this.mapSourceQueue.setAttribute("class", "mapSourceOverview");
        this.mapWinT1Queue.setAttribute("class", "mapWin");
        this.mapPlayerTextT1Queue.setAttribute("class", "mapPlayerText");
        this.mapWinTextT1Queue.setAttribute("class", "mapWinText");
        this.mapWinT2Queue.setAttribute("class", "mapWin");
        this.mapPlayerTextT2Queue.setAttribute("class", "mapPlayerText");
        this.mapWinTextT2Queue.setAttribute("class", "mapWinText");
        this.mapPickQueue.setAttribute("class", isPlayerOne ? "mapPickIconQueueLeft" : "mapPickIconQueueRight");

        this.mapModpoolQueue.innerHTML = this.mods;
        this.mapMapperTitleQueue.innerHTML = "MAPPED BY";
        this.mapDifficultyTitleQueue.innerHTML = "DIFFICULTY";
        this.mapPlayerTextT1Queue.innerHTML = "T1";
        this.mapPlayerTextT2Queue.innerHTML = "T2";
        this.mapWinT1Queue.innerHTML = "WIN";
        this.mapWinT2Queue.innerHTML = "WIN";
        this.mapSourceQueue.setAttribute("src", this.mapSource.src);
        this.mapTitleQueue.innerHTML = this.mapTitle.innerHTML;
        this.mapArtistQueue.innerHTML = this.mapArtist.innerHTML;
        this.mapMapperQueue.innerHTML = this.mapMapper.innerHTML;
        this.mapDifficultyQueue.innerHTML = this.mapDifficulty.innerHTML;
        this.mapPickQueue.setAttribute("src", `../../../_shared_assets/design/igts/pick_queue_${isPlayerOne ? "left" : "right"}.png`);

        clickerObjQueue.appendChild(this.mapDetailsQueue);
        clickerObjQueue.appendChild(this.mapWinT1Queue);
        clickerObjQueue.appendChild(this.mapWinT2Queue);
        clickerObjQueue.appendChild(this.mapPickQueue);
        clickerObjQueue.appendChild(this.mapModpoolQueue);
        clickerObjQueue.appendChild(this.mapOverlayQueue);
        clickerObjQueue.appendChild(this.mapSourceQueue);

        document.getElementById(this.mapWinT1Queue.id).appendChild(this.mapPlayerTextT1Queue);
        document.getElementById(this.mapWinT1Queue.id).appendChild(this.mapWinTextT1Queue);
        document.getElementById(this.mapWinT2Queue.id).appendChild(this.mapPlayerTextT2Queue);
        document.getElementById(this.mapWinT2Queue.id).appendChild(this.mapWinTextT2Queue);

        document.getElementById(this.mapDetailsQueue.id).appendChild(this.mapTitleContainerQueue);
        document.getElementById(this.mapDetailsQueue.id).appendChild(this.mapArtistContainerQueue);
        document.getElementById(this.mapDetailsQueue.id).appendChild(this.mapBottomQueue);

        document.getElementById(this.mapTitleContainerQueue.id).appendChild(this.mapTitleQueue);
        document.getElementById(this.mapArtistContainerQueue.id).appendChild(this.mapArtistQueue);

        document.getElementById(this.mapBottomQueue.id).appendChild(this.mapMapperContainerQueue);
        document.getElementById(this.mapBottomQueue.id).appendChild(this.mapDifficultyContainerQueue);
        document.getElementById(this.mapMapperContainerQueue.id).appendChild(this.mapMapperTitleQueue);
        document.getElementById(this.mapMapperContainerQueue.id).appendChild(this.mapMapperQueue);
        document.getElementById(this.mapDifficultyContainerQueue.id).appendChild(this.mapDifficultyTitleQueue);
        document.getElementById(this.mapDifficultyContainerQueue.id).appendChild(this.mapDifficultyQueue);

        this.clickerQueue.style.animation = `${isPlayerOne ? "fadeInRight" : "fadeInLeft"} 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)`;
        this.clickerQueue.style.opacity = 1;
        if (!this.isBan) {
            this.mapPickIcon.style.transform = `${isPlayerOne ? "fadeInRight" : "fadeInLeft"} 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)`;
            this.mapPickQueue.style.opacity = this.mods == "TB" ? 0 : 1;
        }
    }

    generateResult(isPlayerOne, isBan = false, leftIsTop = false) {
        let player = leftIsTop ? isPlayerOne ? "One" : "Two" : isPlayerOne ? "Two" : "One";
        let resultQueue = this.mods == "TB" ? document.getElementById("resultPickTb") : document.getElementById(`result${isBan ? "Ban" : `Pick${player}`}`);

        this.clickerResults = document.createElement("div");
        this.clickerResults.id = `${this.layerName}resultContainer`;
        this.clickerResults.setAttribute("class", "resultContainer");

        resultQueue.appendChild(this.clickerResults);
        let resultContainer = document.getElementById(this.clickerResults.id);

        this.resultContainerSong = document.createElement("div");
        this.resultContainerPick = document.createElement("div");
        this.resultContainerSource = document.createElement("img");
        this.resultContainerBottom = document.createElement("div");
        this.resultContainerPlayer = document.createElement("div");
        this.resultContainerText = document.createElement("div");

        this.resultContainerSong.id = `${this.layerName}resultContainerSong`;
        this.resultContainerPick.id = `${this.layerName}resultContainerPick`;
        this.resultContainerSource.id = `${this.layerName}resultContainerSource`;
        this.resultContainerBottom.id = `${this.layerName}resultContainerBottom`;
        this.resultContainerPlayer.id = `${this.layerName}resultContainerPlayer`;
        this.resultContainerText.id = `${this.layerName}resultContainerText`;

        this.resultContainerSong.setAttribute("class", "resultContainerSong");
        this.resultContainerPick.setAttribute("class", "resultContainerPick");
        this.resultContainerSource.setAttribute("class", "resultContainerSource");
        this.resultContainerBottom.setAttribute("class", "resultContainerBottom");
        this.resultContainerPlayer.setAttribute("class", "resultContainerPlayer");
        this.resultContainerText.setAttribute("class", "resultContainerText");

        this.resultContainerPick.innerHTML = beatmapSet.find(beatmap => beatmap.beatmapId == this.beatmapID)["pick"];
        this.resultContainerSource.setAttribute("src", this.mapSource.src);
        this.resultContainerPlayer.innerHTML = isPlayerOne ? "T1" : "T2";
        this.resultContainerText.innerHTML = isBan ? "BAN" : "WIN";

        resultContainer.appendChild(this.resultContainerSong);
        resultContainer.appendChild(this.resultContainerBottom);

        document.getElementById(this.resultContainerSong.id).appendChild(this.resultContainerPick);
        document.getElementById(this.resultContainerSong.id).appendChild(this.resultContainerSource);

        document.getElementById(this.resultContainerBottom.id).appendChild(this.resultContainerPlayer);
        document.getElementById(this.resultContainerBottom.id).appendChild(this.resultContainerText);
    }

    async toggleBan(acronym = "MY", isPlayerOne, pickIndex) {
        if (this.isPick || this.mods == "TB" || this.isBan) return;
        const teamFlag = await getCountryFlag(acronym);
        this.isBan = true;
        this.pickIndex = pickIndex;
        this.mapBanPlayer.setAttribute("src", teamFlag);
        setTimeout(function () {
            this.mapBanContainer.style.opacity = 1;
            this.mapBanText.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapBanPlayer.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.generateQueue(isPlayerOne, true);
            this.generateResult(isPlayerOne, true);
        }.bind(this), 100);
    }

    togglePick(isPlayerOne = true, pickIndex, resultLeftOnTop = false) {
        if (this.isBan || this.isPick) return;
        this.isPick = true;
        this.pickIndex = pickIndex;
        this.isPlayerOne = isPlayerOne;
        if (this.mods != "TB") {
            if (isPlayerOne) {
                this.mapPickText.innerHTML = "T1 PICK";
            } else {
                this.mapPickText.innerHTML = "T2 PICK";
            }
            this.mapPickText.style.opacity = 1;
            this.mapPickText.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        }
        this.mapPickIcon.style.opacity = 1;
        this.mapPickIcon.style.animation = "fadeInPickIcon 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.generateQueue(isPlayerOne, false);
        this.generateResult(isPlayerOne, false, resultLeftOnTop);
    }

    toggleWin(isPlayerOne = true) {
        if (this.isBan || !this.isPick) return;
        this.isWin = true;
        this.isWinPlayerOne = isPlayerOne;
        if (isPlayerOne) {
            this.mapWinT1.style.opacity = 1;
            this.mapWinT1.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinT2.style.opacity = 0;
            this.mapWinT2.style.animation = "";
            this.mapWinT2.style.backgroundColor = "white";
            this.mapWinT1Queue.style.opacity = 1;
            this.mapWinT1Queue.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinT2Queue.style.opacity = 0;
            this.mapWinT2Queue.style.animation = "";
            this.mapWinT2Queue.style.backgroundColor = "white";
            this.resultContainerPlayer.innerHTML = "T1";
            if (this.mods != "TB") {
                this.resultContainerText.style.backgroundColor = this.isPlayerOne ? "#d0ffcc" : "#ffcccc";
                this.mapWinT1Queue.style.backgroundColor = this.isPlayerOne ? "#d0ffcc" : "#ffcccc";
                this.mapWinT1.style.backgroundColor = this.isPlayerOne ? "#d0ffcc" : "#ffcccc";
            }
        } else {
            this.mapWinT2.style.opacity = 1;
            this.mapWinT2.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinT1.style.opacity = 0;
            this.mapWinT1.style.animation = "";
            this.mapWinT1.style.backgroundColor = "white";
            this.mapWinT2Queue.style.opacity = 1;
            this.mapWinT2Queue.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinT1Queue.style.opacity = 0;
            this.mapWinT1Queue.style.animation = "";
            this.mapWinT1Queue.style.backgroundColor = "white";
            this.resultContainerPlayer.innerHTML = "T2";
            if (this.mods != "TB") {
                this.resultContainerText.style.backgroundColor = this.isPlayerOne ? "#ffcccc" : "#d0ffcc";
                this.mapWinT2.style.backgroundColor = this.isPlayerOne ? "#ffcccc" : "#d0ffcc";
                this.mapWinT2Queue.style.backgroundColor = this.isPlayerOne ? "#ffcccc" : "#d0ffcc";
            }
        }
    }

    cancelOperation(pickIndex) {
        if (this.isPick && pickIndex == this.pickIndex) {
            if (this.mods != "TB") {
                this.clickerQueue.style.opacity = 0;
                this.clickerResults.style.opacity = 0;
                setTimeout(function () {
                    this.clickerQueue.remove();
                    this.clickerResults.remove();
                }.bind(this), 500);
            }
            this.mapPickText.style.opacity = 0;
            this.mapPickText.style.animation = "";
            this.mapPickIcon.style.opacity = 0;
            this.mapPickIcon.style.animation = "";
            this.mapWinT1.style.opacity = 0;
            this.mapWinT1.style.animation = "";
            this.mapWinT2.style.opacity = 0;
            this.mapWinT2.style.animation = "";
            this.pickIndex = null;
            this.isPick = false;
            this.isWin = false;
            this.isWinPlayerOne = null;
            this.isPlayerOne = null;
        } if (this.isBan && pickIndex == this.pickIndex) {
            this.clickerQueue.style.opacity = 0;
            this.clickerResults.style.opacity = 0;
            setTimeout(function () {
                this.clickerQueue.remove();
                this.clickerResults.remove();
            }.bind(this), 500);
            this.mapBanContainer.style.opacity = 0;
            this.mapBanText.style.animation = "";
            this.mapBanPlayer.style.animation = "";
            this.isBan = false;
        }
    }
}

class MatchManager {
    constructor(beatmapSet) {
        this.beatmapSet = beatmapSet;
        this.overviewBeatmaps = [];
        this.pickCount = 2;
        this.leftWins = 0;
        this.rightWins = 0;
        this.playerTurn = "left";
        this.banCount = 2;
        this.leftPlayerData;
        this.rightPlayerData;
        this.currentMappoolScene = 1;
        this.currentFile;
        this.currentStats = [];
        this.scoreOne;
        this.scoreTwo;
        this.bestOf;

        this.hasBanned = true;
        this.togglePickVar = false;
        this.mappoolSwitchVar = true;
        this.matchSwitchVar = true;
        this.introSwitchVar = true;
        this.resultSwitchVar = false;
        this.currentMatchScene = false;
        this.currentIntroScene = 0;
        this.currentResultScene = false;
        this.autoPicker = true;
        this.autoScene = true;

        this.gameplayManager = new GameplayManager;
        this.resultsManager = new ResultsManager;
        this.historyManager;
        this.currentState;
        this.chatLen = 0;

        this.mappoolOverview = document.getElementById("mappoolContainer");
        this.mappoolQueue = document.getElementById("mappoolQueue");
        this.mappoolUpcoming = document.getElementById("mappoolUpcoming");
        this.mappoolScene = document.getElementById("mappoolScene");

        this.upcomingPickId = document.getElementById("upcomingPickId");
        this.upcomingSongText = document.getElementById("upcomingSongText");
        this.upcomingArtistText = document.getElementById("upcomingArtistText");
        this.upcomingCollabTag = document.getElementById("upcomingCollabTag");
        this.upcomingCustomTag = document.getElementById("upcomingCustomTag");
        this.upcomingSrText = document.getElementById("upcomingSrText");
        this.upcomingOdText = document.getElementById("upcomingOdText");
        this.upcomingBpmText = document.getElementById("upcomingBpmText");
        this.upcomingLengthText = document.getElementById("upcomingLengthText");
        this.upcomingMapperText = document.getElementById("upcomingMapperText");
        this.upcomingDifficultyText = document.getElementById("upcomingDifficultyText");
        this.upcomingSource = document.getElementById("upcomingSource");
        this.upcomingPickPlayerSource = document.getElementById("upcomingPickPlayerSource");
        this.upcomingPickPlayer = document.getElementById("upcomingPickPlayer");

        this.matchPickId = document.getElementById("matchPickId");
        this.matchSource = document.getElementById("matchSource");
        this.matchSongTitle = document.getElementById("matchSongTitle");
        this.matchSongTitleDelay = document.getElementById("matchSongTitleDelay");
        this.matchArtistTitle = document.getElementById("matchArtistTitle");
        this.matchMapperTitle = document.getElementById("matchMapperTitle");
        this.matchDifficultyTitle = document.getElementById("matchDifficultyTitle");

        this.bottomPlayerOnePfp = document.getElementById("bottomPlayerOnePfp");
        this.bottomPlayerTwoPfp = document.getElementById("bottomPlayerTwoPfp");
        this.bottomPlayerOneName = document.getElementById("bottomPlayerOneName");
        this.bottomPlayerTwoName = document.getElementById("bottomPlayerTwoName");
        this.bottomPlayerOneSeed = document.getElementById("bottomPlayerOneSeed");
        this.bottomPlayerTwoSeed = document.getElementById("bottomPlayerTwoSeed");
        this.bottomScoreLeft = document.getElementById("bottomScoreLeft");
        this.bottomScoreRight = document.getElementById("bottomScoreRight");
        this.bottomT1Pick = document.getElementById("bottomT1Pick");
        this.bottomT2Pick = document.getElementById("bottomT2Pick");
        this.bottomT1PickText = document.getElementById("bottomT1PickText");
        this.bottomT2PickText = document.getElementById("bottomT2PickText");

        this.effectsShimmer = document.getElementById("effectsShimmer");

        this.matchScene = document.getElementById("matchScene");
        this.bottomT1Text = document.getElementById("bottomT1Text");
        this.bottomT2Text = document.getElementById("bottomT2Text");
        this.bottomPlayerOnePick = document.getElementById("bottomPlayerOnePick");
        this.bottomPlayerTwoPick = document.getElementById("bottomPlayerTwoPick");

        this.matchSongSr = document.getElementById("matchSongSr");
        this.matchSongOd = document.getElementById("matchSongOd");
        this.matchSongBpm = document.getElementById("matchSongBpm");
        this.matchSongLength = document.getElementById("matchSongLength");

        this.bg = document.getElementById("bg");
        this.bg_match = document.getElementById("bg_match");

        this.chats = document.getElementById("chats");
        this.chatsDebug = document.getElementById("chatsDebug");
        this.matchStage = document.getElementById("matchStage");
        this.mainMatchScene = document.getElementById("mainMatchScene");
        this.matchBottom = document.getElementById("matchBottom");
        this.matchTop = document.getElementById("matchTop");

        this.introPlayerOnePfp = document.getElementById("introPlayerOnePfp");
        this.introPlayerTwoPfp = document.getElementById("introPlayerTwoPfp");
        this.introPlayerOneName = document.getElementById("introPlayerOneName");
        this.introPlayerTwoName = document.getElementById("introPlayerTwoName");
        this.introPlayerOneSeed = document.getElementById("introPlayerOneSeed");
        this.introPlayerTwoSeed = document.getElementById("introPlayerTwoSeed");
        this.introPlayerOneRoster = document.getElementById("introPlayerOneRoster");
        this.introPlayerTwoRoster = document.getElementById("introPlayerTwoRoster");
        this.introScene = document.getElementById("introScene");

        this.matchHistoryLeftPlayerSource = document.getElementById("matchHistoryLeftPlayerSource");
        this.matchHistoryLeftPlayerName = document.getElementById("matchHistoryLeftPlayerName");
        this.matchHistoryLeftPlayerSeed = document.getElementById("matchHistoryLeftPlayerSeed");
        this.matchHistoryRightPlayerSource = document.getElementById("matchHistoryRightPlayerSource");
        this.matchHistoryLightPlayerName = document.getElementById("matchHistoryRightPlayerName");
        this.matchHistoryRightPlayerSeed = document.getElementById("matchHistoryRightPlayerSeed");
        this.matchHistoryScene = document.getElementById("matchHistoryScene");

        this.resultScene = document.getElementById("resultScene");

        this.controllerTurn = document.getElementById("controllerTurn");
        this.controllerTurn.addEventListener("click", async (event) => {
            if (this.playerTurn == "left") {
                if (this.hasBanned && this.banCount < 2) {
                    this.hasBanned = false;
                    this.controllerTurn.innerHTML = `Left Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomT1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT1Pick.style.opacity = 1;
                    this.bottomT2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT2Pick.style.opacity = 0;
                } else if (this.hasBanned || this.banCount < 2) {
                    this.playerTurn = "right";
                    this.controllerTurn.innerHTML = `Right Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    if (this.hasBanned) {
                        this.bottomT1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT1Pick.style.opacity = 0;
                        this.bottomT2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT2Pick.style.opacity = 0;
                    } else {
                        this.bottomT2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT2Pick.style.opacity = 1;
                        this.bottomT1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT1Pick.style.opacity = 0;
                    }
                } else {
                    this.hasBanned = true;
                    this.controllerTurn.innerHTML = `Left Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomT1Pick.style.animation = "pickingBob 1s cubic-bezier(0,.7,.39,.99)";
                }
            } else {
                if (this.hasBanned && this.banCount < 2) {
                    this.hasBanned = false;
                    this.controllerTurn.innerHTML = `Right Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomT2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT2Pick.style.opacity = 1;
                    this.bottomT1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT1Pick.style.opacity = 0;
                } else if (this.hasBanned || this.banCount < 2) {
                    this.playerTurn = "left";
                    this.controllerTurn.innerHTML = `Left Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    if (this.hasBanned) {
                        this.bottomT1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT1Pick.style.opacity = 0;
                        this.bottomT2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT2Pick.style.opacity = 0;
                    } else {
                        this.bottomT1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT1Pick.style.opacity = 1;
                        this.bottomT2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT2Pick.style.opacity = 0;
                    }
                } else {
                    this.hasBanned = true;
                    this.controllerTurn.innerHTML = `Right Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomT2Pick.style.animation = "pickingBob 1s cubic-bezier(0,.7,.39,.99)";
                }
            }
            this.bottomT1PickText.innerHTML = this.banCount < 2 ? "Currently Banning" : "Currently Picking";
            this.bottomT2PickText.innerHTML = this.banCount < 2 ? "Currently Banning" : "Currently Picking";
        });

        this.controllerUndo = document.getElementById("controllerUndo");
        this.controllerUndo.addEventListener("click", async (event) => {
            let deletedPick;
            if (this.pickCount > 2) {
                deletedPick = this.overviewBeatmaps.find(overviewBeatmap => overviewBeatmap.pickIndex == this.pickCount && overviewBeatmap.isPick);
                deletedPick.isWin ? deletedPick.isWinPlayerOne ? this.leftWins-- : this.rightWins-- : null;
                deletedPick.cancelOperation(this.pickCount);
                this.pickCount--;
                this.controllerTurn.click();
            } else if (this.pickCount <= 2 & this.banCount > 0) {
                deletedPick = this.overviewBeatmaps.find(overviewBeatmap => overviewBeatmap.pickIndex == this.pickCount && overviewBeatmap.isBan);
                deletedPick.isWin ? deletedPick.isWinPlayerOne ? this.leftWins-- : this.rightWins-- : null;
                deletedPick.cancelOperation(this.pickCount);
                this.pickCount--;
                this.banCount--;
                this.controllerTurn.click();
            }
        });

        this.controllerArrow = document.getElementById("controllerArrow");
        this.controllerArrow.addEventListener("click", async (event) => {
            if (!this.togglePickVar) return;
            this.unpulseOverview("");
            if (!this.currentMatchScene && (this.bestOf - 1) * 2 != this.pickCount - 2 && (this.scoreOne != this.bestOf && this.scoreTwo != this.bestOf && this.leftWins != this.bestOf && this.rightWins != this.bestOf)) {
                if (this.playerTurn == "left") {
                    this.bottomT1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT1Pick.style.opacity = 1;
                } else if (this.playerTurn == "right") {
                    this.bottomT2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT2Pick.style.opacity = 1;
                }
            }
            this.bottomPlayerOnePick.style.opacity = 0;
            this.bottomPlayerTwoPick.style.opacity = 0;
            this.dimButton(this.controllerArrow);
            this.togglePickVar = false;
        });

        this.controllerMappool = document.getElementById("controllerMappool");
        this.controllerMappool.addEventListener("click", async (event) => {
            if (this.mappoolSwitchVar) {
                this.dimButton(this.controllerMappool);
                this.mappoolSwitchVar = false;
                if (this.currentMappoolScene == 1) {
                    this.controllerMappool.innerHTML = "Mappool Scene (2/3)";
                    this.currentMappoolScene = 2;
                    this.mappoolOverview.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.mappoolOverview.style.opacity = 0;
                    setTimeout(function () {
                        this.mappoolUpcoming.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.mappoolUpcoming.style.opacity = 1;
                    }.bind(this), 1000);
                } else if (this.currentMappoolScene == 2) {
                    this.controllerMappool.innerHTML = "Mappool Scene (3/3)";
                    this.currentMappoolScene = 3;
                    this.mappoolUpcoming.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.mappoolUpcoming.style.opacity = 0;
                    setTimeout(function () {
                        this.mappoolQueue.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.mappoolQueue.style.opacity = 1;
                    }.bind(this), 1000);
                } else if (this.currentMappoolScene == 3) {
                    this.controllerMappool.innerHTML = "Mappool Scene (1/3)";
                    this.currentMappoolScene = 1;
                    this.mappoolQueue.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.mappoolQueue.style.opacity = 0;
                    setTimeout(function () {
                        this.mappoolOverview.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.mappoolOverview.style.opacity = 1;
                    }.bind(this), 1000);
                }
                setTimeout(function () {
                    this.undimButton(this.controllerMappool);
                    this.mappoolSwitchVar = true;
                }.bind(this), 2000);
            }
        });

        this.controllerMatch = document.getElementById("controllerMatch");
        this.controllerMatch.addEventListener("click", async (event) => {
            if (!this.matchSwitchVar) return;
            this.dimButton(this.controllerMatch);
            this.matchSwitchVar = false;
            if (this.currentMatchScene) {
                this.controllerMatch.innerHTML = "Switch to Gameplay";
                this.currentMatchScene = false;
                this.gameplayManager.hideGameplay();
                setTimeout(function () {
                    this.mappoolScene.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.mappoolScene.style.opacity = 1;
                    if (!this.togglePickVar && (this.bestOf - 1) * 2 != this.pickCount - 2 && (this.scoreOne != this.bestOf && this.scoreTwo != this.bestOf && this.leftWins != this.bestOf && this.rightWins != this.bestOf)) {
                        if (this.playerTurn == "left") {
                            this.bottomT1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                            this.bottomT1Pick.style.opacity = 1;
                        } else if (this.playerTurn == "right") {
                            this.bottomT2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                            this.bottomT2Pick.style.opacity = 1;
                        }
                    }
                    this.bottomT1Text.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT1Text.style.opacity = 1;
                    this.bottomT2Text.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomT2Text.style.opacity = 1;
                }.bind(this), 1000);
                setTimeout(function () {
                    this.autoSceneChange(3);
                }.bind(this), 25000);
            } else {
                this.controllerMatch.innerHTML = "Switch to Mappool";
                this.currentMatchScene = true;
                this.mappoolScene.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                this.mappoolScene.style.opacity = 0;
                if (!this.togglePickVar && (this.bestOf - 1) * 2 != this.pickCount - 2 && (this.scoreOne != this.bestOf && this.scoreTwo != this.bestOf && this.leftWins != this.bestOf && this.rightWins != this.bestOf)) {
                    if (this.playerTurn == "left") {
                        this.bottomT1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT1Pick.style.opacity = 0;
                    } else if (this.playerTurn == "right") {
                        this.bottomT2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomT2Pick.style.opacity = 0;
                    }
                }
                this.bottomT1Text.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                this.bottomT1Text.style.opacity = 0;
                this.bottomT2Text.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                this.bottomT2Text.style.opacity = 0;
                setTimeout(function () {
                    this.gameplayManager.promptGameplay();
                }.bind(this), 1000);
            }
            setTimeout(function () {
                this.undimButton(this.controllerMatch);
                this.matchSwitchVar = true;
            }.bind(this), 2000);
        });

        this.controllerIntro = document.getElementById("controllerIntro");
        this.controllerIntro.addEventListener("click", async (event) => {
            if (this.introSwitchVar) {
                this.dimButton(this.controllerIntro);
                this.introSwitchVar = false;
                if (this.currentIntroScene == 1) {
                    this.controllerIntro.innerHTML = "Switch to Intro";
                    this.currentIntroScene = 0;
                    this.introScene.style.animation = "fadeOut 0.5s ease-in-out";
                    this.introScene.style.opacity = 0;
                    setTimeout(function () {
                        this.mainMatchScene.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.mainMatchScene.style.opacity = 1;
                        this.matchBottom.style.animation = "bottomSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.matchBottom.style.opacity = 1;
                    }.bind(this), 500);
                } else if (this.currentIntroScene == 0) {
                    this.controllerIntro.innerHTML = "Switch to Match";
                    this.currentIntroScene = 1;
                    this.mainMatchScene.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.mainMatchScene.style.opacity = 0;
                    this.matchBottom.style.animation = "bottomSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.matchBottom.style.opacity = 0;
                    setTimeout(function () {
                        this.introScene.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.introScene.style.opacity = 1;
                    }.bind(this), 1000);
                }
                setTimeout(function () {
                    this.undimButton(this.controllerIntro);
                    this.introSwitchVar = true;
                }.bind(this), 2000);
            }
        });

        this.controllerResults = document.getElementById("controllerResults");
        this.controllerResults.addEventListener("click", async (event) => {
            if (this.resultSwitchVar) {
                this.dimButton(this.controllerResults);
                this.resultSwitchVar = false;
                if (this.currentResultScene) {
                    this.controllerResults.innerHTML = "Switch to Results";
                    this.currentResultScene = false;
                    this.resultScene.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.resultScene.style.opacity = 0;
                    setTimeout(function () {
                        this.mainMatchScene.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.mainMatchScene.style.opacity = 1;
                        this.matchBottom.style.animation = "bottomSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.matchBottom.style.opacity = 1;
                        this.matchBottom.style.animation = "bottomSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.matchBottom.style.opacity = 1;
                        this.matchTop.style.animation = "topSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.matchTop.style.opacity = 1;
                    }.bind(this), 1000);
                } else {
                    this.controllerResults.innerHTML = "Switch to Match";
                    this.currentResultScene = true;
                    this.mainMatchScene.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.mainMatchScene.style.opacity = 0;
                    this.matchBottom.style.animation = "bottomSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.matchBottom.style.opacity = 0;
                    this.matchTop.style.animation = "topSceneOut 1s cubic-bezier(.45,0,1,.48)";
                    this.matchTop.style.opacity = 0;
                    setTimeout(function () {
                        this.resultScene.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.resultScene.style.opacity = 1;
                    }.bind(this), 1000);
                }
                setTimeout(function () {
                    this.undimButton(this.controllerResults);
                    this.resultSwitchVar = true;
                }.bind(this), 2000);
            }

        });

        this.controllerAutoPick = document.getElementById("controllerAutoPick");
        this.controllerAutoPick.addEventListener("click", async (event) => {
            if (this.autoPicker) {
                this.autoPicker = false;
                this.controllerAutoPick.style.backgroundColor = "white";
                this.controllerAutoPick.innerHTML = "Toggle Auto Pick";
            } else {
                this.autoPicker = true;
                this.controllerAutoPick.style.backgroundColor = "rgb(143, 202, 148)";
                this.controllerAutoPick.innerHTML = "Untoggle Auto Pick";
            }
        });

        this.controllerAutoScene = document.getElementById("controllerAutoScene");
        this.controllerAutoScene.addEventListener("click", async (event) => {
            if (this.autoScene) {
                this.autoScene = false;
                this.controllerAutoScene.style.backgroundColor = "white";
                this.controllerAutoScene.innerHTML = "Toggle Auto Scene";
            } else {
                this.autoScene = true;
                this.controllerAutoScene.style.backgroundColor = "rgb(143, 202, 148)";
                this.controllerAutoScene.innerHTML = "Untoggle Auto Scene";
            }
        });
    }

    generateOverview() {
        this.matchStage.innerHTML = stages.find(stage => stage.stage == currentStage)["stageName"];
        this.beatmapSet.map(async (beatmap, index) => {
            let pickMod = beatmap.pick.substring(0, 2);
            const bm = new Beatmap(pickMod, beatmap.beatmapId, `map${index}`);
            bm.generateOverview();
            const mapData = await getDataSet(beatmap.beatmapId);
            bm.mapSource.setAttribute("src", `https://assets.ppy.sh/beatmaps/${mapData.beatmapset_id}/covers/cover.jpg`);
            mapData.title = mapData.title.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            mapData.version = mapData.version.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            bm.mapTitle.innerHTML = mapData.title;
            bm.mapArtist.innerHTML = mapData.artist;
            bm.mapMapper.innerHTML = mapData.creator;
            bm.mapDifficulty.innerHTML = mapData.version;
            bm.mapData = mapData;
            bm.clicker.addEventListener("click", async (event) => {
                if (bm.mods != "TB") {
                    if (event.altKey && this.hasBanned && bm.isPick && (!bm.isWinPlayerOne || bm.isWinPlayerOne == null)) {
                        // WINNING
                        bm.isWin ? this.rightWins-- : null;
                        this.leftWins++;
                        bm.toggleWin(true);
                        this.controllerArrow.click();
                        this.checkWin();
                    } else if (event.ctrlKey || event.shiftKey) {
                        return;
                    } else {
                        if (this.banCount < 2 && !bm.isBan) {
                            // BANNING
                            this.pickCount++;
                            this.banCount++;
                            if (this.banCount == 1) { this.resultsManager.firstPickIsLeft = this.playerTurn == "left" ? false : true };
                            this.resultsManager.update();
                            bm.toggleBan(this.playerTurn == "left" ? this.leftPlayerData.FlagName : this.rightPlayerData.FlagName, this.playerTurn == "left" ? true : false, this.pickCount);
                            this.controllerTurn.click();
                        } else if (this.banCount == 2 && !bm.isPick && !bm.isBan) {
                            // PICKING
                            this.pickCount++;
                            this.unpulseOverview(bm.layerName);
                            bm.togglePick(this.playerTurn == "left" ? true : false, this.pickCount, this.resultsManager.firstPickIsLeft);
                            bm.clickerQueue.addEventListener("click", async (event) => {
                                if (event.altKey && !bm.isBan && bm.isPick && (!bm.isWinPlayerOne || bm.isWinPlayerOne == null)) {
                                    bm.isWin ? this.rightWins-- : null;
                                    this.leftWins++;
                                    bm.toggleWin(true);
                                    this.controllerArrow.click();
                                    this.checkWin();
                                }
                            });
                            bm.clickerQueue.addEventListener("contextmenu", async (event) => {
                                if (event.altKey && !bm.isBan && bm.isPick && (bm.isWinPlayerOne || bm.isWinPlayerOne == null)) {
                                    bm.isWin ? this.leftWins-- : null;
                                    this.rightWins++;
                                    bm.toggleWin(false);
                                    this.controllerArrow.click();
                                    this.checkWin();
                                }
                            });
                            this.playerTurn == "left" ? this.bottomPlayerOnePick.style.opacity = 1 : this.bottomPlayerTwoPick.style.opacity = 1;
                            this.playerTurn == "left" ? this.bottomPlayerTwoPick.style.opacity = 0 : this.bottomPlayerOnePick.style.opacity = 0;
                            this.controllerTurn.click();
                            this.changeUpcoming(bm.mapData);
                            this.undimButton(this.controllerArrow);
                            this.togglePickVar = true;
                            this.effectsShimmer.style.animation = "glow 1.5s ease-in-out";
                            setTimeout(function () {
                                this.effectsShimmer.style.animation = "none";
                            }.bind(this), 1500);
                            setTimeout(function () {
                                if (this.currentMappoolScene == 1) {
                                    this.autoSceneChange(1);
                                } else if (this.currentMappoolScene == 3) {
                                    this.autoSceneChange(3);
                                    setTimeout(function () {
                                        this.autoSceneChange(1);
                                    }.bind(this), 5000);
                                }
                            }.bind(this), 15000);
                        }
                    }
                } else {
                    if (event.altKey && this.hasBanned && bm.isPick && (!bm.isWinPlayerOne || bm.isWinPlayerOne == null)) {
                        // WINNING
                        bm.isWin ? this.rightWins-- : null;
                        this.leftWins++;
                        bm.toggleWin(true);
                        this.controllerArrow.click();
                        this.checkWin();
                    } else if (event.ctrlKey) {
                        // CANCELING
                        this.unpulseOverview();
                        bm.cancelOperation(null);
                    } else if (!bm.isPick) {
                        this.unpulseOverview(bm.layerName);
                        bm.togglePick(this.playerTurn == "left" ? true : false, null);
                        this.changeUpcoming(bm.mapData);
                        bm.clickerQueue.style.transform = `translateY(-${100 * (7 - this.bestOf)}px)`;
                        this.effectsShimmer.style.animation = "glow 1.5s ease-in-out";
                        setTimeout(function () {
                            this.effectsShimmer.style.animation = "none";
                        }.bind(this), 1500);
                        setTimeout(function () {
                            this.autoSceneChange(1);
                        }.bind(this), 15000);
                    }
                }
            });
            bm.clicker.addEventListener("contextmenu", async (event) => {
                if (event.altKey && this.hasBanned && bm.isPick && (bm.isWinPlayerOne || bm.isWinPlayerOne == null)) {
                    bm.isWin ? this.leftWins-- : null;
                    this.rightWins++;
                    bm.toggleWin(false);
                    this.controllerArrow.click();
                    this.checkWin();
                }
            });
            this.overviewBeatmaps.push(bm);
        });
        preLoading.innerHTML = "Fetching player data...";
        setTimeout(function () {
            preLoading.innerHTML = "Fetching player data failed - Join a valid lobby first!";
        }, 5000);
    }

    unpulseOverview(layerName = "") {
        this.overviewBeatmaps.map(beatmap => {
            if (beatmap.layerName != layerName) {
                beatmap.mapPickIcon.style.opacity = 0;
                beatmap.mapPickIcon.style.animation = "";
                if (beatmap.isPick) {
                    beatmap.mapPickQueue.style.opacity = 0;
                    beatmap.mapPickIcon.style.animation = "";
                }
            }
        })
    }

    async updatePlayerId(playerId) {
        this.leftPlayerData = seedData.find(seed => seed["Acronym"] == playerId[0]);
        this.rightPlayerData = seedData.find(seed => seed["Acronym"] == playerId[1]);
        const leftFlag = await getCountryFlag(seedData.find(seed => seed["Acronym"] == playerId[0])["FlagName"]);
        const rightFlag = await getCountryFlag(seedData.find(seed => seed["Acronym"] == playerId[1])["FlagName"]);
        const leftRoster = await Promise.all(
            this.leftPlayerData.Players.map(async (player) => {
                const data = await getUserDataSet(player.id);
                return data.username;
            }));
        const rightRoster = await Promise.all(
            this.rightPlayerData.Players.map(async (player) => {
                const data = await getUserDataSet(player.id);
                return data.username;
            }));

        this.bottomPlayerOnePfp.setAttribute("src", leftFlag);
        this.bottomPlayerTwoPfp.setAttribute("src", rightFlag);
        this.bottomPlayerOneName.innerHTML = this.leftPlayerData.FullName;
        this.bottomPlayerTwoName.innerHTML = this.rightPlayerData.FullName;
        adjustFont(this.bottomPlayerOneName, 380, 30);
        adjustFont(this.bottomPlayerTwoName, 380, 30);
        this.bottomPlayerOneSeed.innerHTML = `Seed #${seedData.find(seed => seed["Acronym"] == playerId[0])["Seed"].match(/\d+/)[0]}`;
        this.bottomPlayerTwoSeed.innerHTML = `Seed #${seedData.find(seed => seed["Acronym"] == playerId[1])["Seed"].match(/\d+/)[0]}`;

        this.introPlayerOnePfp.setAttribute("src", leftFlag);
        this.introPlayerTwoPfp.setAttribute("src", rightFlag);
        this.introPlayerOneName.innerHTML = this.leftPlayerData.FullName;
        this.introPlayerTwoName.innerHTML = this.rightPlayerData.FullName;
        this.introPlayerOneSeed.innerHTML = `#${seedData.find(seed => seed["Acronym"] == playerId[0])["Seed"].match(/\d+/)[0]}`;
        this.introPlayerTwoSeed.innerHTML = `#${seedData.find(seed => seed["Acronym"] == playerId[1])["Seed"].match(/\d+/)[0]}`;
        this.introPlayerOneRoster.innerHTML = leftRoster.join(" · ");
        this.introPlayerTwoRoster.innerHTML = rightRoster.join(" · ");

        this.matchHistoryLeftPlayerSource.setAttribute("src", leftFlag);
        this.matchHistoryRightPlayerSource.setAttribute("src", rightFlag);
        this.matchHistoryLeftPlayerName.innerHTML = this.leftPlayerData.FullName;
        this.matchHistoryLightPlayerName.innerHTML = this.rightPlayerData.FullName;
        this.matchHistoryLeftPlayerSeed.innerHTML = `#${seedData.find(seed => seed["Acronym"] == playerId[0])["Seed"].match(/\d+/)[0]}`;
        this.matchHistoryRightPlayerSeed.innerHTML = `#${seedData.find(seed => seed["Acronym"] == playerId[1])["Seed"].match(/\d+/)[0]}`;

        this.resultsManager.playerLeft = this.leftPlayerData;
        this.resultsManager.playerRight = this.rightPlayerData;
        this.resultsManager.initialUpdate();
        preLoading.style.opacity = 0;
        hasSetupPlayers = true;
        this.historyManager = new HistoryManager(this.leftPlayerData, this.rightPlayerData);
        this.historyManager.generate();
        setTimeout(function () {
            preLoading.style.display = "none";
        }.bind(this), 1000);
    }

    async changeUpcoming(mapData) {
        let upcomingOfflineMapData = this.beatmapSet.find(beatmap => beatmap.beatmapId == mapData.beatmap_id);
        let finalOD = mapData.diff_overall;
        let bpm = mapData.bpm;
        let length = mapData.total_length;
        // let sr = upcomingOfflineMapData.pick.substring(0, 2) == "DT" ? upcomingOfflineMapData.modSR : mapData.difficultyrating;
        let sr = upcomingOfflineMapData.modSR;
        const teamFlag = await getCountryFlag(this.playerTurn == "left" ? this.rightPlayerData.FlagName : this.leftPlayerData.FlagName);
        if (upcomingOfflineMapData.pick.substring(0, 2) == "HR" || upcomingOfflineMapData.pick.substring(0, 2) == "FM") {
            finalOD = Math.min(finalOD * 1.4, 10);
            this.gameplayManager.isDoubleTime = false;
        } else if (upcomingOfflineMapData.pick.substring(0, 2) == "DT") {
            finalOD = Math.min((79.5 - (Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * finalOD))) / 1.5)) / 6, 1.5 > 1.5 ? 12 : 11);
            bpm = Math.round(bpm * 1.5);
            length = length / 1.5;
            this.gameplayManager.isDoubleTime = true;
        } else {
            this.gameplayManager.isDoubleTime = false;
        }
        this.upcomingPickPlayer.style.display = upcomingOfflineMapData.pick.substring(0, 2) == "TB" ? "none" : "flex";
        this.upcomingPickId.innerHTML = upcomingOfflineMapData.pick;
        this.upcomingSongText.innerHTML = mapData.title;
        this.upcomingArtistText.innerHTML = mapData.artist;
        this.upcomingSrText.innerHTML = `${Number(sr).toFixed(2)}*`;
        this.upcomingOdText.innerHTML = mapData.diff_overall == finalOD ? Number(finalOD).toFixed(1) : `${Number(mapData.diff_overall).toFixed(1)} (${Number(finalOD).toFixed(1)})`;
        this.upcomingBpmText.innerHTML = Number(bpm).toFixed(0);
        this.upcomingLengthText.innerHTML = parseTime(length);
        this.upcomingDifficultyText.innerHTML = mapData.version;
        this.upcomingMapperText.innerHTML = mapData.creator;
        this.upcomingSource.setAttribute("src", `https://assets.ppy.sh/beatmaps/${mapData.beatmapset_id}/covers/cover.jpg`);
        this.upcomingPickPlayerSource.setAttribute("src", teamFlag);
        try {
            this.upcomingCustomTag.style.display = upcomingOfflineMapData.customSong ? "initial" : "none";
            this.upcomingCollabTag.innerHTML = `${upcomingOfflineMapData.collab} Collab`;
            this.upcomingCollabTag.style.display = upcomingOfflineMapData.collab != "" ? "initial" : "none";
        } catch (e) {
            this.upcomingCustomTag.style.display = "none";
            this.upcomingCollabTag.style.display = "none";
        }
    }

    updateMatchSong(data) {
        if (beatmapsIds.includes(data.menu.bm.id)) {
            this.autoPick(data.menu.bm.id);
            let mapData = this.overviewBeatmaps.find(beatmap => beatmap.mapData.beatmap_id == data.menu.bm.id)["mapData"];
            // console.log(mapData);
            let upcomingOfflineMapData = this.beatmapSet.find(beatmap => beatmap.beatmapId == mapData.beatmap_id);
            let finalOD = mapData.diff_overall;
            let bpm = mapData.bpm;
            let length = mapData.total_length;
            // let sr = upcomingOfflineMapData.pick.substring(0, 2) == "DT" ? upcomingOfflineMapData.modSR : mapData.difficultyrating;
            let sr = upcomingOfflineMapData.modSR;

            if (upcomingOfflineMapData.pick.substring(0, 2) == "HR" || upcomingOfflineMapData.pick.substring(0, 2) == "FM") {
                finalOD = Math.min(finalOD * 1.4, 10);
                this.gameplayManager.isDoubleTime = false;
            } else if (upcomingOfflineMapData.pick.substring(0, 2) == "DT") {
                finalOD = Math.min((79.5 - (Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * finalOD))) / 1.5)) / 6, 1.5 > 1.5 ? 12 : 11);
                bpm = Math.round(bpm * 1.5);
                length = length / 1.5;
            }

            this.matchPickId.innerHTML = upcomingOfflineMapData.pick;
            this.matchSongTitle.innerHTML = mapData.title;
            this.matchArtistTitle.innerHTML = mapData.artist;
            this.matchMapperTitle.innerHTML = mapData.creator;
            this.matchDifficultyTitle.innerHTML = mapData.version;
            this.matchSongOd.innerHTML = mapData.diff_overall == finalOD ? Number(finalOD).toFixed(1) : `${Number(mapData.diff_overall).toFixed(1)} (${Number(finalOD).toFixed(1)})`;
            this.matchSongSr.innerHTML = `${Number(sr).toFixed(2)}*`;
            this.matchSongBpm.innerHTML = Number(bpm).toFixed(0);
            this.matchSongLength.innerHTML = parseTime(length);
            this.matchSource.setAttribute("src", `https://assets.ppy.sh/beatmaps/${mapData.beatmapset_id}/covers/cover.jpg`);
            this.matchSource.onerror = function () {
                this.matchSource.setAttribute('src', `../../../_shared_assets/design/igts/main_banner.png`);
            };
        } else {
            let { memoryOD, fullSR, BPM: { min, max } } = data.menu.bm.stats;
            let { full } = data.menu.bm.time;
            let { difficulty, mapper, artist, title } = data.menu.bm.metadata;

            this.matchPickId.innerHTML = "";
            this.matchSongTitle.innerHTML = title;
            this.matchArtistTitle.innerHTML = artist;
            this.matchMapperTitle.innerHTML = mapper;
            this.matchDifficultyTitle.innerHTML = difficulty;
            this.matchSongOd.innerHTML = Number(memoryOD).toFixed(1);
            this.matchSongSr.innerHTML = `${Number(fullSR).toFixed(2)}*`;
            this.matchSongBpm.innerHTML = min === max ? min : `${min} - ${max}`;
            this.matchSongLength.innerHTML = parseTimeMs(full);
            this.matchSource.setAttribute('src', `http://localhost:24050/Songs/${data.menu.bm.path.full}?a=${Math.random(10000)}`);
            this.matchSource.onerror = function () {
                this.matchSource.setAttribute('src', `../../../_shared_assets/design/igts/main_banner.png`);
            };

        }
        makeScrollingText(this.matchSongTitle, this.matchSongTitleDelay, 20, 400, 30);
    }

    updateScores(data) {

        if (!(matchManager.bestOf !== Math.ceil(data.tourney.manager.bestOF / 2) || matchManager.scoreOne !== data.tourney.manager.stars.left || matchManager.scoreTwo !== data.tourney.manager.stars.right)) return;

        let scoreEvent;
        this.bestOf = Math.ceil(data.tourney.manager.bestOF / 2);

        if (this.scoreOne < data.tourney.manager.stars.left) {
            scoreEvent = "blue-add";
        } else if (this.scoreOne > data.tourney.manager.stars.left) {
            scoreEvent = "blue-remove";
        } else if (this.scoreTwo < data.tourney.manager.stars.right) {
            scoreEvent = "red-add";
        } else if (this.scoreTwo > data.tourney.manager.stars.right) {
            scoreEvent = "red-remove";
        }

        this.scoreOne = data.tourney.manager.stars.left;
        this.resultsManager.scoreLeft = data.tourney.manager.stars.left;
        this.bottomScoreLeft.innerHTML = "";
        for (var i = 0; i < this.scoreOne; i++) {
            if (scoreEvent === "blue-add" && i === this.scoreOne - 1) {
                let scoreFill = document.createElement("div");
                scoreFill.setAttribute("class", "score scoreFillAnimate");
                this.bottomScoreLeft.appendChild(scoreFill);
            } else {
                let scoreFill = document.createElement("div");
                scoreFill.setAttribute("class", "score scoreFill");
                this.bottomScoreLeft.appendChild(scoreFill);
            }
        }
        for (var i = 0; i < this.bestOf - this.scoreOne; i++) {
            if (scoreEvent === "blue-remove" && i === 0) {
                let scoreNone = document.createElement("div");
                scoreNone.setAttribute("class", "score scoreNoneAnimate");
                this.bottomScoreLeft.appendChild(scoreNone);
            } else {
                let scoreNone = document.createElement("div");
                scoreNone.setAttribute("class", "score");
                this.bottomScoreLeft.appendChild(scoreNone);
            }
        }

        this.scoreTwo = data.tourney.manager.stars.right;
        this.resultsManager.scoreRight = data.tourney.manager.stars.right;
        this.bottomScoreRight.innerHTML = "";
        for (var i = 0; i < this.bestOf - this.scoreTwo; i++) {
            if (scoreEvent === "red-remove" && i === this.bestOf - this.scoreTwo - 1) {
                let scoreNone = document.createElement("div");
                scoreNone.setAttribute("class", "score scoreNoneAnimate");
                this.bottomScoreRight.appendChild(scoreNone);
            } else {
                let scoreNone = document.createElement("div");
                scoreNone.setAttribute("class", "score");
                this.bottomScoreRight.appendChild(scoreNone);
            }
        }
        for (var i = 0; i < this.scoreTwo; i++) {
            if (scoreEvent === "red-add" && i === 0) {
                let scoreFill = document.createElement("div");
                scoreFill.setAttribute("class", "score scoreFillAnimate");
                this.bottomScoreRight.appendChild(scoreFill);
            } else {
                let scoreFill = document.createElement("div");
                scoreFill.setAttribute("class", "score scoreFill");
                this.bottomScoreRight.appendChild(scoreFill);
            }
        }
        this.resultsManager.update();
        this.checkWin();
    }

    dimButton(button) {
        button.style.backgroundColor = "rgb(67, 67, 67)";
        button.style.color = "rgb(36, 36, 36)";
    }

    undimButton(button) {
        button.style.backgroundColor = "white";
        button.style.color = "black";
    }

    checkState(ipcState) {
        if (matchManager.currentState == ipcState) return;
        this.currentState = ipcState;

        // map has ended and its the next player's turn
        if (ipcState == 4) {
            this.gameplayManager.hidePlayerData(false);
            this.markWin(this.gameplayManager.calculateResults(this.leftPlayerData.FullName, this.rightPlayerData.FullName));
            this.gameplayManager.showResults();
            this.autoSceneChange(2);
            setTimeout(function () {
                this.autoSceneChange(5);
            }.bind(this), 30000);
        } else if (ipcState == 3) {
            // map has entered gameplay
            this.autoSceneChange(4);
        } else if (ipcState == 1) {
            // gameplay has entered idle (the lobby)
            this.gameplayManager.hideResults();
            this.gameplayManager.reset();
            this.autoSceneChange(5);
        }
    }

    autoPick(beatmapId) {
        if (!this.autoPicker || !this.hasBanned || this.leftWins == this.bestOf || this.rightWins == this.bestOf) return;
        if (beatmapsIds.includes(beatmapId)) {
            for (let beatmap of this.overviewBeatmaps) {
                if (beatmap.beatmapID == beatmapId) {
                    setTimeout(() => {
                        beatmap.clicker.click();
                    }, 100);
                }
            }
        }
    }

    markWin(leftWon) {
        let currentMapId = this.currentStats[0];
        if (beatmapsIds.includes(currentMapId)) {
            let winPick = this.overviewBeatmaps.find(beatmap => beatmap.beatmapID == currentMapId);
            if (!this.hasBanned || !winPick.isPick) return;
            winPick.isWin ? leftWon ? this.rightWins-- : this.leftWins-- : null;
            leftWon ? this.leftWins++ : this.rightWins++;
            winPick.toggleWin(leftWon);
            this.controllerArrow.click();
            this.checkWin();
        }
    }

    autoSceneChange(index) {
        if (!this.autoScene || !this.hasBanned) return;

        if (index == 1 && this.currentMappoolScene == 1) {
            // change to upcoming map
            this.controllerMappool.click();
        } else if (index == 2 && this.currentMappoolScene == 2) {
            // change to pick queue
            this.controllerMappool.click();
        } else if (index == 3 && this.currentMappoolScene == 3) {
            // change to mappool overview
            this.controllerMappool.click();
        } else if (index == 4 && !this.currentMatchScene) {
            // change to match scene
            this.controllerMatch.click();
        } else if (index == 5 && this.currentMatchScene) {
            // change to mappool scene
            this.controllerMatch.click();
            // setTimeout(function () {
            //     this.resultSwitchVar == true ? this.controllerResults.click() : null;
            // }.bind(this), 10000);
            setTimeout(function () {
                this.autoSceneChange(3);
            }.bind(this), 25000);
        }
    }

    updateChat(data) {
        if (this.chatLen == data.tourney.manager.chat.length) return;
        let tempClass;

        if (this.chatLen == 0 || (this.chatLen > 0 && this.chatLen > data.tourney.manager.chat.length)) {
            // Starts from bottom
            this.chats.innerHTML = "";
            this.chatsDebug.innerHTML = "";
            this.chatLen = 0;
        }

        // Add the chats
        for (var i = this.chatLen; i < data.tourney.manager.chat.length; i++) {
            tempClass = data.tourney.manager.chat[i].team;

            // Chat variables
            let chatParent = document.createElement('div');
            chatParent.setAttribute('class', 'chat');
            let chatParentDebug = document.createElement('div');
            chatParentDebug.setAttribute('class', 'chat');

            let chatTime = document.createElement('div');
            chatTime.setAttribute('class', 'chatTime');
            let chatTimeDebug = document.createElement('div');
            chatTimeDebug.setAttribute('class', 'chatTime');

            let chatName = document.createElement('div');
            chatName.setAttribute('class', 'chatName');
            let chatNameDebug = document.createElement('div');
            chatNameDebug.setAttribute('class', 'chatName');

            let chatText = document.createElement('div');
            chatText.setAttribute('class', 'chatText');
            let chatTextDebug = document.createElement('div');
            chatTextDebug.setAttribute('class', 'chatText');

            chatTime.innerText = data.tourney.manager.chat[i].time;
            chatName.innerText = data.tourney.manager.chat[i].name + ":\xa0";
            chatText.innerText = data.tourney.manager.chat[i].messageBody;
            chatTimeDebug.innerText = data.tourney.manager.chat[i].time;
            chatNameDebug.innerText = data.tourney.manager.chat[i].name + ":\xa0";
            chatTextDebug.innerText = data.tourney.manager.chat[i].messageBody;

            chatName.classList.add(tempClass);
            chatNameDebug.classList.add(tempClass);

            chatParent.append(chatTime);
            chatParent.append(chatName);
            chatParent.append(chatText);
            chatParentDebug.append(chatTimeDebug);
            chatParentDebug.append(chatNameDebug);
            chatParentDebug.append(chatTextDebug);
            this.chats.append(chatParent);
            this.chatsDebug.append(chatParentDebug);
        }

        // Update the Length of chat
        this.chatLen = data.tourney.manager.chat.length;

        // Update the scroll so it's sticks at the bottom by default
        this.chats.scrollTop = chats.scrollHeight;
        this.chatsDebug.scrollTop = chatsDebug.scrollHeight;
    }

    debug() {
        document.getElementById("debugPickCount").innerHTML = `Pick Count: ${this.pickCount}`;
        document.getElementById("debugLeftWins").innerHTML = `Left Wins: ${this.leftWins}`;
        document.getElementById("debugRightWins").innerHTML = `Right Wins: ${this.rightWins}`;
        document.getElementById("debugScoreOne").innerHTML = `Score One: ${this.scoreOne}`;
        document.getElementById("debugScoreTwo").innerHTML = `Score Two: ${this.scoreTwo}`;
        document.getElementById("debugHasBanned").innerHTML = `Has Banned: ${this.hasBanned}`;
        document.getElementById("debugId").innerHTML = `Current ID: ${this.currentStats[0]}`;
    }

    checkWin() {
        // if ((this.leftWins == this.bestOf || this.rightWins == this.bestOf) && (this.scoreOne == this.bestOf || this.scoreTwo == this.bestOf)) {
        if ((this.leftWins >= 1 || this.rightWins >= 1) && (this.scoreOne >= 1 || this.scoreTwo >= 1)) {
            this.undimButton(this.controllerResults);
            this.resultSwitchVar = true;
        } else {
            this.dimButton(this.controllerResults);
            this.resultSwitchVar = false;
        }
    }
}

class GameplayManager {
    constructor() {
        this.scoreTracker = new ScoreTracker();
        this.matchScoreBoard = document.getElementById("matchScoreBoard");
        this.bottomMatch = document.getElementById("bottomMatch");
        this.bottomMatchResults = document.getElementById("bottomMatchResults");
        this.bottomMatchProgressBar = document.getElementById("bottomMatchProgressBar");
        this.bg = document.getElementById("bg");
        this.bg_match = document.getElementById("bg_match");
        this.matchClients = document.getElementById("matchClients");
        this.matchClientLeft = document.getElementById("matchClientLeft");
        this.matchClientRight = document.getElementById("matchClientRight");

        this.matchOneScore = document.getElementById("matchOneScore");
        this.matchTwoScore = document.getElementById("matchTwoScore");
        this.matchScoreLeftText = document.getElementById("matchScoreLeftText");
        this.matchScoreRightText = document.getElementById("matchScoreRightText");

        this.matchScoreRightContent = document.getElementById("matchScoreRightContent");
        this.matchScoreLeftContent = document.getElementById("matchScoreLeftContent");
        this.matchScoreLeftContainer = document.getElementById("matchScoreLeftContainer");
        this.matchScoreRightContainer = document.getElementById("matchScoreRightContainer");

        this.matchOneLead = document.getElementById("matchOneLead");
        this.matchTwoLead = document.getElementById("matchTwoLead");

        this.bottomProgressBarContent = document.getElementById("bottomProgressBarContent");
        this.bottomSongPercentage = document.getElementById("bottomSongPercentage");
        this.bottomSongEnd = document.getElementById("bottomSongEnd");

        this.bottomResultsTop = document.getElementById("bottomResultsTop");
        this.bottomResultsBottom = document.getElementById("bottomResultsBottom");

        this.matchWinningLeftContent = document.getElementById("matchWinningLeftContent");
        this.matchWinningLeftWinText = document.getElementById("matchWinningLeftWinText");
        this.matchWinningRightContent = document.getElementById("matchWinningRightContent");
        this.matchWinningRightWinText = document.getElementById("matchWinningRightWinText");

        this.isGameplay = false;
        this.animationScore = {
            matchOneScore: new CountUp('matchOneScore', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: ",", decimal: "." }),
            matchTwoScore: new CountUp('matchTwoScore', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: ",", decimal: "." }),
            matchScoreLeftText: new CountUp('matchScoreLeftText', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: ",", decimal: "." }),
            matchScoreRightText: new CountUp('matchScoreRightText', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: ",", decimal: "." }),
        }
        this.scoreLeft;
        this.scoreRight;
        this.comboLeft;
        this.comboRight;
        this.barThreshold = 300000;
        this.songStart;
        this.currentTime;
        this.isDoubleTime = false;
        this.setupClients();
    }

    promptGameplay() {
        if (this.isGameplay) return;
        this.matchScoreBoard.style.animation = "slideUpMatch 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatch.style.animation = "slideUpMatchBottom 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatch.style.transform = "translateY(0)";
        this.matchClients.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.matchClients.style.opacity = 1;
        // this.bg_match.play();
        this.matchScoreBoard.style.opacity = 1;
        this.isGameplay = true;
        setTimeout(function () {
            this.bg.style.clipPath = "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)";
            this.revealPlayerData();
            // this.bg.pause();
        }.bind(this), 1000);
    }

    hideGameplay() {
        if (!this.isGameplay) return;
        this.matchScoreBoard.style.animation = "slideDownMatch 1s cubic-bezier(.45,0,1,.48)";
        this.bottomMatch.style.animation = "slideDownMatchBottom 1s cubic-bezier(.45,0,1,.48)";
        this.bottomMatch.style.transform = "translateY(148px)";
        this.matchClients.style.animation = "mappoolSceneOut 1s cubic-bezier(.45,0,1,.48)";
        this.matchClients.style.opacity = 0;
        this.bg.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0% 100%)";
        // this.bg_match.pause();
        this.hidePlayerData(true);
        // this.bg.play();
        this.matchScoreBoard.style.opacity = 0;
        this.isGameplay = false;
    }

    hidePlayerData(playerNameCheck) {
        if (!playerNameCheck) {
            this.scoreTracker.resultHide();
        } else {
            this.matchClientLeft.style.opacity = 0;
            this.matchClientRight.style.opacity = 0;
        }
    }

    revealPlayerData() {
        this.matchClientLeft.style.opacity = 1;
        this.matchClientRight.style.opacity = 1;
    }

    showResults() {
        this.bottomMatchProgressBar.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatchProgressBar.style.opacity = 0;
        this.bottomMatchResults.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatchResults.style.opacity = 1;
    }

    hideResults() {
        this.bottomMatchProgressBar.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatchProgressBar.style.opacity = 1;
        this.bottomMatchResults.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatchResults.style.opacity = 0;
    }

    async setupClients() {
        const clientNumber = 8
        for (let i=1;i<clientNumber+1;i++) {
            const client = new Client(i);
            client.generate();
            this.scoreTracker.addClient(client, i<5?true:false);
        }
    }

    updateClients(data, scoreVisible, ipcState) {
        if (!(scoreVisible && ipcState == 3)) return;
        // console.log(data);
        this.scoreLeft = data.tourney.manager.gameplay.score.left;
        this.scoreRight = data.tourney.manager.gameplay.score.right;
        this.animationScore.matchOneScore.update(this.scoreLeft);
        this.animationScore.matchTwoScore.update(this.scoreRight);
        this.scoreTracker.updateClients(data.tourney.ipcClients);
        let difference = Math.abs(this.scoreLeft - this.scoreRight);
        this.animationScore.matchScoreLeftText.update(difference);
        this.animationScore.matchScoreRightText.update(difference);

        if (this.scoreLeft > this.scoreRight) {
            this.matchScoreLeftContent.style.width = `${(difference / this.barThreshold > 1 ? 1 : difference / this.barThreshold) * 404}px`;
            this.matchScoreRightContent.style.width = "0px";
            this.toggleLead("left");
        } else if (this.scoreLeft < this.scoreRight) {
            this.matchScoreRightContent.style.width = `${(difference / this.barThreshold > 1 ? 1 : difference / this.barThreshold) * 404}px`;
            this.matchScoreLeftContent.style.width = "0px";
            this.toggleLead("right");
        } else {
            this.matchScoreLeftContent.style.width = "0px";
            this.matchScoreRightContent.style.width = "0px";
            this.toggleLead("center");
        }

        if (this.matchScoreLeftContent.scrollWidth > this.matchScoreLeftText.scrollWidth) {
            this.matchScoreLeftContainer.style.alignItems = "start";
        } else {
            this.matchScoreLeftContainer.style.alignItems = "end";
        }

        if (this.matchScoreRightContent.scrollWidth > this.matchScoreRightText.scrollWidth) {
            this.matchScoreRightContainer.style.alignItems = "end";
        } else {
            this.matchScoreRightContainer.style.alignItems = "start";
        }
    }

    updateProgress(data) {
        if (data.menu.bm.time.current == 0 || data.menu.bm.time.current > (data.menu.bm.time.full - 1)) {
            this.songStart = false;
        } else {
            this.songStart = true;
        }

        if (this.songStart) {
            this.currentTime = data.menu.bm.time.current;
        }

        let ratio = (this.currentTime / (data.menu.bm.time.full - 1)) * 100;

        this.bottomProgressBarContent.style.width = `${(this.currentTime / data.menu.bm.time.full) * 550}px`;
        this.bottomSongPercentage.innerHTML = `${(ratio > 100 ? 100 : ratio).toFixed(1)}%`;
        this.bottomSongEnd.innerHTML = parseTimeMs(this.isDoubleTime ? (data.menu.bm.time.full - 1) / 1.5 : (data.menu.bm.time.full - 1));
    }

    flashMiss(id) {
        let missFlash = document.getElementById(id);
        missFlash.style.animation = "glow 1.5s ease-in-out";
        setTimeout(function () {
            missFlash.style.animation = "none";
        }.bind(this), 1500);
    }

    toggleLead(lead) {
        if (lead == "left") {
            this.matchOneLead.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchOneLead.style.opacity = 1;
            this.matchTwoLead.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchTwoLead.style.opacity = 0;
            this.matchScoreLeftText.style.opacity = 1;
            this.matchScoreRightText.style.opacity = 0;
        } else if (lead == "right") {
            this.matchTwoLead.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchTwoLead.style.opacity = 1;
            this.matchOneLead.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchOneLead.style.opacity = 0;
            this.matchScoreLeftText.style.opacity = 0;
            this.matchScoreRightText.style.opacity = 1;
        } else if (lead == "center") {
            this.matchOneLead.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchOneLead.style.opacity = 0;
            this.matchTwoLead.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchTwoLead.style.opacity = 0;
            this.matchScoreLeftText.style.opacity = 0;
            this.matchScoreRightText.style.opacity = 0;

        }
    }

    reset() {
        this.scoreTracker.reset();
        this.animationScore.matchOneScore.update(0);
        this.animationScore.matchTwoScore.update(0);
        this.animationScore.matchScoreLeftText.update(0);
        this.animationScore.matchScoreRightText.update(0);
        this.matchScoreLeftContent.style.width = "0px";
        this.matchScoreRightContent.style.width = "0px";
        this.matchScoreLeftContainer.style.alignItems = "end";
        this.matchScoreRightContainer.style.alignItems = "start";
        this.matchWinningLeftContent.style.animation = "";
        this.matchWinningLeftContent.style.width = "0%";
        this.matchWinningRightContent.style.animation = "";
        this.matchWinningRightContent.style.width = "0%";
        this.matchOneScore.style.color = "Black";
        this.matchTwoScore.style.color = "Black";
        this.matchOneScore.style.transform = "";
        this.matchTwoScore.style.transform = "";
        this.matchWinningLeftWinText.style.opacity = 0;
        this.matchWinningRightWinText.style.opacity = 0;
        this.toggleLead("center");
    }

    calculateResults(leftPlayerData, rightPlayerData) {
        let leftWon = this.scoreLeft > this.scoreRight;
        let isTie = this.scoreLeft == this.scoreRight;

        if (leftWon && !isTie) {
            this.bottomResultsTop.innerHTML = `${leftPlayerData} WINS BY`;
        } else if (!leftWon && !isTie) {
            this.bottomResultsTop.innerHTML = `${rightPlayerData} WINS BY`;
        } else if (isTie) {
            this.bottomResultsTop.innerHTML = "SCORE IS TIED!";
        }

        this.bottomResultsBottom.innerHTML = Math.abs(this.scoreLeft - this.scoreRight).toLocaleString();

        if (!isTie) this.revealScore(leftWon);

        return leftWon
    }

    revealScore(leftWon) {
        if (leftWon) {
            this.matchWinningLeftContent.style.animation = "winBar 2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchWinningLeftContent.style.width = "100%";
            this.matchWinningLeftContent.style.backgroundColor = "Black";
            this.matchWinningRightContent.style.animation = "loseBar 2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchWinningRightContent.style.width = "100%";
            this.matchWinningRightContent.style.backgroundColor = "white";
            this.matchOneScore.style.color = "white";
            this.matchOneScore.style.transform = "TranslateX(480px)";
            this.matchTwoScore.style.transform = "TranslateX(-570px)";
            this.matchWinningLeftWinText.style.opacity = 1;
            this.matchWinningRightWinText.style.opacity = 0;
        } else {
            this.matchWinningRightContent.style.animation = "winBar 2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchWinningRightContent.style.width = "100%";
            this.matchWinningRightContent.style.backgroundColor = "Black";
            this.matchWinningLeftContent.style.animation = "loseBar 2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.matchWinningLeftContent.style.width = "100%";
            this.matchWinningLeftContent.style.backgroundColor = "white";
            this.matchTwoScore.style.color = "white";
            this.matchOneScore.style.transform = "TranslateX(570px)";
            this.matchTwoScore.style.transform = "TranslateX(-480px)";
            this.matchWinningLeftWinText.style.opacity = 0;
            this.matchWinningRightWinText.style.opacity = 1;
        }
    }
}

class ResultsManager {
    constructor() {
        this.resultScorelinePlayerOneSource = document.getElementById("resultScorelinePlayerOneSource");
        this.resultScorelinePlayerOneText = document.getElementById("resultScorelinePlayerOneText");
        this.resultScorelinePlayerTwoSource = document.getElementById("resultScorelinePlayerTwoSource");
        this.resultScorelinePlayerTwoText = document.getElementById("resultScorelinePlayerTwoText");
        this.resultOne = document.getElementById("resultOne");
        this.resultTwo = document.getElementById("resultTwo");

        this.resultBan = document.getElementById("resultBan");
        this.resultPickOne = document.getElementById("resultPickOne");
        this.resultPickTwo = document.getElementById("resultPickTwo");
        this.resultPickTb = document.getElementById("resultPickTb");

        this.resultPlayerPickSourceOne = document.getElementById("resultPlayerPickSourceOne");
        this.resultPlayerTextOne = document.getElementById("resultPlayerTextOne");
        this.resultPlayerPickSourceTwo = document.getElementById("resultPlayerPickSourceTwo");
        this.resultPlayerTextTwo = document.getElementById("resultPlayerTextTwo");
        this.resultStageText = document.getElementById("resultStageText");

        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.playerLeft;
        this.playerRight;
        this.firstPickIsLeft = false;
        this.beatmapsLeft = [];
        this.beatmapsRight = [];
        this.bans = [];
        this.tb = [];
        this.currentStage = stages.find(stage => stage.stage == currentStage)["stageName"];
    }

    async initialUpdate() {
        const leftFlag = await getCountryFlag(this.playerLeft.FlagName);
        const rightFlag = await getCountryFlag(this.playerRight.FlagName);
        this.resultScorelinePlayerOneSource.setAttribute("src", leftFlag);
        this.resultScorelinePlayerTwoSource.setAttribute("src", rightFlag);
        this.resultScorelinePlayerOneText.innerHTML = this.playerLeft.FullName;
        this.resultScorelinePlayerTwoText.innerHTML = this.playerRight.FullName;
        this.resultPlayerPickSourceOne.setAttribute("src", leftFlag);
        this.resultPlayerPickSourceTwo.setAttribute("src", rightFlag);
        this.resultStageText.innerHTML = this.currentStage;
    }

    update() {
        this.resultOne.innerHTML = this.scoreLeft;
        this.resultTwo.innerHTML = this.scoreRight;
        this.resultPlayerTextOne.innerHTML = `T1 ${this.firstPickIsLeft ? "TOP" : "BOTTOM"}`;
        this.resultPlayerTextTwo.innerHTML = `T2 ${this.firstPickIsLeft ? "BOTTOM" : "TOP"}`;
    }
}

class HistoryManager {
    constructor(leftPlayer, rightPlayer) {
        this.leftPlayer = leftPlayer;
        this.rightPlayer = rightPlayer;
        this.leftHistory = [];
        this.rightHistory = [];
        this.rounds = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];

        this.matchHistoryLeftPlayerSource = document.getElementById("matchHistoryLeftPlayerSource");
        this.matchHistoryLeftPlayerName = document.getElementById("matchHistoryLeftPlayerName");
        this.matchHistoryLeftPlayerSeed = document.getElementById("matchHistoryLeftPlayerSeed");
        this.matchHistoryLeftPlayer = document.getElementById("matchHistoryLeftPlayer");
        this.matchHistoryRightPlayerSource = document.getElementById("matchHistoryRightPlayerSource");
        this.matchHistoryRightPlayerName = document.getElementById("matchHistoryRightPlayerName");
        this.matchHistoryRightPlayerSeed = document.getElementById("matchHistoryRightPlayerSeed");
        this.matchHistoryRightPlayer = document.getElementById("matchHistoryRightPlayer");
        this.matchHistoryText = document.getElementById("matchHistoryText");
        this.matchHistoryScene = document.getElementById("matchHistoryScene");
    }

    async generate() {
        let canGenerate = true;
        let index = 0;
        for (let round of this.rounds) {
            if (canGenerate) {
                canGenerate = round == stages.find(stage => stage.stage == currentStage)["stageName"] ? false : true;
                const stageMatches = await getSchedules(round);
                // console.log(stageMatches);
                const leftMatches = stageMatches
                    .filter(match => (match.score1 == -1 || match.score2 == -1 || match.score1 > 4 || match.score2 > 4))
                    .filter(match => (match.player1 == this.leftPlayer.FullName || match.player2 == this.leftPlayer.FullName))
                    .sort((a, b) => new Date(a.time) - new Date(b.time))
                const rightMatches = stageMatches
                    .filter(match => (match.score1 == -1 || match.score2 == -1 || match.score1 > 4 || match.score2 > 4))
                    .filter(match => (match.player1 == this.rightPlayer.FullName || match.player2 == this.rightPlayer.FullName))
                    .sort((a, b) => new Date(a.time) - new Date(b.time))
                // console.log(leftMatches);
                // console.log(rightMatches);

                leftMatches.map(async (match) => {
                    const history = new History(true, index);
                    index++;
                    history.generate();
                    const isLeft = match.player1 == this.leftPlayer.FullName ? true : false;
                    history.historyPlayer.innerHTML = isLeft ? match.player2 : match.player1;
                    const teamFlag = await getCountryFlag(seedData.find(seed => seed["Acronym"] == history.historyPlayer.innerHTML)["FlagName"]);
                    history.historyRound.innerHTML = stages.find(stage => stage.stageName == round)["stage"];
                    history.historySource.setAttribute("src", teamFlag);
                    history.historyWinText.innerHTML = isLeft ? (match.score1 > match.score2 ? "WIN" : "LOSE") : (match.score2 > match.score1 ? "WIN" : "LOSE");
                    history.historyWinText.style.backgroundColor = isLeft ? (match.score1 > match.score2 ? "white" : "black") : (match.score2 > match.score1 ? "white" : "black");
                    history.historyWinText.style.color = isLeft ? (match.score1 > match.score2 ? "black" : "white") : (match.score2 > match.score1 ? "black" : "white");
                    history.historyWinScore.innerHTML = `${match.score1}-${match.score2}`;
                    this.leftHistory.push(history);
                })
                rightMatches.map(async (match) => {
                    const history = new History(false, index);
                    index++;
                    history.generate();
                    const isLeft = match.player1 == this.rightPlayer.FullName ? true : false;
                    history.historyPlayer.innerHTML = isLeft ? match.player2 : match.player1;
                    const teamFlag = await getCountryFlag(seedData.find(seed => seed["Acronym"] == history.historyPlayer.innerHTML)["FlagName"]);
                    history.historyRound.innerHTML = stages.find(stage => stage.stageName == round)["stage"];
                    history.historySource.setAttribute("src", teamFlag);
                    history.historyWinText.innerHTML = isLeft ? (match.score1 > match.score2 ? "WIN" : "LOSE") : (match.score2 > match.score1 ? "WIN" : "LOSE");
                    history.historyWinText.style.backgroundColor = isLeft ? (match.score1 > match.score2 ? "white" : "black") : (match.score2 > match.score1 ? "white" : "black");
                    history.historyWinText.style.color = isLeft ? (match.score1 > match.score2 ? "black" : "white") : (match.score2 > match.score1 ? "black" : "white");
                    history.historyWinScore.innerHTML = `${match.score1}-${match.score2}`;
                    this.rightHistory.push(history);
                })
            }
        }
    }

    animateIn() {
        this.matchHistoryText.style.animation = "appearIn 1s ease-in-out";
        this.matchHistoryText.style.opacity = 1;
        this.matchHistoryLeftPlayer.style.animation = "fadeInRightHistory 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.matchHistoryLeftPlayer.style.opacity = 1;
        this.matchHistoryRightPlayer.style.animation = "fadeInLeftHistory 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.matchHistoryRightPlayer.style.opacity = 1;
        this.leftHistory.map((history, index) => {
            setTimeout(function () {
                history.history.style.animation = "fadeInRightHistory 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                history.history.style.opacity = 1;
            }.bind(this), 100 * (index + 1));
        })
        this.rightHistory.map((history, index) => {
            setTimeout(function () {
                history.history.style.animation = "fadeInLeftHistory 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                history.history.style.opacity = 1;
            }.bind(this), 100 * (index + 1));
        })
    }

    animateOut() {
        let max = 0;
        this.matchHistoryText.style.animation = "fadeOut 0.5s ease-in-out";
        this.matchHistoryText.style.opacity = 0;
        this.matchHistoryLeftPlayer.style.animation = "fadeOutRightHistory 1s cubic-bezier(.45,0,1,.48)";
        this.matchHistoryLeftPlayer.style.opacity = 0;
        this.matchHistoryRightPlayer.style.animation = "fadeOutLeftHistory 1s cubic-bezier(.45,0,1,.48)";
        this.matchHistoryRightPlayer.style.opacity = 0;
        this.leftHistory.map((history, index) => {
            setTimeout(function () {
                history.history.style.animation = "fadeOutRightHistory 1s cubic-bezier(.45,0,1,.48)";
                history.history.style.opacity = 0;
            }.bind(this), 100 * (index + 1));
            max = max < index + 1 ? index + 1 : max;
        })
        this.rightHistory.map((history, index) => {
            setTimeout(function () {
                history.history.style.animation = "fadeOutLeftHistory 1s cubic-bezier(.45,0,1,.48)";
                history.history.style.opacity = 0;
            }.bind(this), 100 * (index + 1));
            max = max < index + 1 ? index + 1 : max;
        })
        return 1000 + (max * 100);
    }
}

class History {
    constructor(isLeft, index) {
        this.isLeft = isLeft;
        this.index = index;
    }

    generate() {
        let historyContainer = document.getElementById(this.isLeft ? `matchHistoryLeft` : `matchHistoryRight`);

        this.history = document.createElement("div");
        this.history.id = `${this.index}history`;
        this.history.setAttribute("class", this.isLeft ? "historyLeft" : "historyRight");

        historyContainer.appendChild(this.history);
        let historyObj = document.getElementById(this.history.id);

        this.historyRound = document.createElement("div");
        this.historyPlayer = document.createElement("div");
        this.historySource = document.createElement("img");
        this.historyWinDetails = document.createElement("div");
        this.historyWinText = document.createElement("div");
        this.historyWinScore = document.createElement("div");

        this.historyRound.id = `${this.index}historyRound`;
        this.historyPlayer.id = `${this.index}historyPlayer`;
        this.historySource.id = `${this.index}historySource`;
        this.historyWinDetails.id = `${this.index}historyWinDetails`;
        this.historyWinText.id = `${this.index}historyWinText`;
        this.historyWinScore.id = `${this.index}historyWinScore`;


        if (this.isLeft) {
            this.historyRound.setAttribute("class", "historyRoundLeft");
            this.historyPlayer.setAttribute("class", "historyPlayerLeft");
            this.historySource.setAttribute("class", "historySourceLeft");
            this.historyWinDetails.setAttribute("class", "historyWinDetailsLeft");
            this.historyWinText.setAttribute("class", "historyWinTextLeft");
            this.historyWinScore.setAttribute("class", "historyWinScoreLeft");
        } else {
            this.historyRound.setAttribute("class", "historyRoundRight");
            this.historyPlayer.setAttribute("class", "historyPlayerRight");
            this.historySource.setAttribute("class", "historySourceRight");
            this.historyWinDetails.setAttribute("class", "historyWinDetailsRight");
            this.historyWinText.setAttribute("class", "historyWinTextRight");
            this.historyWinScore.setAttribute("class", "historyWinScoreRight");
        }

        this.historyWinText.innerHTML = "WIN";

        historyObj.appendChild(this.historyRound);
        historyObj.appendChild(this.historyPlayer);
        historyObj.appendChild(this.historySource);
        historyObj.appendChild(this.historyWinDetails);

        document.getElementById(this.historyWinDetails.id).appendChild(this.historyWinText);
        document.getElementById(this.historyWinDetails.id).appendChild(this.historyWinScore);
    }
}

async function getSchedules(stage) {
    try {
        const data = (
            await axios.get("/matches", {
                baseURL: "https://gtsosu.com/api",
                params: {
                    tourney: "igts_2025",
                    stage: stage,
                },
            })
        )["data"];
        return data.length !== 0 ? data : null;
    } catch (error) {
        console.error(error);
    }
};

async function setupBeatmaps() {
    matchManager = new MatchManager(beatmapSet);
    matchManager.generateOverview();
}

async function getDataSet(beatmapID) {
    const { data } = await axios.get("/get_beatmaps", {
        baseURL: BASE,
        params: { b: beatmapID }
    });
    return data.length ? data[0] : null;
};

async function getUserDataSet(user_id) {
    const { data } = await axios.get("/get_user", {
        baseURL: BASE,
        params: { u: user_id, m: 1 }
    });
    return data.length ? data[0] : null;
}

const parseTime = seconds => {
    const second = Math.floor(seconds % 60).toString().padStart(2, '0');
    const minute = Math.floor(seconds / 60).toString().padStart(2, '0');
    return `${minute}:${second}`;
};

function arraysEqual(a, b) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
}

async function makeScrollingText(title, titleDelay, rate, boundaryWidth, padding) {
    if (title.scrollWidth > boundaryWidth) {
        titleDelay.innerHTML = title.innerHTML;
        let ratio = (title.scrollWidth / boundaryWidth) * rate
        title.style.animation = `scrollText ${ratio}s linear infinite`;
        titleDelay.style.animation = `scrollTextDelay ${ratio}s linear infinite`;
        titleDelay.style.animationDelay = `${-ratio / 2}s`;
        titleDelay.style.paddingRight = `${padding}px`;
        title.style.paddingRight = `${padding}px`;
        titleDelay.style.display = "initial";
    } else {
        titleDelay.style.display = "none";
        title.style.animation = "none";
        titleDelay.style.animation = "none";
        titleDelay.style.paddingRight = "0px";
        titleDelay.style.marginTop = `0px`;
        title.style.paddingRight = "0px";
    }
}

const parseTimeMs = ms => {
    const second = Math.floor(ms / 1000) % 60 + '';
    const minute = Math.floor(ms / 1000 / 60) + '';
    return `${'0'.repeat(2 - minute.length) + minute}:${'0'.repeat(2 - second.length) + second}`;
}

setInterval(fadeInOut, 25000)

async function fadeInOut() {
    document.getElementById("matchSongPart1").style.opacity = 0;
    await delay(500);
    document.getElementById("matchSubtitleDetails2").style.opacity = 1;
    await delay(12000);
    document.getElementById("matchSubtitleDetails2").style.opacity = 0;
    await delay(500);
    document.getElementById("matchSongPart1").style.opacity = 1;
    await delay(12000);
}

async function delay(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

async function getCountryFlag(acronym) {
    let imageUrl;
    // console.log(acronym);
    if (!teamFlags.includes(acronym)) {
        imageUrl = addFlags.find(flag => flag.flagname == acronym)["link"];
    } else {
        imageUrl = `https://raw.githubusercontent.com/ppy/osu-resources/master/osu.Game.Resources/Textures/Flags/${acronym}.png`;
    }
    // console.log(imageUrl);
    return imageUrl;
}

function updateTeamLineups(clients) {
    let leftTeam = `${playerOne.innerHTML}: `;
    let left = 0;
    let rightTeam = `${playerTwo.innerHTML}: `;
    let right = 0;
    let leftTeamPlayers = teams.find(team => team["teamName"] === playerOne.innerHTML)?.["teamMembers"];
    let rightTeamPlayers = teams.find(team => team["teamName"] === playerTwo.innerHTML)?.["teamMembers"];
    // console.log(leftTeamPlayers);
    clients.map((client) => {
        if (leftTeamPlayers.includes(client.spectating.name)) {
            leftTeam += (left > 0 ? `, ` : ``) + `${client.spectating.name}`;
            left ++;
        } else if (rightTeamPlayers.includes(client.spectating.name)) {
            rightTeam += (right > 0 ? `, ` : ``) + `${client.spectating.name}`;
            right ++;
        }
    })

    leftTeamLineup.innerHTML = leftTeam;
    rightTeamLineup.innerHTML = rightTeam;

}

async function adjustFont(title, boundaryWidth, originalFontSize) {
    if (title.scrollWidth > boundaryWidth) {
        let ratio = (title.scrollWidth / boundaryWidth);
        title.style.fontSize = `${originalFontSize / ratio}px`;
    } else {
        title.style.fontSize = `${originalFontSize}px`;
    }
}