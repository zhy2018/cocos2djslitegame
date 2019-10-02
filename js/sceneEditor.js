// 全局变量
var tileSize = 16;
var b64 = '';
var sceneData = [];
var action = 1;	// 1: 绘制, 2: 擦除, 3: 选取, 0: 什么也不干
var working = false;
var selectBox = {
	left: 0,
	top: 0,
	width: 1,
	height: 1,
};
var shift = false; // 上档键是否处于按下状态
var fileName = '';

// 执行入口
window.onload = function() {
	// 导入场景素材文件
	var domImport = document.getElementById('inp_import');
	domImport.onchange = function(e) {
		if (e.target.files.length) {
			var file = e.target.files[0];
			fileName = file.name;
			console.log(file);
			var reader = new FileReader();
			reader.onload = function(src) {
				b64 = src.target.result;
				var domImg = document.getElementById('div_img');
				domImg.style.backgroundImage = 'url(' + b64 + ')';
				var img = document.createElement('img');
				img.src = b64;
				// 加2是因为边框线的宽度
				domImg.style.width = img.width + 2 + 'px';
				domImg.style.height = img.height + 2 + 'px';
			}
			reader.readAsDataURL(file);
		}
	};

	// 生成网格
	var domGrid = document.getElementById('grid');
	var domContent = document.getElementById('content');
	var domContentBody = document.getElementById('contentBody');
	var gridWidth = parseInt(domContent.offsetWidth / tileSize);
	var gridHeight = parseInt(domContent.offsetHeight / tileSize);
	domContentBody.style.width = domContent.offsetWidth + 'px';
	domContentBody.style.height = domContent.offsetHeight + 'px';
	var html='';
	for (var i = 0; i < gridHeight; i += 1) {
		html += '<tr>';
		sceneData.push([]);
		for (var j = 0; j < gridWidth; j += 1) {
			html += '<td>';
			html += '<div class="div_tile"';
			html += ' id="tile' + i + '_' + j + '"';
			html += ' dataLeft="' + j + '" dataTop="' + i + '"';
			html += ' onmousedown="funcWorkStart(this)"';
			html += ' onmouseover="funcWorking(this)"';
			html += ' onmouseup="funcWorkEnd()"';
			// 减2是因为网格边框线的宽度
			html += ' style="width:' + (tileSize - 2) + 'px;';
			html += ' height:' + (tileSize - 2) + 'px;">';
			html += '</div>';
			html += '</td>';
			sceneData[i].push(0);
		}
		html += '</tr>';
	}
	domGrid.innerHTML = html;

	// 工人方框跟随鼠标移动
	var domWorkerBox = document.getElementById('div_workerBox');
	domContentBody.onmousemove = function(e) {
		var left = e.target.getAttribute('dataLeft');
		var top = e.target.getAttribute('dataTop');
		if (left && top) {
			domWorkerBox.style.left = left * tileSize + 'px';
			domWorkerBox.style.top = top * tileSize + 'px';
			domWorkerBox.style.display = 'block';
		} else domWorkerBox.style.display = 'none';
	};
	domContentBody.onmouseout = function() {
		domWorkerBox.style.display = 'none';
	};

	// 场景素材选择
	var domImg = document.getElementById('div_img');
	var domSelectBox = document.getElementById('div_selectBox');
	var domSelectedBox = document.getElementById('div_selectedBox');
	domImg.onclick = function() {
		var left = parseInt(domSelectBox.style.left);
		var top = parseInt(domSelectBox.style.top);
		if (shift) {
			// 素材范围选择
			selectBox.width = left / tileSize - selectBox.left + 1;
			selectBox.height = top / tileSize - selectBox.top + 1;
		} else {
			// 素材单个选择
			selectBox.left = left / tileSize;
			selectBox.top = top / tileSize;
			selectBox.width = 1;
			selectBox.height = 1;
		}
		domSelectedBox.style.left = selectBox.left * tileSize + 'px';
		domSelectedBox.style.top = selectBox.top * tileSize + 'px';
		domSelectedBox.style.width = selectBox.width * tileSize + 'px';
		domSelectedBox.style.height = selectBox.height * tileSize + 'px';
		domSelectedBox.style.display = 'block';
		domWorkerBox.style.width = domSelectedBox.style.width;
		domWorkerBox.style.height = domSelectedBox.style.height;
	};
	domImg.onmousemove = function(e) {
		// 选框跟随鼠标移动
		if (e.target.id === 'div_img') {
			var left = parseInt(e.offsetX / tileSize) * tileSize;
			var top = parseInt(e.offsetY / tileSize) * tileSize;
			domSelectBox.style.left = left + 'px';
			domSelectBox.style.top = top + 'px';
			domSelectBox.style.display = 'block';
		} else if (e.target.id === 'div_selectedBox') {
			var left = parseInt(domSelectedBox.style.left);
			var top = parseInt(domSelectedBox.style.top);
			domSelectBox.style.left = left + 'px';
			domSelectBox.style.top = top + 'px';
		}
	};

	// 存储场景数据到一个json文件
	var domSave = document.getElementById('btn_save');
	domSave.onclick = function() {
		if (b64) {
			var data = [b64, sceneData];
			data = JSON.stringify(data);
			var a = document.createElement('a');
			var blob = new Blob([data], {type : 'application/json'});
			a.href = URL.createObjectURL(blob);
			a.download = fileName.split('.')[0] + '.json';
			a.click();
		}
	};
	
	// 载入场景数据并呈现出来
	var domLoad = document.getElementById('inp_load');
	domLoad.onchange = function(e) {
		if (e.target.files.length) {
			var file = e.target.files[0];
			fileName = file.name;
			console.log(file);
			var reader = new FileReader();
			reader.onload = function(src) {
				var data = src.target.result;
				var domMsg = document.getElementById('errMsg');
				var errMsg = '';
				domMsg.textContent = '';
				console.log(data.length, data);
				if (data.length <= 16) {
					console.log('无效的文件');
					return;
				}
				if (data.substr(0, 13) !== 'data:;base64,') {
					console.log('无效的文件');
					return;
				}
				
				data = data.split(',')[1];
				try {
					data = base64decode(data);
				} catch(err) {
					errMsg = '文件base64解码发生错误';
					domMsg.textContent = errMsg;
					console.log(errMsg, err);
					return;
				}
				
				try {
					data = JSON.parse(data);
				} catch(err) {
					errMsg = '文件json解析发生错误';
					domMsg.textContent = errMsg;
					console.log(errMsg, err);
					return;
				}
				
				if (data.length !== 2) {
					errMsg = '文件内容格式不正确';
					domMsg.textContent = errMsg;
					console.log(errMsg, data);
					return;
				}
				
				b64 = data[0];
				sceneData = data[1];
				console.log('文件加载完毕');
				var domImg = document.getElementById('div_img');
				domImg.style.backgroundImage = 'url(' + b64 + ')';
				var img = document.createElement('img');
				img.src = b64;
				// 加2是因为边框线的宽度
				domImg.style.width = img.width + 2 + 'px';
				domImg.style.height = img.height + 2 + 'px';
				
				// 根据场景数据生成场景贴图
				for (var i = 0; i < sceneData.length; i += 1) {
					for (var j = 0; j < sceneData[i].length; j += 1) {
						var item = sceneData[i][j];
						if (!item) continue;
						
						var tileId = 'tile' + i + '_' + j;
						var domTile = document.getElementById(tileId);
						if (!domTile) continue;
						
						var left = item.split(',')[0];
						var top = item.split(',')[1];
						domTile.style.backgroundImage = 'url(' + b64 + ')';
						domTile.style.backgroundPosition = -(left * tileSize) + 'px ' + -(top * tileSize) + 'px';
					}
				}
			}
			reader.readAsDataURL(file);
		}
	};
	
	// 开始场景的绘制
	var domDraw = document.getElementById('btn_draw');
	domDraw.onclick = function() {
		action = 1;
		domGrid.style.cursor = 'url(res/img/brush.png), default';
	};
	// 开始场景的擦除
	var domErase = document.getElementById('btn_erase');
	domErase.onclick = function() {
		action = 2;
		domGrid.style.cursor = 'url(res/img/eraser.png), default';
	};
	// 开始场景的选择
	var domSelect = document.getElementById('btn_select');
	domSelect.onclick = function() {
		action = 3;
		domGrid.style.cursor = 'default';
	};
	
	// 监测上档键是否按下
	window.onkeydown = function(e) {
		shift = e.shiftKey;
	};
	window.onkeyup = function() {
		shift = false;
	};
};

function funcWorkStart(e) {
	working = true;
	funcWorking(e);
}
function funcWorking(e) {
	if (b64 && working) {
		var domGrid = document.getElementById('grid');
		var left = e.getAttribute('dataLeft') - 0;
		var top = e.getAttribute('dataTop') - 0;

		switch (action) {
			case 1:
				// 绘制
				for (var row = 0; row < selectBox.height; row += 1) {
					for (var col = 0; col < selectBox.width; col += 1) {
						if (row + top >= sceneData.length || col + left >= sceneData[0].length) continue;
						var domTile = domGrid.rows[row + top].cells[col + left].children[0];
						domTile.style.backgroundImage = 'url(' + b64 + ')';
						domTile.style.backgroundPosition = -((col + selectBox.left) * tileSize) + 'px ' + -((row + selectBox.top) * tileSize) + 'px';
						sceneData[row + top][col + left] = selectBox.left + col + ',' + (selectBox.top + row);
					}
				}
				break;

			case 2:
				// 擦除
				for (var row = 0; row < selectBox.height; row += 1) {
					for (var col = 0; col < selectBox.width; col += 1) {
						if (row + top >= sceneData.length || col + left >= sceneData[0].length) continue;
						var domTile = domGrid.rows[row + top].cells[col + left].children[0];
						domTile.style.backgroundImage = 'none';
						sceneData[row + top][col + left] = 0;
					}
				}
				break;

			default:
				break;
		}
	}
}
function funcWorkEnd() {
	working = false;
}
