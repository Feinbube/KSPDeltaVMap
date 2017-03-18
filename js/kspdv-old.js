var startState = "Kerbin_SurfaceA";
var targetState = "Kerbin_SurfaceA";

var startAnchor = undefined;
var targetAnchor = undefined;

var missionPlan = undefined;

///////////////////////////////////////////////////////////////////////////////
// mission info ///////////////////////////////////////////////////////////////

function missionObjective(objective) {
    if(!getStartFromKerbin())
        startState = targetState;

    targetState = objective; 

    updateMissionInfo();   
}

function updateMissionInfo() {
    document.getElementById('mission').innerHTML
        = "A mission from " + missionStateTextEmphed(startState)
            + " to " + missionStateTextEmphed(targetState) + " requires";
    document.getElementById('deltav').innerHTML
        = "a Delta-V of " + selectDeltaV(startState, targetState) + " m/s.";
}

function missionStateTextEmphed(state) {
    var result = missionStateText(state);
    return result[0] + '<span class="emph">' + result[1] + '</span>';
}

function missionStateTextNormal(state) {
    var result = missionStateText(state);
    return result[0] + '<i>' + result[1] + '</i>';
}

function missionStateText(state) {
    var stateParts = state.split("_");
    
    if(stateParts[0] == "Mun")
        stateParts[0] = "the Mun";

    if(state == "Kerbin_Intercept" || state == "Kerbin_Elliptical")        
        return ["the edge of the influence of ", stateParts[0]];
    else if(stateParts[1] == "Surface" || stateParts[1] == "SurfaceA")
        return ["the surface of ", stateParts[0]];
    else if(stateParts[1] == "LowOrbit")
        return ["a low orbit around ", stateParts[0]];
    else if(stateParts[1] == "Intercept")
        return ["an intercept trajectory of ", stateParts[0]];
    else if(stateParts[1] == "Elliptical")
        return ["an elliptical orbit around ", stateParts[0]];
    else if(stateParts[1] == "GSO")
        return ["a geo-stationary orbit around ", stateParts[0]];
    else if(stateParts[1] == "PlaneBy")
        return ["the orbital plane of ", stateParts[0]];
    else
        throw "State can not be decoded: " + state;
}

function missionDetails() {
    if(missionPlan == undefined)
        return;

    var graph = systemGraph();

    var mission = missionStep(false, "<b>Info</b>", "<b>Delta-V</b>", "<b>Accumulated</b>");
    var deltav = 0;
    for (var missionPlanIndex = 0; missionPlanIndex < missionPlan.length -1; missionPlanIndex++) {
        for (var i = graph.length - 1; i >= 0; i--) {
            if(graph[i][0] == missionPlan[missionPlanIndex] && graph[i][1] == missionPlan[missionPlanIndex+1]) {
                if(missionPlan[missionPlanIndex] == "Kerbin_Intercept" && missionPlan[missionPlanIndex+1] == "Kerbin_Elliptical")
                    continue;
                if(missionPlan[missionPlanIndex] == "Kerbin_Elliptical" && missionPlan[missionPlanIndex+1] == "Kerbin_Intercept")
                    continue;
                var info = "To " + missionStateTextNormal(missionPlan[missionPlanIndex+1]) + ".";
                var additionalDeltaV = getDeltaV(graph[i][2], missionPlan[missionPlanIndex], missionPlan[missionPlanIndex+1]);
                deltav = deltav + additionalDeltaV;
                mission = mission + missionStep(true, info, Math.round(additionalDeltaV) + " m/s", Math.round(deltav) + " m/s");
                continue;
            }
        };
    };  

    $("#missionPlan").html(mission);
}

function missionStep (showRocket, info, dv, dvSum) {
    var stepTemplate = '<div class="row"><div class="col-sm-6">INFO</div><div class="col-sm-3"><span class="pull-right">DELTAV</span></div><div class="col-sm-3"><span class="pull-right">DELTAVSUM</span></div></div>';
    if(showRocket)
        info = '<i class="fa fa-rocket"></i> ' + info;
    return stepTemplate.replace('INFO', info).replace('DELTAV', dv).replace('DELTAVSUM', dvSum)
}

function getDeltaV (value, fromGraphNode, toGraphNode) {
    var inAtmosphere = fromGraphNode.split("_")[1] == "SurfaceA" || toGraphNode.split("_")[1] == "SurfaceA";
    var result = value;
    
    if(inAtmosphere && getAtmosphereDeltaVMargin() > 0)
        result = result + getAtmosphereDeltaVMargin() / 100.0 * result;

    if(!inAtmosphere && getVacuumDeltaVMargin() > 0)
        result = result + getVacuumDeltaVMargin() / 100.0 * result;

    return result;
}

///////////////////////////////////////////////////////////////////////////////
// delta-v computation ////////////////////////////////////////////////////////

function selectDeltaV(startState, objective) {
    var graph = systemGraph();
    missionPlan = dijkstraShortestPath(graph, startState, objective);

    var deltav = 0;
    for (var missionPlanIndex = 0; missionPlanIndex < missionPlan.length -1; missionPlanIndex++) {
        for (var i = graph.length - 1; i >= 0; i--) {
            if(graph[i][0] == missionPlan[missionPlanIndex] && graph[i][1] == missionPlan[missionPlanIndex+1]) {
                var additionalDeltaV = getDeltaV(graph[i][2], missionPlan[missionPlanIndex], missionPlan[missionPlanIndex+1]);
                deltav = deltav + additionalDeltaV;
                continue;
            }
        };
    };    

    return Math.round(deltav/10)*10;
}

function dijkstraShortestPath(graph, startState, objective) {
    var map = {};
    for (var i = graph.length - 1; i >= 0; i--) {
        if(!(graph[i][0] in map))
            map[graph[i][0]] = {};
        map[graph[i][0]][graph[i][1]] = {};
        map[graph[i][0]][graph[i][1]] = graph[i][2];
    };

    return new Graph(map).findShortestPath(startState, objective);
}

function systemGraph() {
    var result = [];

    // Kerbol
    graphAdd(result, ["Kerbin_Intercept",  "Kerbol_Elliptical",    4600]);
    graphAdd(result, ["Kerbol_Elliptical", "Kerbol_LowOrbit",     13500]);
    graphAdd(result, ["Kerbol_LowOrbit",   "Kerbol_SurfaceA",     67000]);

    // Moho    
    graphAdd(result, ["Moho_Intercept",   "Moho_LowOrbit",        2410]);
    graphAdd(result, ["Moho_LowOrbit",    "Moho_Surface",          870]);

    // Eve    
    graphAdd(result, ["Eve_Intercept",    "Eve_Elliptical",         80]);
    graphAdd(result, ["Eve_Elliptical",   "Eve_LowOrbit",         1330]);
    graphAdd(result, ["Eve_LowOrbit",     "Eve_SurfaceA",         6000]);
        // Gilly    
    graphAdd(result, ["Gilly_Intercept",  "Gilly_LowOrbit",        410]);
    graphAdd(result, ["Gilly_LowOrbit",   "Gilly_Surface",          30]);

    // Kerbin    
    graphAdd(result, ["Kerbin_SurfaceA",   "Kerbin_LowOrbit",      3300]);
    graphAdd(result, ["Kerbin_LowOrbit",   "Kerbin_GSO",           1115]);
    graphAdd(result, ["Kerbin_LowOrbit",   "Kerbin_Elliptical",     950]);
    graphAdd(result, ["Kerbin_Elliptical", "Kerbin_Intercept",        0]);
        // Mun    
    graphAdd(result, ["Mun_Intercept",    "Mun_LowOrbit",          310]);
    graphAdd(result, ["Mun_LowOrbit",     "Mun_Surface",           580]);
        // Minmus    
    graphAdd(result, ["Minmus_Intercept", "Minmus_LowOrbit",       160]);
    graphAdd(result, ["Minmus_LowOrbit",  "Minmus_Surface",        180]);        

    // Duna    
    graphAdd(result, ["Duna_Intercept",   "Duna_Elliptical",       250]);
    graphAdd(result, ["Duna_Elliptical",  "Duna_LowOrbit",         360]);
    graphAdd(result, ["Duna_LowOrbit",    "Duna_SurfaceA",        1300]);
        // Ike
    graphAdd(result, ["Ike_Intercept",    "Ike_LowOrbit",          180]);
    graphAdd(result, ["Ike_LowOrbit",     "Ike_Surface",           390]);    

    // Dres    
    graphAdd(result, ["Dres_Intercept",   "Dres_LowOrbit",        1290]);
    graphAdd(result, ["Dres_LowOrbit",    "Dres_Surface",          430]);

    // Jool    
    graphAdd(result, ["Jool_Intercept",   "Jool_Elliptical",       160]);
    graphAdd(result, ["Jool_Elliptical",  "Jool_LowOrbit",        2810]);
    graphAdd(result, ["Jool_LowOrbit",    "Jool_SurfaceA",        16000]);
        // Laythe
    graphAdd(result, ["Laythe_Intercept", "Laythe_LowOrbit",      1070]);
    graphAdd(result, ["Laythe_LowOrbit",  "Laythe_SurfaceA",      2900]);
        // Vall
    graphAdd(result, ["Vall_Intercept",   "Vall_LowOrbit",         910]);
    graphAdd(result, ["Vall_LowOrbit",    "Vall_Surface",          860]);
        // Tylo
    graphAdd(result, ["Tylo_Intercept",   "Tylo_LowOrbit",        1100]);
    graphAdd(result, ["Tylo_LowOrbit",    "Tylo_Surface",         2270]);
        // Bop    
    graphAdd(result, ["Bop_Intercept",    "Bop_LowOrbit",          900]);
    graphAdd(result, ["Bop_LowOrbit",     "Bop_Surface",           220]);
        // Pol        
    graphAdd(result, ["Pol_Intercept",    "Pol_LowOrbit",          820]);
    graphAdd(result, ["Pol_LowOrbit",     "Pol_Surface",           130]);
        
    // Eeloo    
    graphAdd(result, ["Eeloo_Intercept",  "Eeloo_LowOrbit",       1370]);
    graphAdd(result, ["Eeloo_LowOrbit",   "Eeloo_Surface",         620]);

    // plane changes 
    addPlaneChangesSiblings(result, "Kerbin", "Moho",  2520,  760);
    addPlaneChangesSiblings(result, "Kerbin", "Eve",    430,   90);
    addPlaneChangesSiblings(result, "Kerbin", "Duna",    10,  130);
    addPlaneChangesSiblings(result, "Kerbin", "Dres",  1010,  610);
    addPlaneChangesSiblings(result, "Kerbin", "Jool",   270,  980);
    addPlaneChangesSiblings(result, "Kerbin", "Eeloo", 1330, 1140);

    addPlaneChangesSiblings(result, "Minmus", "Mun",    340,   70);

    addPlaneChangesSiblings(result, "Laythe", "Vall",     0,  310);
    addPlaneChangesSiblings(result, "Laythe", "Tylo",     0,  530);
    addPlaneChangesSiblings(result, "Laythe", "Bop",   2440,  710);
    addPlaneChangesSiblings(result, "Laythe", "Pol",    700,  770);
    addPlaneChangesSiblings(result, "Vall",   "Tylo",     0,  220);
    addPlaneChangesSiblings(result, "Vall",   "Bop",   2440,  400);
    addPlaneChangesSiblings(result, "Vall",   "Pol",    700,  460);
    addPlaneChangesSiblings(result, "Tylo",   "Bop",   2440,  180);
    addPlaneChangesSiblings(result, "Tylo",   "Pol",    700,  240);
    addPlaneChangesSiblings(result, "Bop",    "Pol",   1740,   60);

    // wild guesses
    addPlaneChangesSiblings(result, "Moho",   "Eve",   2090,  670);
    addPlaneChangesSiblings(result, "Duna",   "Dres",  1000,  480);
    addPlaneChangesSiblings(result, "Dres",   "Jool",  1280,  370);
    addPlaneChangesSiblings(result, "Jool",   "Eeloo", 1600,  160);

    // plane changes moons - some guesses
    addPlaneChangesOrbiters(result, "Eve",    true, "Gilly",  930,   60, 1270);
    addPlaneChangesOrbiters(result, "Kerbin", true, "Mun",      0,   90,  860);
    addPlaneChangesOrbiters(result, "Kerbin", true, "Minmus", 340,   20,  930);
    addPlaneChangesOrbiters(result, "Duna",   true, "Ike",      0,   30,  330);
    addPlaneChangesOrbiters(result, "Jool",   true, "Laythe",   0,  930, 1880);
    addPlaneChangesOrbiters(result, "Jool",   true, "Vall",     0,  620, 2190);
    addPlaneChangesOrbiters(result, "Jool",   true, "Tylo",     0,  400, 2410);
    addPlaneChangesOrbiters(result, "Jool",   true, "Bop",   2440,  220, 2590);
    addPlaneChangesOrbiters(result, "Jool",   true, "Pol",    700,  160, 2650);

    if(getFullAerobraking()) { // aerobraking        

        graphReplace(result, ["Kerbin_Intercept",  "Kerbin_LowOrbit", 0]);
        graphReplace(result, ["Eve_Intercept",     "Eve_Elliptical",  0]);
        graphReplace(result, ["Duna_Intercept",    "Duna_Elliptical", 0]);
        graphReplace(result, ["Jool_Intercept",    "Jool_Elliptical", 0]);

    } 

    if(getLandingAerobraking()) { // aerobraking        

        graphReplace(result, ["Kerbol_Elliptical", "Kerbol_LowOrbit",  0]);
        graphReplace(result, ["Eve_Elliptical",    "Eve_LowOrbit",     0]);
        graphReplace(result, ["Kerbin_Elliptical", "Kerbin_LowOrbit",  0]);
        graphReplace(result, ["Duna_Elliptical",   "Duna_LowOrbit",    0]);
        graphReplace(result, ["Jool_Elliptical",   "Jool_LowOrbit",    0]);
        graphReplace(result, ["Laythe_Intercept",  "Laythe_LowOrbit",  0]);

        graphReplace(result, ["Kerbol_LowOrbit",   "Kerbol_SurfaceA",  0]);
        graphReplace(result, ["Kerbin_LowOrbit",   "Kerbin_SurfaceA",  0]);
        graphReplace(result, ["Eve_LowOrbit",      "Eve_SurfaceA",     0]);
        graphReplace(result, ["Duna_LowOrbit",     "Duna_SurfaceA",    0]);
        graphReplace(result, ["Jool_LowOrbit",     "Jool_SurfaceA",    0]);
        graphReplace(result, ["Laythe_LowOrbit",   "Laythe_SurfaceA",  0]);

    } 

    return result;
}

function addPlaneChangesSiblings (result, sibling1, sibling2, dvPlane, dvTransfer) {
    if(!getPlaneChanges())
        dvPlane = 0;

    graphA(result, sibling1 + "_Intercept",           sibling2 + "_PlaneBy_" + sibling1, dvPlane);                
    graphA(result, sibling2 + "_PlaneBy_" + sibling1, sibling2 + "_Intercept",           dvTransfer);
    graphA(result, sibling2 + "_Intercept",           sibling1 + "_PlaneBy_" + sibling2, dvPlane);        
    graphA(result, sibling1 + "_PlaneBy_" + sibling2, sibling1 + "_Intercept",           dvTransfer);
}

function addPlaneChangesOrbiters (result, centerBody, centerHasAtmosphere, orbiter, dvPlane, dvTransferElliptic, dvTransferLow) {
    if(!getPlaneChanges())
        dvPlane = 0;

    graphA(result, centerBody + "_Elliptical",                  orbiter + "_PlaneBy_Elliptic_" + centerBody, dvPlane);                
    graphA(result, orbiter + "_PlaneBy_Elliptic_" + centerBody, orbiter + "_Intercept",                      dvTransferElliptic);
    graphA(result, orbiter + "_Intercept",                      centerBody + "_Elliptical",                  dvTransferElliptic);

    graphA(result, centerBody + "_LowOrbit",                    orbiter + "_PlaneBy_LowOrbit_" + centerBody, dvPlane);                
    graphA(result, orbiter + "_PlaneBy_LowOrbit_" + centerBody, orbiter + "_Intercept",                      dvTransferLow);

    if(centerHasAtmosphere && getLandingAerobraking())
        dvTransferLow = 0;

    graphA(result, orbiter + "_Intercept",                      centerBody + "_LowOrbit",                    dvTransferLow);
}

function graphA(graph, start, objective, dv) {
    graph.push([start, objective, dv]);
}

function graphAdd(graph, entry) {
    graph.push(entry);
    graph.push([entry[1], entry[0], entry[2]]);
}

function graphReplace(graph, entry) {
    for (var i = graph.length - 1; i >= 0; i--) {
        if(graph[i][0] == entry[0] && graph[i][1] == entry[1]) {
            graph[i][2] = entry[2];
            return;
        }
    };
}

///////////////////////////////////////////////////////////////////////////////
// settings ///////////////////////////////////////////////////////////////////

function setPerfectionistProfile() {
    setProfile(false, true, true, false, 0, 0);
}

function setRealisticProfile() {
    setProfile(false, false, true, false, 20, 10);
}

function setCasualProfile() {
    setProfile(true, false, true, true, 35, 15);
}

function setProfile (startingFromKerbin, fullAerobraking, aerobrakingForLanding, planeChanges, atmosphereDeltaVMargin, vacuumDeltaVMargin) {
    setChecked("#rbStartFromKerbin", startingFromKerbin);    
    setChecked("#rbStartFromPreviousTarget", !startingFromKerbin);
    setChecked("#rbMaximalAerobrakingOn", fullAerobraking);    
    setChecked("#rbMaximalAerobrakingOff", !fullAerobraking);
    setChecked("#rbLandingAerobrakingOn", aerobrakingForLanding);
    setChecked("#rbLandingAerobrakingOff", !aerobrakingForLanding);
    setChecked("#rbPlaneChangesOn", planeChanges);
    setChecked("#rbPlaneChangesOff", !planeChanges);
    setProgress("#pbAtmosphereDeltaVMargin", atmosphereDeltaVMargin);
    setProgress("#pbVacuumDeltaVMargin", vacuumDeltaVMargin);
}

function setChecked(radioButtonId, checked) {
    $(radioButtonId).attr("checked", checked);   
    if(checked) {
        if($(radioButtonId).parent().attr("class").indexOf("active") == -1)
            $(radioButtonId).parent().attr("class", $(radioButtonId).parent().attr("class") + " active"); 
    } else {
        $(radioButtonId).parent().attr("class", $(radioButtonId).parent().attr("class").replace(" active", "")); 
    }
}

function getChecked(radioButtonId) {
    //return $(radioButtonId).attr("checked") == "checked";
    return $(radioButtonId).parent().attr("class").indexOf("active") > -1;
}

function setProgress(progressbarId, value) {
    $(progressbarId).slider().data('slider').setValue(value);
}

function getProgress(progressbarId) {
    return $(progressbarId).slider().data('slider').getValue();
}

function setMaximalAerobraking(fullAerobraking) {
    if(fullAerobraking) {
        setChecked("#rbLandingAerobrakingOn", true);
        setChecked("#rbLandingAerobrakingOff", false);
    }
}

function setLandingAerobraking(aerobrakingForLanding) {
    if(!aerobrakingForLanding) {
        setChecked("#rbMaximalAerobrakingOn", false);
        setChecked("#rbMaximalAerobrakingOff", true);
    }
}

function applySettings() {
    setStartFromKerbin(        getChecked("#rbStartFromKerbin") );
    setFullAerobraking(        getChecked("#rbMaximalAerobrakingOn") );
    setLandingAerobraking(     getChecked("#rbLandingAerobrakingOn") );
    setPlaneChanges(           getChecked("#rbPlaneChangesOn") );
    setAtmosphereDeltaVMargin( getProgress("#pbAtmosphereDeltaVMargin") );
    setVacuumDeltaVMargin(     getProgress("#pbVacuumDeltaVMargin") );

    if(getStartFromKerbin()) {
        setStartAnchor($("#startingAnchor"));
        startState = "Kerbin_SurfaceA";
    }    

    updateMissionInfo();
}

///////////////////////////////////////////////////////////////////////////////
// UI events and formatting ///////////////////////////////////////////////////

$("#pbAtmosphereDeltaVMargin").slider({
    tooltip: 'always',

    formatter: function(value) {
        return value + "% more Delta-V";
    }
});

$("#pbVacuumDeltaVMargin").slider({
    tooltip: 'always',

    formatter: function(value) {
        return value + "% more Delta-V";
    }
});

$(document).ready(function() {
    startAnchor = $("#startingAnchor");
    targetAnchor = $("#startingAnchor");

    $(".aobjective").click(function() {
    
        if(!getStartFromKerbin()) {
            setStartAnchor(targetAnchor);
        }

        setTargetAnchor($(this));
    });
});

function setStartAnchor(newAnchor) {
    startAnchor.html(startAnchor.html().replace('<i class="fa fa-rocket"></i>', ''));
    startAnchor.attr("class", startAnchor.attr("class").replace(" activestart", ""));
    startAnchor = newAnchor;    
    startAnchor.html('<i class="fa fa-rocket"></i>' + startAnchor.html());
    startAnchor.attr("class", "aobjective activestart");
}

function setTargetAnchor(newAnchor) {
    targetAnchor.html(targetAnchor.html().replace('<i class="fa fa-flag"></i>', ''));
    targetAnchor.attr("class", targetAnchor.attr("class").replace(" activeobjective", ""));
    targetAnchor = newAnchor;    
    targetAnchor.html('<i class="fa fa-flag"></i>' + targetAnchor.html());
    targetAnchor.attr("class", "aobjective activeobjective");
}

function loadSettings() {
    setProfile(getStartFromKerbin(), getFullAerobraking(), getLandingAerobraking(), getPlaneChanges(), getAtmosphereDeltaVMargin(), getVacuumDeltaVMargin());
}

///////////////////////////////////////////////////////////////////////////////
// persistency ////////////////////////////////////////////////////////////////

function setStartFromKerbin (value) { setValue("startFromKerbin", value); }
function getStartFromKerbin ()      { return getBoolean("startFromKerbin", false); }

function setFullAerobraking (value) { setValue("fullAerobraking", value); }
function getFullAerobraking ()      { return getBoolean("fullAerobraking", false); }

function setLandingAerobraking (value) { setValue("landingAerobraking", value); }
function getLandingAerobraking ()      { return getBoolean("landingAerobraking", true); }

function setPlaneChanges (value) { setValue("planeChanges", value); }
function getPlaneChanges ()      { return getBoolean("planeChanges", false); }

function setAtmosphereDeltaVMargin (value) { setValue("atmosphereDeltaVMargin", value); }
function getAtmosphereDeltaVMargin ()      { return getInteger("atmosphereDeltaVMargin", 20); }

function setVacuumDeltaVMargin (value) { setValue("vacuumDeltaVMargin", value); }
function getVacuumDeltaVMargin ()      { return getInteger("vacuumDeltaVMargin", 10); }

var fallbackPersistency = {};

function setValue (id, value) {
    if(typeof(Storage) !== "undefined") {
        try {
            window.localStorage.setItem(id, value);
            return;
        } catch(e) {}
    }

    // this code will only be executed if localStorage is not working

    fallbackPersistency[id] = "" + value;
}

function getValue (id, defaultValue) {
    if(typeof(Storage) !== "undefined") {
        try{
            if(!window.localStorage.getItem(id)) {
                setValue(id, defaultValue);
            }

            return window.localStorage.getItem(id);
        } catch(e) {}
    }

    // this code will only be executed if localStorage is not working

    if(!(id in fallbackPersistency)) {
        setValue(id, defaultValue);
    }

    return fallbackPersistency[id];
}

function getBoolean (id, defaultValue) {
    return getValue(id, defaultValue) == 'true';
}

function getInteger (id, defaultValue) {
    return parseInt(getValue(id, defaultValue));    
}
