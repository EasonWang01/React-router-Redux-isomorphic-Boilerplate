import { Redisclient } from './redis';
import crypto from 'crypto';

const payload = [{a:12,b:13},{a:12,b:13},{a:12,b:13}];

Redisclient.set("short", JSON.stringify(payload), () => {

});
Redisclient.get("short",function (err, reply) {
    console.log(JSON.parse(reply)); // Will print `OK`
});



export const socketio = (io, axios, config1) => {

//伺服器重啟時Redis初始化連線人數
Redisclient.set("connectedUserNumber",0, () => {});
Redisclient.set("chatRoomUsersList",JSON.stringify({'a':12}), () => {});

io.on('connection', function(socket){

  //使用者關閉瀏覽器
  socket.on('close', (res) => {//寫了beforeunload在client
    
    ///解密來自client加密的使用者帳號
    let decipher = crypto.createDecipher('aes-256-cbc','testkey');
    let dec = decipher.update(res,'binary','utf8');
    dec += decipher.final('utf8');
    console.log('解密的文本：' + dec);
    //將Redis 中紀錄的線上的使用者移除
    Redisclient.get("chatRoomUsersList", (err, reply) => {
      if (err) console.log(err);
      let payload = JSON.parse(reply);
      delete payload[dec];
      Redisclient.set("chatRoomUsersList",JSON.stringify(payload), (err, reply) => {
        socket.emit('chatRoomUsers',{user: payload});
        console.log(payload)
      });
    })

  })
  //使用者斷開後減少連線人數
  socket.on('disconnect', function(socket){
    Redisclient.get("connectedUserNumber",function (err, reply) {
      if (err) console.log(err);
      Redisclient.set("connectedUserNumber",parseInt(reply)-1, () => {
        console.log('連線人數'+ (parseInt(reply)-1))
      });
    });
    //線上人數資料
    // Redisclient.get("chatRoomUsersList", (err, reply) => {
    //   if (err) console.log(err);
    //   const payload = JSON.parse(reply);
    //   delete payload[]
    //   Redisclient.set("chatRoomUsersList",JSON.stringify(new1), (err, reply) => {
    //     socket.emit('chatRoomUsers',{user: new1});
    // });
  });
  //使用者連接後增加連線人數
  Redisclient.get("connectedUserNumber",function (err, reply) {
    if (err) console.log(err);
    Redisclient.set("connectedUserNumber",parseInt(reply)+1, () => {
      console.log('連線人數'+ (parseInt(reply)+1))
    });
  });

	//房間
	socket.on('mainPage',(res) => {
		socket.join('mainPage',() => {
		  console.log('join main okok')
			socket.leave('chatPage', () => {
        console.log('leave chat');
        //進入main時將使用者從聊天室使用者列表移除
				Redisclient.get("chatRoomUsersList", (err, reply) => {
        if (err) console.log(err);
        let payload = JSON.parse(reply);
        const name = res.account;
        delete payload[name];
        Redisclient.set("chatRoomUsersList",JSON.stringify(payload), (err, reply) => {
          socket.emit('chatRoomUsers',{user: payload});
          console.log(payload)
        });
			})
		});
	})
  })
	socket.on('chatPage',(res) => {
    console.log(res)
		socket.join('chatPage',() => {
		  console.log('join chat')
      //在chatRoom的所有使用者帳號
      Redisclient.get("chatRoomUsersList", (err, reply) => {
        if (err) console.log(err);
        const payload = JSON.parse(reply);
        const name = res.account;
        const new1 = Object.assign(payload, {[name]: {avatar: res.avatar }});
        Redisclient.set("chatRoomUsersList",JSON.stringify(new1), (err, reply) => {
          socket.emit('chatRoomUsers',{user: new1});
          console.log(new1)
        });
      });
			socket.leave('mainPage', () => {
				console.log('leave main')
			});
		});
	})


  //事件
  socket.on('chat',(res) => {
    socket.broadcast.to('chatPage').emit('chat',{data: res});
    socket.emit('chat',{data: res})
  })
  socket.on('login', (res) => {
    socket.join(res.account);//進入帳號為名稱的房間
  })
  socket.on('logout',(res) => {///登出時把所有同帳號使用者登出
    socket.broadcast.to(res).emit('logout');
    socket.leave(res);//離開帳號為名稱的房間

    Redisclient.get("chatRoomUsersList", (err, reply) => {
      if (err) console.log(err);
      let payload = JSON.parse(reply);
      const name = res;
      delete payload[name];
      Redisclient.set("chatRoomUsersList",JSON.stringify(payload), (err, reply) => {
        socket.emit('chatRoomUsers',{user: payload});
        console.log(payload)
      });
    })
  });
	socket.on('postArticle', function(){
		axios.get(`${config1.origin}/getArticle`)
			.then(function(response){
				socket.broadcast.to('mainPage').emit('addArticle', response.data);//broadcast傳給所有人除了自己
				socket.emit('addArticle', response.data);//加上傳給自己的socket
			}).
			catch(err => {
				console.log(err);
			})
	});
});
}