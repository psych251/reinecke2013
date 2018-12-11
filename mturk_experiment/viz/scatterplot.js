var margin = {top: 20, right: 20, bottom: 50, left: 50},
    width = 500 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var preloadedImages = new Array()
function preload(imageUrlArray) {
    for (i = 0; i < imageUrlArray.length; i++) {
        preloadedImages[i] = new Image()
        preloadedImages[i].src = imageUrlArray[i]
    }
}

function getImagePath(imageName) {
  var imagePath = 'https://web.stanford.edu/~mleake/psych251/mturk_experiment/website_stimuli/'
  //var imagePath = '/website_stimuli/'

  imagePath += imageName.replace("_", "/")
  imagePath += '.png'
  return imagePath
}

function computeRegressionLine(data) {
    var x = [];
    var y = [];
    var n = 282;
    var x_mean = 0;
    var y_mean = 0;
    var term1 = 0;
    var term2 = 0;

    // create x and y values
    for (var i = 0; i < n; i++) {
        y.push(data[i].userScore);
        x.push(data[i].imageScore);
        x_mean += x[i]
        y_mean += y[i]
    }
    // calculate mean x and y
    x_mean /= n;
    y_mean /= n;

    // calculate coefficients
    var xr = 0;
    var yr = 0;
    for (i = 0; i < x.length; i++) {
        xr = x[i] - x_mean;
        yr = y[i] - y_mean;
        term1 += xr * yr;
        term2 += xr * xr;

    }
    var b1 = term1 / term2;
    var b0 = y_mean - (b1 * x_mean);
    // perform regression 

    yhat = [];
    // fit line using coeffs
    for (i = 0; i < x.length; i++) {
        yhat.push(b0 + (x[i] * b1));
    }
    return yhat
  }


/* 
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */ 

// setup x 
var xValue = function(d) { return d.imageScore;}, // data -> value
    xScale = d3.scaleLinear().range([0, width]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}, // data -> display
    xAxis = d3.axisBottom(xScale);

// setup y
var yValue = function(d) { return d.userScore;}, // data -> value
    yScale = d3.scaleLinear().range([height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}, // data -> display
    yAxis = d3.axisLeft(yScale);

// add the graph canvas to the body of the webpage
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

// add the tooltip area to the webpage
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


// load data
d3.json("websitedata.json", function(error, data) {
  yhat = computeRegressionLine(data)
  var allData = []
  var allImages = []
  // change string (from CSV) into number format
  data.forEach(function(d, i) {
    d.websiteName = d.websiteName;
    d.userScore = +d.userScore;
    d.imageScore = +d.imageScore
    d.yhat = yhat[i]
    allData.push(d)
    allImages.push(getImagePath(d.websiteName))
//    console.log(d);
  });

  preload(allImages);
  // don't want dots overlapping axis, so add in buffer to data domain
  xScale.domain([1, 9]);
  yScale.domain([1, 9]);

  

  // x-axis
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
  
  // text label for the x axis
  svg.append("text")             
      .attr("transform",
            "translate(" + (width/2) + " ," + 
                           (height + margin.top + 20) + ")")
      .style("text-anchor", "middle")
      .text("predicted colorfulness ratings");


  // y-axis
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
  
  // text label for the y axis
  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("observed colorfulness ratings");      

  var lineFunction = d3.line()
  .x(function(d) { return xScale(d.imageScore) })
  .y(function(d) { return yScale(d.yhat)})

  var lineGraph = svg.append("path")
    .attr("d", lineFunction(allData))
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  //draw dots
  svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", xMap)
      .attr("cy", yMap)
      .on("mouseover", function(d) {
          tooltip.transition()
               .duration(200)
               .style("opacity", .9);
         //  tooltip.html(d.websiteName + "<br/> (" + xValue(d) 
	        // + ", " + yValue(d) + ")")
         //       .style("left", (d3.event.pageX + 5) + "px")
         //       .style("top", (d3.event.pageY - 28) + "px");

          tooltip.html("<img style = 'width: 200px' class = 'tooltipimage' src = '"+ getImagePath(d.websiteName) +"'</img>")
          .style("left", (d3.event.pageX + 5) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
          tooltip.transition()
               .duration(500)
               .style("opacity", 0);
      });
    })
