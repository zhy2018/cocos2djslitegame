// 全局变量
var TileSize = 16;
var B64 = '';
var SceneData = [];
var Action = 1; // 1: 绘制, 2: 擦除, 3: 选取, 0: 什么也不干
var Working = false;
var SelectBox = {
	left: 0,
	top: 0,
	width: 1,
	height: 1,
};
var Shift = false; // 上档键是否处于按下状态
var FileName = '';
var DomGrid; // 会频繁用到
var Clipboard = [];	// 存放了瓦片数组的剪切板

// 执行入口
window.onload = function() {
	// 导入场景素材文件
	var domImport = document.getElementById('inp_import');
	domImport.onchange = function(e) {
		if (e.target.files.length) {
			var file = e.target.files[0];
			FileName = file.name;
			console.log(file);
			var reader = new FileReader();
			reader.onload = function(src) {
				B64 = src.target.result;
				var domImg = document.getElementById('div_img');
				domImg.style.backgroundImage = 'url(' + B64 + ')';
				var img = document.createElement('img');
				img.src = B64;
				img.onload = function() {
					// 加2是因为边框线的宽度
					domImg.style.width = img.width + 2 + 'px';
					domImg.style.height = img.height + 2 + 'px';
				};
			}
			reader.readAsDataURL(file);
		}
	};

	// 生成网格
	DomGrid = document.getElementById('grid');
	var domContent = document.getElementById('content');
	var domContentBody = document.getElementById('contentBody');
	var gridWidth = parseInt(domContent.offsetWidth / TileSize);
	var gridHeight = parseInt(domContent.offsetHeight / TileSize);
	domContentBody.style.width = domContent.offsetWidth + 'px';
	domContentBody.style.height = domContent.offsetHeight + 'px';
	var html='';
	for (var i = 0; i < gridHeight; i += 1) {
		html += '<tr>';
		SceneData.push([]);
		for (var j = 0; j < gridWidth; j += 1) {
			html += '<td>';
			html += '<div class="div_tile"';
			html += ' id="tile' + i + '_' + j + '"';
			html += ' dataLeft="' + j + '" dataTop="' + i + '"';
			html += ' onmousedown="funcWorkStart(this)"';
			html += ' onmouseover="funcWorking(this)"';
			html += ' onmouseup="funcWorkEnd()"';
			// 减2是因为网格边框线的宽度
			html += ' style="width:' + (TileSize - 2) + 'px;';
			html += ' height:' + (TileSize - 2) + 'px;">';
			html += '</div>';
			html += '</td>';
			SceneData[i].push(0);
		}
		html += '</tr>';
	}
	DomGrid.innerHTML = html;

	// 选框跟随鼠标移动
	var domWorkerBox = document.getElementById('div_workerBox');
	domContentBody.onmousemove = function(e) {
		if (Action === 3 && Shift) return;
		var left = e.target.getAttribute('dataLeft');
		var top = e.target.getAttribute('dataTop');
		if (left && top) {
			domWorkerBox.style.left = left * TileSize + 'px';
			domWorkerBox.style.top = top * TileSize + 'px';
			domWorkerBox.style.display = 'block';
		} else if (Action !== 3) domWorkerBox.style.display = 'none';
	};
	domContentBody.onmouseout = function() {
		if (Action === 3 && Shift) return;
		else if (Action !== 3) domWorkerBox.style.display = 'none';
	};

	// 场景素材选择
	var domImg = document.getElementById('div_img');
	var domSelectBox = document.getElementById('div_selectBox');
	var domSelectedBox = document.getElementById('div_selectedBox');
	domImg.onclick = function() {
		var left = parseInt(domSelectBox.style.left);
		var top = parseInt(domSelectBox.style.top);
		if (Shift) {
			// 素材范围选择
			SelectBox.width = left / TileSize - SelectBox.left + 1;
			SelectBox.height = top / TileSize - SelectBox.top + 1;
		} else {
			// 素材单个选择
			SelectBox.left = left / TileSize;
			SelectBox.top = top / TileSize;
			SelectBox.width = 1;
			SelectBox.height = 1;
		}
		domSelectedBox.style.left = SelectBox.left * TileSize + 'px';
		domSelectedBox.style.top = SelectBox.top * TileSize + 'px';
		domSelectedBox.style.width = SelectBox.width * TileSize + 'px';
		domSelectedBox.style.height = SelectBox.height * TileSize + 'px';
		domSelectedBox.style.display = 'block';
		domWorkerBox.style.width = domSelectedBox.style.width;
		domWorkerBox.style.height = domSelectedBox.style.height;
	};
	domImg.onmousemove = function(e) {
		// 选框跟随鼠标移动
		if (e.target.id === 'div_img') {
			var left = parseInt(e.offsetX / TileSize) * TileSize;
			var top = parseInt(e.offsetY / TileSize) * TileSize;
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
		if (B64) {
			var data = [B64, SceneData];
			data = JSON.stringify(data);
			var a = document.createElement('a');
			var blob = new Blob([data], {type : 'application/json'});
			a.href = URL.createObjectURL(blob);
			a.download = FileName.split('.')[0] + '.json';
			a.click();
		}
	};
	
	// 载入场景数据并呈现出来
	var domLoad = document.getElementById('inp_load');
	domLoad.onchange = function(e) {
		if (e.target.files.length) {
			var file = e.target.files[0];
			FileName = file.name;
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
				
				B64 = data[0];
				SceneData = data[1];
				console.log('文件加载完毕');
				var domImg = document.getElementById('div_img');
				domImg.style.backgroundImage = 'url(' + B64 + ')';
				var img = document.createElement('img');
				img.src = B64;
				// 加2是因为边框线的宽度
				domImg.style.width = img.width + 2 + 'px';
				domImg.style.height = img.height + 2 + 'px';
				
				// 根据场景数据生成场景贴图
				for (var i = 0; i < SceneData.length; i += 1) {
					for (var j = 0; j < SceneData[i].length; j += 1) {
						var value = SceneData[i][j];
						if (!value) continue;
						
						var tileId = 'tile' + i + '_' + j;
						var domTile = document.getElementById(tileId);
						if (!domTile) continue;
						
						var val = value.split(',');
						var left = val[0];
						var top = val[1];
						domTile.style.backgroundImage = 'url(' + B64 + ')';
						domTile.style.backgroundPosition = -(left * TileSize) + 'px ' + -(top * TileSize) + 'px';
						if (val.length >= 3 && val[2]) domTile.innerHTML = '<div>+</div>'; // 设置可通行性视情况而定
					}
				}
			}
			reader.readAsDataURL(file);
		}
	};
	
	// 开始瓦片的绘制
	var domDraw = document.getElementById('btn_draw');
	domDraw.onclick = function() {
		Action = 1;
		DomGrid.style.cursor = 'url(res/img/brush.png), default';
	};
	// 开始瓦片的擦除
	var domErase = document.getElementById('btn_erase');
	domErase.onclick = function() {
		Action = 2;
		DomGrid.style.cursor = 'url(res/img/eraser.png), default';
	};
	// 开始瓦片的选择
	var domSelect = document.getElementById('btn_select');
	domSelect.onclick = function() {
		Action = 3;
		DomGrid.style.cursor = 'default';
	};

	// 按键监测
	window.onkeydown = function(e) {
		Shift = e.shiftKey;	// 监测上档键是否按下
		if (Action === 3) {
			var left = parseInt(domWorkerBox.style.left) / TileSize;
			var top = parseInt(domWorkerBox.style.top) / TileSize;
			var width = (domWorkerBox.offsetWidth - 2) / TileSize;
			var height = (domWorkerBox.offsetHeight - 2) / TileSize;
			switch (e.keyCode) {
				case 46:
					// Del: 删除选框内的瓦片
					funcEraseTile(left, top, width, height);
					break;

				case 67:
					// Ctrl + C: 复制选框内的瓦片到剪切板
					if (e.ctrlKey) funcCopyTile(left, top, width, height);
					break;

				case 88:
					// Ctrl + X: 复制选框内的瓦片到剪切板, 然后再删除选框内的瓦片
					if (e.ctrlKey) {
						funcCopyTile(left, top, width, height);
						funcEraseTile(left, top, width, height);
					}
					break;

				case 86:
					// Ctrl + V: 粘贴剪切板上的瓦片到选框所在位置
					if (e.ctrlKey) funcPasteTile(left, top);
					break;

				default:
					break;
			}
		}
	};
	window.onkeyup = function() {
		Shift = false;
	};
};

function funcWorkStart(e) {
	Working = true;
	funcWorking(e);
}
function funcWorking(e) {
	if (B64 && Working) {
		var left = e.getAttribute('dataLeft') - 0;
		var top = e.getAttribute('dataTop') - 0;

		switch (Action) {
			case 1:
				// 绘制
				funcDrawTile(left, top, SelectBox.width, SelectBox.height);
				break;

			case 2:
				// 擦除
				funcEraseTile(left, top, SelectBox.width, SelectBox.height);
				break;

			case 3:
				// 选择
				var domWorkerBox = document.getElementById('div_workerBox');
				if (Shift) {
					var left0 = parseInt(domWorkerBox.style.left) / TileSize;
					var top0 = parseInt(domWorkerBox.style.top) / TileSize;
					var width = Math.abs(left - left0);
					var height = Math.abs(top - top0);
					domWorkerBox.style.width = (width + 1) * TileSize + 'px';
					domWorkerBox.style.height = (height + 1) * TileSize + 'px';
				} else {
					// 设置瓦片能否通行
					if (SceneData[top][left]) {
						// 只对有贴图的瓦片进行设置(忽略空地)
						var width = parseInt(domWorkerBox.style.width) / TileSize;
						var height = parseInt(domWorkerBox.style.height) / TileSize;
						if (e.textContent) funcSetWalkable(left, top, width, height, true); // 设置为可通行
						else funcSetWalkable(left, top, width, height, false); // 设置为不可通行
					}
				}
				break;

			default:
				break;
		}
	}
}
function funcWorkEnd() {
	Working = false;
}

// 绘制瓦片
function funcDrawTile(left, top, width, height) {
	for (var row = 0; row < height; row += 1) {
		for (var col = 0; col < width; col += 1) {
			if (row + top >= SceneData.length || col + left >= SceneData[0].length) continue;
			var domTile = DomGrid.rows[row + top].cells[col + left].children[0];
			if (!domTile) continue;
			domTile.style.backgroundImage = 'url(' + B64 + ')';
			domTile.style.backgroundPosition = -((col + SelectBox.left) * TileSize) + 'px ' + -((row + SelectBox.top) * TileSize) + 'px';
			SceneData[row + top][col + left] = col + SelectBox.left + ',' + (row + SelectBox.top);
		}
	}
}

// 擦除瓦片
function funcEraseTile(left, top, width, height) {
	for (var row = 0; row < height; row += 1) {
		for (var col = 0; col < width; col += 1) {
			if (row + top >= SceneData.length || col + left >= SceneData[0].length) continue;
			var domTile = DomGrid.rows[row + top].cells[col + left].children[0];
			if (!domTile) continue;
			domTile.style.backgroundImage = 'none';
			domTile.textContent = '';
			SceneData[row + top][col + left] = 0;
		}
	}
}

// 复制瓦片到剪贴板
function funcCopyTile(left, top, width, height) {
	Clipboard = [];
	for (var row = 0; row < height; row += 1) {
		Clipboard.push([]);
		for (var col = 0; col < width; col += 1) {
			if (row + top >= SceneData.length || col + left >= SceneData[0].length) continue;
			Clipboard[row].push(SceneData[row + top][col + left]);
		}
	}
}

// 粘贴剪贴板上的瓦片到选框所在位置
function funcPasteTile(left, top) {
	var height = Clipboard.length;
	if (!height) return;
	var width = Clipboard[0].length;

	for (var row = 0; row < height; row += 1) {
		for (var col = 0; col < width; col += 1) {
			if (row + top >= SceneData.length || col + left >= SceneData[0].length) continue;
			var value = Clipboard[row][col];
			var domTile = DomGrid.rows[row + top].cells[col + left].children[0];
			if (!domTile) continue;
			if (value) {
				// 有瓦片
				SceneData[row + top][col + left] = value;
				var val = value.split(',');
				var left2 = val[0] - 0;
				var top2 = val[1] - 0;
				domTile.style.backgroundImage = 'url(' + B64 + ')';
				domTile.style.backgroundPosition = -left2 * TileSize + 'px ' + -top2 * TileSize + 'px';
				if (val.length >= 3 && val[2]) domTile.innerHTML = '<div>+</div>'; // 设置可通行性视情况而定
			} else {
				// 空位置
				domTile.style.backgroundImage = 'none';
				SceneData[row + top][col + left] = 0;
			}
		}
	}
}

// 设置瓦片能否通行
function funcSetWalkable(left, top, width, height, walkable) {
	for (var row = 0; row < height; row += 1) {
		for (var col = 0; col < width; col += 1) {
			if (row + top >= SceneData.length || col + left >= SceneData[0].length) continue;
			var domTile = DomGrid.rows[row + top].cells[col + left].children[0];
			if (!domTile) continue;

			var value = SceneData[row + top][col + left];
			// 只对有贴图的瓦片进行设置(忽略空地)
			if (!value) continue;

			var val = value.split(',');
			if (walkable) {
				// 设置为可通行
				domTile.textContent = '';
				if (val.length === 3) val.splice(2, 1);
				else if (val.length === 4) val[2] = 0;
			} else {
				// 设置为不可通行
				domTile.innerHTML = '<div>+</div>';
				if (val.length === 2) val.push(1);
				else if (val.length === 4) val[2] = 1;
			}
			SceneData[row + top][col + left] = val.toString();
		}
	}
}
