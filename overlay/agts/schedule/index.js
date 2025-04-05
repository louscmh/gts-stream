// SOCKET /////////////////////////////////////////////////////////////////
let socket;
try {
    socket = new ReconnectingWebSocket("ws://" + location.host + "/ws");

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
} catch (e) {
    console.log(e);
}

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

class MatchManager {
    constructor(data) {
        this.data = data;
        this.selectedSchedules = data
            .filter(match => {
                const matchTime = new Date(match.time);
                const oneHourAgo = new Date();
                oneHourAgo.setHours(oneHourAgo.getHours() - 1);

                return match.score1 !== firstTo &&
                    match.score2 !== firstTo &&
                    matchTime > oneHourAgo
            })
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .slice(0, 5);
        this.currentMatch = this.selectedSchedules[0];
        this.matches = [];
        this.timer = document.getElementById('timer');
    }

    generateInitialSchedules() {
        this.selectedSchedules.map(async (schedule, index) => {
            const match = new Match(index, schedule, schedule.player1, schedule.player2);
            match.generate();
            this.matches.push(match);
            const leftPlayerData = await getUserDataSet(schedule.player1);
            const rightPlayerData = await getUserDataSet(schedule.player2);
            match.leftScore = schedule.score1 < 0 ? 0 : schedule.score1;
            match.rightScore = schedule.score2 < 0 ? 0 : schedule.score2;
            match.matchPlayerOneName.innerHTML = schedule.player1;
            match.matchPlayerOneSeed.innerHTML = `Seed #${seedData.find(seed => seed["Players"][0]["id"] == leftPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;
            match.matchPlayerOneSource.setAttribute("src", `https://a.ppy.sh/${seedData.find(seed => seed["Players"][0]["id"] == leftPlayerData.user_id)["Players"][0]["id"]}`)
            match.matchPlayerTwoName.innerHTML = schedule.player2;
            match.matchPlayerTwoSeed.innerHTML = `Seed #${seedData.find(seed => seed["Players"][0]["id"] == rightPlayerData.user_id)["Seed"].match(/\d+/)[0]}`;
            match.matchPlayerTwoSource.setAttribute("src", `https://a.ppy.sh/${seedData.find(seed => seed["Players"][0]["id"] == rightPlayerData.user_id)["Players"][0]["id"]}`)
            match.matchTime.innerHTML = (new Date(schedule.time)).toLocaleTimeString('en-US', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            match.matchDay.innerHTML = new Intl.DateTimeFormat('en-US', {
                weekday: 'short',
                timeZone: 'UTC',
            }).format(new Date(schedule.time));
            match.matchPlayerOne.addEventListener("click", (event) => {
                if (event.ctrlKey) {
                    match.reset();
                } else {
                    match.addScoreLeft();
                    this.checkUpdates();
                }
            })
            match.matchPlayerOne.addEventListener("contextmenu", (event) => {
                match.removeScoreLeft();
            })
            match.matchPlayerTwo.addEventListener("click", (event) => {
                if (event.ctrlKey) {
                    match.reset();
                } else {
                    match.addScoreRight();
                    this.checkUpdates();
                }
            })
            match.matchPlayerTwo.addEventListener("contextmenu", (event) => {
                match.removeScoreRight();
            })
            match.updateScore();
        })
        this.startCountdown();
    }

    startCountdown() {
        const updateCountdown = () => {
            const targetTime = new Date(this.currentMatch.time);
            const now = new Date();
            const diff = targetTime - now;
            if (diff <= 0) {
                timer.textContent = "00:00";
                // clearInterval(intervalId);
                // return;
            }
            const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
            const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
            if (hours == "00" && diff > 0) {
                timer.textContent = `${minutes}:${seconds}`;
            } else if (hours != "00" && diff > 0) {
                timer.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }

        // Update the countdown immediately and then every second
        const intervalId = setInterval(updateCountdown, 1000);
    }

    checkUpdates() {
        let selectedCurrentMatch = this.matches.find(match => (match.data._id == this.currentMatch._id));
        let selectedCurrentMatchIndex = this.matches.findIndex(match => (match.data._id == this.currentMatch._id));
        console.log(selectedCurrentMatchIndex);
        if (selectedCurrentMatchIndex == 4) return;
        // console.log(selectedCurrentMatch, selectedCurrentMatchIndex);
        if (selectedCurrentMatch.leftScore == firstTo || selectedCurrentMatch.rightScore == firstTo) {
            for (let i = 1; i < (5 - selectedCurrentMatchIndex); i++) {
                console.log(i);
                console.log(selectedCurrentMatchIndex);
                console.log(this.currentMatch.time);
                console.log(this.matches[selectedCurrentMatchIndex + i].data.time);
                if (this.matches[selectedCurrentMatchIndex + i].data.time != this.currentMatch.time) {
                    console.log(selectedCurrentMatchIndex + i);
                    this.currentMatch = this.matches[selectedCurrentMatchIndex + i].data;
                    return;
                }
            };
        }
    }
}

class Match {
    constructor(index, data, leftName, rightName) {
        this.data = data;
        this.index = index;
        this.leftScore = 0;
        this.rightScore = 0;
        this.leftName = leftName;
        this.rightName = rightName;
    }

    generate() {
        let matchContainer = document.getElementById(`upcomingMatch`);

        this.match = document.createElement("div");
        this.match.id = `${this.index}match`;
        this.match.setAttribute("class", "match");

        matchContainer.appendChild(this.match);
        let matchObj = document.getElementById(this.match.id);

        this.matchPlayerOne = document.createElement("div");
        this.matchPlayerOneSource = document.createElement("img");
        this.matchPlayerOneDetails = document.createElement("div");
        this.matchPlayerOneName = document.createElement("div");
        this.matchPlayerOneSeed = document.createElement("div");
        this.matchPlayerOneWin = document.createElement("div");
        this.matchMiddleText = document.createElement("div");
        this.matchPlayerTwo = document.createElement("div");
        this.matchPlayerTwoSource = document.createElement("img");
        this.matchPlayerTwoDetails = document.createElement("div");
        this.matchPlayerTwoName = document.createElement("div");
        this.matchPlayerTwoSeed = document.createElement("div");
        this.matchPlayerTwoWin = document.createElement("div");
        this.matchDate = document.createElement("div");
        this.matchTime = document.createElement("div");
        this.matchDay = document.createElement("div");

        this.matchPlayerOne.id = `${this.index}matchPlayerOne`;
        this.matchPlayerOneSource.id = `${this.index}matchPlayerOneSource`;
        this.matchPlayerOneDetails.id = `${this.index}matchPlayerOneDetails`;
        this.matchPlayerOneName.id = `${this.index}matchPlayerOneName`;
        this.matchPlayerOneSeed.id = `${this.index}matchPlayerOneSeed`;
        this.matchPlayerOneWin.id = `${this.index}matchPlayerOneWin`;
        this.matchMiddleText.id = `${this.index}matchMiddleText`;
        this.matchPlayerTwo.id = `${this.index}matchPlayerTwo`;
        this.matchPlayerTwoSource.id = `${this.index}matchPlayerTwoSource`;
        this.matchPlayerTwoDetails.id = `${this.index}matchPlayerTwoDetails`;
        this.matchPlayerTwoName.id = `${this.index}matchPlayerTwoName`;
        this.matchPlayerTwoSeed.id = `${this.index}matchPlayerTwoSeed`;
        this.matchPlayerTwoWin.id = `${this.index}matchPlayerTwoWin`;
        this.matchDate.id = `${this.index}matchDate`;
        this.matchTime.id = `${this.index}matchTime`;
        this.matchDay.id = `${this.index}matchDay`;

        this.matchPlayerOne.setAttribute("class", "matchPlayerOne");
        this.matchPlayerOneSource.setAttribute("class", "matchPlayerOneSource");
        this.matchPlayerOneDetails.setAttribute("class", "matchPlayerOneDetails");
        this.matchPlayerOneName.setAttribute("class", "matchPlayerOneName");
        this.matchPlayerOneSeed.setAttribute("class", "matchPlayerOneSeed");
        this.matchPlayerOneWin.setAttribute("class", "matchPlayerOneWin");
        this.matchMiddleText.setAttribute("class", "matchMiddleText");
        this.matchPlayerTwo.setAttribute("class", "matchPlayerTwo");
        this.matchPlayerTwoSource.setAttribute("class", "matchPlayerTwoSource");
        this.matchPlayerTwoDetails.setAttribute("class", "matchPlayerTwoDetails");
        this.matchPlayerTwoName.setAttribute("class", "matchPlayerTwoName");
        this.matchPlayerTwoSeed.setAttribute("class", "matchPlayerTwoSeed");
        this.matchPlayerTwoWin.setAttribute("class", "matchPlayerTwoWin");
        this.matchDate.setAttribute("class", "matchDate");
        this.matchTime.setAttribute("class", "matchTime");
        this.matchDay.setAttribute("class", "matchDay");

        this.matchPlayerOneWin.innerHTML = "WIN";
        this.matchPlayerTwoWin.innerHTML = "WIN";
        this.matchMiddleText.innerHTML = "VS";

        matchObj.appendChild(this.matchPlayerOne);
        matchObj.appendChild(this.matchMiddleText);
        matchObj.appendChild(this.matchPlayerTwo);
        matchObj.appendChild(this.matchDate);

        document.getElementById(this.matchPlayerOne.id).appendChild(this.matchPlayerOneSource);
        document.getElementById(this.matchPlayerOne.id).appendChild(this.matchPlayerOneDetails);
        document.getElementById(this.matchPlayerOneDetails.id).appendChild(this.matchPlayerOneName);
        document.getElementById(this.matchPlayerOneDetails.id).appendChild(this.matchPlayerOneSeed);
        document.getElementById(this.matchPlayerOneDetails.id).appendChild(this.matchPlayerOneWin);

        document.getElementById(this.matchPlayerTwo.id).appendChild(this.matchPlayerTwoSource);
        document.getElementById(this.matchPlayerTwo.id).appendChild(this.matchPlayerTwoDetails);
        document.getElementById(this.matchPlayerTwoDetails.id).appendChild(this.matchPlayerTwoName);
        document.getElementById(this.matchPlayerTwoDetails.id).appendChild(this.matchPlayerTwoSeed);
        document.getElementById(this.matchPlayerTwoDetails.id).appendChild(this.matchPlayerTwoWin);

        document.getElementById(this.matchDate.id).appendChild(this.matchTime);
        document.getElementById(this.matchDate.id).appendChild(this.matchDay);
    }

    addScoreLeft() {
        if (this.leftScore == firstTo || (this.leftScore == firstTo - 1 && this.rightScore == firstTo)) return;
        this.leftScore++;
        this.updateScore();
    }

    addScoreRight() {
        if (this.rightScore == firstTo || (this.rightScore == firstTo - 1 && this.leftScore == firstTo)) return;
        this.rightScore++;
        this.updateScore();
    }

    removeScoreLeft() {
        if (this.leftScore == 0) return;
        this.leftScore--;
        this.updateScore();
    }

    removeScoreRight() {
        if (this.rightScore == 0) return;
        this.rightScore--;
        this.updateScore();
    }

    reset() {
        this.leftScore = 0;
        this.rightScore = 0;
        this.updateScore();
    }

    updateScore() {
        if (this.leftScore > 0 || this.rightScore > 0) {
            this.matchMiddleText.innerHTML = `${this.leftScore}-${this.rightScore}`;
            this.matchPlayerOneWin.style.opacity = this.leftScore == firstTo ? 1 : 0;
            this.matchPlayerTwoWin.style.opacity = this.rightScore == firstTo ? 1 : 0;
        } else {
            this.matchMiddleText.innerHTML = "VS";
            this.matchPlayerOneWin.style.opacity = 0;
            this.matchPlayerTwoWin.style.opacity = 0;
        }
    }
}

// BEATMAP DATA /////////////////////////////////////////////////////////////////
let stages = [];
let seedData = [];
let currentStage;
let firstTo;
let matchManager;
let initialized = false;
// const now = new Date("2025-02-23T00:00:00.000Z");
const now = new Date();
(async () => {
    try {
        const jsonData = await $.getJSON("../../_data/stage.json");
        jsonData.map((stage, index) => {
            if (index == 0) {
                currentStage = stage.currentStage;
            } else {
                stages.push(stage);
            }
        });
        const jsonData_2 = await $.getJSON("../../_data/seeding.json");
        jsonData_2.Teams.map((seed) => {
            seedData.push(seed);
        });
        setupSchedules()
    } catch (error) {
        console.error("Could not read JSON file", error);
    }
})();
console.log(stages);

// MAIN LOOP ////////////////////////////////////////////////////////////////////
let tempLeftScore;
let tempRightScore;
let tempBestOf;

socket.onmessage = async event => {
    if (!initialized) { return };
    let data = JSON.parse(event.data);
    [tempLeftScore, tempRightScore, tempBestOf] = [data.tourney.manager.stars.left, data.tourney.manager.stars.right, Math.ceil(data.tourney.manager.bestOF / 2)];
    let [leftTeam, rightTeam] = [data.tourney.manager.teamName.left, data.tourney.manager.teamName.right];
    let currentMatch = matchManager.matches.find(match => match.leftName == leftTeam && match.rightName == rightTeam);

    if (currentMatch != null && tempBestOf == firstTo && (currentMatch.leftScore != tempLeftScore || currentMatch.rightScore != tempRightScore)) {
        currentMatch.leftScore = tempLeftScore;
        currentMatch.rightScore = tempRightScore;
        currentMatch.updateScore();
        matchManager.checkUpdates();
    }
}

async function setupSchedules() {
    firstTo = stages.find(stage => stage.stage == currentStage)["firstTo"];
    document.getElementById("roundName").innerHTML = stages.find(stage => stage.stage == currentStage)["stageName"];
    // const schedules = matches;
    const schedules = await getSchedules(stages.find(stage => stage.stage == currentStage)["stageName"]);
    console.log(schedules);
    matchManager = new MatchManager(schedules);
    matchManager.generateInitialSchedules()
    initialized = true;
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

// setInterval(async function () {
//     if (!matchManager) return; // Ensure matchManager exists before checking

//     try {
//         // console.log("Checking for updates...");
//         const newSchedules = await getSchedules(stages.find(stage => stage.stage == currentStage)["stageName"]);

//         if (!newSchedules) return; // If no new data, exit function

//         // Compare JSON data (stringify to compare deep equality)
//         if (JSON.stringify(newSchedules) !== JSON.stringify(matchManager.data)) {
//             console.log("Schedules updated. Updating matchManager...");

//             // Update matchManager with new schedules
//             matchManager.data = newSchedules;

//             // Re-generate selected schedules
//             matchManager.selectedSchedules = newSchedules
//                 .filter(match => (match.score1 != firstTo && match.score2 != firstTo))
//                 .sort((a, b) => new Date(a.time) - new Date(b.time))
//                 .slice(0, 5);

//             matchManager.currentMatch = newSchedules
//                 .filter(match => (match.score1 != firstTo && match.score2 != firstTo))
//                 .sort((a, b) => new Date(a.time) - new Date(b.time))
//                 .slice(0, 1)[0];

//             // Call any UI update function if necessary
//             matchManager.updateUI();
//         }
//     } catch (error) {
//         console.error("Error checking for schedule updates:", error);
//     }
// }, 60000);