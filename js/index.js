// 执行入口
window.onload = function () {
  cc.game.onStart = function () {
    cc.view.adjustViewPort(true);
    cc.view.resizeWithBrowserSize(true);
    cc.view.setDesignResolutionSize(720, 450, cc.ResolutionPolicy.SHOW_ALL);

    cc.audioEngine.setMusicVolume(0.2);
    cc.audioEngine.setEffectsVolume(0.2);

    //load resources
    cc.LoaderScene.preload(["img/HelloWorld.png"], function () {
      var MyScene = cc.Scene.extend({
        onEnter: function () {
          this._super();
          var size = cc.director.getWinSize();
          var sprite = cc.Sprite.create("img/HelloWorld.png");
          sprite.setPosition(size.width / 2, size.height / 2);
          sprite.setScale(0.8);
          this.addChild(sprite, 0);

          var label = cc.LabelTTF.create("Hello World", "Arial", 40);
          label.setPosition(size.width / 2, size.height / 2);
          this.addChild(label, 1);

          // cc.eventManager.addListener({
          //   event: cc.EventListener.KEYBOARD,
          //   onKeyPressed: function (keyCode, e) {
          //     cc.log('key down:', keyCode);
          //     label.y += 1;
          //   },
          //   onKeyReleased: function (keyCode, e) {
          //     cc.log('key up:', keyCode);
          //     label.y -= 1;
          //   },
          // }, this);
        },
        onExit: function () {
          this._super();
          cc.eventManager.removeListener(cc.EventListener.KEYBOARD);
        },
        update: function () {
          cc.log(2);
        },
      });
      cc.director.runScene(new MyScene());
    }, this);
  };
  cc.game.run("gameCanvas");
};
