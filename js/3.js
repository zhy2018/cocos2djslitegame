var config = {
	tileSize: 29, // 格子大小
	roleSize: 24, // 格子里的角色大小
	mapSizeLimit: 9, // 地图大小的上限
	time: 0.2, // 动画时长(角色下落位移)
	imgPath: 'assets/resources/img/',
	jsonPath: 'assets/resources/json/',
};
var control = {
	winWidth: 0,
	winHeight: 0,
	zoom: 1, // 格子的缩放倍数
	mapSize: 9, // 地图大小(正方形, 每行或每列里的格子个数)
	maps: [],
	layerScene: {},
	roles: {},
	roleNum: 4,
	firstRole: false, // 第一次点击的格子(首次, 之前的)
	currentRole: false, // 第二次点击的格子(当前的)
	acceptTouch: true, // 是否响应触控事件
	touchListener: {}, // 触控事件
	stageNum: 1,
	stageData: {},
};
var res = {
	roles: config.imgPath + 'roles.png',
	tileBg: config.imgPath + 'tileBg.gif',
	tileBorder: config.imgPath + 'tileBorder.gif',
	stage: config.jsonPath + 'stage.json',
};

// 执行入口
window.onload = function() {
	cc.game.onStart = function() {
		cc.view.adjustViewPort(true);
		cc.view.resizeWithBrowserSize(true);
		var w = window.innerWidth;
		var h = window.innerHeight;
		cc.view.setDesignResolutionSize(w < h ? w : h, h > w ? h : w, cc.ResolutionPolicy.SHOW_ALL);

		var resData = [];
		for (var i in res) {
			resData.push(res[i]);
		}

		cc.LoaderScene.preload(resData, function() {
			var sceneMain = cc.Scene.extend({
				onEnter: function() {
					this._super();
					var winSize = cc.director.getWinSize();
					w = winSize.width;
					h = winSize.height;
					control.winWidth = w;
					control.winHeight = h;

					// 计算格子的缩放倍数
					control.zoom = w / config.mapSizeLimit / config.tileSize;
					control.zoom = control.zoom.toFixed(2) - 0;

					var now = new Date();
					var hour = now.getHours();
					var color = (hour >= 7 && hour <= 17) ? '#eeeeee' : '#333333';
					document.body.style.backgroundColor = color;

					// 场景层
					control.layerScene = cc.LayerColor.create(funcColor(color), w, h);
					this.addChild(control.layerScene);

					// 舞台层
					color = (hour >= 7 && hour <= 17) ? '#dddddd' : '#444444';
					var layerStage = cc.LayerColor.create(funcColor(color), w, w);
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

					// 格子的选择框
					var tileBorder = cc.Sprite.create(res.tileBorder);
					tileBorder.attr({
						scale: control.zoom,
						visible: false
					});
					layerStage.addChild(tileBorder);

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

							control.currentRole = target;
							funcPress();
							return true;
						},
					});

					// 加载关卡数据
					cc.loader.loadJson(res.stage, function(_, data) {
						control.stageData = data;
						funcInit();
					});
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
	var data = control.stageData[control.stageNum];
	if (data) control.maps = data.map || [];
	else control.maps = [];
	var maps = control.maps;

	if (maps.length === 0) {
		// 生成一张随机地图
		for (var i = 0; i < control.mapSize; i += 1) {
			maps.push([]);
			for (var j = 0; j < control.mapSize; j += 1) {
				var n = funcRand(control.roleNum);
				if (
					(i >= 2 && n === maps[i - 1][j][0] && n === maps[i - 2][j][0]) ||
					(j >= 2 && n === maps[i][j - 1][0] && n === maps[i][j - 2][0]) ||
					(i >= 1 && j >= 1 && n === maps[i - 1][j][0] && n === maps[i][j - 1][0] && n === maps[i - 1][j - 1][0])
				) {
					n = funcRand(control.roleNum, n);
				}
				maps[i].push([n, 1]);
			}
		}
	} else {
		control.mapSize = maps.length;
		var newMap = [];
		for (var i = 0; i < maps.length; i += 1) {
			newMap.push([]);
			for (var j = 0; j < maps[i].length; j += 1) {
				var n = maps[i][j] - 0;
				newMap[i].push([n, 1]);
			}
		}
		maps = newMap;
	}

	control.roles = {};
	var layer = control.layerScene.children[0];
	layer.children[0].removeAllChildren();
	layer.children[1].removeAllChildren();

	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			if (!maps[i][j][1]) continue;

			var num = maps[i][j][0];
			var x = Math.round((config.tileSize * i + config.tileSize / 2) * control.zoom);
			var y = Math.round((config.tileSize * j + config.tileSize / 2) * control.zoom);

			var bg = cc.Sprite.create(res.tileBg);
			bg.attr({
				x: x,
				y: y,
				scale: control.zoom,
			});
			layer.children[0].addChild(bg);

			var role = cc.Sprite.create(
				res.roles,
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
function funcPress() {
	var role = control.currentRole;
	var role0 = control.firstRole;
	var row = parseInt(role.x / control.zoom / config.tileSize);
	var col = parseInt(role.y / control.zoom / config.tileSize);
	var row0 = parseInt(role0.x / control.zoom / config.tileSize);
	var col0 = parseInt(role0.y / control.zoom / config.tileSize);
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
			var temp = maps[row][col];
			maps[row][col] = maps[row0][col0];
			maps[row0][col0] = temp;

			var result = funcCheck();
			if (!result) {
				// 检测到没有连续再换回去
				maps[row0][col0] = maps[row][col];
				maps[row][col] = temp;
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

	var moveTo0 = cc.moveTo(time, cc.p(x0, y0));
	var moveTo1 = cc.moveTo(time, cc.p(x1, y1));
	role.runAction(moveTo0);
	role.scheduleOnce(function() {
		role.runAction(moveTo1);
	}, time);

	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug
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
	var callFunc = cc.callFunc(function() {
		cb();
		control.firstRole = false;
		control.acceptTouch = true; // 恢复触控的响应
	});
	var moveTo = cc.moveTo(time, cc.p(x1, y1));
	var sequ = cc.sequence(moveTo, callFunc);
	role.runAction(cc.moveTo(time, cc.p(x0, y0)));
	role0.runAction(sequ);
}

// 检查是否存在连续, 并予以标记
function funcCheck() {
	var result = false;
	var maps = control.maps;
	var roleSize = config.roleSize;
	var role = control.currentRole;
	var row = parseInt(role.x / control.zoom / config.tileSize);
	var col = parseInt(role.y / control.zoom / config.tileSize);
	var role0 = control.firstRole;
	var row0 = -1;
	var col0 = -1;
	if (role0) {
		row0 = parseInt(role0.x / control.zoom / config.tileSize);
		col0 = parseInt(role0.y / control.zoom / config.tileSize);
	}

	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			var cell = maps[i][j];
			if (cell[1] === -1) continue;

			// 格子类型: 1正常, －1移除, -2横向贯穿, -3纵向贯穿, -4九格炸弹, -5吸走

			// 横向检查
			var items = [[i, j]];
			for (var k = 1; k <= 4; k += 1) {
				if (maps[i + k] && maps[i + k][j] && cell[0] === maps[i + k][j][0])
					items.push([i + k, j]);
				else break;
			}

			// 纵向检查
			if (items.length === 1) {
				for (var k = 1; k <= 4; k += 1) {
					if (maps[i][j + k] && cell[0] === maps[i][j + k][0])
						items.push([i, j + k]);
					else break;
				}
			}

			if (items.length >= 3) {
				result = true;
				for (var l = 0; l < items.length; l += 1) {
					var item = items[l];
					maps[item[0]][item[1]][1] = -1; // 打上移除标记
				}
			}

		}
	}

	return result;
}

// 移除连续的格子(带有移除标记的格子)
function funcRemove() {
	var maps = control.maps, roles = control.roles, zoom = control.zoom;
	var layer = control.layerScene.children[0];
	var time = config.time, roleSize = config.roleSize;

	// 移除的动画
	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			if (maps[i][j][1] >= 1) continue;

			// 只对标记为负数的格子做移除动画
			var role = roles[i + '_' + j];
			role.zIndex = 1;
			role.setTextureRect(cc.rect(roleSize * 2, roleSize * maps[i][j][0], roleSize, roleSize));
			var scaleToBig = cc.scaleTo(time, zoom * 1.5);
			var fadeOut = cc.fadeOut(time);
			var spawn = cc.spawn(scaleToBig, fadeOut);
			role.runAction(spawn);
		}
	}

	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug
	layer.scheduleOnce(function() {
		control.acceptTouch = true; // 恢复触控的响应

		for (var i = 0; i < maps.length; i += 1) {
			for (var j = 0; j < maps[i].length; j += 1) {
				var role = roles[i + '_' + j];
				var cell = maps[i][j];
				switch (cell[1]) {
					case -1:
						// 移除实体
						layer.children[1].removeChild(role);
						delete roles[i + '_' + j];
						break;
					case -2:
						// 横向贯穿
					case -3:
						// 纵向贯穿
					case -4:
						// 九格炸弹
					case -5:
						// 吸走
						cell[1] = Math.abs(cell[1]);
						funcAddAnimation(role, cell[1]);
						break;
					default:
						break;
				}
			}
		}

		funcFall();
	}, time + 0.1);
}

// 移除后要将浮空的角色落地
function funcFall() {
	var maps = control.maps, zoom = control.zoom;
	var roles = control.roles;
	var layer = control.layerScene.children[0];
	var time = config.time, tileSize = config.tileSize;
	var distance = 0;

	for (var i = 0; i < maps.length; i += 1) {
		var x = Math.round((tileSize * i + tileSize / 2) * zoom);
		var y = Math.round(tileSize / 2 * zoom);
		distance = 0;

		for (var j = 0; j < maps[i].length; j += 1) {
			var cell = maps[i][j];
			if (cell[1] === -1) distance += 1;
			else if (distance) {
				y = Math.round((tileSize * (j - distance) + tileSize / 2) * zoom);
				var role = roles[i + '_' + j];
				if (!role) continue;

				roles[i + '_' + (j - distance)] = role;
				layer.children[1].removeChild(role);
				delete roles[i + '_' + j];
				var role1 = roles[i + '_' + (j - distance)];
				layer.children[1].addChild(role1);
				cc.eventManager.addListener(control.touchListener.clone(), role1);
				role1.runAction(cc.moveTo(time * distance, cc.p(x, y)));

				if (cell[1] >= 2 && cell[1] <= 5)
					funcAddAnimation(role1, cell[1], time * distance);
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
	}, time);
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
		distance = mapSize - maps[i].length;
		if (distance > distanceMax) distanceMax = distance;
		for (var j = maps[i].length, k = 0; j < mapSize; j += 1, k += 1) {
			var num = funcRand(control.roleNum);
			maps[i].push([num, 1]);

			var x = Math.round((tileSize * i + tileSize / 2) * zoom);
			var y0 = Math.round((tileSize * (mapSize + k) + tileSize / 2) * zoom);
			var y1 = Math.round((tileSize * j + tileSize / 2) * zoom);

			var role = cc.Sprite.create(
				res.roles,
				cc.rect(0, num * config.roleSize, config.roleSize, config.roleSize)
			);
			role.attr({
				x: x,
				y: y0,
				scale: zoom,
				tag: num,
			});
			layer.children[1].addChild(role);
			control.roles[i + '_' + j] = role;
			cc.eventManager.addListener(control.touchListener.clone(), role);
			role.runAction(cc.moveTo(time * distance, cc.p(x, y1)));
		}
	}

	// 补满后检查是否存在连续的格子
	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug
	layer.scheduleOnce(function() {
		control.acceptTouch = true; // 恢复触控的响应
		var result = funcCheck();
		if (result) funcRemove();
	}, time * distanceMax);
}

// 给特殊格子加上动画
function funcAddAnimation(role, roleType, afterTime) {
	if (!role) return;

	var roleSize = config.roleSize, time = config.time;
	var layer = control.layerScene.children[0];
	var zoom = control.zoom;

	layer.scheduleOnce(function() {
		role.opacity = 255;
		role.scale = zoom;
		role.setTextureRect(cc.rect(roleSize, roleSize * role.tag, roleSize, roleSize));
		var act = false;

		if (roleType === 4 || roleType === 5) {
			var scaleToBig = cc.scaleTo(time * 2, zoom * 1.1);
			var scaleToSmall = cc.scaleTo(time * 2, zoom * 0.9);
			var sequ = cc.sequence(scaleToBig, scaleToSmall);

			if (roleType === 4) {
				act = cc.repeatForever(sequ);
			} else {
				var rotate = cc.rotateTo(time * 2, 360);
				var spawn = cc.spawn(sequ, rotate);
				act = cc.repeatForever(spawn);
			}
		}

		if (act) role.runAction(act);

	}, afterTime || 0);
}

// 炸弹格子, 2整行消除, 3整列消除, 4小范围炸弹, 5黑洞
function funcBomb(type, row) {
	var maps = control.maps;

	switch (type) {
		case 2:
			// 2整行消除
			for (var i = 0; i < maps.length; i += 1) {
				if (maps[i][row][1] === 1) maps[i][row][1] = -1;
			}
			break;
		case 3:
			// 3整列消除
			for (var i = 0; i < maps[row].length; i += 1) {
				if (maps[row][i][1] === 1) maps[row][i][1] = -1;
			}
			break;
		case 4:
			// 4小范围炸弹
			for (var i = row - 1; i <= row + 1; i += 1) {
				for (var j = col - 1; j <= col + 1; j += 1) {
					if (maps[i][j][1] === 1) maps[i][j][1] = -1;
				}
			}
			break;
		default:
			// 5黑洞
			break;
	}
}
