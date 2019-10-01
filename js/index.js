// 执行入口
window.onload = function () {
  cc.game.onStart = function () {
		var winSize = cc.director.getWinSize();
    cc.view.adjustViewPort(true);
    cc.view.resizeWithBrowserSize(true);
    cc.view.setDesignResolutionSize(winSize.width, winSize.height, cc.ResolutionPolicy.SHOW_ALL);

    cc.audioEngine.setMusicVolume(0.2);
    cc.audioEngine.setEffectsVolume(0.2);

		cc.loader.loadJson('resources.json', function(_, data) {
			var res = [];
			for (var i in data) {
				res.push(data[i]);
			}

			cc.LoaderScene.preload(res, function () {
				var direction = 0; // 1up, 5down, 2left, 4right
				var sprite = 0;
				var scene = cc.Scene.extend({
					onEnter: function () {
						var context = this;
						context._super();
						context.scheduleUpdate();

						cc.loader.loadJson('res/json/威洛之旅雪地.json', function(_, data) {
							funcDrawScene(data[0], data[1], context);
						});

						var mapping = {
							87: 1, 83: 5, 65: 2, 68: 4,
							38: 1, 40: 5, 37: 2, 39: 4,
						};
						cc.eventManager.addListener({
							event: cc.EventListener.KEYBOARD,
							onKeyPressed: function (keyCode) {
								direction = mapping[keyCode];
							},
							onKeyReleased: function (keyCode) {
								direction = 0;
							},
						}, context);
					},
					onExit: function () {
						this._super();
						cc.eventManager.removeListener(cc.EventListener.KEYBOARD);
					},
					update: function() {
						funcRun(direction, sprite);
					},
				});
				cc.director.runScene(new scene());
			}, this);
		});
  };
  cc.game.run("gameCanvas");
};

// 实时处理
function funcRun(direction, sprite) {
	if (sprite) {
		var step = 2;
		switch (direction) {
			case 1:
				sprite.y += step;
				break;
			case 5:
				sprite.y -= step;
				break;
			case 2:
				sprite.x -= step;
				break;
			case 4:
				sprite.x += step;
				break;
			default:
				break;
		}
	}
}

// 绘制场景
function funcDrawScene(dataImg, dataScene, context) {
	var winSize = cc.director.getWinSize();
	var tileSize = 16;

	for (var row = 0; row < dataScene.length; row += 1) {
		for (var col = 0; col < dataScene[row].length; col += 1) {
			var item = dataScene[row][col];
			if (!item) continue;

			var left = item.split(',')[0];
			var top = item.split(',')[1];
			var sprite = cc.Sprite.create(dataImg, cc.rect(left * tileSize, top * tileSize, tileSize, tileSize));
			sprite.attr({
				x: col * tileSize,
				y: winSize.height - row * tileSize,
				anchorX: 0,
				anchorY: 1,
			});
			context.addChild(sprite);
		}
	}
}
