var tileSize = 29; // 格子大小
var roleSize = 24; // 格子里的角色大小
var mapSize = 9; // 地图大小(正方形, 每行或每列里的格子个数)
var zoomMult = 1; // 格子的缩放倍数
var imgPath = 'res/img/';
var colors = ['#1890ff', '#52c41a', '#8B4513', '#800080', '#f5222d', '#faad14'];
var colors2 = ['#91d5ff', '#b7eb8f', '#FF7F50', '#FF00FF', '#ffa39e', '#ffe58f'];
var roleMap = [];
var roles = [];
var firstRole = false; // 第一次点击的格子
var winWidth = 0, winHeight = 0;
var layerScene;

// 执行入口
window.onload = function() {
	cc.game.onStart = function() {
    cc.view.adjustViewPort(true);
    cc.view.setDesignResolutionSize(720, 1280, cc.ResolutionPolicy.SHOW_ALL);
    cc.view.resizeWithBrowserSize(true);

		cc.LoaderScene.preload([], function() {
			var sceneMain = cc.Scene.extend({
				onEnter: function() {
					this._super();
          this.scheduleUpdate();
          var winSize = cc.director.getWinSize();
					winWidth = winSize.width;
					winHeight = winSize.height;

					var now = new Date();
					var hour = now.getHours();
					var color = (hour >= 7 && hour <= 17) ? '#eeeeee' : '#333333';
					// 场景层
					layerScene = cc.LayerColor.create(funcColor(color), winWidth, winHeight);
					this.addChild(layerScene);

					// 舞台层
					var layerStage = cc.LayerColor.create(funcColor('#dddddd'), winWidth, winWidth);
					layerStage.attr({
            y: winHeight / 2 - winWidth / 2,
					});
					layerScene.addChild(layerStage);

					// 格子背景层
					var layerStageBg = cc.Layer.create();
					layerStageBg.attr({
						width: winWidth,
						height: winHeight,
					});
					layerStage.addChild(layerStageBg);

					// 角色层
					var layerStageRole = cc.Layer.create();
					layerStageRole.attr({
						width: winWidth,
						height: winHeight,
					});
					layerStageRole.setName('role');
					layerStage.addChild(layerStageRole);

					// 计算格子的缩放倍数
					zoomMult = winWidth / mapSize / tileSize;
					zoomMult = zoomMult.toFixed(2) - 0;

					// 格子的按下事件
					var listener = cc.EventListener.create({
						event: cc.EventListener.TOUCH_ONE_BY_ONE,
						onTouchBegan: function(touch, e) {
							var target = e.getCurrentTarget();
							var loc  = target.convertToNodeSpace(touch.getLocation());
							var size = target.getContentSize();
							var rect = cc.rect(0, 0, size.width, size.height);
							if (!cc.rectContainsPoint(rect, loc)) return false;

							tileBorder.attr({
								x: target.x,
								y: target.y,
								visible: true,
							});

							funcCellPress(target);
							return true;
						},
					});

					funcInitCell(listener);

					// 格子的选择框
					var tileBorder = cc.Sprite.create(imgPath + 'tileBorder.gif');
					tileBorder.attr({
						scale: zoomMult,
						visible: false
					});
					layerStage.addChild(tileBorder);
				},
				onExit: function() {
					this._super();
					cc.eventManager.removeListener(cc.EventListener.TOUCH_ONE_BY_ONE);
				},
				update: funcRun,
			});
			cc.director.runScene(new sceneMain());
		}, this);
	};
	cc.game.run("gameCanvas");
};

// 初始化所有格子
function funcInitCell(listener) {
  roleMap = [];
  for (var i = 0; i < mapSize; i += 1) {
    roleMap.push([]);
    for (var j = 0; j < mapSize; j += 1) {
      var n = funcRand(6);
      if (
        (i >= 2 && n === roleMap[i - 1][j][0] && n === roleMap[i - 2][j][0]) ||
        (j >= 2 && n === roleMap[i][j - 1][0] && n === roleMap[i][j - 2][0])
      ) {
        n = funcRand(6, n);
      }
      roleMap[i].push([n, 1]);
    }
  }

	roles = [];
	var layer = layerScene.children[0];
  for (var i = 0; i < roleMap.length; i += 1) {
		roles.push([]);
    for (var j = 0; j < roleMap[i].length; j += 1) {
			if (!roleMap[i][j][1]) continue;

      var num = roleMap[i][j][0];
			var x = (tileSize * j + tileSize / 2) * zoomMult;
			var y = (tileSize * i + tileSize / 2) * zoomMult;

			var bg = cc.Sprite.create(imgPath + 'tileBg.gif');
			bg.attr({
				x: x,
				y: y,
				scale: zoomMult,
			});
			layer.children[0].addChild(bg);

      var role = cc.Sprite.create(
				imgPath + 'roles.png',
				cc.rect(0, num * roleSize, roleSize, roleSize)
			);
      role.attr({
        x: x,
        y: y,
				scale: zoomMult,
				tag: num,
				row: i,
				col: j,
      });
      layer.children[1].addChild(role);
			roles[i].push(role);
			cc.eventManager.addListener(listener.clone(), role);
    }
  }
}

// 格子的按下事件
function funcCellPress(role) {
	if (!firstRole) {
		firstRole = role;
		return;
	}

	if (role === firstRole) return;
	cc.log(role.row, role.col, role.tag);

	// 是否相邻
	if (
		(role.row === firstRole.row && (role.col === firstRole.col - 1 || role.col === firstRole.col + 1)) ||
		(role.col === firstRole.col && (role.row === firstRole.row - 1 || role.row === firstRole.row + 1))
	) {
			if (role.tag === firstRole.tag) {
				funcCancel(role);
				return;
			}
	} else firstRole = role;
}

// 取消两个格子位置的交换
function funcCancel(role) {
	var border = layerScene.children[0].children[2];
	border.attr({ visible: false });
	var time = 0.2;
	var x0 = firstRole.x;
	var y0 = firstRole.y;
	var x1 = role.x;
	var y1 = role.y;

	role.runAction(cc.MoveTo.create(time, cc.p(x0, y0)));
	role.scheduleOnce(function() {
		role.runAction(cc.MoveTo.create(time, cc.p(x1, y1)));
		role.scheduleOnce(function() {
			role.attr({ x: x1, y: y1 });
		}, time + 0.1);
	}, time);

	firstRole.runAction(cc.MoveTo.create(time, cc.p(x1, y1)));
	firstRole.scheduleOnce(function() {
		firstRole.runAction(cc.MoveTo.create(time, cc.p(x0, y0)));
		firstRole.scheduleOnce(function() {
			firstRole.attr({ x: x0, y: y0 });
			firstRole = false;
		}, time + 0.1);
	}, time);
}

// 实时运行
function funcRun() {}

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
