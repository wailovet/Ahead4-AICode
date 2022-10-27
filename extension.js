const vscode = require('vscode');
const axios = require("axios")



exports.activate = function () {
	var url = vscode.workspace.getConfiguration('AHead4.url').get()
	var token = vscode.workspace.getConfiguration('AHead4.token').get() 
	if (!url || url == "") {
		url = "http://119.28.6.41:8182/AI-completion"
		if (!token || token == "") {
			token = "de676ffb5670fbac425e748d7603c472"
		}
	}  


	var StatusBar
	var Locker = false
	StatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	StatusBar.text = "AHead4:idle"
	StatusBar.show()

	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
		provideInlineCompletionItems: async (document, position, context, token) => {

			try {
				let cid = String(Math.random())
				id = cid
				await new Promise(resolve => setTimeout(resolve, 2000));
				if (id != cid) {
					console.log("防抖动")
					return
				}
				if (token.isCancellationRequested) {
					console.log("忽略取消")
					return
				}
	
				if (Locker) {
					return
				}
				Locker = true
				StatusBar.text = "AHead4:busy"
	
				const fileName = document.fileName;
				const src = document.getText();
	
				var item = await axios({
					url: url,
					method: 'post',
					data: {
						src: src,
						token: token,
						filename: fileName,
						language_id: document.languageId,
						offset: String(document.offsetAt(position)),
					},
					header: {
						'Content-Type': 'application/json'
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
	
				StatusBar.text = "AHead4:idle"
				Locker = false
				var output = item
				if (!output || output == "") { 
					return []
				}
	
	
				return [
					new vscode.InlineCompletionItem(output, new vscode.Range(position, position.translate(0, output.length)),),
				];
			} catch (error) {
				console.log(error)
				vscode.window.showErrorMessage(error)
			}
		},
	})

}
function Trim(str) {
	return str.replace(/(^\s*)|(\s*$)/g, "");
}
