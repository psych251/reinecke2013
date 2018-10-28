// I'm implementing the experiment using a data structure that I call a **sequence**. The insight behind sequences is that many experiments consist of a sequence of largely homogeneous trials that vary based on a parameter. For instance, in this example experiment, a lot stays the same from trial to trial - we always have to present some number, the subject always has to make a response, and we always want to record that response. Of course, the trials do differ - we're displaying a different number every time. The idea behind the sequence is to separate what stays the same from what differs - to **separate code from data**. This results in **parametric code**, which is much easier to maintain - it's simple to add, remove, or change conditions, do randomization, and do testing.

// ## High-level overview
// Things happen in this order:
// 
// 1. Compute randomization parameters (which keys to press for even/odd and trial order), fill in the template <code>{{}}</code> slots that indicate which keys to press for even/odd, and show the instructions slide.
// 2. Set up the experiment sequence object.
// 3. When the subject clicks the start button, it calls <code>experiment.next()</code>
// 4. <code>experiment.next()</code> checks if there are any trials left to do. If there aren't, it calls <code>experiment.end()</code>, which shows the finish slide, waits for 1.5 seconds, and then uses mmturkey to submit to Turk.
// 5. If there are more trials left, <code>experiment.next()</code> shows the next trial, records the current time for computing reaction time, and sets up a listener for a key press.
// 6. The key press listener, when it detects either a P or a Q, constructs a data object, which includes the presented stimulus number, RT (current time - start time), and whether or not the subject was correct. This entire object gets pushed into the <code>experiment.data</code> array. Then we show a blank screen and wait 500 milliseconds before calling <code>experiment.next()</code> again.

// ## Helper functions

// Shows slides. We're using jQuery here - the **$** is the jQuery selector function, which takes as input either a DOM element or a CSS selector string.
function showSlide(id) {
  // Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
	$("#"+id).show();
}

// Get a random integer less than n.
function randomInteger(n) {
	return Math.floor(Math.random()*n);
}

// Get a random element from an array (e.g., <code>random_element([4,8,7])</code> could return 4, 8, or 7). This is useful for condition randomization.
function randomElement(array) {
  return array[randomInteger(array.length)];
}

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

function getImageForTrials() {
  var englishImagesTrial1 = getImagePaths("english", getRandomIntegers(22, 350));
  var foreignImagesTrial1 = getImagePaths("foreign", getRandomIntegers(4, 60));
  var grayscaleImagesTrial1 = getImagePaths("grayscale", getRandomIntegers(4, 20));
  var practiceImages = getImagePaths("practice", [0, 1, 2, 3, 4]);

  var imagesTrial1 = [].concat(englishImagesTrial1,foreignImagesTrial1, grayscaleImagesTrial1)
  var imagesTrial1_copy = [].concat(imagesTrial1);
  var imagesTrial2_copy = [].concat(imagesTrial1);
  var imagesTrial1 = shuffle(imagesTrial1_copy);
  var imagesTrial2 = shuffle(imagesTrial2_copy);
  return {"trial1": imagesTrial1, "trial2": imagesTrial2, "practice": practiceImages}
}


// ## Configuration settings
var masterData = {}
var myKeyBindings = [
      {"1": 1, "2": 2, "3":3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9}];

var trialNums = Array.apply(null, {length: 65}).map(Number.call, Number);
var randomImages = getImageForTrials()
var imageOrder = (randomImages["practice"]).concat(randomImages["trial1"], randomImages["trial2"]);
console.log(imageOrder)
var experimentOptions = ["colorfulness", "complexity"];
var whichExperiment = randomElement(experimentOptions);

// Show the instructions slide -- this is what we want subjects to see first.
showSlide("instructions");
$("#basicinstructions").text(whichExperiment);

var totalTrialNum = 0;
var currentImage = "";
var canChange = false;
// ## The main event
// I implement the sequence as an object with properties and methods. The benefit of encapsulating everything in an object is that it's conceptually coherent (i.e. the <code>data</code> variable belongs to this particular sequence and not any other) and allows you to **compose** sequences to build more complicated experiments. For instance, if you wanted an experiment with, say, a survey, a reaction time test, and a memory test presented in a number of different orders, you could easily do so by creating three separate sequences and dynamically setting the <code>end()</code> function for each sequence so that it points to the next. **More practically, you should stick everything in an object and submit that whole object so that you don't lose data (e.g. randomization parameters, what condition the subject is in, etc). Don't worry about the fact that some of the object properties are functions -- mmturkey (the Turk submission library) will strip these out.**
var experiment = {
  // Experiment-specific parameters - which keys map to odd/even
  keyBindings: myKeyBindings,
  // An array to store the data that we're collecting.
  data: [],
  trials: trialNums,
  currentTrialNum: 0,
  experimentType: whichExperiment,
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
    setTimeout(function() { turk.submit(experiment) }, 1500);
  },
  showDemographicQuestions: function() {
    showSlide("demographics");
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
  }
  console.log(masterData)
  },
  clearLikert: function() {
    var ids = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"]
    for (var i = 0; i< ids.length; i++){
      document.getElementById(ids[i]).checked = false;
    }
  },
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
    
    experiment.clearLikert();
  },
  // The work horse of the sequence - what to do on every trial.
  next: function() {
    // If the number of remaining trials is 0, we're done, so call the end function.
    if (experiment.trials.length == 0) {
      console.log("in next")
      experiment.end();
      return;
    }

    if (experiment.trials.length == 60 && !canChange) {
      canChange = true;
      showSlide("beginrealtrial");
      return;
    }

    if (experiment.trials.length == 30 && canChange) {
      canChange = false;
      showSlide("break");
      return;
    }
    
    // Get the current trial - <code>shift()</code> removes the first element of the array and returns it.
    totalTrialNum = experiment.trials.shift();
    currentTrialNum = 65 - experiment.trials.length;
    if (currentTrialNum > 35) {
      currentTrialNum = currentTrialNum - 35;
    }
    else if (currentTrialNum > 5) {
      currentTrialNum = currentTrialNum - 5;
    }
    console.log("current trial num", currentTrialNum, experiment.trials.length)
    var partNum = 0;
    var denom = 30;
    if (experiment.trials.length >= 60) {
      denom = 5;
    }
    else if (experiment.trials.length >= 30) {
      partNum = 1;
    }
    else{
      partNum = 2
    }
    currentImage = imageOrder[totalTrialNum];
    showSlide("stage");
    $("#partnum").text(partNum);
    $("#number").text(currentTrialNum);
    $("#denom").text(denom);
    $("#stimulusimage").attr("src", currentImage);
    setTimeout(experiment.evaluate, 500, currentTrialNum, partNum, denom);
  }
}
