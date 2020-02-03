var config = {
	tileSize: 29, // 格子大小
	roleSize: 24, // 格子里的角色大小
	time: 0.2, // 动画时长(角色下落位移)
	imgPath: 'res/img/',
};
var control = {
	winWidth: 0,
	winHeight: 0,
	zoom: 1, // 格子的缩放倍数
	mapSize: 9, // 地图大小(正方形, 每行或每列里的格子个数)
	maps: [],
	layerScene: {},
	roles: {},
	firstRole: false, // 第一次点击的格子
	acceptTouch: true, // 是否响应触控事件
	touchListener: {}, // 触控事件
};

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
					var winSize = cc.director.getWinSize();
					var w = winSize.width;
					var h = winSize.height;
					control.winWidth = w;
					control.winHeight = h;

					var now = new Date();
					var hour = now.getHours();
					var color = (hour >= 7 && hour <= 17) ? '#eeeeee' : '#333333';
					// 场景层
					control.layerScene = cc.LayerColor.create(funcColor(color), w, h);
					this.addChild(control.layerScene);

					// 舞台层
					var layerStage = cc.LayerColor.create(funcColor('#dddddd'), w, w);
					layerStage.attr({ y: h / 2 - w / 2 });
					control.layerScene.addChild(layerStage);

					// 格子背景层
					var layerStageBg = cc.Layer.create();
					layerStageBg.attr({
						width: w,
						height: w,
					});
					layerStage.addChild(layerStageBg);

					// 角色层
					var layerStageRole = cc.Layer.create();
					layerStageRole.attr({
						width: w,
						height: w,
					});
					layerStage.addChild(layerStageRole);

					// 计算格子的缩放倍数
					control.zoom = w / control.mapSize / config.tileSize;
					control.zoom = control.zoom.toFixed(2) - 0;

					// 格子的按下事件
					control.touchListener = cc.EventListener.create({
						event: cc.EventListener.TOUCH_ONE_BY_ONE,
						onTouchBegan: function(touch, e) {
							if (!control.acceptTouch) return false;
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

							funcPress(target);
							return true;
						},
					});

					funcInit();

					// 格子的选择框
					var tileBorder = cc.Sprite.create(config.imgPath + 'tileBorder.gif');
					tileBorder.attr({
						scale: control.zoom,
						visible: false
					});
					layerStage.addChild(tileBorder);
				},
				onExit: function() {
					this._super();
					cc.eventManager.removeListener(cc.EventListener.TOUCH_ONE_BY_ONE);
				},
			});
			cc.director.runScene(new sceneMain());
		}, this);
	};
	cc.game.run("gameCanvas");
};

// 初始化所有格子
function funcInit() {
	var maps = control.maps;
	maps = [];
	for (var i = 0; i < control.mapSize; i += 1) {
		maps.push([]);
		for (var j = 0; j < control.mapSize; j += 1) {
			var n = funcRand(6);
			if (
				(i >= 2 && n === maps[i - 1][j][0] && n === maps[i - 2][j][0]) ||
				(j >= 2 && n === maps[i][j - 1][0] && n === maps[i][j - 2][0])
			) {
				n = funcRand(6, n);
			}
			maps[i].push([n, 1]);
		}
	}

	var layer = control.layerScene.children[0];
	control.roles = {};
	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			if (!maps[i][j][1]) continue;

			var num = maps[i][j][0];
			var x = Math.round((config.tileSize * i + config.tileSize / 2) * control.zoom);
			var y = Math.round((config.tileSize * j + config.tileSize / 2) * control.zoom);

			var bg = cc.Sprite.create(config.imgPath + 'tileBg.gif');
			bg.attr({
				x: x,
				y: y,
				scale: control.zoom,
			});
			layer.children[0].addChild(bg);

			var role = cc.Sprite.create(
				config.imgPath + 'roles.png',
				cc.rect(0, num * config.roleSize, config.roleSize, config.roleSize)
			);
			role.attr({
				x: x,
				y: y,
				scale: control.zoom,
				tag: num,
			});
			layer.children[1].addChild(role);
			control.roles[i + '_' + j] = role;
			cc.eventManager.addListener(control.touchListener.clone(), role);
		}
	}
	control.maps = maps;
}

// 格子的按下事件
function funcPress(role) {
	var role0 = control.firstRole;
	var row = Math.round(role.x / control.zoom / config.tileSize);
	var col = Math.round(role.y / control.zoom / config.tileSize);
	var row0 = Math.round(role0.x / control.zoom / config.tileSize);
	var col0 = Math.round(role0.y / control.zoom / config.tileSize);
	// cc.log(row, col, role.tag);

	if (!role0) {
		control.firstRole = role;
		return;
	}
	if (role === role0) return;

	// 是否相邻
	if (
		(row === row0 && (col === col0 - 1 || col === col0 + 1)) ||
		(col === col0 && (row === row0 - 1 || row === row0 + 1))
	) {
			if (role.tag === role0.tag) {
				funcCancel(role);
				return;
			}

			// 临时交换, 方便下面的检测
			var maps = control.maps;
			var tempTag = maps[row][col][0];
			maps[row][col][0] = maps[row0][col0][0];
			maps[row0][col0][0] = tempTag;

			var result = funcCheck();
			if (!result) {
				// 检测到没有连续再换回去
				maps[row0][col0][0] = maps[row][col][0];
				maps[row][col][0] = tempTag;
				funcCancel(role);
				return;
			}

			// 存在连续
			var roles = control.roles;
			var tempRole = roles[row + '_' + col];
			roles[row + '_' + col] = roles[row0 + '_' + col0];
			roles[row0 + '_' + col0] = tempRole;
			funcSwitch(role, funcRemove);
	} else control.firstRole = role;
}

// 取消两个角色位置的交换
function funcCancel(role) {
	var role0 = control.firstRole;
	var border = control.layerScene.children[0].children[2];
	border.attr({ visible: false });
	var time = config.time;
	var x0 = role0.x;
	var y0 = role0.y;
	var x1 = role.x;
	var y1 = role.y;
	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug

	var moveTo0 = cc.MoveTo.create(time, cc.p(x0, y0));
	var moveTo1 = cc.MoveTo.create(time, cc.p(x1, y1));
	role.runAction(moveTo0);
	role.scheduleOnce(function() {
		role.runAction(moveTo1);
	}, time);

	role0.runAction(moveTo1);
	role0.scheduleOnce(function() {
		role0.runAction(moveTo0);
		role0.scheduleOnce(function() {
			control.firstRole = false;
			control.acceptTouch = true; // 恢复触控的响应
		}, time + 0.1);
	}, time);
}

// 交换两个角色的位置
function funcSwitch(role, cb) {
	var role0 = control.firstRole;
	var border = control.layerScene.children[0].children[2];
	border.attr({ visible: false });
	var time = config.time;
	var x0 = role0.x;
	var y0 = role0.y;
	var x1 = role.x;
	var y1 = role.y;
	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug

	var moveTo = cc.MoveTo.create(time, cc.p(x1, y1));
	var callFunc = cc.callFunc(function() {
		control.firstRole = false;
		control.acceptTouch = true; // 恢复触控的响应
		cb();
	});
	var sequ = cc.sequence(moveTo, callFunc);
	role.runAction(cc.MoveTo.create(time, cc.p(x0, y0)));
	role0.runAction(sequ);
}

// 检查是否存在连续, 并予以标记
function funcCheck() {
	var result = false;
	var maps = control.maps;
	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			var cell = maps[i][j];
			if (cell[1] === -1) continue;

			var tag = cell[0];
			if (
				i < maps.length - 2 && maps[i + 1][j] && maps[i + 2][j] &&
				tag === maps[i + 1][j][0] && tag === maps[i + 2][j][0]
			) {
				result = true;
				// 打上移除标记
				cell[1] = -1;
				maps[i + 1][j][1] = -1;
				maps[i + 2][j][1] = -1;
			}
			if (
				j < maps[i].length - 2 && maps[i][j + 1] && maps[i][j + 2] &&
				tag === maps[i][j + 1][0] && tag === maps[i][j + 2][0]
			) {
				result = true;
				cell[1] = -1;
				maps[i][j + 1][1] = -1;
				maps[i][j + 2][1] = -1;
			}
		}
	}

	return result;
}

// 移除连续的格子(带有移除标记的格子)
function funcRemove() {
	var maps = control.maps;
	var roles = control.roles;
	var layer = control.layerScene.children[0];

	// 移除roles
	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			if (maps[i][j][1] === -1) {
				var role = roles[i + '_' + j];
				layer.children[1].removeChild(role);
				delete roles[i + '_' + j];
			}
		}
	}

	// 移除后要将浮空的角色落地
	var time = config.time;
	var distance = 0, distanceMax = 0;
	for (var i = 0; i < maps.length; i += 1) {
		var x = Math.round((config.tileSize * i + config.tileSize / 2) * control.zoom);
		var y = Math.round(config.tileSize / 2 * control.zoom);
		distance = 0;

		for (var j = 0; j < maps[i].length; j += 1) {
			if (maps[i][j][1] === -1) {
				distance += 1;
				distanceMax = distance;
			} else if (distance) {
				y = Math.round((config.tileSize * (j - distance) + config.tileSize / 2) * control.zoom);
				var role = roles[i + '_' + j];
				if (!role) continue;

				roles[i + '_' + (j - distance)] = role;
				layer.children[1].removeChild(role);
				delete roles[i + '_' + j];
				var role1 = roles[i + '_' + (j - distance)];
				layer.children[1].addChild(role1);
				cc.eventManager.addListener(control.touchListener.clone(), role1);
				role1.runAction(cc.MoveTo.create(time * distance, cc.p(x, y)));
			}
		}
	}

	// 移除maps
	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			if (maps[i][j][1] === -1) {
				maps[i].splice(j, 1);
				j = -1; // 数组内容移除后需要重头再次检查有无连续的格子
			}
		}
	}

	// 移除后检查是否存在连续的格子
	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug
	layer.scheduleOnce(function() {
		control.acceptTouch = true; // 恢复触控的响应
		var result = funcCheck();
		if (result) funcRemove();
		else funcFill();
	}, time * distanceMax);
}

// 移除后需要补满
function funcFill() {
	var maps = control.maps;
	var roles = control.roles;
	var layer = control.layerScene.children[0];
	var time = config.time, tileSize = config.tileSize;
	var mapSize = control.mapSize, zoom = control.zoom;
	var distance = 0, distanceMax = 0;

	for (var i = 0; i < maps.length; i += 1) {
		for (var j = maps[i].length; j < control.mapSize; j += 1) {
			var num = funcRand(6);
			maps[i].push([num, 1]);

			var x = Math.round((tileSize * i + tileSize / 2) * zoom);
			var y = Math.round((tileSize * (mapSize - j + mapSize - 1) + tileSize / 2) * zoom);

			var role = cc.Sprite.create(
				config.imgPath + 'roles.png',
				cc.rect(0, num * config.roleSize, config.roleSize, config.roleSize)
			);
			role.attr({
				x: x,
				y: y,
				scale: control.zoom,
				tag: num,
			});
			layer.children[1].addChild(role);
			control.roles[i + '_' + j] = role;
			cc.eventManager.addListener(control.touchListener.clone(), role);
			role.runAction(cc.MoveTo.create(time * distance, cc.p(x, y)));
		}
	}

	// 补满后检查是否存在连续的格子
	var result = funcCheck();
	if (result) funcRemove();
}
