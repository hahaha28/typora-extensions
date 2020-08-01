

$(function () {
    getWriteUntilAppear(function () {
        startRunning();
    })
})

function startRunning() {
    dealH2();

    $("#write").bind("DOMNodeInserted",()=>{
        dealH2();
    })

}

function getWriteUntilAppear(onAppear) {
    let el = $("#write")
    if(el.length === 0){
        setTimeout(getRootNodeUntilAppear,100,startRunning);
    }else{
        onAppear();
    }
}

function dealH2() {
    let h1s = $("#write").children("h1")
    console.log(h1s);
    for(let i=0;i<h1s.length;++i){
        let next = h1s.next();
        if(next[0].tagName === "H2"){
            console.log("next is H2")
            next.css("margin-top","0")
                .css("padding-top","0")
                .css("border-top","0");
        }
    }
}