import { User, Post } from './DB.js';
import { sendMail } from './utils/mail.js';
import crypto from 'crypto';



exports.api = (app) => {


app.post('/getArticle',function(req,res){
	Post.find({}).sort({lastModify : -1})
  	.then(data => {
	  	 res.end(JSON.stringify(data))
		})
})

app.get('/getUser',function(req,res){
	User.find({account:req.session.user},{_id:0,account:1,email:1,name:1,avatar:1,RegistedDate:1,mobile:1,address:1,hobby:1,birthday:1})
		.then(data => {
			res.end(JSON.stringify(data[0]));
		})
		.catch(err => console.log(err));
})
app.get('/checkLogin',(req,res) => {
	if(typeof req.session.user === 'string') {
		res.json({ login: true });
	}
})
app.get('/userArticles/:user',(req,res) => {
	Post.find({posterAccount: req.params.user})
	.sort({PostDate : -1})
	.then(data => {
  	 res.end(JSON.stringify(data))
	})
})


app.post('*',function(req,res,next){
	if(req.connection.remoteAddress !== '127.0.0.1'){
		res.end('not local')
	}
	next();
})

app.post('/login',function(req,res){
	User.find({account:req.body.account})
		.then(data => {
			if(data[0] === undefined) {
				res.end('帳號或密碼錯誤');
			}
			if (data[0].password === req.body.password) {
			  res.cookie('ifUser',true, { maxAge: 1000 * 60 * 60 * 24 * 1, httpOnly: false });
				req.session.user = req.body.account;//將會在cookie中存入token之後token回到server取值
			  res.end('success login');
			}else{
				res.end('帳號或密碼錯誤');
			}
		})
})

app.post('/logout',function(req,res){
	res.cookie('ifUser',true, { expires: new Date() });
	req.session.user = null
	res.end();
})

app.post('/signup',function(req,res){
	User.find({account:req.body.account})
  	.then(data => {
	  	if(data[0] !== undefined){
		  	res.end('此帳號已被註冊');
				throw new Error('此帳號已被註冊');
		  }
	  })
		.then(() => {
		User.find({email:req.body.email})
			.then(data => {
				if(data[0] !== undefined){
					res.end('此信箱已被使用');
					throw new Error('信箱重複');//以此方法來中斷then,記得寫catch
				}
			})
			.then(() => {
				const md5  = crypto.createHash('md5');
				let user = new User({
					account: req.body.account,
					password: req.body.password,
					email: req.body.email,
					name: req.body.nickName,
					avatar: `http://www.gravatar.com/avatar/${md5.update(req.body.email).digest('hex')}`,
					RegistedDate: new Date(),
					mobile: '',
					address: '',
					hobby: '',
					birthday: ''
				});
				user.save()
				.catch(err => console.log(err));

				sendMail({ email: req.body.email })
				res.end('成功註冊');
			})
			.catch(err => console.log(err));
		})
		.catch(err => console.log(err));
})

app.post('/postArticle',function(req,res) {
	if(typeof req.session.user === 'string') {
		let post = new Post({
			posterAccount: req.body.account,
			posterName: req.body.name,
			title: req.body.title,
		  content: req.body.content,
			avatar: req.body.avatar,
		  PostDate: Date.now() + 1000 * 60 * 60 * 8, //因此預設為UTC+0 要改為UTC+8
			lastModify: Date.now() + 1000 * 60 * 60 * 8,
			comments: '',
			tag: req.body.tag,
		});
		post.save()
		.then(() => {
			res.end('發表文章成功');
		})
		.catch(err => {
			res.end('發表文章錯誤');
		});
	}
})

app.put('/UpdateUserInfo',(req,res) => {
	// console.log(req.body.avatar)
	// res.json({ok:'ok'})
	User.update({account: req.body.account},{
		avatar: req.body.avatar,
		name: req.body.name,
		mobile: req.body.mobile,
    address: req.body.address,
    hobby: req.body.hobby,
    birthday: req.body.birthday,
	})
	.then(() => (
		res.end('更改成功')
	))
	.catch(err => {
		res.end('更改錯誤');
	});
})

app.put('/updateArticle',(req,res) => {
	Post.update({ _id: req.body.id },{ $set : {
		"content" : req.body.content,
		"lastModify" : Date.now() + 1000 * 60 * 60 * 8
		}})
		.then(data => {
			 res.end(JSON.stringify(data))
		})
})




};
