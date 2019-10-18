// 刻隆对象
function funcObjectClone(object) {
  var obj = {};
  for (var i in object) {
    obj[i] = object[i];
  }
  return obj;
}
