// I'm implementing the experiment using a data structure that I call a **sequence**. 
// The insight behind sequences is that many experiments consist of a sequence of largely homogeneous trials that vary based on a parameter. For instance, in this example experiment, a lot stays the same from trial to trial - we always have to present some number, the subject always has to make a response, and we always want to record that response. Of course, the trials do differ - we're displaying a different number every time. The idea behind the sequence is to separate what stays the same from what differs - to **separate code from data**. This results in **parametric code**, which is much easier to maintain - it's simple to add, remove, or change conditions, do randomization, and do testing.

// ## High-level overview
// Things happen in this order:
// 
// 1. Compute randomization parameters (whether user will evaluate complexity or colorfulness and the order of the images).
// 2. Set up the experiment sequence object.
// 3. When the subject clicks the start button, it takes them through several sets of instructions, a practice trial, and then two real trials.
// 4. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 5. If there are more trials left, <code>experiment.next()</code> shows the next trial and records the user's colorfulness or complexity rating for a website image.

// ## Helper functions

// Shows slides. We're using jQuery here - the **$** is the jQuery selector function, which takes as input either a DOM element or a CSS selector string.
function showSlide(id) {
  // Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
	$("#"+id).show();
}

function beginTimeout(partNum, currentTrialNum, denom, currentImage) {
  console.log(partNum, currentTrialNum, denom, currentImage)
  showSlide("stage");
  $("#partnum").text(partNum);
  $("#number").text(currentTrialNum);
  $("#denom").text(denom);
  $("#stimulusimage").attr("src", currentImage);
  var img = document.getElementById("stimulusimage")
  img.addEventListener("load", function () {
    setTimeout(experiment.evaluate, 500, currentTrialNum, partNum, denom);
  });
  }

// clears likert scale between trials
function clearLikert() {
  var ids = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"]
  for (var i = 0; i< ids.length; i++){
    document.getElementById(ids[i]).checked = false;
  }
}

// Get a random integer less than n.
function randomInteger(n) {
	return Math.floor(Math.random()*n);
}

// Get a random element from an array (e.g., <code>random_element([4,8,7])</code> could return 4, 8, or 7). This is useful for condition randomization.
function randomElement(array) {
  return array[randomInteger(array.length)];
}

// Gets numNeeded random integers without replacement
function getRandomIntegers(numNeeded, maxInt){
  var bucket = [];
  for (var i=0;i<maxInt;i++) {
      bucket.push(i);
  }

  function getRandomFromBucket() {
     var randomIndex = Math.floor(Math.random()*bucket.length);
     return bucket.splice(randomIndex, 1)[0];
  }

  var selected_indices = [];
  for (var i = 0; i < numNeeded; i++) {
    selected_indices.push(getRandomFromBucket())
  }
  console.log(selected_indices);
  return selected_indices
}

// Shuffles the order of an array in place
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Gets the correct image paths based on given integers in numArr
function getImagePaths(category, numArr) {
  var imagePaths = [];
  var imagePath;
  console.log(category, numArr)
  for (var i = 0; i< numArr.length; i++) {
    imagePath = './website_stimuli/'+category+"/"+numArr[i].toString()+".png"
    imagePaths.push(imagePath)
  }
  return imagePaths
}

// Gets the correct distribution of images from different categories and randomizes their order
function getImageForTrials() {
  var englishImagesTrial1 = getImagePaths("english", getRandomIntegers(22, 350));
  var foreignImagesTrial1 = getImagePaths("foreign", getRandomIntegers(4, 60));
  var grayscaleImagesTrial1 = getImagePaths("grayscale", getRandomIntegers(4, 20));
  var practiceImages = getImagePaths("practice", [0, 1, 2, 3, 4]);

  var imagesTrial1 = [].concat(englishImagesTrial1,foreignImagesTrial1, grayscaleImagesTrial1)
  var imagesTrial1_copy = [].concat(imagesTrial1);
  var imagesTrial2_copy = [].concat(imagesTrial1);
  var imagesTrial1 = shuffle(imagesTrial1_copy);
  var imagesTrial2 = shuffle(imagesTrial2_copy); // same images as trial 1 but in a new order
  return {"trial1": imagesTrial1, "trial2": imagesTrial2, "practice": practiceImages}
}


// ## Configuration settings
var masterData = {} // main data structure for holding data
var trialNums = Array.apply(null, {length: 65}).map(Number.call, Number); // total number of images shown
var randomImages = getImageForTrials()
var imageOrder = (randomImages["practice"]).concat(randomImages["trial1"], randomImages["trial2"]); // list of image paths
var experimentOptions = ["colorfulness", "complexity"];
var whichExperiment = randomElement(experimentOptions); // decide on colorfulness or complexity once

// Show the instructions slide -- this is what we want subjects to see first.
showSlide("instructions");
$("#basicinstructions").text(whichExperiment);

var totalTrialNum = 0;
var currentImage = "";
var canChange = false;
// ## The main event
// I implement the sequence as an object with properties and methods. The benefit of encapsulating everything in an object is that it's conceptually coherent (i.e. the <code>data</code> variable belongs to this particular sequence and not any other) and allows you to **compose** sequences to build more complicated experiments. For instance, if you wanted an experiment with, say, a survey, a reaction time test, and a memory test presented in a number of different orders, you could easily do so by creating three separate sequences and dynamically setting the <code>end()</code> function for each sequence so that it points to the next. **More practically, you should stick everything in an object and submit that whole object so that you don't lose data (e.g. randomization parameters, what condition the subject is in, etc). Don't worry about the fact that some of the object properties are functions -- mmturkey (the Turk submission library) will strip these out.**
var experiment = {
  // An array to store the data that we're collecting.
  data: [],
  trials: trialNums,
  currentTrialNum: 0,
  experimentType: whichExperiment,
  // determine which instructions to show to user
  decideSlide: function(){
    if (experiment.experimentType == "colorfulness") {
      showSlide("overview-colorful")
    }
    else {
      showSlide("overview-complexity")
    }
  },
  
  // The function that gets called when the sequence is finished.
  end: function() {
    // Show the finish slide.
    showSlide("finished");
    // Wait 1.5 seconds and then submit the whole experiment object to Mechanical Turk (mmturkey filters out the functions so we know we're just submitting properties [i.e. data])
    setTimeout(function() { 
    //turk.submit(experiment) 
  }, 1500);
  },
  submitform: function(id) {
    masterData["imageOrder"] = imageOrder;
    masterData["experimentType"] = whichExperiment;
    if (id == "demo") {
      var formData = JSON.stringify($("#"+id).serializeArray());
      masterData["demographics"] = formData;
    }
    else {
      var existingTrials = Object.keys(masterData)
      if (existingTrials.indexOf(totalTrialNum) < 0) {
        masterData[totalTrialNum] = {}
      }
      var formData = $("#"+id).serializeArray()[0]
      if (typeof formData == 'undefined') {
        var userScore = null;
      }
      else {
        var userScore = parseInt(formData["value"]);
      }
      masterData[totalTrialNum]["userScore"] = userScore;
      masterData[totalTrialNum]["totalTrialNum"] = totalTrialNum;
      masterData[totalTrialNum]["currentTrialNum"] = currentTrialNum;
      masterData[totalTrialNum]["imagePath"] = currentImage;

      // var newData = {"userScore": userScore, "totalTrialNum": totalTrialNum,
      // "currentTrialNum": currentTrialNum, "imagePath": currentImage}
  }
  
  // setTimeout(function(){
  //   console.log(masterData)
  //   , 1000
  // })
  //turk.submit(masterData)
  },
  // updates evaluation data
  evaluate: function(trialNum, partNum, denom) {
    showSlide("evaluate")
    $("#numbereval").text(trialNum);
    $("#instructionstype").text(experiment.experimentType);
    $("#partnumeval").text(partNum);
    $("#denomeval").text(denom);
    if (experiment.experimentType == "colorfulness") {
      $("#q1label").text("Not colorful at all");
      $("#q9label").text("Very colorful");
    }
    else {
      $("#q1label").text("Very simple");
      $("#q9label").text("Very complex");
    }
    experiment.submitform();
    clearLikert('likert');
  },
  
  // The work horse of the sequence - what to do on every trial.
  next: function() {
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
      console.log("in next")
      experiment.end();
      return;
    }

    // switches to trial 1
    if (experiment.trials.length == 60 && !canChange) {
      canChange = true;
      showSlide("beginrealtrial");
      return;
    }

    // switches to trial 2
    if (experiment.trials.length == 30 && canChange) {
      canChange = false;
      showSlide("break");
      return;
    }
    //turk.submit(experiment) 
  
    // Get the current trial - <code>shift()</code> removes the first element of the array and returns it.
    totalTrialNum = experiment.trials.shift();
    currentTrialNum = 65 - experiment.trials.length;
    var partNum = 0;
    var denom = 30;
    if (currentTrialNum > 35) { // sets indexing correctly for trial 2
      currentTrialNum = currentTrialNum - 35;
      partNum = 2
    }
    else if (currentTrialNum > 5) { // sets indexing correctly for trial 1
      currentTrialNum = currentTrialNum - 5;
      partNum = 1
    }
    else { // practice trial
      denom = 5
    }
    //console.log("current trial num", currentTrialNum, experiment.trials.length)
    currentImage = imageOrder[totalTrialNum];
    //console.log(currentImage)
    beginTimeout(partNum, currentTrialNum, denom, currentImage);
  }
}
