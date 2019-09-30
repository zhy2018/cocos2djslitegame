// console.log(1);
// var loadingLayer = cc.LayerColor.extend({
//   count: 0,
//   ctor: function () {
//     this._super(cc.color(255, 0, 0, 255));
//     var winSize = cc.winSize;
//     var label = new cc.LabelTTF('0%', 'Arial', 40);
//     label.x = winSize.width / 2;
//     label.y = winSize.height / 2;
//     this.addChild(label, 11, 12);
//
//     cc.loader.loadImg('img/img.jpg', this, function () {
//       this.count += 1;
//       var text = this.getChildByTag(12);
//       text.setString((this.count / 3).toFixed(1) * 100 + '%');
//       if (this.count === 3) {
//         cc.director.runScene(new scene());
//       }
//     });
//   }
// });
//
// var scene = cc.Scene.extend({
//   onEnter: function () {
//     this._super();
//     var layer = new loadingLayer();
//     this.addChild(layer);
//   }
// });
