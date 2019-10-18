// 全局变量(注意首字母是大写)
var Context; // 上下文
var Res = {}; // 资源
// 窗口(设备屏幕)尺寸
var WinSize = {
	width: 0,
	height: 0,
};
var TileSize = 16; // 瓦片尺寸(像素)
var MapTile = []; // 地图数组
var MapRole = [];
var MapBullet = [];
var MapGoods = [];
var LayerTile = []; // 精灵层
var LayerRole = [];
var LayerBullet = [];
var LayerGoods = [];
// 角色原型
var RoleProto = {
	direction: 'halt',
	status: 'ok',
	step: 2, // 精灵每次移动的步长值
	tileLeft: 0, // 精灵所在的格子
	tileTop: 0,
	tileWidth: 1, // 精灵所占几个格子
	tileHeight: 1,
  life: 1,
  hp: 100,
  mp: 100,
  money: 0,
  speed: 1,
  attack: 40,
  defense: 0,
  level: 1,
  name: '',
  camp: 'player',
  id: 0,
};
var Roles = []; // 角色们
var Id = 0; // 主索引, 唯一标识

// 执行入口
window.onload = function () {
  cc.game.onStart = function () {
		WinSize = cc.director.getWinSize();
    cc.view.adjustViewPort(true);
    cc.view.resizeWithBrowserSize(true);
    cc.view.setDesignResolutionSize(
      WinSize.width,
      WinSize.height,
      cc.ResolutionPolicy.SHOW_ALL
    );
    cc.audioEngine.setMusicVolume(0.2);
    cc.audioEngine.setEffectsVolume(0.2);

		cc.loader.loadJson('resources.json', function(_, data) {
			Res = data;
			var resArr = [];
			for (var i in Res) {
				resArr.push(Res[i]);
			}

			cc.LoaderScene.preload(resArr, function () {
				var scene = cc.Scene.extend({
					onEnter: function () {
						Context = this;
						Context._super();
						Context.scheduleUpdate();

						// 初始化精灵层
						LayerTile = cc.Layer.create();
						LayerRole = cc.Layer.create();
						LayerBullet = cc.Layer.create();
						LayerGoods = cc.Layer.create();
						Context.addChild(LayerTile);
						Context.addChild(LayerRole);
						Context.addChild(LayerBullet);
						Context.addChild(LayerGoods);

						// 加载并绘制场景(地块)
						cc.loader.loadJson(Res.scene0, function(_, data) {
              MapTile = data[1];
							funcDrawScene(data[0]);
						});

						funcRoleAdd('player'); // 创建玩家控制的精灵

						// 处理按键
						var mapping = {
							87: 'up', 83: 'down', 65: 'left', 68: 'right',
						};
						cc.eventManager.addListener({
							event: cc.EventListener.KEYBOARD,
							onKeyPressed: function(keyCode) {
								if (mapping[keyCode]) {
									// 按下的是方向键
                  for (let i = 0; i < Roles.length; i += 1) {
                    const role = Roles[i];
                    if (role.camp !== 'player') continue;

                    if (role.status === 'ok') {
                      role.direction = mapping[keyCode];
                      if (!role.action) {
                        role.action = role.sprite.runAction(
                          cc.RepeatForever.create(cc.Sequence.create(role.animate))
                        );
                      }
                    }
                    break;
                  }
								}
							},
							onKeyReleased: function() {
							  for (let i = 0; i < Roles.length; i += 1) {
							    const role = Roles[i];
							    if (role.camp !== 'player') continue;

							    if (role.status === 'ok') {
							      role.direction = '';
							      if (role.action) {
							        role.sprite.stopAction(role.action);
							        role.action = 0;
                    }
                    role.sprite.texture = Res.kodFighterOther;
							      role.sprite.setTextureRect(cc.rect(0, 0, 45, 68));
                  }
                }
							},
						}, Context);
					},
					onExit: function () {
						this._super();
						cc.eventManager.removeListener(cc.EventListener.KEYBOARD);
					},
					// update: funcRun,
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
	for (var row = 0; row < MapTile.length; row += 1) {
		for (var col = 0; col < MapTile[row].length; col += 1) {
			var item = MapTile[row][col];
			if (!item) continue;

			var left = item.split(',')[0];
			var top = item.split(',')[1];
			var sprite = cc.Sprite.create(
			  dataImg, cc.rect(left * TileSize, top * TileSize, TileSize, TileSize),
      );
			sprite.attr({
				x: col * TileSize,
				y: WinSize.height - row * TileSize,
				anchorX: 0,
				anchorY: 1,
        tag: row + '_' + col,
			});
			LayerTile.addChild(sprite);
		}
	}
}

// 添加一个角色
function funcRoleAdd(roleType) {
  var role = funcObjectClone(RoleProto);
  role.id = Id;
  role.camp = roleType;

	switch (roleType) {
		case 'player':
      // 精灵的站立状态
      var imgPath = Res.kodFighterOther;
      var sprite = cc.Sprite.create(imgPath, cc.rect(0, 0, 45, 68));
      sprite.attr({
        x: WinSize.width / 2,
        y: WinSize.height / 2,
        tag: Id,
      });

      // 精灵的行走状态
      // 加载走路图片帧
      imgPath = Res.kodFighterGo;
      var a = imgPath.split('_');
      a = a[a.length - 1];
      a = a.split('.')[0];
      var imgInfo = {
        width: parseInt(a.split('w')[1]),
        height: parseInt(a.split('h')[1]),
        number: parseInt(a.split('n')[1]),
      };

      var animation = cc.Animation.create();
      for (var i = 0; i < imgInfo.number; i += 1) {
        var frame = cc.SpriteFrame.create(
          imgPath, cc.rect(i * imgInfo.width, 0, imgInfo.width, imgInfo.height),
        );
        animation.addSpriteFrame(frame);
      }
      animation.setDelayPerUnit(0.1);
      animation.setRestoreOriginalFrame(true);
      role.animate = cc.Animate.create(animation);
			break;

		case 'enemy':
			break;

		default:
			break;
	}

  LayerRole.addChild(sprite);
	role.sprite = sprite;
  Roles.push(role);
  Id += 1;
}
