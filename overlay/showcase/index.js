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
let beatmaps = [];
let offlineData = [];
let stages = [];
let currentStage;
(async () => {
    try {
        const jsonData = await $.getJSON("../../_data/beatmaps.json");
        jsonData.map((beatmap) => {
            beatmapSet.push(beatmap);
        });
        const jsonData_2 = await $.getJSON("../../_data/offline_dataset.json");
        jsonData_2.map((beatmap) => {
            offlineData.push(beatmap);
        });
        const jsonData_3 = await $.getJSON("../../_data/stage.json");
        jsonData_3.map((stage,index) => {
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
        beatmaps.push(beatmapSet[index]["beatmapId"]);
    }
})();
console.log(beatmapSet);
console.log(offlineData);
console.log(stages);
console.log(currentStage);

// PLACEHOLDER VARS /////////////////////////////////////////////////////////////////
let currentFile = "";
let currentStats;
let tempBG;
let hasSetup = false;
let generated = false;
let showcaseManager;
let initialized = false;
let currentScene = "showcase"
const beatmapsStore = new Set(); // Store beatmapID;

// CONTROL PANELS //////////
sceneButton.addEventListener("click", async function(event) {
    if (currentScene == "showcase" && generated) {
        await promptOverview();
        sceneButton.style.backgroundColor = "rgb(85, 4, 139)";
        sceneButton.innerHTML = "CURRENT SCENE: OVERVIEW";
    }
    else if (generated) {
        await promptShowcase();
        sceneButton.style.backgroundColor = "rgb(4, 96, 139)";
        sceneButton.innerHTML = "CURRENT SCENE: SHOWCASE";
    }
})

// CLASS ////////////////////////////////////////////////////////////////////////
class ShowcaseManager {
    constructor(beatmapSet) {
        this.fgAsset = document.getElementById("fg");
        this.clientAsset = document.getElementById("client");
        this.beatmapDetailsAsset = document.getElementById("beatmapDetails");
        this.pickMaskAsset = document.getElementById("pickMask");
        this.modpoolAsset = document.getElementById("modpool");
        this.songTitleAsset = document.getElementById("songTitle");
        this.artistTitleAsset = document.getElementById("artistTitle");
        this.sourceAsset = document.getElementById("source");
        this.pickAsset = document.getElementById("pick");
        this.customSongAsset = document.getElementById("customSong");
        this.customCollabAsset = document.getElementById("customCollab");
        this.mapperTextAsset = document.getElementById("mapperText");
        this.difficultyTextAsset = document.getElementById("difficultyText");
        this.difficultyTextDelayAsset = document.getElementById("difficultyTextDelay");
        this.srAsset = document.getElementById("sr");
        this.odAsset = document.getElementById("od");
        this.bpmAsset = document.getElementById("bpm");
        this.lengthAsset = document.getElementById("length");
        this.replayAsset = document.getElementById("replay");
        this.pickQueueAsset = document.getElementById("pickQueue");
        this.stinger = document.getElementById("transitionVideo");
        this.replayer = document.getElementById("replay");
        this.showcaseText = document.getElementById("asset_1");
        this.overviewStage = document.getElementById("overviewStage");
        this.overviewDetails = document.getElementById("overviewDetails");
        this.metadata;
        this.stats = [];
        this.beatmapSet = beatmapSet;
        this.currentPick;
        this.revealed = 3;
        this.generate();
    }
    async generate() {
        this.showcaseText.setAttribute("src",stages.find(stage => stage.stage == currentStage)["showcase"]);
        this.overviewStage.innerHTML = stages.find(stage => stage.stage == currentStage)["stageName"];
        this.overviewDetails.innerHTML = stages.find(stage => stage.stage == currentStage)["overviewText"];
        for (let i = 0; i < this.beatmapSet.length; i++) {
            this.pickItem = document.createElement("div");
            this.pickName = document.createElement("div");
            this.pickOverlay = document.createElement("div");
            this.pickSource = document.createElement("img");

            this.pickItem.id = `${i}pickItem`;
            this.pickName.id = `${i}pickName`;
            this.pickOverlay.id = `${i}pickOverlay`;
            this.pickSource.id = `${i}pickSource`;

            this.pickItem.setAttribute("class", "pickItem");
            this.pickName.setAttribute("class", "pickName");
            this.pickOverlay.setAttribute("class", "pickOverlay");
            this.pickSource.setAttribute("class", "pickSource");
            
            if (i >= 4) {
                this.pickItem.setAttribute("class", "pickItem");
                this.pickName.setAttribute("class", "pickName lastPick");
                this.pickOverlay.setAttribute("class", "pickOverlay lastOverlay");
                this.pickSource.setAttribute("class", "pickSource lastSource");
            }

            if (i == 0) {
                this.pickSource.style.filter = "blur(0px)";
            } else {
                this.pickSource.style.filter = "blur(10px)";
            }

            this.pickName.innerHTML = this.beatmapSet[i]["pick"];
            let mapData = offlineData.find(beatmapData => (/^[0-9]+$/.test(this.beatmapSet[i]["beatmapId"]) ? beatmapData.menu.bm.id : beatmapData.menu.bm.path.file) === this.beatmapSet[i]["beatmapId"]);
            try {
                this.pickSource.setAttribute("src", "http://" + location.host + `/Songs/${mapData.menu.bm.path.full}?a=${Math.random(10000)}`);
            } catch (e) {
                this.pickSource.setAttribute("src","../../_shared_assets/design/main_banner.png");
            }

            this.pickQueueAsset.appendChild(this.pickItem);
            document.getElementById(this.pickItem.id).appendChild(this.pickName);
            document.getElementById(this.pickItem.id).appendChild(this.pickOverlay);
            document.getElementById(this.pickItem.id).appendChild(this.pickSource);
        }
        this.currentPick = 0;
        generated = true;
        console.log("Completed Setup!");
    }
    move(moveIndex) {
        let distance = 332+18;
        this.pickQueueAsset.style.transform = `translateX(-${distance*(this.revealed + moveIndex - 3)}px)`;
        this.beatmapSet.map((beatmap, index) => {
            let pickName = document.getElementById(`${index}pickName`);
            let pickOverlay = document.getElementById(`${index}pickOverlay`);
            let pickSource = document.getElementById(`${index}pickSource`);
            if (index < this.revealed+moveIndex+1) {
                pickName.style.opacity = 1;
                pickOverlay.style.backgroundImage = "linear-gradient(to right, rgba(255,255,255,0.5) ,rgba(255,255,255,0.5))";
                pickSource.style.opacity = 1;
            } else {
                pickName.style.opacity = 0;
                pickOverlay.style.backgroundImage = "linear-gradient(to right, rgba(255,255,255,1) ,rgba(255,255,255,0))";
                pickSource.style.opacity = 0;
            }
            // console.log(this.revealed+moveIndex-3);
            if (index == this.revealed+moveIndex-3) {
                pickSource.style.filter = "blur(0px)";
            } else {
                pickSource.style.filter = "blur(10px)";
            }
        })
        this.revealed += moveIndex;
    }
    updateDetails(data) {
        this.stinger.play();
        let { id } = data.menu.bm;
        let { memoryOD, fullSR, BPM: { min, max } } = data.menu.bm.stats;
        let { full } = data.menu.bm.time;
        let { difficulty, mapper, artist, title } = data.menu.bm.metadata;
        let file = data.menu.bm.path.file;
        let index;
        let pick;
        let customMapper = "";
        let mod = "";
        let modOD;
    
        // console.log(file);
    
        // CHECKER FOR MAPPICK
        if (beatmaps.includes(id)) {
            index = beatmapSet.findIndex(beatmap => beatmap["beatmapId"] === id);
            pick = beatmapSet[index]["pick"];
            customMapper = beatmapSet[index]["mappers"];
            mod = pick.substring(0,2).toUpperCase();
            if (mod == "HR" || mod == "FM") {
                modOD = Math.min(memoryOD*1.4, 10).toFixed(2);
            } else if (mod == "DT") {
                modOD = Math.min((79.5 - (Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * memoryOD))) / 1.5)) / 6, 1.5 > 1.5 ? 12 : 11).toFixed(2);
                full = full/1.5;
                min = Math.round(min*1.5);
                max = Math.round(max*1.5);
            }
            this.move(index-this.currentPick);
            this.currentPick = index;
        } else if (beatmaps.includes(file)) {
            index = beatmapSet.findIndex(beatmap => beatmap["beatmapId"] === file);
            pick = beatmapSet[index]["pick"];
            customMapper = beatmapSet[index]["mappers"];
            mod = pick.substring(0,2).toUpperCase();
            if (mod == "HR" || mod == "FM") {
                modOD = Math.min(memoryOD*1.4, 10).toFixed(2);
            } else if (mod == "DT") {
                modOD = Math.min((79.5 - (Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * memoryOD))) / 1.5)) / 6, 1.5 > 1.5 ? 12 : 11).toFixed(2);
                full = full/1.5;
                min = Math.round(min*1.5);
                max = Math.round(max*1.5);
            }
            this.move(index-this.currentPick);
            this.currentPick = index;
        }

        setTimeout(function() {
            try {
                this.customSongAsset.style.display = beatmapSet[index]["customSong"] ? "initial" : "none";
                this.customCollabAsset.innerHTML = `${beatmapSet[index]["collab"]} Collab`;
                this.customCollabAsset.style.display = beatmapSet[index]["collab"] != "" ? "initial" : "none";
            } catch (e) {
                this.customSongAsset.style.display = "none";
                this.customCollabAsset.style.display = "none";
            }
            this.pickAsset.innerHTML = pick == undefined ? "N.A" : pick;
            this.songTitleAsset.innerHTML = title;
            this.artistTitleAsset.innerHTML = artist;
            this.mapperTextAsset.innerHTML = customMapper != "" ? customMapper:mapper;
            this.difficultyTextAsset.innerHTML = difficulty;
            this.odAsset.innerHTML = (mod == "DT" || mod == "FM" || mod == "HR") ? `${Number(memoryOD).toFixed(1)} (${Number(modOD).toFixed(1)})` : Number(memoryOD).toFixed(1);
            this.srAsset.innerHTML = mod == "DT" ? `${beatmapSet[index]["modSR"]}*` : `${Number(fullSR).toFixed(2)}*`;
            this.bpmAsset.innerHTML = min === max ? min : `${min} - ${max}`;
            this.lengthAsset.innerHTML = parseTime(full);
            this.modpoolAsset.innerHTML = mod == "TB" ? "&#8202;TB" : mod;
        
            // BG
            try {
                if(tempBG !== data.menu.bm.path.full){
                    tempBG = data.menu.bm.path.full;
                    data.menu.bm.path.full = data.menu.bm.path.full.replace(/#/g,'%23').replace(/%/g,'%25');
                    this.sourceAsset.setAttribute('src',`http://` + location.host + `/Songs/${data.menu.bm.path.full}?a=${Math.random(10000)}`);
                }
            } catch (e) {
                this.sourceAsset.setAttribute('src',"../../_shared_assets/design/main_banner.png");
            }
    
            this.adjustFont(this.songTitleAsset,700,48);
        
            this.makeScrollingText(this.difficultyTextAsset, this.difficultyTextDelayAsset,20,340,40);
        }.bind(this),1000)
    }
    adjustFont(title, boundaryWidth, originalFontSize) {
        if (title.scrollWidth > boundaryWidth) {
            let ratio = (title.scrollWidth/boundaryWidth);
            title.style.fontSize = `${originalFontSize/ratio}px`;
        } else {
            title.style.fontSize = `${originalFontSize}px`;
        }
    }
    makeScrollingText(title, titleDelay, rate, boundaryWidth, padding) {
        if (title.scrollWidth > boundaryWidth) {
            titleDelay.innerHTML = title.innerHTML;
            let ratio = (title.scrollWidth/boundaryWidth)*rate
            title.style.animation = `scrollText ${ratio}s linear infinite`;
            titleDelay.style.animation = `scrollText ${ratio}s linear infinite`;
            titleDelay.style.animationDelay = `${-ratio/2}s`;
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
    updateReplayer(name) {
        if (name == this.replayer.innerHTML || name == undefined) return;
        this.replayer.innerHTML = name;
    }
    fadeOut() {
        this.clientAsset.style.animation = "fadeOutRight 1s cubic-bezier(.45,0,1,.48)";
        this.beatmapDetailsAsset.style.animation = "fadeOutRight 1s cubic-bezier(.45,0,1,.48)";
        this.pickMaskAsset.style.animation = "fadeOutRight 1s cubic-bezier(.45,0,1,.48)";
        this.fgAsset.style.animation = "fadeOutRight 1s cubic-bezier(.45,0,1,.48)";
        this.clientAsset.style.opacity = 0;
        this.beatmapDetailsAsset.style.opacity = 0;
        this.pickMaskAsset.style.opacity = 0;
        this.fgAsset.style.opacity = 0;
    }
    fadeIn() {
        this.clientAsset.style.opacity = 1;
        this.beatmapDetailsAsset.style.opacity = 1;
        this.pickMaskAsset.style.opacity = 1;
        this.fgAsset.style.opacity = 1;
        this.clientAsset.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.beatmapDetailsAsset.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.pickMaskAsset.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.fgAsset.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
    }
    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }
    updateStats(metadata,stats) {
        this.metadata = metadata;
        this.stats = stats;
    }
}

class Beatmap {
    constructor(mods, beatmapID, layerName) {
        this.mods = mods;
        this.beatmapID = beatmapID;
        this.layerName = layerName;
        this.isBan = false;
    }
    generate() {
        let mappoolContainer = document.getElementById(`${this.mods}`);

        this.clicker = document.createElement("div");
        this.clicker.id = `${this.layerName}Clicker`;
        this.clicker.setAttribute("class", "clicker");

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

        this.mapDetails.id = `${this.layerName}mapDetails`;
        this.mapTitleContainer.id = `${this.layerName}mapTitleContainer`;
        this.mapTitle.id = `${this.layerName}mapTitle`;
        this.mapArtistContainer.id = `${this.layerName}mapArtistContainer`;
        this.mapArtist.id = `${this.layerName}mapArtist`;
        this.mapBottom.id = `${this.layerName}mapBottom`;
        this.mapMapperContainer.id = `${this.layerName}mapMapperContainer`;
        this.mapMapperTitle.id = `${this.layerName}mapMapperTitle`;
        this.mapMapper.id = `${this.layerName}mapMapper`;
        this.mapDifficultyContainer.id = `${this.layerName}mapDifficultyContainer`;
        this.mapDifficultyTitle.id = `${this.layerName}mapDifficultyTitle`;
        this.mapDifficulty.id = `${this.layerName}mapDifficulty`;
        this.mapModpool.id = `${this.layerName}mapModpool`;
        this.mapOverlay.id = `${this.layerName}mapOverlay`;
        this.mapSource.id = `${this.layerName}mapSource`;

        this.mapDetails.setAttribute("class", "mapDetails");
        this.mapTitleContainer.setAttribute("class", "mapTitleContainer");
        this.mapTitle.setAttribute("class", "mapTitle");
        this.mapArtistContainer.setAttribute("class", "mapArtistContainer");
        this.mapArtist.setAttribute("class", "mapArtist");
        this.mapBottom.setAttribute("class", "mapBottom");
        this.mapMapperContainer.setAttribute("class", "mapMapperContainer");
        this.mapMapperTitle.setAttribute("class", "mapMapperTitle");
        this.mapMapper.setAttribute("class", "mapMapper");
        this.mapDifficultyContainer.setAttribute("class", "mapDifficultyContainer");
        this.mapDifficultyTitle.setAttribute("class", "mapDifficultyTitle");
        this.mapDifficulty.setAttribute("class", "mapDifficulty");
        this.mapModpool.setAttribute("class", "mapModpool");
        this.mapOverlay.setAttribute("class", "mapOverlay");
        this.mapSource.setAttribute("class", "mapSource");

        this.mapModpool.innerHTML = this.mods;
        this.mapMapperTitle.innerHTML = "MAPPED BY";
        this.mapDifficultyTitle.innerHTML = "DIFFICULTY";
        this.mapSource.setAttribute('src',"../../_shared_assets/design/main_banner.png");
        
        clickerObj.appendChild(this.mapDetails);
        clickerObj.appendChild(this.mapModpool);
        clickerObj.appendChild(this.mapOverlay);
        clickerObj.appendChild(this.mapSource);

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
}


socket.onmessage = async event => {
    if (!initialized) {return};
    let data = JSON.parse(event.data);

    if (!hasSetup) {
        hasSetup = true;
        showcaseManager = new ShowcaseManager(beatmapSet);
        await setupBeatmaps();
    } 
    
    if (generated) {
        showcaseManager.updateReplayer(data.gameplay.name);
        if (beatmaps.includes(data.menu.bm.path.file)) {
            data = offlineData.find(beatmapData => beatmapData.menu.bm.path.file == data.menu.bm.path.file);
        }
        let tempStats = [data.menu.bm.stats.memoryOD, data.menu.bm.stats.fullSR, data.menu.bm.stats.BPM.min, data.menu.bm.stats.BPM.max];
        if (showcaseManager.metadata != data.menu.bm.path.file || !showcaseManager.arraysEqual(showcaseManager.stats,tempStats)) {
            showcaseManager.updateStats(data.menu.bm.path.file, tempStats);
            showcaseManager.updateDetails(data);
        };
    }
}

const parseTime = ms => {
	const second = Math.floor(ms / 1000) % 60 + '';
	const minute = Math.floor(ms / 1000 / 60) + '';
	return `${'0'.repeat(2 - minute.length) + minute}:${'0'.repeat(2 - second.length) + second}`;
}

async function makeScrollingText(title, titleDelay, rate, boundaryWidth, padding) {
    if (title.scrollWidth > boundaryWidth) {
        titleDelay.innerHTML = title.innerHTML;
		let ratio = (title.scrollWidth/boundaryWidth)*rate
		title.style.animation = `scrollText ${ratio}s linear infinite`;
		titleDelay.style.animation = `scrollText ${ratio}s linear infinite`;
		titleDelay.style.animationDelay = `${-ratio/2}s`;
		titleDelay.style.paddingRight = `${padding}px`;
		title.style.paddingRight = `${padding}px`;
        titleDelay.style.marginTop = `-${title.offsetHeight}px`;
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

async function promptOverview() {
    document.getElementById("bg_overview").style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0% 100%)";
    document.getElementById("bg_overview").play();

    setTimeout(function() {
        showcaseManager.fadeOut();
    },500);
    
    setTimeout(function() {
        overviewScene.style.opacity = 1;
        overviewScene.style.animation = "fadeInLeft 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        document.getElementById("bg").pause();
        currentScene = "overview";
    },1500);
}

async function promptShowcase() {
    let overviewScene = document.getElementById("overviewScene");
    overviewScene.style.opacity = 0;
    overviewScene.style.animation = "fadeOutRight 1s cubic-bezier(.45,0,1,.48)";
    document.getElementById("bg").play();

    setTimeout(function() {
        showcaseManager.fadeIn();
    },1000);

    
    setTimeout(function() {
        document.getElementById("bg_overview").style.clipPath = "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)";
        document.getElementById("bg_overview").pause();
        currentScene = "showcase";
    },2000);
}

const mods = {
    NM: 0,
    HD: 1,
    HR: 2,
    DT: 3,
    FM: 4,
    TB: 5,
};

async function setupBeatmaps() {
    const modsCount = {
        NM: 0,
        HD: 0,
        HR: 0,
        DT: 0,
        FM: 0,
        TB: 0,
    };

    (function countMods() {
        beatmapSet.map((beatmap) => {
            modsCount[beatmap.pick.substring(0,2)]++;
        });
    })();

    let row = -1;
    let preMod = 0;
    let colIndex = 0;
    beatmapSet.map(async(beatmap, index) => {
        if (beatmap.mods !== preMod || colIndex % 3 === 0) {
            preMod = beatmap.pick.substring(0,2);
            colIndex = 0;
            row++;
        }
        const bm = new Beatmap(beatmap.pick.substring(0,2), beatmap.beatmapId, `map${index}`);
        bm.generate();
        // console.log(offlineData[0].menu.bm.path.file);
        const mapData = offlineData.find(beatmapData => (/^[0-9]+$/.test(beatmap["beatmapId"]) ? beatmapData.menu.bm.id : beatmapData.menu.bm.path.file) == beatmap["beatmapId"]);
        // console.log(mapData);
        bm.mapSource.setAttribute("src", "http://" + location.host + `/Songs/${mapData.menu.bm.path.full}?a=${Math.random(10000)}`);
        bm.mapTitle.innerHTML = mapData.menu.bm.metadata.title;
        bm.mapArtist.innerHTML = mapData.menu.bm.metadata.artist;
        bm.mapMapper.innerHTML = mapData.menu.bm.metadata.mapper;
        bm.mapDifficulty.innerHTML = mapData.menu.bm.metadata.difficulty;
        beatmapsStore.add(bm);
    });
}