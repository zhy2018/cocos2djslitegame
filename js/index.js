// 全局变量
var Context;
var WinSize = {
	width: 0,
	height: 0,
};
var SceneData = [];
var Direction = 0; // 1上, 5下, 2左, 4右
var Step = 2;	// 精灵每次移动的步长值
var Sprite, Animate, Action;

// 执行入口
window.onload = function () {
  cc.game.onStart = function () {
		WinSize = cc.director.getWinSize();
    cc.view.adjustViewPort(true);
    cc.view.resizeWithBrowserSize(true);
    cc.view.setDesignResolutionSize(WinSize.width, WinSize.height, cc.ResolutionPolicy.SHOW_ALL);
    cc.audioEngine.setMusicVolume(0.2);
    cc.audioEngine.setEffectsVolume(0.2);

		cc.loader.loadJson('resources.json', function(_, data) {
			var res = [];
			for (var i in data) {
				res.push(data[i]);
			}

			cc.LoaderScene.preload(res, function () {
				var scene = cc.Scene.extend({
					onEnter: function () {
						Context = this;
						Context._super();
						Context.scheduleUpdate();

						// 加载并绘制场景
						cc.loader.loadJson(data.scene0, function(_, data) {
							SceneData = data[1];
							funcDrawScene(data[0]);
						});

						// 创建玩家控制的精灵
						funcMakePlayerSprite(data);

						// 处理按键
						var mapping = {
							87: 1, 83: 5, 65: 2, 68: 4,
							38: 1, 40: 5, 37: 2, 39: 4,
						};
						cc.eventManager.addListener({
							event: cc.EventListener.KEYBOARD,
							onKeyPressed: function(keyCode) {
								Direction = mapping[keyCode];
								if (Direction) {
									// 按下的是方向键
									if (!Action) {
										Action = Sprite.runAction(cc.RepeatForever.create(cc.Sequence.create(Animate)));
									}
								}
							},
							onKeyReleased: function() {
								Direction = 0;
								if (Action) {
									Sprite.stopAction(Action);
									Action = 0;
								}
								Sprite.texture = data.kodFighterOther;
								Sprite.setTextureRect(cc.rect(0, 0, 45, 68));
							},
						}, Context);
					},
					onExit: function () {
						this._super();
						cc.eventManager.removeListener(cc.EventListener.KEYBOARD);
					},
					update: funcRun,
				});
				cc.director.runScene(new scene());
			}, this);
		});
  };
  cc.game.run("gameCanvas");
};

// 实时处理
function funcRun() {
	if (!Sprite) return;
	switch (Direction) {
		case 0:
		case undefined:
			// 首先忽略掉无效按键
			break;
		case 1:
			// 上
			Sprite.y += Step;
			break;
		case 5:
			// 下
			Sprite.y -= Step;
			break;
		case 2:
			// 左
			Sprite.x -= Step;
			Sprite.flippedX = true;
			break;
		case 4:
			// 右
			Sprite.x += Step;
			Sprite.flippedX = false;
			break;
		default:
			break;
	}
}

// 绘制场景
function funcDrawScene(dataImg) {
	var tileSize = 16;

	for (var row = 0; row < SceneData.length; row += 1) {
		for (var col = 0; col < SceneData[row].length; col += 1) {
			var item = SceneData[row][col];
			if (!item) continue;

			var left = item.split(',')[0];
			var top = item.split(',')[1];
			var sprite = cc.Sprite.create(dataImg, cc.rect(left * tileSize, top * tileSize, tileSize, tileSize));
			sprite.attr({
				x: col * tileSize,
				y: WinSize.height - row * tileSize,
				anchorX: 0,
				anchorY: 1,
			});
			Context.addChild(sprite);
		}
	}
}

// 创建玩家控制的精灵
function funcMakePlayerSprite(dataRes) {
	// 精灵的站立状态
	var imgPath = dataRes.kodFighterOther;
	Sprite = cc.Sprite.create(imgPath, cc.rect(0, 0, 45, 68));
	Sprite.attr({
		x: WinSize.width / 2,
		y: WinSize.height / 2,
	});
	Context.addChild(Sprite);

	// 精灵的行走状态
	// 加载走路图片帧
	var imgInfo = {
		width: 0,
		height: 0,
		number: 0,
	};
	imgPath = dataRes.kodFighterGo;
	var a = imgPath.split('_');
	a = a[a.length - 1];
	a = a.split('.')[0];
	imgInfo = {
		width: parseInt(a.split('w')[1]),
		height: parseInt(a.split('h')[1]),
		number: parseInt(a.split('n')[1]),
	};

	var ani = cc.Animation.create();
	for (var i = 0; i < imgInfo.number; i += 1) {
		var frame = cc.SpriteFrame.create(imgPath, cc.rect(i * imgInfo.width, 0, imgInfo.width, imgInfo.height));
		ani.addSpriteFrame(frame);
	}
	ani.setDelayPerUnit(0.1);
	ani.setRestoreOriginalFrame(true);
	Animate = cc.Animate.create(ani);
}
