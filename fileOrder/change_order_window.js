const orderFileName = 'order.json'

var File = function (path) {
    this.path = path;   // 路径
    let temp = this.path.split('\\');
    this.name = temp[temp.length - 1];  // 名称
    this.isDir = isDirectory(path);     // 是否是文件夹
}

var fs = require('fs');
var ipc = require("electron").ipcRenderer;

//  根路径和当前的路径
var rootPath;
var currentPath;

$(function () {

    //  根路径和当前的路径
    rootPath = window.localStorage.getItem("rootPath");
    currentPath = window.localStorage.getItem("currentPath");
    console.log('rootPath='+rootPath);
    console.log('currentPath='+currentPath);

    initUI();

})

/**
 * 初始化UI
 */
function initUI() {
    // 设置导航栏
    setNav(rootPath, currentPath);
    // 设置显示文件夹和文件
    let filesInfo = getTrueFilesInfo(currentPath);
    console.log('currentPath=' + currentPath);
    console.log('filesInfo=')
    console.log(filesInfo)
    filesInfo.forEach(function (file) {
        if (file.isDir) {
            appendFileDir(file.name);
        } else {
            appendFile(file.name);
        }
    })
}

/**
 * 清空UI数据
 */
function clearUI() {
    $(".files-container").children().remove();
    $(".breadcrumb").children().remove();
}

/**
 * 点击导航栏上的路径的点击事件
 * @param element
 */
function onclickPrePath(element) {
    const dirName = $(element).text();
    const dirs = getNavDirs(rootPath, currentPath);
    let clickPath = rootPath;

    if (dirName !== dirs[0]) {
        dirs.splice(0, 1);
        for (let i = 0; i < dirs.length; ++i) {
            clickPath = clickPath + '\\' + dirs[i];
            if (dirs[i] === dirName) {
                break
            }
        }
    }
    currentPath = clickPath;
    clearUI();
    initUI();
}

/**
 * 点击文件夹的点击事件
 * @param obj jquery对象
 */
function onclickDir(obj) {
    const dirName = obj.attr('name');
    currentPath = currentPath + '\\' + dirName;
    clearUI();
    initUI();
}

/**
 * 结合排序文件获取路径下真正的文件信息
 * @param path
 */
function getTrueFilesInfo(path) {
    // 首先获取默认文件信息
    let defaultFilesInfo = getDefaultFilesInfo(path);

    // 检查是否存在顺序文件
    const orderFilePath = path + '/' + orderFileName;
    const exist = fs.existsSync(orderFilePath);
    if (exist === false) {
        // 如果顺序文件不存在，则创建
        let orderData = [];
        for (let i = 0; i < defaultFilesInfo.length; ++i) {
            orderData[i] = defaultFilesInfo[i].name;
        }
        const jsonOrderData = JSON.stringify(orderData);
        fs.writeFile(orderFilePath, jsonOrderData, 'utf-8', function (err) {
            if (err) {
                console.log("文件创建失败！")
            }
        });
        return defaultFilesInfo;
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

    // 把orderData转换为File数组
    let result = [];
    orderData.forEach(function (name) {
        result[result.length] = new File(path + '\\' + name);
    })
    return result;

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
        result[i] = new File(path + '\\' + filesNameArray[i])
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
    return result;
}

/**
 * 判断是否时文件夹
 * @param path
 * @returns {boolean}
 */
function isDirectory(path) {
    return fs.statSync(path).isDirectory();
}

/**
 * 获取指定路径下的顺序文件，并返回json格式数据
 * @param dirPath
 */
function getOrder(dirPath) {
    const path = dirPath + '/' + orderFileName;
    const data = fs.readFileSync(path, 'utf-8');
    if (data === '') {
        return []
    }
    return JSON.parse(data);
}

/**
 * 向html添加文件夹
 * @param name
 */
function appendFileDir(name) {
    console.log('appendFileDir ' + name)
    const html = template('tpl-file-dir-node', {
        "fileName": name
    });
    const obj = $(html);
    drag(obj);
    $(".files-container").append(obj);
}

/**
 * 向html添加文件
 * @param name
 */
function appendFile(name) {
    const html = template('tpl-file-node', {
        "fileName": name
    });
    const obj = $(html);
    drag(obj);
    $(".files-container").append(obj);
}

/**
 * 获取nav所有显示的文件夹
 * @param rootPath
 * @param currentPath
 * @returns {[]}
 */
function getNavDirs(rootPath, currentPath) {
    let temp = rootPath.split('\\');
    const startDir = temp[temp.length - 1];
    temp = currentPath.split('\\');
    let dirs = [];
    let start = false;
    for (let i = 0; i < temp.length; ++i) {
        if (temp[i] === startDir) {
            start = true;
        }
        if (start === true) {
            dirs[dirs.length] = temp[i];
        }
    }
    return dirs;
}

/**
 * 设置导航栏
 * @param rootPath 根路径
 * @param currentPath 当前路径
 */
function setNav(rootPath, currentPath) {
    // 首先把文件夹都梳理出来
    let dirs = getNavDirs(rootPath, currentPath);
    // 根据dirs[] 设置显示的 nav
    let html;
    const nav = $(".breadcrumb");
    for (let i = 0; i < dirs.length - 1; ++i) {
        html = template("normal-path", {'name': dirs[i]})
        nav.append(html);
    }
    html = template("active-path", {'name': dirs[dirs.length - 1]});
    nav.append(html);
}

/**
 * 文件/文件夹 下移一格
 * 成功返回true，失败返回false
 * @param obj 必须时jquery的元素对象
 */
function moveDownOneBlock(obj) {
    let nextEl = obj.next(); // 下一个同胞
    if(nextEl.length === 0){
        // 已经最下
        // console.log("到达边界");
        return false;
    }
    obj.remove();   // 移除自己
    nextEl.after(obj);  // 在下一个同胞后添加自己
    drag(obj);  //重新添加拖拽处理
    return true;
}

/**
 * 文件/文件夹 上移一格
 * 成功返回true，失败返回false
 * @param obj 必须时jquery的元素对象
 */
function moveUpOneBlock(obj) {
    let lastEl = obj.prev(); // 上一个同胞
    if(lastEl.length === 0){
        // 已经最上
        // console.log("到达边界");
        return false;
    }
    obj.remove();   // 移除自己
    lastEl.before(obj);  // 在上一个同胞前添加自己
    drag(obj);  //重新添加拖拽处理
    return true;
}

/**
 * 修改顺序文件中的顺序
 * @param fileName 文件名
 * @param moveLines 移动数，正数代表向下移动
 */
function modifyFileOrder(fileName,moveLines) {
    let orderData = getOrder(currentPath);
    let index = orderData.indexOf(fileName)
    let changeIndex = index+moveLines;
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
                // 先主进程发送修改完成消息
                ipc.send('modifyFilesOrderOver');
            }
        })
    }else{
        console.log('bug !!!!!!!!!!!!!!!')
    }
}

/**
 * 拖动处理
 * @param obj
 */
var drag = function (obj) {
    var downY;  // 鼠标点下的Y坐标
    var moveY;  // 鼠标移动时的Y坐标
    var diffY;  // 对象移动的Y坐标
    var upY;    // 鼠标拿起时的Y坐标

    var isDrag = false;     // 是否触发拖动事件
    var moveLines = 0; // 下移了几格，上移则为负数

    const dragDiff = 10;    // 超过这个数值则判定为拖动事件
    const blockHeight = 44.67; // 块高度，单位为px

    obj.bind("mousedown", start);

    function start(event) {
        if (event.button === 0) {//判断是否点击鼠标左键
            /*
             * clientX和clientY代表鼠标当前的横纵坐标
             * offset()该方法返回的对象包含两个整型属性：top 和 left，以像素计。此方法只对可见元素有效。
             * bind()绑定事件，同样unbind解绑定，此效果的实现最后必须要解绑定，否则鼠标松开后拖拽效果依然存在
             * getX获取当前鼠标横坐标和对象离屏幕左侧距离之差（也就是left）值，
             * getY和getX同样道理，这两个差值就是鼠标相对于对象的定位，因为拖拽后鼠标和拖拽对象的相对位置是不变的
             */
            downY = event.clientY;
            console.log(downY);
            // gapX=event.clientX-obj.offset().left;
            // gapY=event.clientY-obj.offset().top;
            //movemove事件必须绑定到$(document)上，鼠标移动是在整个屏幕上的
            $(document).bind("mousemove", move);
            //此处的$(document)可以改为obj
            $(document).bind("mouseup", stop);

        }
        return false;//阻止默认事件或冒泡
    }

    function move(event) {
        moveY = event.clientY;
        diffY = moveY - downY - moveLines * blockHeight;

        // console.log("diffY="+diffY);
        if (Math.abs(diffY) > dragDiff) {
            console.log("触发拖动");
            isDrag = true;

            offsetY = diffY; // 偏移代表对象相对正确位置的偏移

            if (diffY > blockHeight / 2) {
                // 下移一格
                console.log('下移一格');
                // 下移处理
                if(moveDownOneBlock(obj)) {
                    moveLines = moveLines + 1;
                    diffY = diffY - blockHeight;
                }
            } else if (diffY < -(blockHeight / 2)) {
                // 上移一格
                console.log('上移一格');
                if(moveUpOneBlock(obj)){
                    moveLines = moveLines -1;
                    diffY = diffY + blockHeight;
                }
            }

            obj.css("top", diffY + "px");

        }

        return false;//阻止默认事件或冒泡
    }

    function stop(event) {
        // 回归原位，消除偏移
        obj.css('top',0);

        upY = event.clientY;
        console.log('up')
        //解绑定，这一步很必要，前面有解释
        $(document).unbind("mousemove", move);
        $(document).unbind("mouseup", stop);

        if (isDrag === false) {
            // 触发点击事件
            console.log('点击事件')
            if(obj.attr('isDir') === 'true'){
                // 调用文件夹点击事件
                onclickDir(obj);
            }
        }
        isDrag = false;

        // 修改顺序文件
        if(moveLines !== 0){
            modifyFileOrder(obj.attr('name'),moveLines);
        }

    }
}