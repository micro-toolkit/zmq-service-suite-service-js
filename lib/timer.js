function startTimer(){
  return process.hrtime();
}

function elapsedTime(start){
  // divide by a million to get from nano to milli
  var elapsed = process.hrtime(start)[1] / 1000000;
  // 3 decimal places
  return parseFloat(elapsed.toFixed(3));
}

module.exports = {
  start: startTimer,
  time: elapsedTime
}
