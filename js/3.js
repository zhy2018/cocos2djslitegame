var runMode = 'debug'; // 运行模式: debug / formal
var cellSize = 32;
var rowLength = 9;
var colors = ['#1890ff', '#52c41a', '#8B4513', '#800080', '#f5222d', '#faad14'];
var colors2 = ['#91d5ff', '#b7eb8f', '#FF7F50', '#FF00FF', '#ffa39e', '#ffe58f'];
var arr = [], arr2 = [];
var firstCell = false; // 第一次点击的格子
var stage, cells = [];
var winSize = { width: 0, height: 0 };

window.onload = function() {
  cc.game.onStart = function() {
    cc.view.adjustViewPort(true);
    cc.view.setDesignResolutionSize(720, 1280, cc.ResolutionPolicy.SHOW_ALL);
    cc.view.resizeWithBrowserSize(true);

    // load resources
    cc.LoaderScene.preload([], function () {
      var MyScene = cc.Scene.extend({
        onEnter: function () {
          this._super();
          this.scheduleUpdate();
          winSize = cc.director.getWinSize();
					stage = cc.LayerColor.create(
            cc.color(255, 255, 255, 40),
            winSize.width,
            winSize.width
          );
          stage.attr({
            y: winSize.height / 2 - winSize.width / 2,
          });
          this.addChild(stage);
          
          funcCellInit();
          funcCellPress();
        },
				onExit: function() {
					this._super();
					cc.eventManager.removeListener(cc.EventListener.TOUCH_ONE_BY_ONE);
				},
				update: funcRun
      });
      cc.director.runScene(new MyScene());
    }, this);
  };
  cc.game.run("gameCanvas");
};

// 实时运行
function funcRun() {}

// 初始化所有格子
function funcCellInit() {
  arr = [];
  for (var i = 0; i < rowLength; i += 1) {
    arr.push([]);
    for (var j = 0; j < rowLength; j += 1) {
      var num = funcRand(6);
      if (
        (i >= 2 && num === arr[i - 1][j] && num === arr[i - 2][j]) ||
        (j >= 2 && num === arr[i][j - 1] && num === arr[i][j - 2])
      ) {
        num = funcRand(6, num);
      }
      arr[i].push(num);
    }
  }
  rowLength = (arr.length) ? arr[0].length : rowLength;
  arr2 = [];
  for (var i = 0; i < arr.length; i += 1) {
    arr2.push([]);
    for (var j = 0; j < arr[i].length; j += 1) {
      var num = arr[i][j];
      arr2[i].push([num, 0]);
    }
  }

  cellSize = parseInt(winSize.width / rowLength);
  for (var i = 0; i < arr.length; i += 1) {
    for (var j = 0; j < arr[i].length; j += 1) {
      var num = arr[i][j];
      var cell = cc.LayerColor.create(
        funcColor(colors[num]),
        cellSize - 8,
        cellSize - 8
      );
      cell.attr({
        x: cellSize * i,
        y: cellSize * j,
      });
      stage.addChild(cell);
      cells.push(cell);
    }
  }
}

// 格子的按下事件
function funcCellPress() {
	cc.eventManager.addListener({
		event: cc.EventListener.TOUCH_ONE_BY_ONE,
		onTouchBegan: function(touch, evt) {
			var target = evt.getCurrentTarget();
			if (target != stage) return false;

			var loc  = target.convertToNodeSpace(touch.getLocation());
			var size = target.getContentSize();
			var rect = cc.rect(0, 0, size.width, size.height);
			if (!cc.rectContainsPoint(rect, loc)) return false;

      var row = parseInt(loc.y / cellSize);
      var col = parseInt(loc.x / cellSize);
      console.log(row, col);
			return true;
		},
		onTouchEnded: function(touch, evt) {
			var target = evt.getCurrentTarget();
			if (target != stage) return false;

			return true;
		}
	}, stage);
  
  return;
  var otherDom = document.getElementsByClassName('cellCurrent');
  if (otherDom.length) {
    otherDom[0].classList.remove('cellCurrent');
  }
  dom.classList.add('cellCurrent');
  if (!firstCell) {
    // 第一次点击
    firstCell = dom;
  } else {
    // 第二次点击
    dom.classList.remove('cellCurrent');
    var secondCell = dom;
    // 判断是否相邻
    if (
      (
        firstCell.offsetLeft === secondCell.offsetLeft &&
        (
          firstCell.offsetTop + cellSize === secondCell.offsetTop ||
          firstCell.offsetTop - cellSize === secondCell.offsetTop
        )
      ) ||
      (
        firstCell.offsetTop === secondCell.offsetTop &&
        (
          firstCell.offsetLeft + cellSize === secondCell.offsetLeft ||
          firstCell.offsetLeft - cellSize === secondCell.offsetLeft
        )
      )
    ) {
      // 相邻
      funcCellSwitch(secondCell, function() {
        var first = {
          top: firstCell.offsetTop / cellSize,
          left: firstCell.offsetLeft / cellSize
        };
        var second = {
          top: secondCell.offsetTop / cellSize,
          left: secondCell.offsetLeft / cellSize
        };

        var temp = arr[first.top][first.left];
        arr[first.top][first.left] = arr[second.top][second.left];
        arr[second.top][second.left] = temp;
        arr2[first.top][first.left][0] = arr2[second.top][second.left][0];
        arr2[second.top][second.left][0] = temp;

        // 判断是否连续
        if (funcCheckContinuous()) {
          // 连续
          // dom置换
          firstCell.style.transitionDuration = '0s';
          secondCell.style.transitionDuration = '0s';
          temp = firstCell.textContent;
          firstCell.textContent = secondCell.textContent;
          secondCell.textContent = temp;
          temp = firstCell.style.color;
          firstCell.style.color = secondCell.style.color;
          secondCell.style.color = temp;
          temp = firstCell.style.background;
          firstCell.style.background = secondCell.style.background;
          secondCell.style.background = temp;
          temp = firstCell.style.top;
          firstCell.style.top = secondCell.style.top;
          secondCell.style.top = temp;
          temp = firstCell.style.left;
          firstCell.style.left = secondCell.style.left;
          secondCell.style.left = temp;
          setTimeout(function () {
            firstCell.style.transitionDuration = '';
            secondCell.style.transitionDuration = '';
            firstCell = false;
            funcCellRemove();
          }, 16);
        } else {
          // 不连续
          setTimeout(function() {
            funcCellSwitch(secondCell);
            temp = arr[first.top][first.left];
            arr[first.top][first.left] = arr[second.top][second.left];
            arr[second.top][second.left] = temp;
            arr2[first.top][first.left][0] = arr2[second.top][second.left][0];
            arr2[second.top][second.left][0] = temp;
            firstCell = false;
          }, 200);
        }
      });
    } else {
      // 不相邻
      firstCell = false;
    }
  }
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

