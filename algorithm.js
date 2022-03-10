// algorithm adapted from Breathing Labs Ltd (http://www.breathinglabs.com/)
const TOTALTIME = 180;
let start = false;

// user preferred breathing durations
let inhaleDuration = 4;
let holdDuration = 7;
let exhaleDuration = 8;

// text displays
let instructions = [];
let counts = [];

// circle dimensions
let innerRadius;
let outerRadius;
let minRadius = 130;
let maxRadius = 200;

// triggers for breath collection
let inhaling;
let exhaling;

// keep responsiveness adaptive to the user's average breathing volume
let normAvg = 100;
let scaleIn = 0.04; // inhalations are quieter
let scaleOut = 0.03;
let maxAvg = 20;

// colours for target, close and far
let rc = 115;
let gc = 160;
let bc = 245;

let rf = 235;
let gf = 87;
let bf = 131;

// start algorithm
function startAlgo() {
  setup();
  start = true;
  innerRadius = minRadius - 30;
  breathingAlgorithm.run({ runjQuery: true });
}

// stop algorithm
function stopAlgo() {
  start = false;
}

function setup() {
  let cycles = Math.ceil(
    TOTALTIME / (inhaleDuration + holdDuration + exhaleDuration)
  );

  for (let i = 0; i < cycles; i++) {
    for (let j = inhaleDuration; j > 0; j--) {
      instructions.push("Inhale");
      counts.push(j);
    }
    for (let j = holdDuration; j > 0; j--) {
      instructions.push("Hold");
      counts.push(j);
    }
    for (let j = exhaleDuration; j > 0; j--) {
      instructions.push("Exhale");
      counts.push(j);
    }
  }
}

function showMain() {
  let intro = document.getElementById("intro");
  let main = document.getElementById("main");

  intro.style.display = "none";
  main.style.display = "block";
}

function enableButtons() {
  let start = document.getElementById("startButton");
  let stop = document.getElementById("stopButton");
  let confirm = document.getElementById("confirmButton");
  let selection = document.getElementById("selection");
  let wrapper = document.getElementById("wrapper");
  let buttons = document.getElementById("buttons");

  start.style.pointerEvents = "auto";
  stop.style.pointerEvents = "auto";

  start.style.opacity = 1;
  stop.style.opacity = 1;

  confirm.style.display = "none";
  selection.style.display = "none";
  wrapper.style.display = "block";
  buttons.style.top = 0;
}

// define algorithm environment
let breathingAlgorithm = {
  libraryCheck: function () {
    // the minimum version of jQuery we want
    let v = "1.3.2";

    // check prior inclusion and version
    if (window.jQuery === undefined || window.jQuery.fn.jquery < v) {
      let done = false;
      let script = document.createElement("script");
      script.src =
        "http://ajax.googleapis.com/ajax/libs/jquery/" + v + "/jquery.min.js";
      script.onload = script.onreadystatechange = function () {
        if (
          !done &&
          (!this.readyState ||
            this.readyState == "loaded" ||
            this.readyState == "complete")
        ) {
          done = true;
        }
      };
      document.getElementsByTagName("head")[0].appendChild(script);
    } else {
    }
  },

  // define algorithm parameters
  pow: 0, //Sum of all frequency element data(b.frequencyBin) - power
  sampleSize: 1024, // number of samples to collect before analyzing data
  fftSize: 1024, // must be power of two // **
  frequencyBin: new Array(), //Put all frequency element data in array

  run: function (pfu) {
    // add your own parameters here

    this.pfu = pfu || {};

    if (this.pfu.runjQuery == true) {
      breathingAlgorithm.libraryCheck();
    }

    // asks for microphone access
    getUserMedia();
  },
};

// create algorithm instance
let b = breathingAlgorithm;

// create audio nodes
let sourceNode, analyserNode, javascriptNode;

// create audio context
window.AudioContext =
  window.AudioContext ||
  window.webkitAudioContext ||
  window.mozAudioContext ||
  window.oAudioContext ||
  window.msAudioContext;

let audioContext = new AudioContext();

// start audio context if start button is clicked
document.getElementById("startButton").addEventListener("click", function () {
  audioContext.resume();
  document.getElementById("startButton").style.backgroundColor = "yellow";
  document.getElementById("stopButton").style.backgroundColor = "";
});

// stop audio context if stop button is clicked
document.getElementById("stopButton").addEventListener("click", function () {
  audioContext.suspend();
  document.getElementById("stopButton").style.backgroundColor = "yellow";
  document.getElementById("startButton").style.backgroundColor = "";
});

// set up microphone for data gathering
function getUserMedia() {
  let constraints = { audio: true, video: false };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (mediaStream) {
      goStream(mediaStream);
    })
    .catch(function (err) {
      console.log(err.name + ": " + err.message);
    }); // always check for errors at the end.
}

// microphone signal processing and exhalation algorithm process
function goStream(stream) {
  doAlgo();

  let frequencyArray; // array to hold frequency data

  // create the media stream from the audio input source (microphone)
  sourceNode = audioContext.createMediaStreamSource(stream);
  audioStream = stream;

  analyserNode = audioContext.createAnalyser();

  analyserNode.smoothingTimeConstant = 0.3;
  analyserNode.fftSize = b.fftSize;

  javascriptNode = audioContext.createScriptProcessor(b.sampleSize, 1, 1);

  // set up the event handler that is triggered every time enough samples have been collected
  javascriptNode.onaudioprocess = function () {
    b.pow = 0;

    frequencyArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(frequencyArray);

    // add frequencyArray data
    for (let i = 0; i < frequencyArray.length; i++) {
      b.frequencyBin[i] = frequencyArray[i];
      b.pow += b.frequencyBin[i];
    }
  };

  // connect audio nodes, do not connect source node to destination to avoid feedback
  sourceNode.connect(analyserNode);
  analyserNode.connect(javascriptNode);
  javascriptNode.connect(audioContext.destination);
}

// error function to handle microphone input
function error() {
  alert("Stream generation failed");
}

function showDropdown(option) {
  document.getElementById(option).classList.toggle("show");
}

function registerEvent(num, button) {
  let target;

  if (button == "inhale") {
    target = document.getElementById("inhalebtn");
    inhaleDuration = num;
  } else if (button == "hold") {
    target = document.getElementById("holdbtn");
    holdDuration = num;
  } else {
    target = document.getElementById("exhalebtn");
    exhaleDuration = num;
  }

  target.innerHTML = num;
}

function drawInstruction(elapsed, context, x, y) {
  let xpos = 0;
  let ypos = 0;
  context.font = "30px Arial";
  if (elapsed == TOTALTIME) {
    context.fillText("Finished!", x - 60, y - 210); // text instruction
  } else {
    if (instructions[elapsed] == "Inhale") {
      xpos = 43;
      ypos = 250;
    } else if (instructions[elapsed] == "Hold") {
      xpos = 35;
      ypos = 250;
    } else {
      xpos = 43;
      ypos = 250;
    }
    context.fillText(instructions[elapsed], x - xpos, y - ypos); // text instruction
    context.fillText(counts[elapsed], x - 15, y - 170);
    if (instructions[elapsed] == "Hold") {
      return 0;
    } else {
      return 1;
    }
  }
}

// draw visualisation
function doAlgo() {
  // set environment parameters
  let canvas = document.getElementById("circlecanvas");
  let context = canvas.getContext("2d");
  let canvas2 = document.getElementById("circlecanvas2");
  let context2 = canvas2.getContext("2d");
  let x = canvas.width / 2;
  let y = canvas.height / 2;
  context.lineWidth = 60;
  context2.lineWidth = 10;

  let startTime = performance.now(); // get current time
  let flag = 0; // on/off counter for gathering breathing data
  let inhaleTime = 0;
  let exhaleTime = 0; // total exhalation time
  let deepTime = 0; // deep breathing time - time that is spent in the coloured circle
  let remainingTime = 0;

  draw();

  // create shapes
  function draw(currentTime) {
    // elapsed time
    let elapsed = Math.floor((currentTime - startTime) / 1000) - 1;
    let seconds = (currentTime - startTime) / 1000 - 1;

    // clear context on every frame
    context.clearRect(0, 0, canvas.width, canvas.height);
    context2.clearRect(0, 0, canvas.width, canvas.height);

    // redraw
    context.beginPath();
    context2.beginPath();

    // set algorithm duration
    if (elapsed >= TOTALTIME) {
      start = false;
    }

    if (instructions[elapsed] == "Inhale") {
      inhaling = true;
      exhaling = false;
    } else if (instructions[elapsed] == "Exhale") {
      inhaling = false;
      exhaling = true;
    } else {
      inhaling = false;
      exhaling = false;
    }

    // check elapsed time - draw new image every second based on conditions
    if (elapsed >= 0) {
      flag = drawInstruction(elapsed, context, x, y);

      if (instructions[elapsed] == "Inhale") {
        outerRadius =
          minRadius +
          ((maxRadius - minRadius) *
            (seconds % (inhaleDuration + holdDuration + exhaleDuration))) /
            inhaleDuration;
      } else if (instructions[elapsed] == "Hold") {
        outerRadius = maxRadius;
      } else if (instructions[elapsed] == "Exhale") {
        outerRadius =
          maxRadius -
          ((maxRadius - minRadius) *
            ((seconds % (inhaleDuration + holdDuration + exhaleDuration)) -
              inhaleDuration -
              holdDuration)) /
            exhaleDuration;
      }

      // draw circles
      context.strokeStyle = "rgba(0, 150, 200, 0.5)";
      context.arc(x, y - 215, outerRadius, 0, Math.PI * 2, true);

      context.stroke();
    }

    // get breathing sample statistics
    const sum = b.frequencyBin.reduce((a, b) => a + b, 0);
    const avg = sum / b.frequencyBin.length || 0;

    if (avg > maxAvg) {
      maxAvg = avg;
    }

    let factor = 0;
    if (inhaling) {
      factor = scaleIn * (normAvg / maxAvg);
    } else if (exhaling) {
      factor = scaleOut * (normAvg / maxAvg);
    }

    let delta = avg * factor;

    // check if breath collection is on and enough breath is supplied
    if (flag == 1 && avg >= 3) {
      deepTime += 1 / 60;
    }

    // calculate times
    if (seconds >= 0) {
      totalMin = Math.floor(seconds / 60);
      totalSec = Math.floor(seconds % 60, 2);

      deepMin = Math.floor(deepTime / 60);
      deepSec = Math.floor(deepTime % 60, 2);

      context.fillText(
        "Elapsed Time: " + totalMin + "m " + totalSec + "s",
        x - 140,
        y - 475
      );

      // visualise breathing

      // draw inner circle
      if (inhaling) {
        innerRadius += delta;
        innerRadius = Math.min(innerRadius, maxRadius + 30);
      } else if (exhaling) {
        innerRadius -= delta;
        innerRadius = Math.max(innerRadius, minRadius - 30);
      }

      context2.arc(x, y - 215, innerRadius, 0, Math.PI * 2, true);

      let ratio =
        1 - Math.abs(innerRadius - outerRadius) / (maxRadius - minRadius);
      let rn = rf + (rc - rf) * ratio;
      let gn = gf + (gc - gf) * ratio;
      let bn = bf + (bc - bf) * ratio;

      context2.strokeStyle = "rgba(" + rn + "," + gn + "," + bn + ",1)"; // responsive
      // context2.strokeStyle = "rgba(0, 0, 0, 0)"; // non-responsive
      context2.stroke();
    }

    if (start == true) {
      requestAnimationFrame(draw); // loop at screen refresh rate
    } else {
      // display statistics when algorithm terminates
      inhaleTime =
        Math.floor(seconds / (inhaleDuration + holdDuration + exhaleDuration)) *
        inhaleDuration;

      /* 
      let inhaleMin = Math.floor(inhaleTime / 60);
      let inhaleSec = Math.ceil(inhaleTime % 60, 2);
      */

      exhaleTime =
        Math.floor(seconds / (inhaleDuration + holdDuration + exhaleDuration)) *
        exhaleDuration;

      remainingTime =
        seconds -
        Math.floor(seconds / (inhaleDuration + holdDuration + exhaleDuration)) *
          (inhaleDuration + holdDuration + exhaleDuration);

      // calculate leftover time after the last cycle
      if (remainingTime >= inhaleDuration) {
        if (remainingTime >= inhaleDuration + holdDuration) {
          remainingInhale = inhaleDuration;
          remainingExhale = remainingTime - inhaleDuration - holdDuration;
        } else {
          remainingInhale = inhaleDuration;
          remainingExhale = 0;
        }
      } else {
        remainingInhale = remainingTime;
        remainingExhale = 0;
      }

      /*  
      let exhaleMin = Math.floor(exhaleTime / 60);
      let exhaleSec = Math.ceil(exhaleTime % 60, 2);
      */

      /*
      console.log("Inhalation Time: " + inhaleMin + "m " + inhaleSec + "s");
      console.log("Exhalation Time: " + exhaleMin + "m " + exhaleSec + "s");
      console.log("Deep Breathing Time: " + deepMin + "m " + deepSec + "s");
      console.log(
        "Deep Breathing Percent: " +
          ((deepTime / (inhaleTime + exhaleTime)) * 100).toFixed(2) +
          "%"
      );
      */

      context.fillText(
        "Deep Breathing Time: " + deepMin + "m " + deepSec + "s",
        x - 190,
        y + 60
      );

      let warning = document.getElementById("warning");
      warning.style.display = "block";

      /*
      if (inhaleTime + exhaleTime == 0) {
        context.fillText("Deep Breathing Percent: 0.00%", x - 210, y + 100);
      } else {
        context.fillText(
          "Deep Breathing Percent: " +
            (
              (deepTime /
                (inhaleTime + exhaleTime + remainingInhale + remainingExhale)) *
              100
            ).toFixed(2) +
            "%",
          x - 210,
          y + 100
        );
      }
      */
    }
  }
}

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
  if (!event.target.matches(".dropbtn")) {
    let dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      let openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};
