var x,y,z,ctrl,s;
var steps=[];
var boards=[];


var dir=[[0,0,1],[0,1,0],[0,1,1],[0,1,-1],[1,0,0],[1,0,1],[1,0,-1],[1,1,0],[1,-1,0],[1,1,1],[1,1,-1],[1,-1,1],[-1,1,1]];


function checkWin(no,x,y,z) {
    var down,up;
    steps[no]++;
    for (var d=0;d<13;d++)
    {
        down=1;
        up=1;
        while (x+up*dir[d][0]>=0&&y+up*dir[d][1]>=0&&z+up*dir[d][2]>=0&&x+up*dir[d][0]<=6&&y+up*dir[d][1]<=6&&z+up*dir[d][2]<=6&&boards[no][x][y][z]===boards[no][x+up*dir[d][0]][y+up*dir[d][1]][z+up*dir[d][2]]) up++;
        while (x-down*dir[d][0]>=0&&y-down*dir[d][1]>=0&&z-down*dir[d][2]>=0&&x-down*dir[d][0]<=6&&y-down*dir[d][1]<=6&&z-down*dir[d][2]<=6&&boards[no][x][y][z]===boards[no][x-down*dir[d][0]][y-down*dir[d][1]][z-down*dir[d][2]]) down++;
        if (down+up>5)
            return 1;
    }
    return 0;
}

var webSocketsServerPort=8080;
var webSocketServer=require('websocket').server;
var http=require('http');

var clients=[];

var server=http.createServer(function(request,response){});
server.listen(webSocketsServerPort,function(){
    console.log((new Date())+"Server is listening on port "+webSocketsServerPort);
});

var wsServer=new webSocketServer({
    httpServer:server
});

function gamestart(index) {
    console.log((new Date()) + "游戏开始！");
    ctrl = 0;
    clients[index].connection.sendUTF(JSON.stringify({type: 'ctrl', data: ctrl}));
    for(var m=0;m<clients.length;m++){
        if (m!==index&&clients[m].roomNo===-1){
            clients[m].roomNo=boards.length;
            clients[index].roomNo=boards.length;
            var board=[];
            for (var i=0;i<=6;i++)
            {
                board[i]=[];
                for (var j=0;j<=6;j++)
                    board[i][j]=[];
            }
            for (var i=0;i<=6;i++)
                for (var j=0;j<=6;j++)
                    for (var k=0;k<=6;k++)
                        board[i][j][k]=0;
            boards.push(board);
            steps.push(0);
            ctrl = 1;
            clients[m].connection.sendUTF(JSON.stringify({type: 'ctrl', data: ctrl}));
            break;
        }
    }
}

function exit(roomNo){
    boards.splice(roomNo, 1);
    steps.splice(roomNo, 1);
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].roomNo > roomNo) {
            clients[i].roomNo--;
        }else if(clients[i].roomNo === roomNo){
            clients[i].roomNo=-1;
        }
    }
}

wsServer.on('request',function(request) {
    var client={
        connection:request.accept(null,request.origin),
        index:clients.length,
        roomNo:-1
    };
    clients.push(client);
    if (clients.length%2===1)
    {
        console.log((new Date())+"正在为您匹配对手，请稍等~");
        ctrl=3;
        client.connection.sendUTF(JSON.stringify({type:'ctrl',data:ctrl}));
    } else {
        gamestart(client.index);
    }




    // if (clients.length<3) gamestart();
    // else
    // {
    //     console.log((new Date())+"A viewer gets in . There is "+clients.length+" people totally .");
    //     client.connection.sendUTF(JSON.stringify({type:'board',data:board}));
    // }

    client.connection.on('message',function(message){
        if (message.type=='utf8') {
            var step={x:0,y:0,z:0,blackwhite:0};
            step.x=parseInt(message.utf8Data.substring(1,2));
            step.y=parseInt(message.utf8Data.substring(3,4));
            step.z=parseInt(message.utf8Data.substring(5,6));
            step.blackwhite=parseInt(message.utf8Data.substring(7,8));
            if (boards[client.roomNo][step.x][step.y][step.z]===0)
            {
                for (var i=0;i<clients.length;i++) {
                    if (clients[i].roomNo===client.roomNo){
                        clients[i].connection.sendUTF(JSON.stringify({type:'step',data:step}));
                    }
                }
                if (step.blackwhite)
                    {
                    boards[client.roomNo][step.x][step.y][step.z]=1;
                    console.log((new Date())+"White walks at ("+step.x+","+step.y+","+step.z+") .");
                    if (checkWin(client.roomNo,step.x,step.y,step.z))
                    {
                        ctrl=7;
                        for (var i=0;i<clients.length;i++) {
                            if (clients[i].roomNo===client.roomNo) {
                                clients[i].connection.sendUTF(JSON.stringify({type: 'ctrl', data: ctrl}));
                            }
                        }
                        exit(client.roomNo);
                        console.log((new Date())+"White wins . Restart .");
                        gamestart(client.index);
                    }
                }
                else {
                    boards[client.roomNo][step.x][step.y][step.z]=2;
                    console.log((new Date())+"Black walks at ("+step.x+","+step.y+","+step.z+") .");
                    if (checkWin(client.roomNo,step.x,step.y,step.z))
                    {
                        ctrl=8;
                        for (var i=0;i<clients.length;i++) {
                            if (clients[i].roomNo===client.roomNo) {
                                clients[i].connection.sendUTF(JSON.stringify({type: 'ctrl', data: ctrl}));
                            }
                        }
                        exit(client.roomNo);
                        console.log((new Date())+"Black wins . Restart .");
                        gamestart(client.index);
                    }
                }
                if (steps[client.roomNo]===343)
                {
                    ctrl=6;
                    for (var i=0;i<clients.length;i++) {
                        if (clients[i].roomNo===client.roomNo) {
                            clients[i].connection.sendUTF(JSON.stringify({type: 'ctrl', data: ctrl}));
                        }
                    }
                    exit(client.roomNo);
                    console.log((new Date())+"Draw . Restart .");
                    gamestart(client.index);
                }
            }
        }
    });

    client.connection.on('close',function(connection) {
        var roomNo = client.roomNo;
        boards.splice(roomNo, 1);
        steps.splice(roomNo, 1);
        var index = client.index;
        for (var i = index + 1; i < clients.length; i++)
            clients[i].index--;
        clients.splice(index, 1);
        var flag=0;
        for (var i = 0; i < clients.length; i++) {
            if (roomNo!==-1&&clients[i].roomNo > roomNo) {
                clients[i].roomNo--;
            }else if(flag===0&&roomNo!==-1&&clients[i].roomNo === roomNo){
                flag=1;
                clients[i].roomNo=-1;
                ctrl = 5;
                clients[i].connection.sendUTF(JSON.stringify({type: 'ctrl', data: ctrl}));
                if(clients.length%2===0){
                    gamestart(i);
                }
            }
        }

    });
});