// BEATMAP DATA /////////////////////////////////////////////////////////////////
let stages = [];
let seedData = [];
let matches = [];
let currentStage;
let firstTo;
let matchManager;
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
        const jsonData_3 = await $.getJSON(stages.find(stage => stage.stage == currentStage)["matchData"]);
        jsonData_3.map((match) => {
            matches.push(match);
        });
        setupSchedules()
    } catch (error) {
        console.error("Could not read JSON file", error);
    }
})();
console.log(stages);
console.log(matches);

async function setupSchedules() {
    firstTo = stages.find(stage => stage.stage == currentStage)["firstTo"];
    document.getElementById("roundName").innerHTML = stages.find(stage => stage.stage == currentStage)["stageName"];
    const schedules = matches;
    console.log(schedules);
    matchManager = new MatchManager(schedules);
    matchManager.generateInitialSchedules()
}

class MatchManager {
    constructor(data) {
        this.data = data;
        this.selectedSchedules = data
            .filter(match => new Date(match.time) > now)
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .slice(0, 5);
        this.currentMatch = this.selectedSchedules[0];
        this.matches = [];
        this.timer = document.getElementById('timer');
    }

    generateInitialSchedules() {
        this.selectedSchedules.map(async (schedule, index) => {
            const match = new Match(index);
            match.generate();
            match.matchPlayerOneName.innerHTML = schedule.player1;
            match.matchPlayerOneSeed.innerHTML = `Seed #${seedData.find(seed => seed.FullName == schedule.player1)["Seed"].match(/\d+/)[0]}`;
            match.matchPlayerOneSource.setAttribute("src", `https://a.ppy.sh/${seedData.find(seed => seed.FullName == schedule.player1)["Players"][0]["id"]}`)
            match.matchPlayerTwoName.innerHTML = schedule.player2;
            match.matchPlayerTwoSeed.innerHTML = `Seed #${seedData.find(seed => seed.FullName == schedule.player2)["Seed"].match(/\d+/)[0]}`;
            match.matchPlayerTwoSource.setAttribute("src", `https://a.ppy.sh/${seedData.find(seed => seed.FullName == schedule.player2)["Players"][0]["id"]}`)
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
                }
            })
            match.matchPlayerTwo.addEventListener("contextmenu", (event) => {
                match.removeScoreRight();
            })
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
                clearInterval(intervalId);
                return;
            }
            const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
            const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
            if (hours == "00") {
                timer.textContent = `${minutes}:${seconds}`;
            } else {
                timer.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }

        // Update the countdown immediately and then every second
        updateCountdown();
        const intervalId = setInterval(updateCountdown, 1000);
    }
}

class Match {
    constructor(index) {
        this.data;
        this.index = index;
        this.leftScore = 0;
        this.rightScore = 0;
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