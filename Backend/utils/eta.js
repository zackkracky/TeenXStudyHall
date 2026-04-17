const estimateETA = (distance) => {
  const avgSpeed = 30; // km/h
  const time = (distance / avgSpeed) * 60;
  return `${Math.round(time)} mins`;
};

module.exports = { estimateETA };