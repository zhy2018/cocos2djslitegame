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
  jump: false,
  jumpStart: 10,
  jumpSpeed: 0,
  gravity: 0.5,
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
              // y轴倒置一下才能把地图正过来
              for (var i = data[1].length - 1; i >= 0; i -= 1) {
                var row = data[1][i];
                MapTile.push(row);
              }

							// 绘制场景(地块)
              for (var row = 0; row < MapTile.length; row += 1) {
                for (var col = 0; col < MapTile[row].length; col += 1) {
                  var item = MapTile[row][col];
                  if (item === 0) continue;

                  MapTile[row][col] = JSON.parse('[' + item + ']');
                  item = MapTile[row][col];
                  var sprite = cc.Sprite.create(
                    data[0], cc.rect(item[0] * TileSize, item[1] * TileSize, TileSize, TileSize)
                  );
                  sprite.attr({
                    x: col * TileSize,
                    y: row * TileSize,
                    anchorX: 0,
                    anchorY: 0,
                    tag: row + '_' + col,
                  });
                  LayerTile.addChild(sprite);
                }
              }

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
							65: 'left', 68: 'right',
						};
						cc.eventManager.addListener({
							event: cc.EventListener.KEYBOARD,
							onKeyPressed: function(keyCode) {
								if (mapping[keyCode]) {
									// 按下的是左右键
                  for (var i = 0; i < Roles.length; i += 1) {
                    var role = Roles[i];
                    if (role.camp !== 'player' || role.status !== 'ok') continue;
                    role.direction = mapping[keyCode];
                    if (role.action) continue;
                    role.action = role.sprite.runAction(
                      cc.RepeatForever.create(cc.Sequence.create(role.animate))
                    );
                    break;
                  }
								} else {
								  // 按下了其它键
                  switch (keyCode) {
                    case 74:
                      // 普攻
                      break;
                    case 75:
                      // 跳跃
                      for (var i = 0; i < Roles.length; i += 1) {
                        var role = Roles[i];
                        if (role.camp !== 'player' || role.status !== 'ok' || role.jump) continue;
                        role.sprite.texture = Res.kodFighterOther;
                        role.sprite.setTextureRect(cc.rect(77, 0, 52, 58));
                        role.jumpSpeed = role.jumpStart;
                        setTimeout(function() {
                          role.sprite.setTextureRect(cc.rect(154, 0, 51, 100));
                          role.jump = true;
                        }, 100);
                      }
                      break;
                    default:
                      break;
                  }
                }
							},
							onKeyReleased: function(keyCode) {
							  for (var i = 0; i < Roles.length; i += 1) {
							    var role = Roles[i];
							    if (role.camp !== 'player' || role.status !== 'ok') continue;
                  if (!mapping[keyCode]) continue;
                  // 释放的是左右键
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
					update: function() {
					  // 实时运行
            for (var i = 0; i < Roles.length; i += 1) {
              var role = Roles[i];
              if (role.status !== 'ok') continue;

              // 碰撞检测
              var collision = false;
              var proboX = role.sprite.x;
              var probeY = role.sprite.y;
              var half = parseInt(role.tileWidth / 2);

              switch (role.direction) {
                case 'left':
                  if (!role.sprite.flippedX) role.sprite.flippedX = true;
                  else proboX -= role.step;

                  var left = parseInt(proboX / TileSize);
                  var top = parseInt(probeY / TileSize);
                  cc.log(MapTile[top][left - half], MapTile[top + role.tileHeight][left - half]);
                  if (proboX - role.sprite.width / 2 < 0) collision = true;
                  else if (
                    (MapTile[top][left - half] && MapTile[top][left - half][2]) ||
                    (MapTile[top + role.tileHeight][left - half] && MapTile[top + role.tileHeight][left - half][2])
                  ) collision = true;
                  break;
                case 'right':
                  if (role.sprite.flippedX) role.sprite.flippedX = false;
                  else proboX += role.step;

                  var left = parseInt(proboX / TileSize);
                  var top = parseInt(probeY / TileSize);
                  cc.log(MapTile[top][left + half], MapTile[top + role.tileHeight][left + half]);
                  if (proboX + role.sprite.width / 2 > MapTile[0].length * TileSize) collision = true;
                  else if (
                    (MapTile[top][left + half] && MapTile[top][left + half][2]) ||
                    (MapTile[top + role.tileHeight][left + half] && MapTile[top + role.tileHeight][left + half][2])
                  ) collision = true;
                  break;
                default:
                  break;
              }

              // 跳跃
              if (role.jump) {
                probeY += role.jumpSpeed;
                var left = parseInt(proboX / TileSize);
                var top = parseInt(probeY / TileSize);
                role.jumpSpeed -= role.gravity;
                role.sprite.texture = Res.kodFighterOther;
                if (Math.abs(role.jumpSpeed) <= TileSize / 4)
                  role.sprite.setTextureRect(cc.rect(231, 0, 54,73)); // 腾空帧
                else role.sprite.setTextureRect(cc.rect(154, 0, 51, 100));

                if (role.jumpSpeed >= 0) {
                  // 往上跳
                  // 检测角色是否越界
                  // 检测角色的头是否碰到了墙/天花板(砖)
                  if (probeY + role.sprite.height > MapTile.length * TileSize) collision = true;
                  else if (
                    (MapTile[top + role.tileHeight][left - half] && MapTile[top + role.tileHeight][left - half][2]) ||
                    (MapTile[top + role.tileHeight][left + half] && MapTile[top + role.tileHeight][left + half][2])
                  ) {
                    collision = true;
                    role.jumpSpeed = 0;
                  }
                } else {
                  // 下落
                  if (role.jumpSpeed > TileSize) {
                    // 防止速度过快而导致的隔过一个格子
                    role.jumpSpeed = TileSize;
                  }
                  // 检测角色是否越界
                  // 检测角色的脚是否着地了
                  if (probeY < 0) collision = true;
                  else if (
                    (MapTile[top][left - half] && MapTile[top][left - half][2]) ||
                    (MapTile[top][left + half] && MapTile[top][left + half][2])
                  ) {
                    collision = true;
                    role.jump = false;
                    role.tileTop = top.toFixed() - 0 + 1;
                    role.sprite.y = role.tileTop * TileSize;
                    role.sprite.texture = Res.kodFighterOther;
                    role.sprite.setTextureRect(cc.rect(77, 0, 52, 58));
                    setTimeout(function() {
                      role.sprite.setTextureRect(cc.rect(0, 0, 45, 68));
                    }, 200);
                  }
                }
              } else {
                // 判断脚下是否为空
                var left = parseInt(proboX / TileSize);
                var top = parseInt(probeY / TileSize);
                if (
                  (MapTile[top - 1][left - half] === 0 || MapTile[top - 1][left - half][2] === 0) &&
                  (MapTile[top - 1][left + half] === 0 || MapTile[top - 1][left + half][2] === 0)
                ) {
                  // 为空则开始下落
                  role.jump = true;
                  role.jumpSpeed = 0;
                }
              }

              if (collision) continue;

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
          },
				});
				cc.director.runScene(new scene());
			}, this);
		});
  };
  cc.game.run("gameCanvas");
};

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
		  role.tileLeft = 2;
		  role.tileTop = 4;

		  // 在角色层地图数组上标记角色的标识(id)
		  for (var i = 0; i < role.tileHeight; i += 1) {
		    for (var j = 0; j < role.tileWidth; j += 1) {
		      MapRole[role.tileTop + i][role.tileLeft - parseInt(role.tileWidth / 2) + j] = role.id;
        }
      }

      // 精灵的站立状态
      var imgPath = Res.kodFighterOther;
      var sprite = cc.Sprite.create(imgPath, cc.rect(0, 0, 45, 68));
      sprite.attr({
        tag: Id,
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
          imgPath, cc.rect(i * imgInfo.width, 0, imgInfo.width, imgInfo.height)
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
		  // npc
			break;
	}

  LayerRole.addChild(sprite);
	role.sprite = sprite;
  Roles.push(role);
  Id += 1;
}
