// 刻隆对象
function funcObjectClone(object) {
  var obj = {};
  for (var i in object) {
    obj[i] = object[i];
  }
  return obj;
}

// 根据16进制生成rgb颜色
function funcColor(colorString) {
  var rgb = [];
  for (var i = 1; i <= 5; i += 2) {
    var color = '0x' + colorString.substr(i, 2) - 0;
    rgb.push(color);
  }
  return cc.color(rgb[0], rgb[1], rgb[2], 255);
}

// 生成一个0到n-1的随机正整数, 第二个参数是需要排除的一个数字
function funcRand(n, excludeNum) {
  var num = 0;
  for (var i = 0; i < 1000; i += 1) {
    num = parseInt(Math.random() * n);
    if (num !== excludeNum) break;
  }
  return num;
}
