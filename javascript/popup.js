var totp = new KeyUtilities();
var getCode = totp.generate;
var _secret = [];
var deleteIdList = [];
var deleteKeyList = [];
var updateInterval;
var dragBox;

document.getElementById('extName').innerText = chrome.i18n.getMessage('extShortName');
document.getElementById('add_qr').innerText = chrome.i18n.getMessage('add_qr');
document.getElementById('add_secret').innerText = chrome.i18n.getMessage('add_secret');
document.getElementById('add_button').innerText = chrome.i18n.getMessage('ok');
document.getElementById('message_close').innerText = chrome.i18n.getMessage('close');
document.getElementById('account_label').innerText = chrome.i18n.getMessage('account');
document.getElementById('secret_label').innerText = chrome.i18n.getMessage('secret');

chrome.storage.sync.get(showCodes);

document.getElementById('infoActione').onclick = function(){
	document.getElementById('info').className = 'fadein';
	setTimeout(function(){
		document.getElementById('info').style.opacity = 1;
		document.getElementById('infoContent').innerHTML = chrome.i18n.getMessage('info');
	}, 200);
}

document.getElementById('infoClose').onclick = function(){
	document.getElementById('info').className = 'fadeout';
	setTimeout(function(){
		document.getElementById('info').className = '';
		document.getElementById('info').style.opacity = 0;
		document.getElementById('infoContent').innerHTML = '';
	}, 200);
}

document.getElementById('add').onclick = function(){
	document.getElementById('add_qr').style.display = 'block';
	document.getElementById('add_secret').style.display = 'block';
	document.getElementById('secret_box').style.display = 'none';
	document.getElementById('addAccount').className = 'fadein';
	setTimeout(function(){
		document.getElementById('addAccount').style.opacity = 1;
	}, 200);
}

document.getElementById('addAccountClose').onclick = function(){
	document.getElementById('addAccount').className = 'fadeout';
	setTimeout(function(){
		document.getElementById('addAccount').className = '';
		document.getElementById('addAccount').style.opacity = 0;
	}, 200);
}

document.getElementById('add_qr').onclick = function(){
	beginCapture();
}

document.getElementById('add_secret').onclick = function(){
	document.getElementById('add_qr').style.display = 'none';
	document.getElementById('add_secret').style.display = 'none';
	document.getElementById('secret_box').style.display = 'block';
}

document.getElementById('editActione').onclick = editCodes;

document.getElementById('qr').onclick = function(){
	this.className = 'qrfadeout';
	setTimeout(function(){
		document.getElementById('qr').className = '';
		document.getElementById('qr').style.opacity = 0;
	}, 200);
}

document.getElementById('message_close').onclick = function(){
	document.getElementById('message').style.display = 'none';
}

document.getElementById('add_button').onclick = saveSecret;

function showMessage(msg){
	document.getElementById('message_content').innerText = msg;
	document.getElementById('message').style.display = 'block';
}

function saveSecret(){
	var account = document.getElementById('account_input').value;
	var secret = document.getElementById('secret_input').value;
	if(!account || !secret){
		showMessage(chrome.i18n.getMessage('err_acc_sec'));
		return;
	}
	chrome.storage.sync.get(function(result){
		var index = Object.keys(result).length;
		var addSecret = {};
		addSecret[secret] = {
			account: account,
			issuer: '',
			secret: secret,
			index: index
		}
		chrome.storage.sync.set(addSecret);
		document.getElementById('addAccount').className = '';
		document.getElementById('addAccount').style.opacity = 0;
		document.getElementById('account_input').value = '';
		document.getElementById('secret_input').value = '';
		document.getElementById('editActione').setAttribute('edit', 'false');
		document.getElementById('editActione').innerHTML = '&#xf014f;';
		chrome.storage.sync.get(showCodes);
	});
}

function beginCapture(){
	chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs){
		var tab = tabs[0];
		chrome.tabs.sendMessage(tab.id, {action: 'capture'});
		window.close();
	});
}

function startMoveBox(e){
	dragBox = this;
	e.dataTransfer.effectAllowed = 'move';
}

function enterBox(){
	this.setAttribute('dropOver', 'true');
}

function leaveBox(){
	this.removeAttribute('dropOver');
}

function dropBox(e) {
	if (dragBox != this) {
		var tmpId = this.id;
		var tmpHtml = this.innerHTML;
		this.id = dragBox.id;
		this.innerHTML = dragBox.innerHTML;
		dragBox.id = tmpId;
		dragBox.innerHTML = tmpHtml;
	}
	this.removeAttribute('dropOver');
	return false;
}

function endMoveBox(){
	var deleteAction = document.getElementsByClassName('deleteAction');
	for(var i=0; i<deleteAction.length; i++){
		deleteAction[i].onclick = deleteCode;
	}
	var showQrAction = document.getElementsByClassName('showqr');
	for(var i=0; i<showQrAction.length; i++){
		showQrAction[i].onclick = showQr;
	}
}

function overBox(e){
	e.dataTransfer.dropEffect = 'move';
	return false;
}

function editCodes(){
	var codes = document.getElementById('codes');
	if(this.getAttribute('edit') == 'false'){
		clearInterval(updateInterval);
		codes.className = 'edit';
		this.innerHTML = '&#xf00b2;';
		this.setAttribute('edit', 'true');
		var code = document.getElementsByClassName('code');
		var codeBox = document.getElementsByClassName('codeBox');
		for(var i=0; i<code.length; i++){
			code[i].innerHTML = '&bull;&bull;&bull;&bull;&bull;&bull;';
			codeBox[i].draggable = 'true';
			codeBox[i].ondragstart = startMoveBox;
			codeBox[i].ondragenter = enterBox;
			codeBox[i].ondragleave = leaveBox;
			codeBox[i].ondragover = overBox;
			codeBox[i].ondrop = dropBox;
			codeBox[i].ondragend = endMoveBox;
		}
		codes.scrollTop = codes.scrollHeight;
	}
	else{
		codes.className = '';
		this.innerHTML = '&#xf014f;';
		this.setAttribute('edit', 'false');
		for(var i=0; i<_secret.length; i++){
			if(deleteIdList.indexOf(i)!=-1){
				_secret[i] = null;
			}
		}
		_secret = sortCode();
		clearInterval(updateInterval);
		chrome.storage.sync.remove(deleteKeyList, function(){
			deleteIdList = [];
			deleteKeyList = [];
			chrome.storage.sync.get(function(secret){
				var changeSecret = {};
				for(var i=0; i<_secret.length; i++){
					if(secret[_secret[i].secret].index != _secret[i].index ||
								secret[_secret[i].secret].account != _secret[i].account ||
								secret[_secret[i].secret].issuer != _secret[i].issuer){
						changeSecret[_secret[i].secret] = _secret[i];
					}
				}
				if(changeSecret){
					chrome.storage.sync.set(changeSecret, function(){
						showCodes();
						codes.scrollTop = 0;
					});
				}
				else{
					showCodes();
					codes.scrollTop = 0;
				}
			});
		});
	}
}

function sortCode(){
	var codeBox = document.getElementsByClassName('codeBox');
	var newSecret = [];
	for(var index=0, i=0; i<codeBox.length; i++){
		if(_secret[Number(codeBox[i].id.substr(8))] === null){
			continue;
		}
		_secret[Number(codeBox[i].id.substr(8))].index = index;
		newSecret.push(_secret[Number(codeBox[i].id.substr(8))]);
		index++;
	}
	return newSecret;
}

function deleteCode(){
	var codeId = this.getAttribute('codeId');
	var key = this.getAttribute('key');
	codeId = Number(codeId);
	deleteIdList.push(codeId);
	deleteKeyList.push(key);
	document.getElementById('codeBox-'+codeId).style.display = 'none';
}

function updateCode(){
	for(var i=0; i<_secret.length; i++){
		document.getElementById('code-'+i).innerText = getCode(_secret[i].secret);
	}
}

function update(){
	getSector();
	var second = new Date().getSeconds();
	second = second%30;
	if(second>25){
		document.getElementById('codes').className = 'timeout';
	}
	else{
		document.getElementById('codes').className = '';
	}
	if(second<1){
		updateCode();
	}
}

function getSector(){
	var second = new Date().getSeconds();
	second = second%30;
	var canvas = document.getElementById('sector');
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0,0,20,20);
	ctx.fillStyle = '#888';
	sector(ctx, 10, 10, Math.PI/180*second/30*360, Math.PI/180*(1-second/30)*360, 8, 0, true);
	var url = canvas.toDataURL();
	var sectors = document.getElementsByClassName('sector');
	for(var i=0; i<sectors.length; i++){
		sectors[i].style.background = 'url('+url+') center';
	}
}

function showCodes(result){
	document.getElementById('codeList').innerHTML = '';
	if(result && result.secret){
		result = changeDataForm(result);
	}
	if(!result && !_secret){
		return false;
	}
	else{
		if(result){
			_secret = [];
			for(var i in result){
				_secret.push(result[i]);
			}
			_secret.sort(function(a, b){
				return a.index - b.index;
			});
		}
		for(var i=0; i<_secret.length; i++){
			var el = document.createElement('div');
			el.id = 'codeBox-'+i;
			el.className = 'codeBox';
			el.innerHTML = '<div class="deleteAction" codeId="'+i+'" key="'+_secret[i].secret+'">&#xf00b4;</div>'+
							'<div class="sector"></div>'+
							(_secret[i].issuer?('<div class="issuer">'+_secret[i].issuer+'</div>'):'')+
							'<div class="issuerEdit"><input class="issuerEditBox" type="text" codeId="'+i+'" value="'+(_secret[i].issuer?_secret[i].issuer:'')+'" /></div>'+
							'<div class="code" id="code-'+i+'">&bull;&bull;&bull;&bull;&bull;&bull;</div>'+
							'<div class="account">'+_secret[i].account+'</div>'+
							'<div class="accountEdit"><input class="accountEditBox" type="text" codeId="'+i+'" value="'+_secret[i].account+'" /></div>'+
							'<div id="showqr-'+i+'" class="showqr">&#x3433;</div>'+
							'<div class="movehandle">&#xf0025;</div>';
			document.getElementById('codeList').appendChild(el);
		}
		var deleteAction = document.getElementsByClassName('deleteAction');
		for(var i=0; i<deleteAction.length; i++){
			deleteAction[i].onclick = deleteCode;
		}
		var showQrAction = document.getElementsByClassName('showqr');
		for(var i=0; i<showQrAction.length; i++){
			showQrAction[i].onclick = showQr;
		}
		var accountEditBox = document.getElementsByClassName('accountEditBox');
		for(var i=0; i<accountEditBox.length; i++){
			accountEditBox[i].onblur = saveAccount;
		}
		var issuerEditBox = document.getElementsByClassName('issuerEditBox');
		for(var i=0; i<issuerEditBox.length; i++){
			issuerEditBox[i].onblur = saveIssuer;
		}
		updateCode();
		update();
		updateInterval = setInterval(update, 500);
	}
}

function saveAccount(){
	var codeId = this.getAttribute('codeId');
	var s = this.value;
	s = s.replace(/&/g, "&amp;"); 
	s = s.replace(/</g, "&lt;"); 
	s = s.replace(/>/g, "&gt;"); 
	s = s.replace(/ /g, "&nbsp;"); 
	s = s.replace(/\'/g, "&#39;"); 
	s = s.replace(/\"/g, "&quot;");
	_secret[codeId].account = s;
}

function saveIssuer(){
	var codeId = this.getAttribute('codeId');
	var s = this.value;
	s = s.replace(/&/g, "&amp;"); 
	s = s.replace(/</g, "&lt;"); 
	s = s.replace(/>/g, "&gt;"); 
	s = s.replace(/ /g, "&nbsp;"); 
	s = s.replace(/\'/g, "&#39;"); 
	s = s.replace(/\"/g, "&quot;");
	_secret[codeId].issuer = s;
}

function changeDataForm(result){
	var secret = result.secret;
	var newResult = {};
	for(var i=0; i<secret.length; i++){
		newResult[secret[i].secret] = secret[i];
		newResult[secret[i].secret].index = i;
	}
	chrome.storage.sync.set(newResult);
	chrome.storage.sync.remove('secret');
	return newResult;
}

function showQr(){
	var codeId = this.id.substr(7);
	codeId = Number(codeId);
	var secret = _secret[codeId];
	var label = secret.issuer?(secret.issuer+':'+secret.account):secret.account;
	var otpauth = 'otpauth://totp/'+label+'?secret='+secret.secret+(secret.issuer?('&issuer='+secret.issuer):'');
	var qrcode = new QRCode('qr', {
		text: otpauth,
		width: 128,
		height: 128,
		colorDark : '#000000',
		colorLight : '#ffffff',
		correctLevel : QRCode.CorrectLevel.L
	}, function(qrUrl){
		document.getElementById('qr').style.backgroundImage = 'url('+qrUrl+')';
		document.getElementById('qr').className = 'qrfadein';
		setTimeout(function(){
			document.getElementById('qr').style.opacity = 1;
		}, 200);
	});
}