// SEEDING DATA /////////////////////////////////////////////////////////////////
let seedData = [];
let beatmapData = [];
let teamController;
let playerController;
(async () => {
    try {
        const jsonData = await $.getJSON("../../_data/seeding.json");
        jsonData.Teams.map((seed) => {
            seedData.push(seed);
        });
        const jsonData2 = await $.getJSON("../../_data/quals_data.json");
        jsonData2.map((map) => {
            beatmapData.push(map);
        });
        console.log(seedData);
        console.log(beatmapData);
        playerController = new PlayerController;
        setupInitial();
    } catch (error) {
        console.error("Could not read JSON file", error);
    }
})();

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

// HTML VARS /////////////////////////////////////////////////////////////////
let controllerSeed = document.getElementById("controllerSeed");
let controllerNextSeed = document.getElementById("controllerNextSeed");
let controllerPreviousSeed = document.getElementById("controllerPreviousSeed");
let controllerNext10Seed = document.getElementById("controllerNext10Seed");
let controllerPrevious10Seed = document.getElementById("controllerPrevious10Seed");
// let stinger = document.getElementById("transitionVideo");
// let controllerSceneChange = document.getElementById("controllerSceneChange");

// PLACEHOLDER VARS /////////////////////////////////////////////////////////////////
let picks = [];
let currentSeed = 0;

class Map {
    constructor(index, beatmapId, pick) {
        this.index = index;
        this.beatmapId = beatmapId;
        this.pick = pick;
        this.mod = this.pick.substring(0,2);
    }
    generate() {
        let resultContainer = document.getElementById(`resultContainer`);

        this.map = document.createElement("div");
        this.mapSide = document.createElement("div");
        this.mapLeft = document.createElement("div");
        this.mapSong = document.createElement("div");
        this.mapArtist = document.createElement("div");
        this.mapRight = document.createElement("div");
        this.mapRank = document.createElement("div");
        this.mapScore = document.createElement("div");
        this.mapSource = document.createElement("img");
        this.mapMod = document.createElement("div");

        this.map.id = `${this.index}map`;
        this.mapSide.id = `${this.index}mapSide`;
        this.mapLeft.id = `${this.index}mapLeft`;
        this.mapSong.id = `${this.index}mapSong`;
        this.mapArtist.id = `${this.index}mapArtist`;
        this.mapRight.id = `${this.index}mapRight`;
        this.mapRank.id = `${this.index}mapRank`;
        this.mapScore.id = `${this.index}mapScore`;
        this.mapSource.id = `${this.index}mapSource`;
        this.mapMod.id = `${this.index}mapMod`;

        this.map.setAttribute("class", "map");
        this.mapSide.setAttribute("class", "mapSide");
        this.mapLeft.setAttribute("class", "mapLeft");
        this.mapSong.setAttribute("class", "mapSong");
        this.mapArtist.setAttribute("class", "mapArtist");
        this.mapRight.setAttribute("class", "mapRight");
        this.mapRank.setAttribute("class", "mapRank");
        this.mapScore.setAttribute("class", "mapScore");
        this.mapSource.setAttribute("class", "mapSource");
        this.mapMod.setAttribute("class", "mapMod");

        this.mapMod.innerHTML = this.mod;

        resultContainer.appendChild(this.map);

        document.getElementById(this.map.id).appendChild(this.mapSide);
        document.getElementById(this.map.id).appendChild(this.mapMod);

        document.getElementById(this.mapSide.id).appendChild(this.mapLeft);
        document.getElementById(this.mapSide.id).appendChild(this.mapRight);
        document.getElementById(this.mapSide.id).appendChild(this.mapSource);

        document.getElementById(this.mapLeft.id).appendChild(this.mapSong);
        document.getElementById(this.mapLeft.id).appendChild(this.mapArtist);

        document.getElementById(this.mapRight.id).appendChild(this.mapRank);
        document.getElementById(this.mapRight.id).appendChild(this.mapScore);
    }
    updateDetails(score, seed) {
        document.getElementById(this.mapRank.id).innerHTML = `#${seed}`;
        document.getElementById(this.mapScore.id).innerHTML = score.toLocaleString('en-US');
    }
    fadeOut() {
        document.getElementById(this.map.id).style.animation = "fadeOutDown 1s cubic-bezier(.45,0,1,.48)";
        document.getElementById(this.map.id).style.opacity = 0;
    }
    fadeIn() {
        document.getElementById(this.map.id).style.animation = "fadeInDown 1s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        document.getElementById(this.map.id).style.opacity = 1;
    }
}

class PlayerController {
    constructor() {
        this.picks = [];
        this.playerSection = document.getElementById("playerSection");
        this.qualsSection = document.getElementById("qualsSection");
        this.playerPic = document.getElementById("playerPic");
        this.playerName = document.getElementById("playerName");
        this.seedNumber = document.getElementById("seedNumber");
        this.rank = document.getElementById("rank");
        this.avg = document.getElementById("avg");
    }
    async updateDetails(seedData) {
        animateIn();
        const data = await getUserDataSet(seedData.Players[0].id);
        let imageUrl = `https://a.ppy.sh/${seedData.Players[0].id}`;
        let img = new Image();
        img.src = imageUrl;
        setTimeout( function() {
                let seeds = [];
                this.playerPic.setAttribute("src", imageUrl);
                this.playerName.innerHTML = seedData.FullName;
                this.seedNumber.innerHTML = seedData["Seed"].match(/\d+/)[0];
                this.rank.innerHTML = `#${data.pp_rank}`;
        
                seedData.SeedingResults.map(modpool => {
                    modpool.Beatmaps.map(pick => {
                        seeds.push(pick.Seed);
                        const map = this.picks.find(mappick => mappick.beatmapId == pick.ID);
                        map.updateDetails(pick.Score,pick.Seed);
                        
                    })
                })

                this.avg.innerHTML = seeds.length === 0 ? "N.A" : (seeds.reduce((sum, num) => sum + num, 0) / seeds.length).toFixed(2);
                animateOut();
            }.bind(this), 135*9
        );
    }
    addMappicks(picks) {
        this.picks = picks;
    }
    fadeOut() {
        this.qualsSection.style.animation = "fadeOutDown 1.2s cubic-bezier(.45,0,1,.48)";
        this.qualsSection.style.opacity = 0;
        setTimeout(function() {
            this.playerSection.style.animation = "fadeOutDown 1.2s cubic-bezier(.45,0,1,.48)";
            this.playerPic.style.animation = "fadeOutDown 1.2s cubic-bezier(.45,0,1,.48)";
            this.playerSection.style.opacity = 0;
            this.playerPic.style.opacity = 0;
        }.bind(this),100);
    }
    fadeIn() {
        this.qualsSection.style.animation = "fadeInRight 1.2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
        this.qualsSection.style.opacity = 1;
        setTimeout(function() {
            this.playerSection.style.animation = "fadeInRight 1.2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.playerPic.style.animation = "fadeInRight 1.2s cubic-bezier(0.000, 0.125, 0.000, 1.005)";
            this.playerSection.style.opacity = 1;
            this.playerPic.style.opacity = 1;
        }.bind(this),100);
    }
}

async function setupInitial() {
    await Promise.all(beatmapData.map(async (beatmap,index) => {
        const mapPick = new Map(index,beatmap.beatmapId,beatmap.pick)
        mapPick.generate();
        const bm = await getDataSet(beatmap.beatmapId)
        mapPick.mapSong.innerHTML = bm.title;
        mapPick.mapArtist.innerHTML = bm.artist;
        adjustFont(mapPick.mapSong,555,37);
        mapPick.mapSource.setAttribute("src",`https://assets.ppy.sh/beatmaps/${bm.beatmapset_id}/covers/cover.jpg`)
        picks.push(mapPick);
    }));

    playerController.addMappicks(picks);
    console.log(playerController.picks);
    let lastSeed = seedData.find(seed => seed["Seed"].match(/\d+/)[0] == seedData.length) ?? seedData[seedData.length-1];
    console.log(lastSeed);
    playerController.updateDetails(lastSeed);
    currentSeed = lastSeed["Seed"].match(/\d+/)[0];
    controllerSeed.innerHTML = currentSeed;
}

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

async function adjustFont(title, boundaryWidth, originalFontSize) {
    if (title.scrollWidth > boundaryWidth) {
		let ratio = (title.scrollWidth/boundaryWidth);
        title.style.fontSize = `${originalFontSize/ratio}px`;
    } else {
		title.style.fontSize = `${originalFontSize}px`;
	}
}

function animateIn() {
    let interval = 50;
    picks.map(pick => {
        console.log(pick.index*interval);
        setTimeout(function() {
            pick.fadeOut();
        },(pick.index-9)*-1*interval)
    })
    playerController.fadeOut();
}
function animateOut() {
    let interval = 50;
    picks.map(pick => {
        console.log(pick.index*interval);
        setTimeout(function() {
            pick.fadeIn();
        },(pick.index-9)*-1*interval)
    })
    playerController.fadeIn();
}

async function updateSeed(currentSeed) {
    let seed = seedData.find(seed => seed["Seed"].match(/\d+/)[0] == currentSeed) ?? seedData[currentSeed-1];
    console.log(seed);
    playerController.updateDetails(seed);
}

// BUTTONS //////////////////////////////////////////
controllerNextSeed.addEventListener("click", function(event) {
 if (currentSeed < 2) return;
 currentSeed--;
 controllerSeed.innerHTML = currentSeed;
 updateSeed(currentSeed);
})
controllerPreviousSeed.addEventListener("click", function(event) {
 if (currentSeed >= seedData.length) return;
 currentSeed++;
 controllerSeed.innerHTML = currentSeed;
 updateSeed(currentSeed);
})
controllerNext10Seed.addEventListener("click", function(event) {
    if (currentSeed < 11) return;
    currentSeed-=10;
    controllerSeed.innerHTML = currentSeed;
    updateSeed(currentSeed);
})
controllerPrevious10Seed.addEventListener("click", function(event) {
    if (currentSeed >= seedData.length-9) return;
    currentSeed+=10;
    controllerSeed.innerHTML = currentSeed;
    updateSeed(currentSeed);
})
// let sceneController = "seed";
// controllerSceneChange.addEventListener("click", function(event) {
//     if (sceneController == "seed") {
//         sceneController = "showcase";
//         controllerSceneChange.style.display = "none";
//         stinger.play();
//         setTimeout(function() {
//             document.getElementById("main").style.opacity = 0;
//         },300);
//     }
// })
controllerNextSeed.onmouseover = function() {
	controllerNextSeed.style.transform = "translateY(-5px)";
}
controllerNextSeed.onmouseleave = function() {
	controllerNextSeed.style.transform = "translateY(0px)";
}
controllerPreviousSeed.onmouseover = function() {
	controllerPreviousSeed.style.transform = "translateY(-5px)";
}
controllerPreviousSeed.onmouseleave = function() {
	controllerPreviousSeed.style.transform = "translateY(0px)";
}
controllerNext10Seed.onmouseover = function() {
	controllerNext10Seed.style.transform = "translateY(-5px)";
}
controllerNext10Seed.onmouseleave = function() {
	controllerNext10Seed.style.transform = "translateY(0px)";
}
controllerPrevious10Seed.onmouseover = function() {
	controllerPrevious10Seed.style.transform = "translateY(-5px)";
}
controllerPrevious10Seed.onmouseleave = function() {
	controllerPrevious10Seed.style.transform = "translateY(0px)";
}
// controllerSceneChange.onmouseover = function() {
// 	controllerSceneChange.style.transform = "translateY(-5px)";
// }
// controllerSceneChange.onmouseleave = function() {
// 	controllerSceneChange.style.transform = "translateY(0px)";
// }
