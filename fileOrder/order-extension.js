// 顺序文件的名字
const orderFileName = 'order.json';

// 打开typora的延迟执行时间
const appDelay = 1000;

// 插入的延迟执行时间
const insertDelay = 100;

/**
 * 代表typora中的一个文件（夹）节点
 * @param element
 * @constructor
 */
var FileNode = function (element) {
    this.element = element;     // 元素，jquery对象
    this.path = element.attr('data-path');      // 文件路径
    let temp = this.path.split('\\');
    this.name = temp[temp.length - 1];      // 文件名
    this.subNodes = [];     // 子文件对象
    this.isDirectory = element.attr('data-is-directory')  // 是否是文件夹
}

/**
 * 代表真实的一个文件（夹）
 * @param path
 * @constructor
 */
var FileObject = function (path) {
    this.path = path;   // 路径
    let temp = this.path.split('\\');
    this.name = temp[temp.length - 1];  // 名称
    this.isDir = isDirectory(path);     // 是否是文件夹
}

/**
 * 标记是否正在插入
 * @type {boolean}
 */
var isInsert = false;

// 必须用reqnode()才能导入node.js模块
var fs = reqnode('fs'); // 读取文件用的
var ipc = reqnode("electron").ipcRenderer;

/**
 * 点击菜单中的 修改文件顺序 的点击事件
 * @param e
 */
function modifyFilesOrder(e){
    // console.log("!!!!!!!!!!!!!!!!!!");
    console.log(e);
    // 存储根路径
    window.localStorage.setItem("rootPath",getRootNode().path);
    // 查找并存储点击的当前路径
    const el = $(e);
    // console.log(el);
    let path = el.find(".file-node-title").attr('title');
    if(el.find('.fa-folder').length === 0){
        // 选中的是文件
        // console.log("是文件");
        const temp = path.split('\\');
        const len = temp[temp.length-1].length;
        path = path.substr(0,path.length-len-1);
        // console.log('path='+path);
        window.localStorage.setItem("currentPath",path);
    }else{
        // 选中的是文件夹
        // console.log("是文件夹");
        // console.log('path='+path);
        window.localStorage.setItem("currentPath",path);
    }
    //ipc 发送消息
    ipc.send('modifyFilesOrder')
}

/**
 * 新建文件时触发的回调
 */
function onNewFile() {
    console.log("new file");
    // 暂停一段时间的插入检测
    isInsert = true;
    setTimeout(function () {
        isInsert = false;
    },1000);
}

function onRename(){

}

/**
 * 点击菜单中的 上移文件 的点击事件
 * @param e
 */
function moveFileUp(e){
    const el = $(e);
    let path = el.find(".file-node-title").attr('title');
    $("#moveModalLabel").text("上移几格")
    $("#moveModal").attr('type','up').attr('path',path).modal('show');
    $("#move-number").focus();
}

/**
 * 点击菜单中的下移文件 的点击事件
 * @param e
 */
function moveFileDown(e){
    const el = $(e);
    let path = el.find(".file-node-title").attr('title');
    $("#moveModalLabel").text("下移几格")
    $("#moveModal").attr('type','down').attr('path',path).modal("show");
    $("#move-number").focus();
}

/**
 * 点击 移动对话框 的完成按钮的点击事件
 */
function onClickMoveModalOKBtn(){
    const moveModal = $("#moveModal");
    const val = parseInt($("#move-number").val());
    const type = moveModal.attr('type');
    const path = moveModal.attr('path');
    moveModal.modal('hide')
    // console.log(val);
    // console.log(type);
    // console.log(path);
    if(type === 'up'){
        modifyFileOrder(path,-val);
    }else if(type === 'down'){
        modifyFileOrder(path,val);
    }
}

/**
 * 修改文件顺序结束时触发这个函数
 */
ipc.on('modifyFilesOrderOver',(event,message)=>{
    // console.log('modifyFilesOrderOver')
    onInsert(); //执行这个方法用来重新加载排序
})

$(function () {
    // setTimeout('run()', appDelay)
    getRootNodeUntilAppear(function(e){
        run();
    });
})

// typora打开后，延迟一段时间，运行这个方法
function run() {

    // 排序
    let rootNode = getRootNode();
    $(rootNode.element).bind("DOMNodeInserted",()=>{
        // 插入后要一段时间才排序，因为元素可能还没生成
        if(!isInsert){
            setTimeout('onInsert()',insertDelay);
            console.log('insert')
        }
    });
    console.log('rootNode = ');
    console.log(rootNode);
    generateNodeTree(rootNode);
    sort(rootNode);

}

/**
 * 获取rootNode，这个方法保证能获取到
 * @param onAppear function(FileNode)
 */
function getRootNodeUntilAppear(onAppear) {
    // console.log("getRootNodeUntil")

    let el = $(".file-node-root")
    if(el.length === 0){
        // console.log('el.length==0')
        setTimeout(getRootNodeUntilAppear,100,run);
    }else{
        // console.log('typeof onAppear')
        // console.log(typeof onAppear);
        onAppear();
    }
}

/**
 * 插入时执行的方法
 */
function onInsert() {
    isInsert = true
    let rootNode = getRootNode();
    generateNodeTree(rootNode);
    sort(rootNode);
    isInsert = false;
}

/**
 * 对一个节点下的所有进行排序
 * @param rootNode
 */
function sort(rootNode) {
    // 每层遍历排序
    sortOneLevel(rootNode);
    for(let i=0;i<rootNode.subNodes.length;++i){
        sort(rootNode.subNodes[i]);
    }

}

/**
 * 对一层就行排序，即只排序node下的一层
 * @param node
 */
function sortOneLevel(node) {
    // console.log('node.name='+node.name);
    // 先检查是否是文件夹
    if(node.isDirectory === 'false'){
        return;
    }
    // 再检查是否有子文件
    if(node.subNodes.length === 0){
        return;
    }
    const nodePath = node.path;

    const orderData = dealOrderFile(nodePath);

    // 判断 顺序 文件是否存在
    // const filePath = nodePath + '/' + orderFileName;
    // const exist = fs.existsSync(filePath)
    // // console.log('filePath='+filePath);
    // if (exist === false) {
    //     // 如果文件不存在，则创建，并写入生成树中的文件顺序
    //     // 并且不需要排序
    //     let orderData = [];
    //     for (let i = 0; i < node.subNodes.length; ++i) {
    //         let temp = node.subNodes[i];
    //         orderData[i] = temp.name;
    //     }
    //     const jsonOrderData = JSON.stringify(orderData);
    //     fs.writeFile(filePath, jsonOrderData, function (err) {
    //         if (err) {
    //             console.log("文件创建失败！")
    //         }
    //     });
    //     return;
    // }
    // // 文件存在，检查是否完整包含各个文件顺序
    // const orderData = getOrder(nodePath);
    // // 如果顺序文件的长度更短，把生成树中多出的加到尾部
    // if (orderData.length < node.subNodes.length) {
    //     for (let i = 0; i < node.subNodes.length; ++i) {
    //         let name = node.subNodes[i].name;
    //         if (orderData.indexOf(name) === -1) {
    //             orderData[orderData.length] = name;
    //         }
    //     }
    //     // 重新写入顺序文件
    //     const jsonOrderData = JSON.stringify(orderData);
    //     fs.writeFile(filePath, jsonOrderData, 'utf-8',function (err) {
    //         if (err) {
    //             console.log("文件创建失败！")
    //         }
    //     });
    // }
    // 如果顺序文件多了，那么删掉
    
    // 不做处理，因为可能没加载完，这样删了会有问题
    // if(orderData.length > node.subNodes.length){
    //     for (let i = orderData.length - 1; i >= 0; i = i-1) {
    //         let name = orderData[i];
    //
    //         let exist = false;
    //         node.subNodes.forEach(function (fileInfo) {
    //             if(fileInfo.name === name){
    //                 exist = true;
    //             }
    //         })
    //         if(exist === false){
    //             orderData.splice(i,1);
    //         }
    //     }
    //     // 重新写入顺序文件
    //     const jsonOrderData = JSON.stringify(orderData);
    //     fs.writeFile(filePath, jsonOrderData, 'utf-8',function (err) {
    //         if (err) {
    //             console.log("文件创建失败！")
    //         }
    //     });
    // }
    // 检查目前顺序是否和文件中顺序相同
    let same = true;
    for(let i=0;i<orderData.length;++i){
        if(orderData[i] !== node.subNodes[i].name){
            same = false;
            break;
        }
    }
    if(same === true){
        // 如果顺序相同，就不用排序了
        return;
    }
    // 一切正常，则开始排序
    const subNodes = node.subNodes;
    const parent = subNodes[0].element.parent();
    // 移除
    for (let i = subNodes.length - 1; i >= 0; --i) {
        subNodes[i].element.remove();
    }
    // 按顺序添加
    let fileName;
    let subNode;
    for (let i = 0; i < orderData.length; ++i) {
        fileName = orderData[i];
        subNode = findNode(subNodes, fileName);
        if(subNode != null){
            parent.append(subNode.element);
        }
    }
}

/**
 * 根据名称查找结点
 * @param nodes
 * @param name
 * @returns {null|*}
 */
function findNode(nodes, name) {
    var node;
    for (let i = 0; i < nodes.length; ++i) {
        node = nodes[i];
        if (node.name === name) {
            return node;
        }
    }
    return null;
}

/**
 * 根据路径查找节点
 * @param rootNode 根节点
 * @param path 路径
 * @returns {null|*}
 */
function findNodeByPath(rootNode, path) {
    if (rootNode.path === path) {
        return rootNode;
    }
    for (let i = 0; i < rootNode.subNodes.length; ++i) {
        let subNode = rootNode.subNodes[i];
        let result = findNodeByPath(subNode, path);
        if (result != null) {
            return result;
        }
    }
    return null;
}

/**
 * 获取指定路径下的顺序文件，并返回json格式数据
 * @param dirPath
 */
function getOrder(dirPath) {
    const path = dirPath + '/' + orderFileName;
    const data = fs.readFileSync(path, 'utf-8');
    if(data === ''){
        return []
    }
    return JSON.parse(data);
}

/**
 * 在typora打开并加载完毕的条件下，获取根node
 */
function getRootNode() {
    return new FileNode($(".file-node-root"))
}

/**
 * 根据一个node找到其所有子node，并把数据加入node中
 * @param node
 * @returns {*}
 */
function generateNodeTree(node) {

    if (node.isDirectory === false) {
        return;
    }

    const rootEl = node.element;
    const childrenEl = rootEl.children("div.file-node-children");
    const nodes = childrenEl.children();
    var temp;
    for (let i = 0; i < nodes.length; ++i) {
        temp = new FileNode(nodes.eq(i));
        generateNodeTree(temp);
        node.subNodes[i] = temp;
    }
}

/**
 * 找到node下的所有子节点
 * @param node
 * @returns {[]}
 */
function findChildren(node) {
    var children = []

    const rootEl = node.element;
    const childrenEl = rootEl.children("div.file-node-children");
    // console.log('children element=')
    // console.log(childrenEl)
    const nodes = childrenEl.children();
    // console.log('children length=' + nodes.length)
    var temp;
    for (let i = 0; i < nodes.length; ++i) {
        // console.log('add children')
        temp = new FileNode(nodes.eq(i));
        children[i] = temp;
    }

    return children;
}

/**
 * 修改顺序文件中的顺序
 * @param filePath 文件路径
 * @param moveLines 移动数，正数代表向下移动
 */
function modifyFileOrder(filePath,moveLines) {
    let temp = filePath.split('\\');
    const fileName = temp[temp.length - 1];      // 文件名
    const currentPath = filePath.substr(0,filePath.length-fileName.length); // 文件所属的路径
    // 如果路径是根路径，那就别玩了
    if(filePath === getRootNode().path){
        return;
    }
    // 读取顺序文件，修改顺序
    let orderData = getOrder(currentPath);
    let index = orderData.indexOf(fileName)
    let changeIndex = index+moveLines;
    if(changeIndex < 0){
        changeIndex = 0;
    }else if(changeIndex >= orderData.length){
        changeIndex = orderData.length-1;
    }
    if(index !== -1 && changeIndex >= 0 && changeIndex < orderData.length){
        if(changeIndex > index){
            // 向右移动
            let temp = orderData[index];
            for(let i=index;i<changeIndex;++i){
                orderData[i] = orderData[i+1];
            }
            orderData[changeIndex] = temp;
        }else if(changeIndex < index){
            // 向左移动
            let temp = orderData[index];
            for(let i=index;i>changeIndex;i--){
                orderData[i] = orderData[i-1];
            }
            orderData[changeIndex] = temp;
        }
        // 写入文件
        const filePath = currentPath + '\\' + orderFileName;
        fs.writeFile(filePath,JSON.stringify(orderData),'utf-8',function (err) {
            if(err){
                console.log('error !!!!')
            }else{
                // 修改完成
                onInsert(); // 调用这个方法来重载
            }
        })
    }else{
        console.log('bug !!!!!!!!!!!!!!!')
    }
}

/**
 * 处理顺序文件
 * @param path 所在目录
 * @return [] 返回处理后的顺序文件信息
 */
function dealOrderFile(path) {
    // 首先获取默认文件信息
    let defaultFilesInfo = getDefaultFilesInfo(path);

    // 检查是否存在顺序文件
    const orderFilePath = path + '/' + orderFileName;
    const exist = fs.existsSync(orderFilePath);
    // 如果顺序文件不存在，则创建
    if (exist === false) {
        let orderData = [];
        for (let i = 0; i < defaultFilesInfo.length; ++i) {
            orderData[i] = defaultFilesInfo[i].name;
        }
        const jsonOrderData = JSON.stringify(orderData);
        fs.writeFile(orderFilePath, jsonOrderData, 'utf-8', function (err) {
            if (err) {
                console.log("文件创建失败！")
            }else{
                // 隐藏文件
                // hideFile(orderFilePath);
            }
        });
        return orderData;
    }
    // 如果顺序文件存在，检查是否完整包含各个文件顺序
    const orderData = getOrder(path);

    let shouldReWrite = false;  // 是否该重新写入文件

    // 检查顺序文件中是否包含不存在的文件
    for (let i = orderData.length - 1; i >= 0; i = i - 1) {
        let name = orderData[i];
        let exist = false;
        defaultFilesInfo.forEach(function (fileInfo) {
            if (fileInfo.name === name) {
                exist = true;
            }
        })
        if (exist === false) {
            orderData.splice(i, 1);
            shouldReWrite = true;
        }
    }


    // 如果顺序文件中的更少,把缺失的添加到最后
    if (orderData.length < defaultFilesInfo.length) {

        for (let i = 0; i < defaultFilesInfo.length; ++i) {
            let name = defaultFilesInfo[i].name;
            if (orderData.indexOf(name) === -1) {
                orderData[orderData.length] = name;
            }
        }
        shouldReWrite = true;
    }

    // 重新写入顺序文件
    if(shouldReWrite === true){
        const jsonOrderData = JSON.stringify(orderData);
        fs.writeFile(orderFilePath, jsonOrderData, 'utf-8', function (err) {
            if (err) {
                console.log("文件创建失败！")
            }
        });
    }

    return orderData;
}

/**
 * 获取指定路径下的默认文件信息（不考虑顺序文件）
 * @param path
 */
function getDefaultFilesInfo(path) {
    // 获取目录下的所有文件和文件夹名
    let filesNameArray = fs.readdirSync(path);
    // 转换为File对象
    let result = [];
    for (let i = 0; i < filesNameArray.length; ++i) {
        result[i] = new FileObject(path + '\\' + filesNameArray[i])
    }
    // 去掉其中非markdown 和 txt的文件，去掉.git文件夹
    for (let i = result.length - 1; i >= 0; i--) {
        let temp = result[i];
        if (temp.name === '.git'){
            result.splice(i, 1);
            continue;
        }
        if (temp.isDir) {
            continue;
        }
        if (temp.name.endsWith('.md')) {
            continue;
        }
        if (temp.name.endsWith('.txt')) {
            continue;
        }

        result.splice(i, 1);
    }

    // 把文件夹排在文件前面（按默认的读取顺序，一切都按字母排序）
    let dir = [];
    let file = [];
    for(let i=0;i<result.length;++i){
        if(result[i].isDir){
            dir[dir.length] = result[i];
        }else{
            file[file.length] = result[i];
        }
    }
    for(let i=0;i<result.length;++i){
        if(i < dir.length){
            result[i] = dir[i];
        }else{
            result[i] = file[i-dir.length];
        }
    }

    return result;
}

/**
 * 判断是否是文件夹
 * @param path
 * @returns {boolean}
 */
function isDirectory(path) {
    return fs.statSync(path).isDirectory();
}