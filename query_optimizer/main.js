var input = document.getElementById("inputField");
var clearBtn = document.getElementById("clear");
var optimizeBtn = document.getElementById("optimize");
var showBtn = document.getElementById("show");
var forCanvas = document.getElementById("forCanvas");
var forCanvasOpt = document.getElementById("forCanvasOpt");
var queryList = document.getElementById("queryList");
var deleteBtn = document.getElementById("deleteItem");
var deleteAllBtn = document.getElementById("deleteAll");
var raQuery = document.getElementById('ra-query');
var raOptQuery = document.getElementById('ra-optimized-query');
var warning1 = document.getElementById('warning1');

clearBtn.addEventListener("mousedown", function(ev) {input.value = ""});
optimizeBtn.addEventListener("mousedown", addQuery);
deleteBtn.addEventListener("mousedown", deleteItem);
deleteAllBtn.addEventListener("mousedown", deleteAll);
showBtn.addEventListener("mousedown", showElem);

var selectedItem = null;
var queryCount = -1;
var queryArray = [];
var canv = document.createElement("canvas");
var canvOpt = document.createElement("canvas");
canv.width = canvOpt.width = 1000;
canv.height = canvOpt.height = 400;
forCanvas.appendChild(canv);
forCanvasOpt.appendChild(canvOpt);
var canv_ctx = canv.getContext("2d");
var canv_ctxOpt = canvOpt.getContext("2d");

function addQuery(ev) {
	var userInput = input.value.toLowerCase();
	if (userInput.startsWith("select") 
		&& userInput.includes("from")
		&& userInput.slice(userInput.indexOf("from")).includes("where")
	) {
		warning1.className = "hidden";
		var queryElems = userInput.split(" ");
		for (var i = 0; i < queryElems.length; ++i) {
			queryElems[i] = queryElems[i].replace(",","");
			queryElems[i] = queryElems[i].replace(" ","");
		}
		var isOk = true;
		for (var i = queryElems.indexOf("where") + 1; i < queryElems.length; ++i) {
			var tmp = false;

			for (var j = queryElems.indexOf("from") + 1; j < queryElems.indexOf("where"); ++j) {
				if (queryElems[i].startsWith(queryElems[j] + ".")) {
					tmp = true;
				}
			}
			if (!tmp) {
				isOk = false;
				break;
			}
		}
		if (isOk) {
			warning2.className = "hidden";
			queryCount++;
			input.value = "";
			var newQueryItem = document.createElement("a");
			newQueryItem.innerHTML = userInput;
			newQueryItem.className += "list-group-item";
			newQueryItem.queryId = queryCount;
			newQueryItem.addEventListener("mousedown", selectItem);
			queryList.appendChild(newQueryItem);
			//
			//converting the query into r.a.
			//
			select = queryElems.indexOf("select");
			from = queryElems.indexOf("from");
			where = queryElems.indexOf("where");
			var newQueryObject = {select: [], from: [], where: [], raString: "", raOptString: ""};
			
			newQueryObject.select = queryElems.slice(select + 1, from);
			newQueryObject.from = queryElems.slice(from + 1, where);
			newQueryObject.where = queryElems.slice(where + 1);
			
			var raString = "\u03A0"	+ "<sub>" + newQueryObject.select[0];
			var commonProject = "\u03A0" + "<sub>" + newQueryObject.select[0]; //will be used for optimization later
			for (var i = 1; i < newQueryObject.select.length; ++i) {
				raString += ", " + newQueryObject.select[i];
				commonProject += ", " + newQueryObject.select[i];
			}
			raString += "</sub>" + "(\u03C3<sub>" + newQueryObject.where[0];
			for (var i = 1; i < newQueryObject.where.length; ++i) {
				raString += " \u2227 " + newQueryObject.where[i];
			}
			raString += "</sub>(" + newQueryObject.from[0];
			for (var i = 1; i < newQueryObject.from.length; ++i) {
				raString += " \u00D7 " + newQueryObject.from[i];
			}
			raString += "))";

			newQueryObject.raString = raString;

			var raOptString = raString;
			if (newQueryObject.from.length > 1) {//we want to check if there is a join and the push the selections before the join if possible
				for (var i = 0; i < newQueryObject.where.length; ++i) {//we're going to loop through the predicates to check if they can be performed before the join
					if (!newQueryObject.where[i].slice(newQueryObject.where[i].indexOf(".") + 1).includes(".")) { //checking if the predicate regards only one relation
						raOptString = raOptString.replace(newQueryObject.where[i], ""); //removing the predicate from the select operation
						if (raOptString[raOptString.indexOf("\u03C3<sub>") + 6] == " ") {
							raOptString = raOptString.slice(0, raOptString.indexOf("\u03C3<sub>") + 6) + raOptString.slice(raOptString.indexOf("\u03C3<sub>") + 9);
						} else if (raOptString[raOptString.indexOf("</sub>", raOptString.indexOf("\u03C3<sub>") + 6) - 1] == " ") {
							raOptString = raOptString.slice(0, raOptString.indexOf("</sub>", raOptString.indexOf("\u03C3<sub>") + 6) - 3) 
								+ raOptString.slice(raOptString.indexOf("</sub>", raOptString.indexOf("\u03C3<sub>") + 6));
						}
						tab = newQueryObject.where[i].slice(0, newQueryObject.where[i].indexOf("."));//name of the relation we are considering
						var helperTabName = (newQueryObject.from.indexOf(tab) == 0) ? tab + " \u00D7 " : " \u00D7 " +  tab;
						var tmp1 = raOptString.slice(0, raOptString.indexOf(helperTabName));//beginning of the final string
						var tmp3 = raOptString.slice(raOptString.indexOf(helperTabName) + helperTabName.length);//end of the final string
						var tmp2 = "\u03C3<sub>" + newQueryObject.where[i] + "</sub>(" + tab + ")";//the optimized part of the string
						var tmp2 = (newQueryObject.from.indexOf(tab) == 0) ? tmp2 + " \u00D7 " : " \u00D7 " +  tmp2;
						raOptString = tmp1 + tmp2 + tmp3;
					}
				}
				for (var i = 0; i < newQueryObject.where.length; ++i) {
					if (newQueryObject.where[i].slice(newQueryObject.where[i].indexOf(".") + 1).includes(".")) {//looking for predicate for transforming cart. prod. into join
						raOptString = raOptString.replace(newQueryObject.where[i], ""); //removing the predicate from the select operation
						if (raOptString[raOptString.indexOf("\u03C3<sub>") + 6] == " ") {
							raOptString = raOptString.slice(0, raOptString.indexOf("\u03C3<sub>") + 6) + raOptString.slice(raOptString.indexOf("\u03C3<sub>") + 9);
						} else if (raOptString[raOptString.indexOf("</sub>", raOptString.indexOf("\u03C3<sub>") + 6) - 1] == " ") {
							raOptString = raOptString.slice(0, raOptString.indexOf("</sub>", raOptString.indexOf("\u03C3<sub>") + 6) - 3) 
								+ raOptString.slice(raOptString.indexOf("</sub>", raOptString.indexOf("\u03C3<sub>") + 6));
						}
						var tab1 = newQueryObject.where[i].slice(0, newQueryObject.where[i].indexOf("."));
						var tab2 = newQueryObject.where[i].slice(newQueryObject.where[i].indexOf("=") + 1, newQueryObject.where[i].lastIndexOf("."));
						for (var j = 0; j < newQueryObject.from.length - 1; ++j) {
							var cartProdIndex = raOptString.indexOf("\u00D7");
							if (((raOptString.lastIndexOf("(", cartProdIndex) < raOptString.lastIndexOf(tab1, cartProdIndex)) //checking if this is the cart. prod. we want to change
								|| (raOptString.lastIndexOf("(", cartProdIndex) < raOptString.lastIndexOf(tab2, cartProdIndex)))
								&& ((raOptString.indexOf(")", cartProdIndex) > raOptString.indexOf(tab1, cartProdIndex))
								|| (raOptString.indexOf(")", cartProdIndex) > raOptString.indexOf(tab2, cartProdIndex)))
							) {
								raOptString = raOptString.slice(0, cartProdIndex) + "\u22c8<sub>" + newQueryObject.where[i] 
									+ "</sub>" + raOptString.slice(cartProdIndex + 1);
							}
						}
					}
				}
				var lastIndex = 0;
				while (lastIndex >= 0) {
					if (raOptString.indexOf("\u03C3<sub></sub>(", lastIndex + 1) >= 0) {
						raOptString = raOptString.replace("\u03C3<sub></sub>(", "");
						raOptString = raOptString.slice(0, raOptString.length - 1);
					}
					lastIndex = raOptString.indexOf("\u03C3<sub></sub>(", lastIndex + 1);
				}
			}
			for (var i = 0; i < newQueryObject.from.length; ++i) {
				var attributes = commonProject;
				for (var j = 0; j < newQueryObject.where.length; ++j) {
					if (newQueryObject.where[j].includes(newQueryObject.from[i])) {
						var attribute = newQueryObject.where[j].slice(
							newQueryObject.where[j].indexOf(newQueryObject.from[i]) + newQueryObject.from[i].length + 1,
							(newQueryObject.where[j].indexOf("=") > newQueryObject.where[j].indexOf(newQueryObject.from[i]) ? newQueryObject.where[j].indexOf("=") : newQueryObject.where[j].length));
						if (!attributes.includes(attribute)) {
							attributes += ", " + attribute;
						}
					}
				}
				attributes += "</sub>";
				var changed = false;
				var searchIndex = raOptString.indexOf("</sub>");
				var finishAt = raOptString.length;
				while ((searchIndex < finishAt) && (searchIndex >= 0) && !changed) {
					searchIndex = raOptString.indexOf(newQueryObject.from[i], searchIndex + 6);
					if (raOptString.lastIndexOf("</sub>", searchIndex) > raOptString.lastIndexOf("<sub>", searchIndex)) {
						raOptString = raOptString.slice(0,searchIndex) + attributes + "(" + newQueryObject.from[i] + ")" + raOptString.slice(searchIndex + newQueryObject.from[i].length);
						changed = true;
					}
				}
			}

			newQueryObject.raOptString = raOptString;		
			queryArray.push(newQueryObject);
		} else {
			warning2.className = "";
		}
	} else {
		warning1.className = "";
	}
}

function selectItem(ev) {
	ev.target.className += " active";
	if(selectedItem!=null){
		selectedItem.className = selectedItem.className.replace(" active", "");
	}
	selectedItem = ev.target;
}

function deleteItem(ev) {
	if(selectedItem!=null){
		queryList.removeChild(selectedItem);
		selectedItem = null;
	}
}
function deleteAll(ev) {
	while (queryList.hasChildNodes()) {
    	queryList.removeChild(queryList.lastChild);
	}	
	selectedItem = null;
}
function showElem(ev) {
	if (selectedItem) {
		raQuery.innerHTML = queryArray[selectedItem.queryId].raString;
		raOptQuery.innerHTML = queryArray[selectedItem.queryId].raOptString;
		drawTree(canv_ctx, queryArray[selectedItem.queryId].raString);
		drawTree(canv_ctxOpt, queryArray[selectedItem.queryId].raOptString);
	}
}
function drawTree(ctx, ra_exp) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.width);
	var tree = [];
	ra_exp = ra_exp.replace(/<sub>/g, "");
	ra_exp = ra_exp.replace(/<\/sub>/g, "");
	createTree(ra_exp, tree, 0);
	tree[0] = {text: tree[0], x: ctx.canvas.width/2 - 60, y: 40};
	var offsetX = 100;
	var offsetY = 40;
	for (var i = 1; i < tree.length; ++i) {
		if (tree[i]) { //the element is not an empty node
			if (i == 2*Math.floor((i - 1)/2) + 2 
				&& tree[2*Math.floor((i - 1)/2) + 1] == undefined
			) { //the element is an only child (it's the right descendant of it's father, and doesn't have a brother)
				tree[i] = {text: tree[i], x: tree[Math.floor((i - 1)/2)].x, y: tree[Math.floor((i - 1)/2)].y + offsetY};
			} else if(i == 2*Math.floor((i - 1)/2) + 2) { //the node has a brother and is its father's left child
				tree[i] = {text: tree[i], x: tree[Math.floor((i - 1)/2)].x - offsetX, y: tree[Math.floor((i - 1)/2)].y + offsetY};
			} else { //the node has a brother and is its father's right child
				tree[i] = {text: tree[i], x: tree[Math.floor((i - 1)/2)].x + offsetX, y: tree[Math.floor((i - 1)/2)].y + offsetY};
			}
		} 
	}
	ctx.font = "12px sans-serif";
	ctx.fillText(tree[0].text, tree[0].x, tree[0].y);
	var lineOffsetX = 5;
	var lineOffsetY = 7;
	for (var i = 1; i < tree.length; ++i) {
		if (tree[i]) {
			ctx.fillText(tree[i].text, tree[i].x, tree[i].y);
			ctx.beginPath();
			ctx.moveTo(tree[Math.floor((i-1)/2)].x + lineOffsetX, tree[Math.floor((i-1)/2)].y + lineOffsetY);
			ctx.lineTo(tree[i].x + lineOffsetX, tree[i].y - 2*lineOffsetY);
			ctx.closePath();
			ctx.stroke();
		}
	}
}
function createTree(string, arr, ind) {
	var openBracket = 0;
	var openIndex = null;
	var closeBracket = 0;
	var closeIndex = null;
	for (var j = 0; j < string.length; ++j) {
		if (string.charAt(j) == "(") {
			++openBracket;
			if (openBracket == 1) {
				openIndex = j;
			}
		} else if (string.charAt(j) == ")") {
			++closeBracket;
			if (closeBracket == openBracket) {	
				closeIndex = j;
				break;
			}
		}
	}
	if (closeIndex) { //we found the operand of an operator
		if (string.slice(closeIndex + 1) == "") { //the current element is not an operand for join or cart. prod.
			var node = string.slice(0, openIndex);
			arr[ind] = node;
			createTree(string.slice(openIndex + 1, closeIndex), arr, 2*ind + 2);
		} else if (string.slice(closeIndex + 1).charAt(1) == "\u00D7" 
			|| string.slice(closeIndex + 1).charAt(1) == "\u22c8"
			) { //the current element is a child of a join or cart. prod.
			arr[ind] = string.slice(closeIndex + 2, string.indexOf(" ", closeIndex + 2));
			createTree(string.slice(0, closeIndex + 1), arr, 2*ind + 1);
			createTree(string.slice(string.indexOf(" ", closeIndex + 2) + 1), arr, 2*ind + 2);
		}
	}
	if (!closeIndex) { //there are no brackets in the string left
		if (string == "") { //you can't go deeper on this branch
			arr[ind] = undefined;
		} else if (string.includes("\u00D7") || string.includes("\u22c8")) { //there still is a join or cart. prod.
			if (string.includes("\u00D7")) {
				var node = string.indexOf("\u00D7");
			} else {
				var node = string.indexOf("\u22c8");
			}
			arr[ind] = string.slice(node, string.indexOf(" ", node + 1));
			createTree(string.slice(0, node - 1), arr, 2*ind + 1);
			createTree(string.slice(string.indexOf(" ", node + 1) + 1), arr, 2*ind + 2);
		} else { //there is only the name of a relation left
			arr[ind] = string;
		}
	}
}	