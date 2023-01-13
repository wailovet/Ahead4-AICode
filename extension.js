const vscode = require('vscode');
const axios = require("axios")
const fs = require('fs')
 

function getGoFileNames(dir) {
	// 读取目录中的文件
	const files = fs.readdirSync(dir);

	// 用于保存所有 Go 文件的文件名
	const goFileNames = [];

	// 遍历所有文件
	for (const file of files) {
		// 获取文件的绝对路径
		const filePath = dir+"/"+file
		// 获取文件的信息
		const stat = fs.statSync(filePath);

		// 如果文件是目录，递归调用 getGoFileNames() 函数
		if (stat.isDirectory()) {
			goFileNames.push(...getGoFileNames(filePath));
		}

		// 如果文件是 Go 文件，则将文件名保存到 goFileNames 数组中
		if (stat.isFile() && filePath.endsWith(".go")) {
			console.log(filePath)
			goFileNames.push(filePath);
		}
	}

	return goFileNames;
}

function basename(f){
	return f.substring(f.lastIndexOf('/')+1)
}

function getGoFileInfo(dir) {
	const goFileNames = getGoFileNames(dir);
	const result = {};

	goFileNames.forEach(filePath => {
		const fileName = basename(filePath)
		const fileInfo = getGoStructAndFunc(filePath);
		result[fileName] = fileInfo;
	});

	return result;
}

function getGoStructAndFunc(goFile) {
	// 读取 Go 源文件
	const content = fs.readFileSync(goFile, 'utf8')

  	// 正则表达式：匹配函数定义，如func foo() {}
  	let methodRegExp = /func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*?\)\s*{/g;
	

  	// 正则表达式：匹配结构体定义，如type Foo struct {}
  	let structRegExp = /type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+struct\s*{/g;

	let methods = [];
	let structs = [];
  	// 匹配函数
  	let matchMethod = methodRegExp.exec(content);
  	while (matchMethod) {
  	  methods.push(matchMethod[1]);
  	  matchMethod = methodRegExp.exec(content);
  	}

  	// 匹配结构体
  	let matchStruct = structRegExp.exec(content);
  	while (matchStruct) {
  	  structs.push(matchStruct[1]);
  	  matchStruct = structRegExp.exec(content);
  	}
  // 正则表达式：匹配结构体方法，如func (f *Foo) Bar() {}
	let structMethodRegExp = /func\s+\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s+\*([a-zA-Z_][a-zA-Z0-9_]*)\)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(.*?\)\s*{/g;

	// 匹配结构体方法
	let matchStructMethod = structMethodRegExp.exec(content);
	while (matchStructMethod) {
	methods.push(`${matchStructMethod[1]}.${matchStructMethod[2]}`);
	matchStructMethod = structMethodRegExp.exec(content);
	}
	
	return {
		"methods": methods, 
		"structs": structs, 
	}
}

function getRootPath() {
	const rootPath = vscode.workspace.rootPath;
	if (!rootPath) {
		// 当前工作区没有根目录，可能是没有打开任何文件或没有选择工作区
		return null;
	}

	return rootPath;
}

//整理成txt
function ToText(obj){
	let text = ""
	for (var k in obj){
		if (obj[k]["methods"].length > 0 ){
			text += `${k}-methods:`+obj[k]["methods"].join(",")+`\n`
		}
	}
	for (var k in obj){
		if (obj[k]["structs"].length > 0 ){
			text += `${k}-structs:`+obj[k]["structs"].join(",")+`\n`
		}
	}
	return text
}




exports.activate = function () {
	// var goFileInfo = getGoFileInfo(root)
	// console.log(goFileInfo)


	var url = vscode.workspace.getConfiguration().get('AHead4.url')
	var token = vscode.workspace.getConfiguration().get('AHead4.token')
	var max_generation = vscode.workspace.getConfiguration().get('AHead4.max_generation')
	var check_type = vscode.workspace.getConfiguration().get('AHead4.check_type')
	if (!url || url == "") {
		url = "http://127.0.0.1:46188/AI-completion"
		if (!token || token == "") {
			// token = "de676ffb5670fbac425e748d7603c472"
		}
	}



	var globalInformation = ""
	setInterval(() => {
		var root = getRootPath()
		var goFileInfo = getGoFileInfo(root) 
		let globalInformation = ToText(goFileInfo)
		console.log(globalInformation) 
	}, 20000);

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
				console.log("src:",src)
				var item = await axios({
					url: url,
					method: 'post',
					data: {
						src: src,
						token: token,
						filename: fileName,
						language: document.languageId,
						offset: String(document.offsetAt(position)),
						max: String(max_generation),
						check_type: String(check_type),
						extension:globalInformation,
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
