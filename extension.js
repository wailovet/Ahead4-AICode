const vscode = require('vscode');
const axios = require("axios")

// var url = "http://119.28.6.41:8182/AI-completion"
var url = "http://127.0.0.1:46188/AI-completion"


exports.activate = function () {

	var StatusBar
	var Locker = false
	StatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	StatusBar.text = "AHead4:空闲"
	StatusBar.show()

	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
		provideInlineCompletionItems: async (document, position, context, token) => {
		
			let cid = String(Math.random())
			id = cid
			await new Promise(resolve => setTimeout(resolve, 2000));
			if (id != cid) {
				console.log("防抖动")
				return
			}
			if (token.isCancellationRequested){
				console.log("忽略取消")
				return
			}
			
			if (Locker) {
				return
			}
			Locker = true
			StatusBar.text = "AHead4:忙碌"
			console.log("无抖动") 
			console.log('provideInlineCompletionItems token:', token) 
			console.log('provideInlineCompletionItems context:', context) 
			console.log('provideInlineCompletionItems offsetAt:', document.offsetAt(position)) 
			const fileName = document.fileName;
			const src = document.getText();
			// const word = document.getText(document.getWordRangeAtPosition(position));
			const line = document.lineAt(position);

			// console.log('provideInlineCompletionItems fileName:', fileName);
			// console.log('provideInlineCompletionItems word:', word);
			// console.log('provideInlineCompletionItems position:', position);
			// console.log('provideInlineCompletionItems position.line:', position.line);
			// console.log('provideInlineCompletionItems line:', line.text);

			var item = await axios({
				url: url,
				method: 'post',
				data: {
					src: src,
					language: "go",
					line_num: String(position.line),
					character_num: String(position.character),
					offset: String(document.offsetAt(position)),
				},  //这里json对象会转换成json格式字符串发送
				header: {
					'Content-Type': 'application/json'  //如果写成contentType会报错,如果不写这条也报错
					//Content type 'application/x-www-form-urlencoded;charset=UTF-8'...
				}
			}).then(res => {
				console.log(res);
				var ret = res["data"]
				if (ret['code'] == 0) {
					return ret["data"];
				}
				return undefined;
			}).catch(error => {
				console.log(error);
				return undefined;
			})

			// console.log('complete3: ', Trim(item));
			// console.log('complete3: ', item);

			var output = item

			StatusBar.text = "AHead4:空闲"
			Locker = false
			return [
				new vscode.InlineCompletionItem(output, new vscode.Range(position, position.translate(0, output.length)),),
			];
		},
	})

}
function Trim(str) {
	return str.replace(/(^\s*)|(\s*$)/g, "");
}
