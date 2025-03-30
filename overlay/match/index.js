// SOCKET /////////////////////////////////////////////////////////////////
let socket = new ReconnectingWebSocket("ws://" + location.host + "/ws");
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
let currentStage;
(async () => {
    try {
        const jsonData = await $.getJSON("../../_data/beatmaps.json");
        jsonData.map((beatmap) => {
            beatmapSet.push(beatmap);
        });
        const jsonData_2 = await $.getJSON("../../_data/seeding.json");
        jsonData_2.Teams.map((seed) => {
            seedData.push(seed);
        });
        const jsonData_3 = await $.getJSON("../../_data/stage.json");
        jsonData_3.map((stage, index) => {
            if (index == 0) {
                currentStage = stage.currentStage;
            } else {
                stages.push(stage);
            }
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
const file = [];
let api;
(async () => {
    try {
        const jsonData = await $.getJSON("../../_data/api.json");
        jsonData.map((num) => {
            file.push(num);
        });
        api = file[0].api;
    } catch (error) {
        console.error("Could not read JSON file", error);
    }
})();

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
        await setupBeatmaps();
        hasSetupBeatmaps = true;
    }

    if (!hasSetupBeatmaps) { return };

    // NORMAL CODE

    tempLeft = data.tourney.manager.teamName.left;

    if (tempLeft != leftTeam && tempLeft != "" && !playersSetup) {
        leftTeam = tempLeft;
        playersSetup = true;
        setTimeout(function (event) {
            matchManager.updatePlayerId([data.tourney.manager.teamName.left, data.tourney.manager.teamName.right])
        }, 150);
    }

    if (!hasSetupPlayers) { return };

    matchManager.checkState(data.tourney.manager.ipcState);
    matchManager.gameplayManager.updateProgress(data);
    matchManager.gameplayManager.updateClients(data.tourney.ipcClients, data.tourney.manager.bools.scoreVisible, data.tourney.manager.ipcState);
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
        this.mapWinP1 = document.createElement("div");
        this.mapPlayerTextP1 = document.createElement("div");
        this.mapWinTextP1 = document.createElement("div");
        this.mapWinP2 = document.createElement("div");
        this.mapPlayerTextP2 = document.createElement("div");
        this.mapWinTextP2 = document.createElement("div");
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
        this.mapWinP1.id = `${this.layerName}mapWinP1`;
        this.mapPlayerTextP1.id = `${this.layerName}mapPlayerTextP1`;
        this.mapWinTextP1.id = `${this.layerName}mapWinTextP1`;
        this.mapWinP2.id = `${this.layerName}mapWinP2`;
        this.mapPlayerTextP2.id = `${this.layerName}mapPlayerTextP2`;
        this.mapWinTextP2.id = `${this.layerName}mapWinTextP2`;
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
        this.mapWinP1.setAttribute("class", "mapWin");
        this.mapPlayerTextP1.setAttribute("class", "mapPlayerText");
        this.mapWinTextP1.setAttribute("class", "mapWinText");
        this.mapWinP2.setAttribute("class", "mapWin");
        this.mapPlayerTextP2.setAttribute("class", "mapPlayerText");
        this.mapWinTextP2.setAttribute("class", "mapWinText");
        this.mapPickIcon.setAttribute("class", "mapPickIcon");
        this.mapBanContainer.setAttribute("class", "mapBanContainer");
        this.mapBanPlayer.setAttribute("class", "mapBanPlayer");
        this.mapBanText.setAttribute("class", "mapBanText");
        this.mapPickText.setAttribute("class", "mapPickText");

        this.mapModpool.innerHTML = this.mods;
        this.mapMapperTitle.innerHTML = "MAPPED BY";
        this.mapDifficultyTitle.innerHTML = "DIFFICULTY";
        this.mapPlayerTextP1.innerHTML = "P1";
        this.mapPlayerTextP2.innerHTML = "P2";
        this.mapWinP1.innerHTML = "WIN";
        this.mapWinP2.innerHTML = "WIN";
        this.mapBanText.innerHTML = "BAN";
        this.mapPickText.innerHTML = "PICK";
        this.mapSource.setAttribute('src', "../../_shared_assets/design/main_banner.png");
        this.mapPickIcon.setAttribute('src', "../../_shared_assets/design/pick_arrow_overview.png");
        this.mapBanPlayer.setAttribute('src', "../../_shared_assets/design/main_banner.png");

        clickerObj.appendChild(this.mapPickText);
        clickerObj.appendChild(this.mapBanContainer);
        clickerObj.appendChild(this.mapDetails);
        clickerObj.appendChild(this.mapWinP1);
        clickerObj.appendChild(this.mapWinP2);
        clickerObj.appendChild(this.mapModpool);
        clickerObj.appendChild(this.mapOverlay);
        clickerObj.appendChild(this.mapSource);
        clickerObj.appendChild(this.mapPickIcon);

        document.getElementById(this.mapBanContainer.id).appendChild(this.mapBanPlayer);
        document.getElementById(this.mapBanContainer.id).appendChild(this.mapBanText);

        document.getElementById(this.mapWinP1.id).appendChild(this.mapPlayerTextP1);
        document.getElementById(this.mapWinP1.id).appendChild(this.mapWinTextP1);
        document.getElementById(this.mapWinP2.id).appendChild(this.mapPlayerTextP2);
        document.getElementById(this.mapWinP2.id).appendChild(this.mapWinTextP2);

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
        this.mapWinP1Queue = document.createElement("div");
        this.mapPlayerTextP1Queue = document.createElement("div");
        this.mapWinTextP1Queue = document.createElement("div");
        this.mapWinP2Queue = document.createElement("div");
        this.mapPlayerTextP2Queue = document.createElement("div");
        this.mapWinTextP2Queue = document.createElement("div");
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
        this.mapWinP1Queue.id = `${this.layerName}mapWinP1Queue`;
        this.mapPlayerTextP1Queue.id = `${this.layerName}mapPlayerTextP1Queue`;
        this.mapWinTextP1Queue.id = `${this.layerName}mapWinTextP1Queue`;
        this.mapWinP2Queue.id = `${this.layerName}mapWinP2Queue`;
        this.mapPlayerTextP2Queue.id = `${this.layerName}mapPlayerTextP2Queue`;
        this.mapWinTextP2Queue.id = `${this.layerName}mapWinTextP2Queue`;
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
        this.mapWinP1Queue.setAttribute("class", "mapWin");
        this.mapPlayerTextP1Queue.setAttribute("class", "mapPlayerText");
        this.mapWinTextP1Queue.setAttribute("class", "mapWinText");
        this.mapWinP2Queue.setAttribute("class", "mapWin");
        this.mapPlayerTextP2Queue.setAttribute("class", "mapPlayerText");
        this.mapWinTextP2Queue.setAttribute("class", "mapWinText");
        this.mapPickQueue.setAttribute("class", isPlayerOne ? "mapPickIconQueueLeft" : "mapPickIconQueueRight");

        this.mapModpoolQueue.innerHTML = this.mods;
        this.mapMapperTitleQueue.innerHTML = "MAPPED BY";
        this.mapDifficultyTitleQueue.innerHTML = "DIFFICULTY";
        this.mapPlayerTextP1Queue.innerHTML = "P1";
        this.mapPlayerTextP2Queue.innerHTML = "P2";
        this.mapWinP1Queue.innerHTML = "WIN";
        this.mapWinP2Queue.innerHTML = "WIN";
        this.mapSourceQueue.setAttribute("src", this.mapSource.src);
        this.mapTitleQueue.innerHTML = this.mapTitle.innerHTML;
        this.mapArtistQueue.innerHTML = this.mapArtist.innerHTML;
        this.mapMapperQueue.innerHTML = this.mapMapper.innerHTML;
        this.mapDifficultyQueue.innerHTML = this.mapDifficulty.innerHTML;
        this.mapPickQueue.setAttribute("src", `../../_shared_assets/design/pick_queue_${isPlayerOne ? "left" : "right"}.png`);

        clickerObjQueue.appendChild(this.mapDetailsQueue);
        clickerObjQueue.appendChild(this.mapWinP1Queue);
        clickerObjQueue.appendChild(this.mapWinP2Queue);
        clickerObjQueue.appendChild(this.mapPickQueue);
        clickerObjQueue.appendChild(this.mapModpoolQueue);
        clickerObjQueue.appendChild(this.mapOverlayQueue);
        clickerObjQueue.appendChild(this.mapSourceQueue);

        document.getElementById(this.mapWinP1Queue.id).appendChild(this.mapPlayerTextP1Queue);
        document.getElementById(this.mapWinP1Queue.id).appendChild(this.mapWinTextP1Queue);
        document.getElementById(this.mapWinP2Queue.id).appendChild(this.mapPlayerTextP2Queue);
        document.getElementById(this.mapWinP2Queue.id).appendChild(this.mapWinTextP2Queue);

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
        this.resultContainerPlayer.innerHTML = isPlayerOne ? "P1" : "P2";
        this.resultContainerText.innerHTML = isBan ? "BAN" : "WIN";

        resultContainer.appendChild(this.resultContainerSong);
        resultContainer.appendChild(this.resultContainerBottom);

        document.getElementById(this.resultContainerSong.id).appendChild(this.resultContainerPick);
        document.getElementById(this.resultContainerSong.id).appendChild(this.resultContainerSource);

        document.getElementById(this.resultContainerBottom.id).appendChild(this.resultContainerPlayer);
        document.getElementById(this.resultContainerBottom.id).appendChild(this.resultContainerText);
    }

    toggleBan(playerId = 6231292, isPlayerOne, pickIndex) {
        if (this.isPick || this.mods == "TB" || this.isBan) return;
        this.isBan = true;
        this.pickIndex = pickIndex;
        this.mapBanPlayer.setAttribute("src", `https://a.ppy.sh/${playerId}`);
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
                this.mapPickText.innerHTML = "P1 PICK";
            } else {
                this.mapPickText.innerHTML = "P2 PICK";
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
            this.mapWinP1.style.opacity = 1;
            this.mapWinP1.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinP2.style.opacity = 0;
            this.mapWinP2.style.animation = "";
            this.mapWinP2.style.backgroundColor = "white";
            this.mapWinP1Queue.style.opacity = 1;
            this.mapWinP1Queue.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinP2Queue.style.opacity = 0;
            this.mapWinP2Queue.style.animation = "";
            this.mapWinP2Queue.style.backgroundColor = "white";
            this.resultContainerPlayer.innerHTML = "P1";
            if (this.mods != "TB") {
                this.resultContainerText.style.backgroundColor = this.isPlayerOne ? "#d0ffcc" : "#ffcccc";
                this.mapWinP1Queue.style.backgroundColor = this.isPlayerOne ? "#d0ffcc" : "#ffcccc";
                this.mapWinP1.style.backgroundColor = this.isPlayerOne ? "#d0ffcc" : "#ffcccc";
            }
        } else {
            this.mapWinP2.style.opacity = 1;
            this.mapWinP2.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinP1.style.opacity = 0;
            this.mapWinP1.style.animation = "";
            this.mapWinP1.style.backgroundColor = "white";
            this.mapWinP2Queue.style.opacity = 1;
            this.mapWinP2Queue.style.animation = "fadeInOverviewBeatmap 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.mapWinP1Queue.style.opacity = 0;
            this.mapWinP1Queue.style.animation = "";
            this.mapWinP1Queue.style.backgroundColor = "white";
            this.resultContainerPlayer.innerHTML = "P2";
            if (this.mods != "TB") {
                this.resultContainerText.style.backgroundColor = this.isPlayerOne ? "#ffcccc" : "#d0ffcc";
                this.mapWinP2.style.backgroundColor = this.isPlayerOne ? "#ffcccc" : "#d0ffcc";
                this.mapWinP2Queue.style.backgroundColor = this.isPlayerOne ? "#ffcccc" : "#d0ffcc";
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
            this.mapWinP1.style.opacity = 0;
            this.mapWinP1.style.animation = "";
            this.mapWinP2.style.opacity = 0;
            this.mapWinP2.style.animation = "";
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
        this.pickCount = 0;
        this.leftWins = 0;
        this.rightWins = 0;
        this.playerTurn = "left";
        this.banCount = 0;
        this.leftPlayerData;
        this.rightPlayerData;
        this.currentMappoolScene = 1;
        this.currentFile;
        this.currentStats = [];
        this.scoreOne;
        this.scoreTwo;
        this.bestOf;

        this.hasBanned = false;
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
        this.bottomP1Pick = document.getElementById("bottomP1Pick");
        this.bottomP2Pick = document.getElementById("bottomP2Pick");
        this.bottomP1PickText = document.getElementById("bottomP1PickText");
        this.bottomP2PickText = document.getElementById("bottomP2PickText");

        this.effectsShimmer = document.getElementById("effectsShimmer");

        this.matchScene = document.getElementById("matchScene");
        this.bottomP1Text = document.getElementById("bottomP1Text");
        this.bottomP2Text = document.getElementById("bottomP2Text");
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
        this.introPlayerOneRank = document.getElementById("introPlayerOneRank");
        this.introPlayerTwoRank = document.getElementById("introPlayerTwoRank");
        this.introScene = document.getElementById("introScene");

        this.matchHistoryLeftPlayerSource = document.getElementById("matchHistoryLeftPlayerSource");
        this.matchHistoryLeftPlayerName = document.getElementById("matchHistoryLeftPlayerName");
        this.matchHistoryLeftPlayerSeed = document.getElementById("matchHistoryLeftPlayerSeed");
        this.matchHistoryRightPlayerSource = document.getElementById("matchHistoryRightPlayerSource");
        this.matchHistoryRightPlayerName = document.getElementById("matchHistoryRightPlayerName");
        this.matchHistoryRightPlayerSeed = document.getElementById("matchHistoryRightPlayerSeed");
        this.matchHistoryScene = document.getElementById("matchHistoryScene");

        this.resultScene = document.getElementById("resultScene");

        this.controllerTurn = document.getElementById("controllerTurn");
        this.controllerTurn.addEventListener("click", async (event) => {
            if (this.playerTurn == "left") {
                if (this.hasBanned && this.banCount < 2) {
                    this.hasBanned = false;
                    this.controllerTurn.innerHTML = `Left Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomP1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP1Pick.style.opacity = 1;
                    this.bottomP2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP2Pick.style.opacity = 0;
                } else if (this.hasBanned || this.banCount < 2) {
                    this.playerTurn = "right";
                    this.controllerTurn.innerHTML = `Right Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    if (this.hasBanned) {
                        this.bottomP1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP1Pick.style.opacity = 0;
                        this.bottomP2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP2Pick.style.opacity = 0;
                    } else {
                        this.bottomP2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP2Pick.style.opacity = 1;
                        this.bottomP1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP1Pick.style.opacity = 0;
                    }
                } else {
                    this.hasBanned = true;
                    this.controllerTurn.innerHTML = `Left Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomP1Pick.style.animation = "pickingBob 1s cubic-bezier(0,.7,.39,.99)";
                }
            } else {
                if (this.hasBanned && this.banCount < 2) {
                    this.hasBanned = false;
                    this.controllerTurn.innerHTML = `Right Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomP2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP2Pick.style.opacity = 1;
                    this.bottomP1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP1Pick.style.opacity = 0;
                } else if (this.hasBanned || this.banCount < 2) {
                    this.playerTurn = "left";
                    this.controllerTurn.innerHTML = `Left Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    if (this.hasBanned) {
                        this.bottomP1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP1Pick.style.opacity = 0;
                        this.bottomP2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP2Pick.style.opacity = 0;
                    } else {
                        this.bottomP1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP1Pick.style.opacity = 1;
                        this.bottomP2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP2Pick.style.opacity = 0;
                    }
                } else {
                    this.hasBanned = true;
                    this.controllerTurn.innerHTML = `Right Player ${this.banCount < 2 ? "Ban" : "Pick"}`;
                    this.bottomP2Pick.style.animation = "pickingBob 1s cubic-bezier(0,.7,.39,.99)";
                }
            }
            this.bottomP1PickText.innerHTML = this.banCount < 2 ? "Currently Banning" : "Currently Picking";
            this.bottomP2PickText.innerHTML = this.banCount < 2 ? "Currently Banning" : "Currently Picking";
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
                    this.bottomP1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP1Pick.style.opacity = 1;
                } else if (this.playerTurn == "right") {
                    this.bottomP2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP2Pick.style.opacity = 1;
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
                            this.bottomP1Pick.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                            this.bottomP1Pick.style.opacity = 1;
                        } else if (this.playerTurn == "right") {
                            this.bottomP2Pick.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                            this.bottomP2Pick.style.opacity = 1;
                        }
                    }
                    this.bottomP1Text.style.animation = "fadeInRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP1Text.style.opacity = 1;
                    this.bottomP2Text.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                    this.bottomP2Text.style.opacity = 1;
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
                        this.bottomP1Pick.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP1Pick.style.opacity = 0;
                    } else if (this.playerTurn == "right") {
                        this.bottomP2Pick.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.bottomP2Pick.style.opacity = 0;
                    }
                }
                this.bottomP1Text.style.animation = "fadeOutRight 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                this.bottomP1Text.style.opacity = 0;
                this.bottomP2Text.style.animation = "fadeOutLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                this.bottomP2Text.style.opacity = 0;
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
                if (this.currentIntroScene == 2) {
                    this.controllerIntro.innerHTML = "Switch to Intro";
                    this.currentIntroScene = 0;
                    let value = this.historyManager.animateOut();
                    setTimeout(function () {
                        this.mainMatchScene.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.mainMatchScene.style.opacity = 1;
                        this.matchBottom.style.animation = "bottomSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                        this.matchBottom.style.opacity = 1;
                    }.bind(this), value);
                } else if (this.currentIntroScene == 1) {
                    this.controllerIntro.innerHTML = "Switch to Match";
                    this.currentIntroScene = 2;
                    this.introScene.style.animation = "fadeOut 0.5s ease-in-out";
                    this.introScene.style.opacity = 0;
                        // this.historyManager.animateIn();
                    setTimeout(function () {
                        this.historyManager.animateIn();
                    }.bind(this), 250);
                } else if (this.currentIntroScene == 0) {
                    this.controllerIntro.innerHTML = "Switch to History";
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
                            bm.toggleBan(this.playerTurn == "left" ? this.leftPlayerData.user_id : this.rightPlayerData.user_id, this.playerTurn == "left" ? true : false, this.pickCount);
                            this.controllerTurn.click();
                        } else if (this.banCount == 2 && !bm.isPick && !bm.isBan && (this.bestOf - 1) * 2 != this.pickCount - 2) {
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
        this.leftPlayerData = await getUserDataSet(playerId[0]);
        this.rightPlayerData = await getUserDataSet(playerId[1]);

        this.bottomPlayerOnePfp.setAttribute("src", `https://a.ppy.sh/${this.leftPlayerData.user_id}`);
        this.bottomPlayerTwoPfp.setAttribute("src", `https://a.ppy.sh/${this.rightPlayerData.user_id}`);
        this.bottomPlayerOneName.innerHTML = playerId[0];
        this.bottomPlayerTwoName.innerHTML = playerId[1];
        this.bottomPlayerOneSeed.innerHTML = `Seed #${seedData.find(seed => seed["Players"][0].id == this.leftPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;
        this.bottomPlayerTwoSeed.innerHTML = `Seed #${seedData.find(seed => seed["Players"][0].id == this.rightPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;

        this.introPlayerOnePfp.setAttribute("src", `https://a.ppy.sh/${this.leftPlayerData.user_id}`);
        this.introPlayerTwoPfp.setAttribute("src", `https://a.ppy.sh/${this.rightPlayerData.user_id}`);
        this.introPlayerOneName.innerHTML = playerId[0];
        this.introPlayerTwoName.innerHTML = playerId[1];
        this.introPlayerOneSeed.innerHTML = `#${seedData.find(seed => seed["Players"][0].id == this.leftPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;
        this.introPlayerTwoSeed.innerHTML = `#${seedData.find(seed => seed["Players"][0].id == this.rightPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;
        this.introPlayerOneRank.innerHTML = `#${this.leftPlayerData.pp_rank}`;
        this.introPlayerTwoRank.innerHTML = `#${this.rightPlayerData.pp_rank}`;

        this.matchHistoryLeftPlayerSource.setAttribute("src", `https://a.ppy.sh/${this.leftPlayerData.user_id}`);
        this.matchHistoryRightPlayerSource.setAttribute("src", `https://a.ppy.sh/${this.rightPlayerData.user_id}`);
        this.matchHistoryLeftPlayerName.innerHTML = playerId[0];
        this.matchHistoryRightPlayerName.innerHTML = playerId[1];
        this.matchHistoryLeftPlayerSeed.innerHTML = `Seed #${seedData.find(seed => seed["Players"][0].id == this.leftPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;
        this.matchHistoryRightPlayerSeed.innerHTML = `Seed #${seedData.find(seed => seed["Players"][0].id == this.rightPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;

        this.resultsManager.playerLeft = this.leftPlayerData;
        this.resultsManager.playerRight = this.rightPlayerData;
        this.resultsManager.initialUpdate();
        preLoading.style.opacity = 0;
        hasSetupPlayers = true;
        this.historyManager = new HistoryManager(playerId[0], playerId[1]);
        this.historyManager.generate();
        setTimeout(function () {
            preLoading.style.display = "none";
        }.bind(this), 1000);
    }

    changeUpcoming(mapData) {
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
        this.upcomingPickPlayerSource.setAttribute("src", `https://a.ppy.sh/${this.playerTurn == "left" ? this.rightPlayerData.user_id : this.leftPlayerData.user_id}`)

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
                this.matchSource.setAttribute('src', `../../_shared_assets/design/main_banner.ong`);
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
            this.matchSource.setAttribute('src', `http://` + location.host + `/Songs/${data.menu.bm.path.full}?a=${Math.random(10000)}`);
            this.matchSource.onerror = function () {
                this.matchSource.setAttribute('src', `../../_shared_assets/design/main_banner.ong`);
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
            this.gameplayManager.hidePlayerData();
            this.markWin(this.gameplayManager.calculateResults(this.leftPlayerData, this.rightPlayerData));
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
            setTimeout(function () {
                this.resultSwitchVar == true ? this.controllerResults.click() : null;
            }.bind(this), 10000);
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
        if ((this.leftWins == this.bestOf || this.rightWins == this.bestOf) && (this.scoreOne == this.bestOf || this.scoreTwo == this.bestOf)) {
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
        this.matchScoreBoard = document.getElementById("matchScoreBoard");
        this.bottomMatch = document.getElementById("bottomMatch");
        this.bottomMatchResults = document.getElementById("bottomMatchResults");
        this.bottomMatchProgressBar = document.getElementById("bottomMatchProgressBar");
        this.bg = document.getElementById("bg");
        this.bg_match = document.getElementById("bg_match");
        this.matchClients = document.getElementById("matchClients");

        this.matchClientOne100 = document.getElementById("matchClientOne100");
        this.matchClientOneMiss = document.getElementById("matchClientOneMiss");
        this.matchClientOneUr = document.getElementById("matchClientOneUr");
        this.matchClientTwo100 = document.getElementById("matchClientTwo100");
        this.matchClientTwoMiss = document.getElementById("matchClientTwoMiss");
        this.matchClientTwoUr = document.getElementById("matchClientTwoUr");
        this.matchOneScore = document.getElementById("matchOneScore");
        this.matchTwoScore = document.getElementById("matchTwoScore");
        this.matchScoreLeftText = document.getElementById("matchScoreLeftText");
        this.matchScoreRightText = document.getElementById("matchScoreRightText");

        this.matchClientOneDetails = document.getElementById("matchClientOneDetails");
        this.matchClientTwoDetails = document.getElementById("matchClientTwoDetails");
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
            matchClientOne100: new CountUp('matchClientOne100', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientOneMiss: new CountUp('matchClientOneMiss', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientOneUr: new CountUp('matchClientOneUr', 0, 0, 2, 2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientTwo100: new CountUp('matchClientTwo100', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientTwoMiss: new CountUp('matchClientTwoMiss', 0, 0, 0, .2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
            matchClientTwoUr: new CountUp('matchClientTwoUr', 0, 0, 2, 2, { useEasing: true, useGrouping: true, separator: "", decimal: "." }),
        }
        this.scoreLeft;
        this.scoreRight;
        this.comboLeft;
        this.comboRight;
        this.barThreshold = 100000;
        this.songStart;
        this.currentTime;
        this.isDoubleTime = false;
    }

    promptGameplay() {
        if (this.isGameplay) return;
        this.matchScoreBoard.style.animation = "slideUpMatch 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatch.style.animation = "slideUpMatchBottom 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.bottomMatch.style.transform = "translateY(0)";
        this.matchClients.style.animation = "mappoolSceneIn 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.matchClients.style.opacity = 1;
        this.bg_match.play();
        this.matchScoreBoard.style.opacity = 1;
        this.isGameplay = true;
        setTimeout(function () {
            this.bg.style.clipPath = "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)";
            this.revealPlayerData();
            this.bg.pause();
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
        this.bg_match.pause();
        this.hidePlayerData();
        this.bg.play();
        this.matchScoreBoard.style.opacity = 0;
        this.isGameplay = false;
    }

    hidePlayerData() {
        this.matchClientOneDetails.style.opacity = 0;
        this.matchClientTwoDetails.style.opacity = 0;
    }

    revealPlayerData() {
        this.matchClientOneDetails.style.opacity = 1;
        this.matchClientTwoDetails.style.opacity = 1;
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

    updateClients(data, scoreVisible, ipcState) {
        if (!(scoreVisible && ipcState == 3)) return;

        data.map(async (clientData, index) => {
            let ur = clientData.gameplay.hits.unstableRate;
            if (index == 0) {
                this.scoreLeft = clientData.gameplay.score;
                if (this.comboLeft > 30 && clientData.gameplay.combo.current < this.comboLeft) this.flashMiss("matchClientOneMissGlow");
                this.comboLeft = clientData.gameplay.combo.current;
                this.animationScore.matchOneScore.update(this.scoreLeft);
                this.animationScore.matchClientOne100.update(clientData.gameplay.hits["100"]);
                this.animationScore.matchClientOneMiss.update(clientData.gameplay.hits["0"]);
                this.animationScore.matchClientOneUr.update(Number(ur) > 999.99 ? 999.99 : ur);
            } else if (index == 1) {
                this.scoreRight = clientData.gameplay.score;
                if (this.comboRight > 30 && clientData.gameplay.combo.current < this.comboRight) this.flashMiss("matchClientTwoMissGlow");
                this.comboRight = clientData.gameplay.combo.current;
                this.animationScore.matchTwoScore.update(this.scoreRight);
                this.animationScore.matchClientTwo100.update(clientData.gameplay.hits["100"]);
                this.animationScore.matchClientTwoMiss.update(clientData.gameplay.hits["0"]);
                this.animationScore.matchClientTwoUr.update(Number(ur) > 999.99 ? 999.99 : ur);
            }
        })
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
        this.animationScore.matchOneScore.update(0);
        this.animationScore.matchClientOne100.update(0);
        this.animationScore.matchClientOneMiss.update(0);
        this.animationScore.matchClientOneUr.update(0);
        this.animationScore.matchTwoScore.update(0);
        this.animationScore.matchClientTwo100.update(0);
        this.animationScore.matchClientTwoMiss.update(0);
        this.animationScore.matchClientTwoUr.update(0);
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
        this.matchOneScore.style.color = "black";
        this.matchTwoScore.style.color = "black";
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
            this.bottomResultsTop.innerHTML = `${leftPlayerData.username} WINS BY`;
        } else if (!leftWon && !isTie) {
            this.bottomResultsTop.innerHTML = `${rightPlayerData.username} WINS BY`;
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
            this.matchWinningLeftContent.style.backgroundColor = "black";
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
            this.matchWinningRightContent.style.backgroundColor = "black";
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

    initialUpdate() {
        this.resultScorelinePlayerOneSource.setAttribute("src", `https://a.ppy.sh/${this.playerLeft.user_id}`);
        this.resultScorelinePlayerTwoSource.setAttribute("src", `https://a.ppy.sh/${this.playerRight.user_id}`);
        this.resultScorelinePlayerOneText.innerHTML = this.playerLeft.username;
        this.resultScorelinePlayerTwoText.innerHTML = this.playerRight.username;
        this.resultPlayerPickSourceOne.setAttribute("src", `https://a.ppy.sh/${this.playerLeft.user_id}`);
        this.resultPlayerPickSourceTwo.setAttribute("src", `https://a.ppy.sh/${this.playerRight.user_id}`);
        this.resultStageText.innerHTML = this.currentStage;
    }

    update() {
        this.resultOne.innerHTML = this.scoreLeft;
        this.resultTwo.innerHTML = this.scoreRight;
        this.resultPlayerTextOne.innerHTML = `P1 ${this.firstPickIsLeft ? "TOP" : "BOTTOM"}`;
        this.resultPlayerTextTwo.innerHTML = `P2 ${this.firstPickIsLeft ? "BOTTOM" : "TOP"}`;
    }
}

class HistoryManager {
    constructor(leftPlayer, rightPlayer) {
        this.leftPlayer = leftPlayer;
        this.rightPlayer = rightPlayer;
        this.leftHistory = [];
        this.rightHistory = [];
        this.rounds = ["Round of 64", "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Finals", "Grand Finals"];

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
                const leftMatches = stageMatches
                    .filter(match => (match.score1 == -1 || match.score2 == -1 || match.score1 > 4 || match.score2 > 4))
                    .filter(match => (match.player1 == this.leftPlayer || match.player2 == this.leftPlayer))
                    .sort((a, b) => new Date(a.time) - new Date(b.time))
                const rightMatches = stageMatches
                    .filter(match => (match.score1 == -1 || match.score2 == -1 || match.score1 > 4 || match.score2 > 4))
                    .filter(match => (match.player1 == this.rightPlayer || match.player2 == this.rightPlayer))
                    .sort((a, b) => new Date(a.time) - new Date(b.time))

                leftMatches.map(async (match) => {
                    const history = new History(true, index);
                    index++;
                    history.generate();
                    const isLeft = match.player1 == this.leftPlayer ? true : false;
                    const playerData = await getUserDataSet(isLeft ? match.player2 : match.player1);
                    history.historyRound.innerHTML = stages.find(stage => stage.stageName == round)["stage"];
                    history.historyPlayer.innerHTML = isLeft ? match.player2 : match.player1;
                    history.historySource.setAttribute("src", `https://a.ppy.sh/${playerData.user_id}`);
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
                    const isLeft = match.player1 == this.rightPlayer ? true : false;
                    const playerData = await getUserDataSet(isLeft ? match.player2 : match.player1);
                    history.historyRound.innerHTML = stages.find(stage => stage.stageName == round)["stage"];
                    history.historyPlayer.innerHTML = isLeft ? match.player2 : match.player1;
                    history.historySource.setAttribute("src", `https://a.ppy.sh/${playerData.user_id}`);
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
        this.leftHistory.map((history,index)=>{
            setTimeout(function() {
                history.history.style.animation = "fadeInRightHistory 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                history.history.style.opacity = 1;
            }.bind(this),100*(index+1));
        }) 
        this.rightHistory.map((history,index)=>{
            setTimeout(function() {
                history.history.style.animation = "fadeInLeftHistory 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
                history.history.style.opacity = 1;
            }.bind(this),100*(index+1));
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
        this.leftHistory.map((history,index)=>{
            setTimeout(function() {
                history.history.style.animation = "fadeOutRightHistory 1s cubic-bezier(.45,0,1,.48)";
                history.history.style.opacity = 0;
            }.bind(this),100*(index+1));
            max = max < index+1 ? index+1 : max;
        }) 
        this.rightHistory.map((history,index)=>{
            setTimeout(function() {
                history.history.style.animation = "fadeOutLeftHistory 1s cubic-bezier(.45,0,1,.48)";
                history.history.style.opacity = 0;
            }.bind(this),100*(index+1));
            max = max < index+1 ? index+1 : max;
        }) 
        return 1000+(max*100);
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
                    tourney: "egts_2025",
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
    try {
        const data = (
            await axios.get("/get_beatmaps", {
                baseURL: "https://osu.ppy.sh/api",
                params: {
                    k: api,
                    b: beatmapID,
                },
            })
        )["data"];
        return data.length !== 0 ? data[0] : null;
    } catch (error) {
        console.error(error);
    }
};

async function getUserDataSet(user_id) {
    try {
        const data = (
            await axios.get("/get_user", {
                baseURL: "https://osu.ppy.sh/api",
                params: {
                    k: api,
                    u: user_id,
                    m: 1,
                },
            })
        )["data"];
        return data.length !== 0 ? data[0] : null;
    } catch (error) {
        console.error(error);
    }
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