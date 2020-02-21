var config = {
	tileSize: 29, // 格子大小
	roleSize: 24, // 格子里的角色大小
	mapSizeLimit: 9, // 地图大小的上限
	time: 0.2, // 动画时长(角色下落位移)
	imgPath: 'assets/resources/img/',
	jsonPath: 'assets/resources/json/',
	hpLine: 256,
	hpLimit: 1024,
	hpStep: 16,
	mpLimit: 32,
	mpStep: 1,
	dpLimit: 128,
	dpStep: 8,
	scaleUI: 2,
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
	img: config.imgPath + 'sprite.png',
	stage: config.jsonPath + 'stage.json',
	act: config.imgPath + 'action.png',
	bg: config.imgPath + 'bg.png',
};
var game = {
	hero: {
		name: '小悟空',
		hp: 0,
		hpFull: config.hpLimit,
		mp: 0,
		mpGather: 0,
		mpFull: config.mpLimit,
		dp: 0,
		dpFull: config.dpLimit,
		status: 'ok',
	},
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

					var colors = ['#007858'];
					var color = colors[control.stageNum - 1];
					document.body.style.backgroundColor = color;

					// 场景层
					control.layerScene = cc.LayerColor.create(funcColor(color), w, h);
					this.addChild(control.layerScene);

					// 背景图
					var scale = w / 264;
					scale = scale.toFixed(3) - 0;
					var bg = cc.Sprite.create(res.bg);
					bg.attr({
						y: h,
						anchorX: 0,
						anchorY: 1,
						scale: scale,
					});
					control.layerScene.addChild(bg);

					// 舞台层
					var layerStage = cc.LayerColor.create(cc.color(255, 0, 0, 0), w, w);
					layerStage.attr({ y: 64 });
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
					var tileBorder = cc.Sprite.create(
						res.img,
						cc.rect(32, 32, 30, 30)
					);
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

					funcShowHeroInfo();
					funcUpdateHeroInfo();
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
	var tileSize = config.tileSize, roleSize = config.roleSize;
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
	var layer = control.layerScene.children[1];
	layer.children[0].removeAllChildren();
	layer.children[1].removeAllChildren();

	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			if (!maps[i][j][1]) continue;

			var num = maps[i][j][0];
			var x = Math.round((tileSize * i + tileSize / 2) * control.zoom);
			var y = Math.round((tileSize * j + tileSize / 2) * control.zoom);

			var bg = cc.Sprite.create(
				res.img,
				cc.rect(0, 32, tileSize, tileSize)
			);
			bg.attr({
				x: x,
				y: y,
				scale: control.zoom,
				opacity: 192,
			});
			layer.children[0].addChild(bg);

			var role = cc.Sprite.create(
				res.img,
				cc.rect(num * roleSize, 0, roleSize, roleSize)
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
	var border = control.layerScene.children[1].children[2];
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
	var border = control.layerScene.children[1].children[2];
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
			// 格子类型: 1正常, －1移除, -2横向贯穿, -3纵向贯穿, -4九格炸弹, -5吸走

			// 横向检查
			var items = [[i, j]];
			for (var k = 1; k <= 4; k += 1) {
				if (maps[i + k] && maps[i + k][j] && cell[0] === maps[i + k][j][0])
					items.push([i + k, j]);
				else break;
			}
			if (items.length >= 3) {
				result = true;
				for (var l = 0; l < items.length; l += 1) {
					var item = items[l];
					maps[item[0]][item[1]][1] = -1; // 打上移除标记
				}
			}

			// 纵向检查
			items = [[i, j]];
			for (var k = 1; k <= 4; k += 1) {
				if (maps[i][j + k] && cell[0] === maps[i][j + k][0])
					items.push([i, j + k]);
				else break;
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
	var layer = control.layerScene.children[1];
	var time = config.time, roleSize = config.roleSize;

	var sum = [];
	for (var i = 0; i < control.roleNum; i += 1) {
		sum.push(0);
	}

	// 移除的动画
	for (var i = 0; i < maps.length; i += 1) {
		for (var j = 0; j < maps[i].length; j += 1) {
			var cell = maps[i][j];
			if (cell[1] >= 1) continue;

			// 只对标记为负数的格子做移除动画
			var role = roles[i + '_' + j];
			role.zIndex = 1;
			var scaleToBig = cc.scaleTo(time, zoom * 1.5);
			var fadeOut = cc.fadeOut(time);
			var spawn = cc.spawn(scaleToBig, fadeOut);
			role.runAction(spawn);

			sum[cell[0]] += 1;
		}
	}

	control.acceptTouch = false; // 暂时忽略触控的响应, 防止出现bug
	layer.scheduleOnce(function() {
		control.acceptTouch = true; // 恢复触控的响应

		for (var i = 0; i < maps.length; i += 1) {
			for (var j = 0; j < maps[i].length; j += 1) {
				var role = roles[i + '_' + j];
				var cell = maps[i][j];
				if (cell[1] !== -1) continue;

				// 移除实体
				layer.children[1].removeChild(role);
				delete roles[i + '_' + j];
			}
		}

		funcFall();
	}, time + 0.1);

	var mapping = [0, 'dp', 'hp', 'mp'];
	var hero = game.hero;
	for (var i = 1; i < control.roleNum; i += 1) {
		if (sum[i] === 0) continue;

		var value = hero[mapping[i]];
		var valueFull = hero[mapping[i] + 'Full'];
		value += config[mapping[i] + 'Step'] * sum[i];
		if (value > valueFull) value = valueFull;
		hero[mapping[i]] = value;
		funcUpdateHeroInfo(mapping[i]);
	}
}

// 移除后要将浮空的角色落地
function funcFall() {
	var maps = control.maps, zoom = control.zoom;
	var roles = control.roles;
	var layer = control.layerScene.children[1];
	var time = config.time, tileSize = config.tileSize;
	var distance = 0, distanceMax = 0;

	for (var i = 0; i < maps.length; i += 1) {
		var x = Math.round((tileSize * i + tileSize / 2) * zoom);
		var y = Math.round(tileSize / 2 * zoom);
		distance = 0;

		for (var j = 0; j < maps[i].length; j += 1) {
			var cell = maps[i][j];
			if (cell[1] === -1) {
				distance += 1;
				if (distance > distanceMax) distanceMax = distance;
			} else if (distance) {
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
	var layer = control.layerScene.children[1];
	var time = config.time, tileSize = config.tileSize, roleSize = config.roleSize;
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
				res.img,
				cc.rect(num * roleSize, 0, roleSize, roleSize)
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

// 显示血槽, 防御槽和气槽
function funcShowHeroInfo() {
	var w = control.winWidth, h = control.winHeight;
	var obj = control.layerScene.children[1];
	var scale = config.scaleUI;
	var hero = game.hero;

	var layer = cc.Layer.create();
	layer.attr({ width: w, height: h });
	control.layerScene.addChild(layer);

	var layerTop = cc.LayerColor.create(cc.color(255, 0, 0, 0), w, h - obj.height - obj.y);
	layerTop.attr({ y: obj.y + obj.height });
	layer.addChild(layerTop);

	var hpUI = cc.Sprite.create(res.img, cc.rect(0, 64, 112, 32));
	hpUI.attr({
		y: layerTop.height,
		anchorX: 0,
		anchorY: 1,
		scale: scale,
	});
	layerTop.addChild(hpUI);

	var hp0 = cc.Sprite.create(res.img, cc.rect(114, 81, 1, 6));
	hp0.attr({
		x: 32 * scale,
		y: hpUI.y - 17 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
		scaleX: 0,
	});
	layerTop.addChild(hp0);
	var hp1 = cc.Sprite.create(res.img, cc.rect(116, 81, 1, 6));
	hp1.attr({
		x: 32 * scale,
		y: hpUI.y - 17 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
		scaleX: 0,
	});
	layerTop.addChild(hp1);
	var hp2 = cc.Sprite.create(res.img, cc.rect(118, 81, 1, 6));
	hp2.attr({
		x: 32 * scale,
		y: hpUI.y - 17 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
		scaleX: 0,
	});
	layerTop.addChild(hp2);
	var hp3 = cc.Sprite.create(res.img, cc.rect(120, 81, 1, 6));
	hp3.attr({
		x: 32 * scale,
		y: hpUI.y - 17 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
		scaleX: 0,
	});
	layerTop.addChild(hp3);

	var dp = cc.LayerColor.create(funcColor('#00e800'), 0, 2 * scale);
	dp.attr({
		x: 32 * scale,
		y: hpUI.y - 28 * scale,
	});
	layerTop.addChild(dp);

	var name = cc.LabelTTF.create(hero.name, '黑体', 16);
	name.attr({
		x: 32 * scale,
		y: hpUI.y - 8 * scale,
		anchorX: 0,
		anchorY: 1,
		lineWidth: 2,
		strokeStyle: cc.color(0, 0, 0, 255),
	});
	layerTop.addChild(name);

	var layerBottom = cc.LayerColor.create(cc.color(0, 255, 0, 0), w, 64);
	layer.addChild(layerBottom);

	var mpUI = cc.Sprite.create(res.img, cc.rect(2, 98, 20, 19));
	mpUI.attr({
		x: 32 * scale,
		y: layerBottom.height - 8 * scale,
		anchorX: 0,
		anchorY: 1,
		scale: scale,
	});
	layerBottom.addChild(mpUI);

	var x0 = 51;
	var ii = Math.round(hero.mpFull / 8);
	for (var i = 0; i < ii; i += 1) {
		var mpLoader = cc.Sprite.create(res.img, cc.rect(24, 106, 16, 8));
		mpLoader.attr({
			x: (16 * i + x0) * scale,
			y: mpUI.y - 7 * scale,
			anchorX: 0,
			anchorY: 1,
			scale: scale,
		});
		layerBottom.addChild(mpLoader);
	}

	var mpLoader2 = cc.Sprite.create(res.img, cc.rect(48, 106, 5, 8));
	mpLoader2.attr({
		x: (16 * ii + x0) * scale,
		y: mpUI.y - 7 * scale,
		anchorX: 0,
		anchorY: 1,
		scale: scale,
	});
	layerBottom.addChild(mpLoader2);

	var mp0 = cc.Sprite.create(res.img, cc.rect(56, 108, 1, 4));
	mp0.attr({
		x: x0 * scale,
		y: mpUI.y - 9 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
	});
	layerBottom.addChild(mp0);
	var mp1 = cc.Sprite.create(res.img, cc.rect(58, 108, 1, 4));
	mp1.attr({
		x: x0 * scale,
		y: mpUI.y - 9 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
	});
	layerBottom.addChild(mp1);
	var mp2 = cc.Sprite.create(res.img, cc.rect(60, 108, 1, 4));
	mp2.attr({
		x: x0 * scale,
		y: mpUI.y - 9 * scale,
		anchorX: 0,
		anchorY: 1,
		scaleY: scale,
	});
	layerBottom.addChild(mp2);
}

// 更新血槽, 防御槽和气槽
function funcUpdateHeroInfo(type) {
	var layer = control.layerScene.children[2];
	var layerTop = layer.children[0].children;
	var layerBottom = layer.children[1].children;
	var scale = config.scaleUI;
	var hero = game.hero;
	var hpLine = config.hpLine;

	if (!type || type === 'hp') {
		var hp = [];
		var ii = parseInt(hero.hp / hpLine);

		for (var i = 0; i < ii; i += 1) {
			hp.push(hpLine);
		}
		if (hero.hp % hpLine) hp.push(hero.hp % hpLine);

		for (var i = 0; i < hp.length; i += 1) {
			layerTop[i + 1].attr({ scaleX: hp[i] / scale });
		}
	}

	if (!type || type === 'dp') {
		layerTop[5].attr({ width: hero.dp / scale });
	}

	if (!type || type === 'mp') {
		var len = layerBottom.length;
		var mpFix = parseInt(hero.mp / 8) * 8;
		layerBottom[len - 3].attr({ scaleX: hero.mp * 4 });
		layerBottom[len - 2].attr({ scaleX: mpFix * 4 });
		if (hero.mpGather > 0) {
			layerBottom[len - 1].attr({ scaleX: hero.mpGather * 4 });
		}
	}
}
