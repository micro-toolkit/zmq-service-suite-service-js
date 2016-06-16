function startTimer(){
  return process.hrtime();
}

function elapsedTime(start){
  // divide by a million to get from nano to milli
  var elapsed = process.hrtime(start);
  var inMillis = (elapsed[0]*1000) + (elapsed[1] / 1000000);
  // 3 decimal places
  return parseFloat(inMillis.toFixed(3));
}

module.exports = {
  start: startTimer,
  time: elapsedTime
}
