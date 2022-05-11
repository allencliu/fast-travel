var fuzzySearchURL = "https://api.tomtom.com/search/2/search/";
var urlEnd = ".json?key=3bVn9TEeURdBGhpmji0FludZi5qOHvG0";
var serializedForm;
var startingAddress;
var endingAddress;
var routeType;
var modeOfTravel;
var hilliness;
var info;

$( document ).ready(function() {
    $("#directionsForm").submit(function(event) {
        $("#displayDirections").html("");
        event.preventDefault();
        info ={
            "request": {
              "origin": {
                "fuzzySearch": "",
                "coords": {
                  "latitude": 0,
                  "longitude": 0
                }
              },
              "destination": {
                "fuzzySearch": "",
                "coords": {
                  "latitude": 0,
                  "longitude": 0
                }
              },
              "routeType": "",
              "modeOfTravel": "",
              "hilliness": ""
            },
            "response": {
              "totalDistanceMi": 0,
              "totalTime": "",
              "trafficDelay": "",
              "instructions": [
                {
                  "message": "",
                  "mapImgURL": "",
                  "timeToNextInstruct": "",
                  "milesToNextInstruct": ""
                }
              ],
              "arrived": {
                "mapImgURL": "",
                "arrivedMsg": ""
              }
            }
          };
        checkHilly();
    });

    $("#clearBtn").click(function() {
        $("#displayDirections").html("");
        $("#startingAddress").val("");
        $("#endingAddress").val("");
        $("#routeType").val("");
        $("#modeOfTravel").val("");
        $("#hilliness").val("");
    });
});
const sleep = (ms) =>
	new Promise(resolve => setTimeout(resolve, ms));

function checkHilly() {
        if ($("#routeType").val() != "thrilling" && $("#hilliness").val() != "") {
            alert("Cannot have a value for hilliness unless the route type is thrilling");
        } else if ($("#routeType").val() === "thrilling" && $("#hilliness").val() === "") {
            alert("Must include a value for hilliness");
        } else {
            serializedForm = $("#directionsForm").serialize();
            console.log(serializedForm);
            getFormFields();
        }

}

function getFormFields() {
    startingAddress = $("#startingAddress").val();
    info.request.origin.fuzzySearch = startingAddress;
    endingAddress = $("#endingAddress").val();
    info.request.destination.fuzzySearch = endingAddress;
    routeType = $("#routeType").val();
    info.request.routeType = routeType;
    modeOfTravel = $("#modeOfTravel").val();
    info.request.modeOfTravel = modeOfTravel;
    hilliness = $("#hilliness").val();
    info.request.hilliness = hilliness;
    getStartCoords();
}

function getStartCoords() {
    a=$.ajax({
		url: fuzzySearchURL + startingAddress + urlEnd,
		method: "GET"
	}).done(function(data) {
        // console.log(data);
        let startingLat = data.results[0].position.lat;
        info.request.origin.coords.latitude = startingLat;
		let startingLon = data.results[0].position.lon;
        info.request.origin.coords.longitude = startingLon;
        // console.log("Lat: " + startingLat + " Long: " + startingLon);
        getEndCoords(startingLat, startingLon);
	    }).fail(function(error) {
            console.log(error);
	        });
}

function getEndCoords(startingLat, startingLon) {
    a=$.ajax({
		url: fuzzySearchURL + endingAddress + urlEnd,
		method: "GET"
	}).done(function(data) {
        // console.log(data);
        let endingLat = data.results[0].position.lat;
        info.request.destination.coords.latitude = endingLat;
		let endingLon = data.results[0].position.lon;
        info.request.destination.coords.longitude = endingLon;
        // console.log("Lat: " + endingLat + " Long: " + endingLon);
        calcRoute(startingLat, startingLon, endingLat, endingLon);
	    }).fail(function(error) {
            console.log(error);
	        });
}

async function displayMap(longitude, latitude) {
    await sleep(1000);
	return `https://api.tomtom.com/map/1/staticimage?layer=basic&style=main&format=jpg&zoom=12&center=${longitude}, ${latitude}&width=512&height=512&view=Unified&key=3bVn9TEeURdBGhpmji0FludZi5qOHvG0`;
}

function calcRoute(startingLat, startingLon, endingLat, endingLon) {
    let coords = startingLat + "," + startingLon + ":" + endingLat + "," + endingLon;
    a=$.ajax({
		url: "https://api.tomtom.com/routing/1/calculateRoute/" + coords + "/json?" + serializedForm,
		method: "GET"
	}).done(async function(data) {
        console.log(data);
        let instruct = data.routes[0].guidance.instructions;
        let summary = data.routes[0].summary;
        let totalDistance = toMiles(summary.lengthInMeters);
        info.response.totalDistanceMi = totalDistance;
        let totalTime = secondsToHms(summary.travelTimeInSeconds);
        info.response.totalTime = totalTime;
        let trafficDelay = getTrafficDelay(summary.trafficDelayInSeconds);
        info.response.trafficDelay = trafficDelay;
        console.log(totalTime);
        // console.log(totalDistance);
        console.log(instruct);
        $("#displayDirections").append(`<div class='summary pb-5'>This trip is ${totalDistance} miles long and will take ${totalTime} to arrive at your destination ${trafficDelay}.</div>`);
        for (let i = 0; i + 1 < instruct.length; i++) {
            let src = await displayMap(instruct[i].point.longitude, instruct[i].point.latitude);
            let time = secondsToHms(instruct[i + 1].travelTimeInSeconds - instruct[i].travelTimeInSeconds);
            let miles = toMiles(instruct[i + 1].routeOffsetInMeters - instruct[i].routeOffsetInMeters);
            info.response.instructions.push({"message": instruct[i].message, "mapImgURL":src, "timeToNextInstruct":time, "milesToNextInstruct":miles});
            // info.response.instructions.timeToNextInstruct[i] = time;
            // info.response.instructions.milesToNextInstruct[i] = miles;
            $("#displayDirections").append(`<img src="${src}">`);
            $("#displayDirections").append(`<div class="directions">${instruct[i].message} and in ${time} for ${miles} miles </div>`);
        }
        let srcEnd = await displayMap(instruct[instruct.length - 1].point.longitude, instruct[instruct.length - 1].point.latitude);
        let arrive = instruct[instruct.length - 1].message;
        info.response.arrived.mapImgURL = srcEnd;
        info.response.arrived.arrivedMsg = arrive;
        $("#displayDirections").append(`<img src="${srcEnd}">`);
        $("#displayDirections").append(`<div class="directions">${arrive}</div>`);
        sendToDatabase();
	    }).fail(function(error) {
            console.log(error);
	        });
}

function sendToDatabase() {
    jsonString = JSON.stringify(info);
    console.log(jsonString);
    a=$.ajax({
        type: "POST",
        url: "http://172.17.12.181/final.php?method=setLookup&location=%20&sensor=%20&value=" + jsonString,
        success: function(output) {
            console.log(output);
        }
    });
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return hDisplay + mDisplay + sDisplay; 
}

function getTrafficDelay(trafficDelayInSeconds) {
    if (trafficDelayInSeconds == 0) {
        return "with no traffic delays";
    } else {
        return "with a traffic delay of " + secondsToHms(trafficDelayInSeconds);
    }
}

function toMiles(meters) {
    return Math.round((meters * 0.000621371192) * 100) / 100;
}