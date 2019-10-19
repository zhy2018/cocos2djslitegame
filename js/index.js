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
	tileWidth: 1, // 精灵所占几个格子
	tileHeight: 1,
  tileLeft: 0, // 精灵所在的格子
  tileTop: 0,
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
  id: 1,
};
var Roles = []; // 角色们
var Id = 1; // 主索引, 唯一标识

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
			Res = data;
			var resArr = [];
			for (var i in Res) resArr.push(Res[i]);

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

						cc.loader.loadJson(Res.scene0, function(_, data) {
              MapTile = data[1];
							funcDrawScene(data[0]); // 绘制场景(地块)

							// 初始化角色, 子弹, 物品所在层的地图数组
              for (var i = 0; i < MapTile.length; i += 1) {
                MapRole.push([]);
                MapBullet.push([]);
                MapGoods.push([]);
                for (var j = 0; j < MapTile[i].length; j += 1) {
                  MapRole[i].push(0);
                  MapBullet[i].push(0);
                  MapGoods[i].push(0);
                }
              }

              funcRoleAdd('player'); // 创建玩家控制的精灵
						});

						// 处理按键
						var mapping = {
							87: 'up', 83: 'down', 65: 'left', 68: 'right',
						};
						cc.eventManager.addListener({
							event: cc.EventListener.KEYBOARD,
							onKeyPressed: function(keyCode) {
								if (mapping[keyCode]) {
									// 按下的是方向键
                  for (var i = 0; i < Roles.length; i += 1) {
                    var role = Roles[i];
                    if (role.camp !== 'player') continue;
                    if (role.status !== 'ok') break;
                    role.direction = mapping[keyCode];
                    if (role.action) break;
                    role.action = role.sprite.runAction(
                      cc.RepeatForever.create(cc.Sequence.create(role.animate))
                    );
                    break;
                  }
								}
							},
							onKeyReleased: function() {
							  for (var i = 0; i < Roles.length; i += 1) {
							    var role = Roles[i];
							    if (role.camp !== 'player') continue;
							    if (role.status !== 'ok') break;
                  role.direction = 'halt';
                  role.sprite.texture = Res.kodFighterOther;
                  role.sprite.setTextureRect(cc.rect(0, 0, 45, 68));
                  if (!role.action) break;
                  role.sprite.stopAction(role.action);
                  role.action = 0;
                  break;
                }
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

// 实时运行
function funcRun() {
  for (var i = 0; i < Roles.length; i += 1) {
    var role = Roles[i];
    if (role.status !== 'ok' || role.direction === 'halt') continue;

    var step = role.step;

    // 碰撞检测
    var proboX = role.sprite.x;
    var probeY = role.sprite.y;

    switch (role.direction) {
      case 'up':
        probeY += step;
        break;
      case 'down':
        probeY -= step;
        break;
      case 'left':
        if (!role.sprite.flippedX) role.sprite.flippedX = true;
        else proboX -= step;
        break;
      case 'right':
        if (role.sprite.flippedX) role.sprite.flippedX = false;
        else proboX += step;
        break;
      default:
        break;
    }

    // 检测角色是否越界
    if (
      proboX < 0 || proboX + role.tileWidth * TileSize > MapTile[0].length * TileSize ||
      probeY < 0 || probeY + role.tileHeight * TileSize > MapTile.length * TileSize
    ) continue;

    // 检测角色是否碰到了墙(砖)
    var left = proboX / TileSize;
    var top = probeY / TileSize;
    left = left.toFixed() - 0;
    top = top.toFixed() - 0;
    cc.log(MapTile[top][left], MapTile[top][left + role.tileWidth], MapTile[top + role.tileHeight][left], MapTile[top + role.tileHeight][left + role.tileWidth]);
    if (
      MapTile[top][left] ||
      MapTile[top][left + role.tileWidth] ||
      MapTile[top + role.tileHeight][left] ||
      MapTile[top + role.tileHeight][left + role.tileWidth]
    ) continue;

    role.sprite.x = proboX;
    role.sprite.y = probeY;

    // 更新角色在地图上所处的位置
    left = role.sprite.x / TileSize;
    top = role.sprite.y / TileSize;
    role.tileLeft = left.toFixed() - 0;
    role.tileTop = top.toFixed() - 0;

    for (var i = 0; i < role.tileHeight; i += 1) {
      for (var j = 0; j < role.tileWidth; j += 1) {
        MapRole[role.tileTop + i][role.tileLeft + j] = role.id;
      }
    }
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
		  var width = 45 / TileSize;
		  var height = 68 / TileSize;
		  role.tileWidth = width.toFixed() - 0;
		  role.tileHeight = height.toFixed() - 0;
		  // role.tileLeft = parseInt(MapTile[0].length / 2);
		  // role.tileTop = parseInt(MapTile.length / 2);

		  // 在角色层地图数组上标记角色的标识(id)
		  for (var i = 0; i < role.tileHeight; i += 1) {
		    for (var j = 0; j < role.tileWidth; j += 1) {
		      MapRole[role.tileTop + i][role.tileLeft + j] = role.id;
        }
      }

      // 精灵的站立状态
      var imgPath = Res.kodFighterOther;
      var sprite = cc.Sprite.create(imgPath, cc.rect(0, 0, 45, 68));
      sprite.attr({
        tag: Id,
        anchorX: 0,
        anchorY: 0,
        x: role.tileLeft * TileSize,
        y: role.tileTop * TileSize,
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
