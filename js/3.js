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
	acceptTouch: false, // 是否响应触控事件
	touchListener: {}, // 触控事件
	stageNum: 1,
	stageData: {},
	scaleUI: 2,
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
			var sceneWelcome = cc.Scene.extend({
				onEnter: function() {
					this._super();
					var winSize = cc.director.getWinSize();
					w = winSize.width;
					h = winSize.height;
					control.winWidth = w;
					control.winHeight = h;
					var bgSize = 256;
					var scaleX = w / bgSize;
					scaleX = scaleX.toFixed(3) - 0;
					var scaleY = h / bgSize;
					scaleY = scaleY.toFixed(3) - 0;

					// 底层
					var layer = cc.Layer.create();
					layer.attr({
						y: h,
						anchorX: 0,
						anchorY: 0,
						scaleX: scaleX,
						scaleY: scaleY,
					});
					this.addChild(layer);

					// 背景图
					var bg = cc.Sprite.create(res.bg, cc.rect(0, 0, bgSize, 130));
					bg.attr({
						anchorX: 0,
						anchorY: 1,
					});
					layer.addChild(bg);

					// 云朵, 青山, 浮云 [y, height]
					var datas = [
						[0, 30], [63, 32], [96, 21], [119, 7],
						[130, 80], [210, 16], [226, 14], [240, 16],
					];
					var times = [2, 3, 4, 8, 10, 5, 3, 2];
					for (var i = 0; i < datas.length; i += 1) {
						var data = datas[i];
						var time = times[i];
						var sprite = cc.Sprite.create(
							res.bg,
							cc.rect(i < 4 ? bg.width : 0, data[0], bg.width, data[1])
						);
						sprite.attr({
							y: -data[0],
							anchorX: 0,
							anchorY: 1,
						});
						layer.addChild(sprite);
						sprite.runAction(cc.repeatForever(cc.sequence(
							cc.moveTo(time, cc.p(-bg.width, -data[0])),
							cc.moveTo(0, cc.p(i < 4 ? bg.width : 0, -data[0]))
						)));

						if (i >= 4) {
							var sprite2 = cc.Sprite.create(res.bg, cc.rect(0, data[0], bg.width, data[1]));
							sprite2.attr({
								x: bg.width,
								y: -data[0],
								anchorX: 0,
								anchorY: 1,
							});
							layer.addChild(sprite2);
							sprite2.runAction(cc.repeatForever(cc.sequence(
								cc.moveTo(time, cc.p(0, -data[0])),
								cc.moveTo(0, cc.p(bg.width, -data[0]))
							)));
						}
					}

					// logo
					var logo = cc.Sprite.create(res.img, cc.rect(0, 120, 189, 96));
					logo.attr({
						x: w / 2,
						y: h / 3 * 2,
						scale: scaleX,
					});
					this.addChild(logo);

					var btn = cc.LabelTTF.create('开始游戏', '黑体', 24 * scaleX);
					btn.attr({
						x: w / 2,
						y: h / 4,
						scaleX: 0.75,
						lineWidth: 2 * scaleX,
						strokeStyle: cc.color(0, 0, 0, 255),
					});
					this.addChild(btn);
					btn.runAction(cc.RepeatForever.create(cc.Blink.create(1, 1)));

					var mask = cc.LayerColor.create(funcColor('#000000'), w, h);
					mask.attr({ opacity: 0 });
					this.addChild(mask);

					cc.eventManager.addListener({
						event: cc.EventListener.TOUCH_ONE_BY_ONE,
						onTouchBegan: function(touch, e) {
							var target = e.getCurrentTarget();
							if (target != btn) return false;

							var loc = target.convertToNodeSpace(touch.getLocation());
							var size = target.getContentSize();
							var rect = cc.rect(0, 0, size.width, size.height);
							if (!cc.rectContainsPoint(rect, loc)) return false;

							btn.stopAllActions();
							btn.runAction(cc.RepeatForever.create(cc.Blink.create(1, 5)));
							btn.scheduleOnce(function() {
								mask.runAction(cc.FadeIn.create(0.5));
								btn.scheduleOnce(function() {
									cc.director.runScene(new sceneMap());
								}, 0.5);
							}, 0.5);
						}
					}, btn);
				},
				onExit: function() {
					this._super();
					cc.eventManager.removeListener(cc.EventListener.TOUCH_ONE_BY_ONE);
				},
			});

			var sceneMap = cc.Scene.extend({
				onEnter: function() {
					this._super();
					w = control.winWidth;
					h = control.winHeight;
					var scale = h / 320;
					scale = scale.toFixed(3) - 0;

					// 底层
					var layer = cc.Layer.create();
					layer.attr({
						y: h,
						anchorX: 0,
						anchorY: 0,
						scale: scale,
					});
					this.addChild(layer);

					// 背景图
					var bg = cc.Sprite.create(res.bg, cc.rect(0, 256, 480, 320));
					bg.attr({
						anchorX: 0,
						anchorY: 1,
					});
					layer.addChild(bg);

					var mask = cc.LayerColor.create(funcColor('#000000'), w, h);
					this.addChild(mask);
					mask.runAction(cc.FadeOut.create(0.5));

					cc.eventManager.addListener({
						event: cc.EventListener.TOUCH_ONE_BY_ONE,
						onTouchBegan: function(touch, e) {
							var target = e.getCurrentTarget();
							var loc = target.convertToNodeSpace(touch.getLocation());
							cc.log('onTouchBegan', touch.getLocation(), loc);
							return true;
						},
						onTouchMoved: function(touch, e) {
							var target = e.getCurrentTarget();
							var loc = target.convertToNodeSpace(touch.getLocation());
							cc.log('onTouchMoved', touch.getLocation(), loc);
						},
						onTouchEnded: function(touch, e) {
							var target = e.getCurrentTarget();
							var loc = target.convertToNodeSpace(touch.getLocation());
							cc.log('onTouchEnded', touch.getLocation(), loc);
						},
					}, bg);
				},
				onExit: function() {
					this._super();
					cc.eventManager.removeListener(cc.EventListener.TOUCH_ONE_BY_ONE);
				},
			});

			var sceneMain = cc.Scene.extend({
				onEnter: function() {
					this._super();
					w = control.winWidth;
					h = control.winHeight;

					// 计算格子的缩放倍数
					control.zoom = w / config.mapSizeLimit / config.tileSize;
					control.zoom = control.zoom.toFixed(2) - 0;

					var colors = ['#007858'];
					var color = colors[control.stageNum - 1];
					document.body.style.backgroundColor = color;

					// 场景层
					control.layerScene = cc.LayerColor.create(funcColor(color), w, h);
					this.addChild(control.layerScene);

					var mask = cc.LayerColor.create(funcColor('#ffffff'), w, h);
					this.addChild(mask);

					// 背景图
					var scale = w / 264;
					scale = scale.toFixed(3) - 0;
					var bg = cc.Sprite.create(res.bg, cc.rect(0, 576, 264, 208));
					bg.attr({
						y: h,
						anchorX: 0,
						anchorY: 1,
						scale: scale,
					});
					control.layerScene.addChild(bg);

					funcShowHeroInfo();
					funcUpdateHeroInfo();

					// 舞台层
					var layerStage = cc.LayerColor.create(cc.color(255, 0, 0, 0), w, w);
					control.layerScene.addChild(layerStage);

					// 消息层
					var layerInfo = cc.Layer.create();
					control.layerScene.addChild(layerInfo);

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
					var tileBorder = cc.Sprite.create(res.img, cc.rect(32, 32, 30, 30));
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

						var sprite;
						mask.runAction(cc.FadeOut.create(0.5));
						mask.scheduleOnce(function() {
							sprite = cc.Sprite.create(res.img, cc.rect(0, 220, 117, 36));
							sprite.attr({
								x: w / 2,
								y: h / 2,
								scale: scale,
							});
							layerInfo.addChild(sprite);
						}, 0.5);
						mask.scheduleOnce(function() {
							sprite.setTextureRect(cc.rect(120, 220, 65, 35));
						}, 1);
						mask.scheduleOnce(function() {
							layerInfo.removeAllChildren();
							control.acceptTouch = true;
						}, 1.5);
					});
				},
				onExit: function() {
					this._super();
					cc.eventManager.removeListener(cc.EventListener.TOUCH_ONE_BY_ONE);
				},
			});

			cc.director.runScene(new sceneWelcome());
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
	var layer = control.layerScene.children[2];
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
				opacity: 168,
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
	var border = control.layerScene.children[2].children[2];
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
	var border = control.layerScene.children[2].children[2];
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
	var layer = control.layerScene.children[2];
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
	var layer = control.layerScene.children[2];
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
	var layer = control.layerScene.children[2];
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
	var hero = game.hero;
	var scale = w / 2.5 / 112;
	scale = scale.toFixed(3) - 0;
	control.scaleUI = scale;

	var layerUI = cc.LayerColor.create(funcColor('#000000'), 0, 0);
	layerUI.attr({
		y: h,
		scale: scale,
	});
	control.layerScene.addChild(layerUI);

	var layerHP = cc.Layer.create();
	layerHP.attr({ y: 32 });
	layerUI.addChild(layerHP);

	var hpUI = cc.Sprite.create(res.img, cc.rect(0, 64, 112, 32));
	hpUI.attr({
		y: 0,
		anchorX: 0,
		anchorY: 1,
	});
	layerHP.addChild(hpUI);

	var colors = ['#f82040', '#f89000', '#00e800', '#68b8d0'];
	for (var i = 0; i < colors.length; i += 1) {
		var color = colors[i];
		var hpBar = cc.LayerColor.create(funcColor(color), 0, 6);
		hpBar.attr({ x: 32, y: -23 });
		layerHP.addChild(hpBar);
	}

	var hpBorderTop = cc.LayerColor.create(cc.color(255, 255, 255, 192), 64, 1);
	hpBorderTop.attr({ x: 32, y: -18 });
	layerHP.addChild(hpBorderTop);
	var hpBorderBottom = cc.LayerColor.create(cc.color(0, 0, 0, 128), 64, 1);
	hpBorderBottom.attr({ x: 32, y: -23 });
	layerHP.addChild(hpBorderBottom);

	var dp = cc.LayerColor.create(funcColor('#00e800'), 0, 2);
	dp.attr({ x: 32, y: -28 });
	layerHP.addChild(dp);

	var name = cc.LabelTTF.create(hero.name, '黑体', 16);
	name.attr({
		x: 32,
		y: -1,
		anchorX: 0,
		anchorY: 1,
		lineWidth: 1,
		strokeStyle: cc.color(0, 0, 0, 255),
	});
	layerHP.addChild(name);
	layerHP.runAction(cc.moveTo(0.5, cc.p(0, 0)));

	var layerMP = cc.Layer.create();
	layerMP.attr({ y: -32 });
	layerUI.addChild(layerMP);

	var mpUI = cc.Sprite.create(res.img, cc.rect(2, 98, 20, 19));
	mpUI.attr({
		x: 8,
		y: -(h - w - 19 * scale - 8) / scale,
		anchorX: 0,
		anchorY: 1,
	});
	layerMP.addChild(mpUI);

	var x0 = 27;
	var ii = 4;
	for (var i = 0; i < ii; i += 1) {
		var mpLoader = cc.Sprite.create(res.img, cc.rect(24, 106, 16, 8));
		mpLoader.attr({
			x: 16 * i + x0,
			y: mpUI.y - 7,
			anchorX: 0,
			anchorY: 1,
		});
		layerMP.addChild(mpLoader);
	}

	var mpLoader2 = cc.Sprite.create(res.img, cc.rect(48, 106, 5, 8));
	mpLoader2.attr({
		x: 16 * ii + x0,
		y: mpUI.y - 7,
		anchorX: 0,
		anchorY: 1,
	});
	layerMP.addChild(mpLoader2);

	colors = ['#f0a040', '#f8f800', '#f82040'];
	for (var i = 0; i < colors.length; i += 1) {
		var color = colors[i];
		var mpBar = cc.LayerColor.create(funcColor(color), 0, 4);
		mpBar.attr({ x: x0, y: mpUI.y - 13 });
		layerMP.addChild(mpBar);
	}

	var mpBorderTop = cc.LayerColor.create(cc.color(0, 0, 0, 80), 64, 1);
	mpBorderTop.attr({ x: x0, y: mpUI.y - 10 });
	layerMP.addChild(mpBorderTop);
	var mpBorderBottom = cc.LayerColor.create(cc.color(0, 0, 0, 80), 64, 1);
	mpBorderBottom.attr({ x: x0, y: mpUI.y - 13 });
	layerMP.addChild(mpBorderBottom);
	layerMP.runAction(cc.moveTo(0.5, cc.p(0, 0)));
}

// 更新血槽, 防御槽和气槽
function funcUpdateHeroInfo(type) {
	var layerUI = control.layerScene.children[1].children;
	var layerHP = layerUI[0].children;
	var layerMP = layerUI[1].children;
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
			layerHP[i + 1].attr({ width: hp[i] / 4 });
		}
	}

	if (!type || type === 'dp') {
		layerHP[7].attr({ width: hero.dp / 4 });
	}

	if (!type || type === 'mp') {
		var mpFix = parseInt(hero.mp / 8) * 8;
		layerMP[6].attr({ width: hero.mp * 2 });
		layerMP[7].attr({ width: mpFix * 2 });
		if (hero.mpGather > 0)
			layerMP[8].attr({ width: hero.mpGather * 2 });
	}
}
