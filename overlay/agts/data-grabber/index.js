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

let fileAsset = document.getElementById("file");
let mapperAsset = document.getElementById("mapper");
let difficultyAsset = document.getElementById("difficulty");
let sourceAsset = document.getElementById("source");
let sourceAssetBG = document.getElementById("sourceBG");
let grabBeatmap = document.getElementById("grabBeatmap");
let downloadDataset = document.getElementById("downloadDataset");
let data;
let offlineSet = new Set();

// CONTROL PANELS //////////
grabBeatmap.addEventListener("click", async function(event) {
    offlineSet.add(data);
    console.log(offlineSet);
})
downloadDataset.addEventListener("click", async function(event) {
    // Convert the Set to an array
    const setArray = Array.from(offlineSet);

    // Convert the array to JSON string
    const jsonString = JSON.stringify(setArray, null, 2);

    // Create a blob object with JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a temporary anchor element for downloading
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'offline_dataset.json';

    // Trigger the download by simulating a click
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
})
let tempFile;

socket.onmessage = async event => {
    data = JSON.parse(event.data);

    if (tempFile != data.menu.bm.path.file) {
        tempFile = data.menu.bm.path.file;
        fileAsset.innerHTML = data.menu.bm.path.file;
        console.log(data.menu.bm.path.file);
        mapperAsset.innerHTML = data.menu.bm.metadata.mapper;
        difficultyAsset.innerHTML = data.menu.bm.metadata.difficulty;
        let bgSource = `http://` + location.host + `/Songs/${data.menu.bm.path.full}?a=${Math.random(10000)}`;
        console.log(bgSource);
        sourceAsset.innerHTML = decodeHtmlEntities(bgSource);
        sourceAssetBG.setAttribute('src',decodeHtmlEntities(bgSource));
    }
}

function copyToClipboard() {
    navigator.clipboard.writeText(tempFile);
}

function decodeHtmlEntities(text) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, "text/html");
    return doc.documentElement.textContent;
}