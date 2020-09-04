/**
 *AppEmit websocket 调用程序
 * v1.0.3  多App异步 Gzip
 * 有问题反馈：appemit@appemit.com
  @license  MIT
   2020-09-03
  *部署步骤说明：
  *1、设置AE_initAppWs 函数 使用的 AE_initSet参数
  *2、关注AE_开头的函数及参数
*/ 
 

//可调整的参数                                       //$(function () { window.οnlοad=	 function () {
 
	var ws_port= [80,8617,8618,8619,8811];      //必需， [80,8617,8618,8619,8811];  ws端口。  可修改，与config.ini文件设置一致,websocket可用的未注册的端口。 依次尝试，若全部失败则在最后一个端口(不小于2000，并剔除 未指定端口排除表的端口)基础，再尝试port_try_Maxcnt次+1打开
	var wss_port=[443,7131,7132,7133,7366];      //必需，  wss端口。可修改 。同上。
	var port_try_Maxcnt=10;                                   //非必需，未指定端口最大尝试次数，可以调整为0或者 65536 不限制尝试。
	var excludePorts=[2049];                                 // 必需，未指定端口排除表，已排除小于2000的端口，可追加chrome不可用的websocket端口。只能追加。https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?&page=5
	var AE_initSet={                                                //必需。 websocket初始化参数
					"emit":"init",                                       //不可更改。
					 "clientKey": "temp-0000000000",     //【需要更改】，混淆加密本js文件，不要公开 clientKey等私密数据
				    //"OTP":"24DqU57GuWXi_q0IepZ25E60t5Ue_Cewc7P24ica3r0",   // 服务器动态生成 OTP。设置了OTP，clientKey可以不用。生成算法具体见说明书。
					//wsUrl:null,
					//  "flag":0,                                        //调试标识。默认为0生产环境 1 调试   2生产环境压缩  3 调试压缩
					//  "sid":"1",                                      // 必需。用户session 或者用户名ID，用户之间通话则必需唯一，才能互相准确通话     //sid  gid 发布后统一设置在此。在调试时也可以在wsUrl的参数里面设置
					"gid": "[1,2]",                                   //非必需。用户群(频道、子公司、组)ID，一个用户可以加入多个群(频道、子公司、组)
				   //"utf_escape":false,                         //默认false, 反馈的data编码转义
				   "test":"中文字符",
				}; 

	var AppJs_OutData={};                                     //非必需 所有的反馈结果 
	var debounce_throttle_time=80;                        //防抖 节流时间间隔 可以修改
	var rid = 0;                                                         //必需。 本次发送请求的标识 request id  ,可以修改。
 

//////////不可更改参数/////////////////
var ws=null;                                                       //必需， websocket
var AE_WS_MARK=false;                                   //必需。打开appemit服务端口标识     
var AE_AppObj={};                                          //必需。保存所有APP的固定属性 ,如果没有必要，考虑性能只打开一个APP  
var AE_SERVICE="appemit";                                
/////////////////////////////////////
 
 /*
 AE_AppObj 结构
 { AppId:                                        //AppId  1 2 3 4 5    {}表示所有  
           {Obj: "flash" ,                      //flash office comm web file...         
			  AppShow:true,                      //显示APP载体
			  AppFollow:1,                       // AppShow:true是才生效,   1  跟随 移动 变形  0否
			  pos:[l,t,w,h],                          // 保存最新绝对pos，调用参数1 追加最新绝对位置， -1 删除绝对位置， 
			  elementId:"AppEmbed1",     //多个则需要分别设置AppEmbed2 、AppEmbed3、AppEmbed4
			  AppStatus:0,                         //1已打开 0已关闭
            },
	AppId2:{...}		
 }
 */ 
 

 
 function getUrlPar(str,name) {
	var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
	var r = str.match(reg);
	if (r != null) {
	   return unescape(r[2]);
	}
	return null;
 } 
  sleep = function(time) {
    var startTime = new Date().getTime() + parseInt(time, 10);
    while(new Date().getTime() < startTime) {}
};
//解压   <script type="text/javascript" src="https://cdn.bootcss.com/pako/1.0.11/pako.min.js"></script>
 function unGzip(key) {
    var restored = pako.ungzip(key, { to: 'string' });
     return restored;
 
}

// 压缩
function Gzip(str,l,w) {
    var binaryString = pako.gzip(str, { to: 'string' ,level:6,windowBits :15});
    return binaryString;
}

///////main proc////////////////// 

//尝试下一个端口,设置的最后一个端口号依次+1，尝试port_try_cnt次

var port_try_cnt=0;
var port_default_mark =0 
var new_ports;
AE_next_wsUrlPort=function(wsUrl){
 
      if  ( !new_ports && wsUrl.match(/(ws?):/,':')[1]=="ws" ) {
		     new_ports= typeof (ws_port) =="number" ?[ws_port]:ws_port  ;
	  }else if(!new_ports && wsUrl.match(/(wss?):/,':')[1]=="wss"){
		    new_ports=typeof (wss_port) =="number" ?[wss_port]:wss_port   ;
	  }
	  //追加10个new_ports
 
	   var idx=new_ports.indexOf(Number(wsUrl.match(/:(\d+)/)[1]));

	   if  (((idx==-1 && port_default_mark) ||  idx+1==new_ports.length ) && port_try_cnt<port_try_Maxcnt)  { 
 
	      var np= (Number(wsUrl.match(/:(\d+)/)[1])+1)%65536 
		   if (np<1000) np=1000;
		    while( excludePorts.indexOf(np)>-1){   //尝试最后一个端口+1,去掉 
				np++;
			}
            wsUrl=wsUrl.replace(/:(\d+)/,':'+(np));	   
		   port_try_cnt+=1;
 
	   }else if((idx==-1 && !port_default_mark) || (idx>=0 && idx+1<new_ports.length)){
	 
		   port_default_mark=1;
	       wsUrl=wsUrl.replace(/:(\d+)/,':'+new_ports[idx+1]);	 //尝试设置好的端口
	 
	   }else{
		   console.log("请检查是否安装了AppEmit ，可用端口是否一致。Check whether appemit is installed and the available ports are consistent,please!")    
		  return null;
	   }
 
      AE_initAppWs(wsUrl)
	   //return wsUrl
}	
 
 //初始化ws
AE_initAppWs = function(wsUrl) {
 
    if (clientInfo.os !='Windows') {console.log("Not Windows!"); return false; }
 	if (clientInfo.IE_core && clientInfo.browser!=="IE" ) {console.log("Better not compatibility mode") }      //最好不要兼容模式， 360EE 不能判断。 兼容模式的浏览器存在无法监控切换tab的隐藏属性的bug
 
    if (!wsUrl) {
        console.log("No  websocket  Url");
        return false;
    }
   
 
    try {
        //ws://localhost:80/appemit?cid=00000-1&sid=1&flag=1
 
         ws = new WebSocket(wsUrl); 
 
     // 打开Socket 
        ws.onopen = function(evt) {
 
            // 发送一个初始化消息 
			AE_initSet.clientInfo=clientInfo;
			AE_initSet.wsUrl=wsUrl;
           if  ( typeof AE_initSet.flag =="undefined" ) {
			  if  ( getUrlPar(wsUrl,"flag")) { 
			      AE_initSet.flag=getUrlPar(wsUrl,"flag");
			  }else {
				  AE_initSet.flag=0;
			  }
		   }
            AE_EmitReq_PIP(AE_initSet);
			
 
        };
        // 监听消息
        ws.onmessage = function(evt) {
            var data = evt.data;
            var Jdata =null,Jdata_Json=0;
		  
			try {
			 
  		     if (AE_initSet.flag==2 || AE_initSet.flag==3 )  { data=unGzip(atob(data))}   //解压数据
			}catch(e) {
				 console.log('error：zip '+data+'  '+e);
			 	}
				
			  if (typeof data == 'string') {
						try {
							  Jdata = JSON.parse(data);
                               if  (typeof Jdata == 'object' && Jdata )  {
								    Jdata_Json=1 ;
								   if (!(Jdata.tip && Jdata.tip=="PONG") )  console.log( Jdata);    //自行修改  firefox 修正    
							   }
						} catch(e) {
							 console.log('error：JSON '+data+'  '+e);
						}
				}
				 
           if  (!Jdata_Json ) {
			   // data  instanceof Blob   pako
			   //处理接收的不是JSON字符 比如 comm串口数据或者二进制数据
			   /////////////进一步处理
			   console.log( data);
		     //var blob=new Blob([data],{"type":"application/octet-binary"}); 
			   return;  
		   }
		   
		   //处理JSON
			
  			//判断是否连接为appemit对应的ws
			 if((Jdata.code==200 && Jdata.service==AE_SERVICE )){   //判断为appemit端口连接成功
				AE_WS_MARK=true;      
				
			  if  ( clientInfo.browser=="Firefox" )       AE_EmitReq_PIP({"emit":"init","interval_Pong":3000});  //保持连接pong, firefox最好设置 返回{"tip":"PONG","rep":0}
            // AE_EmitReq_PIP({"emit":"getPar","Obj":"clientAuth" });  //获取授权信息


			}else if( !AE_WS_MARK   ) {
				
 				 if (ws) { ws.close(); }        //连接到别的程序的ws端口
         
				 AE_next_wsUrlPort(wsUrl)
    
			}
				 
            if (Jdata.AppStatus == 1 && Jdata.service==AE_SERVICE && Jdata.AppId) {
                 AE_AppObj[Jdata.AppId].AppStatus = 1;
			   //Yandex 不稳定
 
		  }else if(Jdata.AppStatus == 0 && Jdata.service==AE_SERVICE && Jdata.AppId){
				 AE_AppObj[Jdata.AppId].AppStatus = 0;
			}
			//保存数据
 		    if (Jdata.rid && Jdata.data  ) {  //typeof Jdata.rid === 'number' && !isNaN(Jdata.rid) 
				   /////////////进一步处理
				//console.log(Jdata)
				AppJs_OutData[Jdata.rid]= Jdata ;       // 反馈结果data 可以修改
			}
 
		   
            AppEmbedOut = document.getElementById("AppEmbedOut");
            if (AppEmbedOut   && !Jdata.tip   ) {     //   && !Jdata.tip   提示信息不显示 
                AppEmbedOut.innerHTML = data + '</br>' + AppEmbedOut.innerHTML
            }
        };
        ws.onerror = function(evt) {
            // 重新连接
		   if (ws) { ws.close(); }    
            AE_WS_MARK=false;		   
		   AE_next_wsUrlPort(wsUrl)
		  
        };
        ws.onclose = function(evt) {
			AE_WS_MARK=false;  //关闭了
			 for (key in AE_AppObj){ 
                  AE_AppObj[key].AppStatus=0;
			 }
        };

    } catch (ex) {
        console.log(ex.message);
    }
   return true;
};



//打开APP  初始化参数
AE_OpenApp = function(Req,interval,sync) {
     var interval=interval || 5; //多命令执行时间间隔
    //是否启动ws
    if (!ws || !Req)   return;
    //多命令
 
	 if (typeof (Req) =="object"  && Req.constructor != Array)  Req=[Req];
	
     for (var i = 0; i < Req.length; i++) {  //初始数据
			 if ( Req[i]["emit"]=="open" || Req[i]["emit"]=="login"   ) {    //新开
				 if (!Req[i].Obj  ) return;
					if (typeof Req[i].AppId== "undefined")  Req[i].AppId=(i+1);   //key 123
					 
					if ( AE_AppObj[Req[i].AppId] && AE_AppObj[Req[i].AppId]["AppStatus"]) {   //重新打开 
						   AE_EmitReq_PIP({ "emit": "close","Obj":Req[i].Obj,"AppId":Req[i].AppId});
						   sleep(200) //等待关闭
					  }
					  
					if ( typeof Req[i].AppShow =="undefined") Req[i].AppShow=true;//默认可视化控件
					if ( typeof Req[i].AppFollow =="undefined") Req[i].AppFollow=1;//默认可视化控件跟随 移动变形1 
			 
					AE_AppObj[Req[i].AppId] ={Obj: Req[i].Obj ,  //flash office comm web
											   AppId : Req[i].AppId,  
											   AppShow: Req[i].AppShow,           
											   AppFollow: Req[i].AppFollow,
											   pos:Req[i].pos,    //需要变化
											  elementId: Req[i].elementId || ("AppEmbed" +(i+1)),
											  AppStatus:(typeof Req[i].AppStatus =="undefined")?0:Req[i].AppStatus,    
											}
				 
					 interval=200;   //新开间隔时间长一些
			   }	
				 if ( Req[i]["emit"]=="runCmd" || Req[i]["emit"]=="close"){  //默认执行 、关闭第一个
					if (typeof Req[i].AppId== "undefined")  Req[i].AppId=(i+1);   //key
				}	 
  }
	 
  if (!sync ){  //异步处理
	   AE_EmitReq_PIP(Req,null,null, interval);
    }else{   //同步处理
       AE_EmitReq_PIP_sync(Req)
	  }
};

//  同步处理
 AE_OpenApp_sync=function(Req){
	 AE_OpenApp(Req,null,1) 
	 
 }
 
 

/////////////AE_Emit //////////////////////////////////////////////////////////		
// 直接发送命令
 AE_Emit_wsSend=function(Par,gzip){
	  var msg;
 
	    if (typeof (Par["rid"]) =="undefined")   Par["rid"] = rid;   //没有定义则自动增加
		  msg= JSON.stringify(Par);   //默认json  
 	    if  (AE_initSet.flag==2 || AE_initSet.flag==3 || gzip) {
             msg=   btoa(Gzip(msg));
		}
	 
		 if (ws && ws.readyState == 1 && msg) {
		  rid++;
		 ws.send(msg);
	  }
	 
 }
 


/*
 可以追加参数多条命令, 异步处理发送消息 ,前一条消息执行后就执行下一条消息
 Par   发送数据
 AppId 追加App对象AppId,   AppId={}表示所有
 pos  1追加最新 位置  -1删除位置数据
 interval 多条命令时间间隔
 */
AE_EmitReq_PIP = function(Par, AppId, pos,interval) {
	
    if (!Par)  return;

    //多命令
	interval=interval ||  80;        //毫秒 .太小的话,在需要异步处理的office 或者wps处理消息可能会遗漏，不同程序请测试. 或者不使用数组多命令异步执行
	if (typeof (Par) =="object"  && Par.constructor == Array) {
		 for (var i = 0; i < Par.length; i++) {
	       setTimeout(  function ( Pari) {  AE_EmitReq_PIP(Pari)},interval*i,Par[i]);  
		 }
		 return;
	} 
	// 一条命令
	 
    if (AppId){  
				for (id  in AE_AppObj) {       //所有的APP对象
					  if ( typeof AppId !="object" && AppId!=id   )   continue; //  AppId

					 var Pari= Object.assign({},Par,AE_AppObj[id]) 
				
				   if ((pos==1 || Par["pos"] ==1)   && Pari["elementId"])  {   //更新为动态位置
				     Pari["pos"] = GetAbsoluteLocationEx(id)["pos"];
				    }else if (pos==-1 || Par["pos"] ==-1) {
						Pari["pos"] =null;
					}
				 
				  AE_Emit_wsSend(Pari);
			  } 

	} else {
		 //没有考虑追加对象属性，直接发送
		  if  ((pos==1 || Par["pos"] ==1)  && (Par.AppId && AE_AppObj[Par.AppId]["elementId"]))  {
                Par["pos"] = GetAbsoluteLocationEx(Par.AppId)["pos"];
		  }else if (pos==-1 || Par["pos"] ==-1) {
						Par["pos"] =null;
					}
		 AE_Emit_wsSend(Par);
	}
};

//同步发送消息数组 sync ，在此消息组内，等前一条消息执行完成，再执行下一条消息. 但是不同消息组之间仍是异步关系
//需要考虑性能问题和阻塞.  二维数组  消息数*App个数
 //AppId 追加App对象AppId,   AppId={}表示所有
 // pos  1追加最新 位置
AE_EmitReq_PIP_sync = function(Par,AppId,pos) {
    if (!Par)  return;
	
  	if (typeof (Par) =="object"  && Par.constructor !== Array)  Par=[Par];

	      var ParijPos={};
		for (var i = 0; i < Par.length; i++) {
			     if (!Par[i]["rid"])   Par[i]["rid"] = rid;    //  数组内所有消息的rid相同
				if (AppId){    // 变为 i*id的数组   
							  var Parij=new Array();
							for (id  in AE_AppObj) {       //所有的APP对象
								  if ( typeof AppId !="object" && AppId!=id   )   continue; //  AppId
								 
 									   if ((pos==1 || Par[i]["pos"] ==1)   && AE_AppObj[id]["elementId"] )  {   //更新为动态位置
								            if (!ParijPos[id])   ParijPos[id]= GetAbsoluteLocationEx(id)["pos"];
							            } else if (pos==-1 || Par[i]["pos"] ==-1) {
						                    ParijPos[id] =null;
					                    }else if (AE_AppObj[id].pos){  //使用原有的位置
											ParijPos[id] =AE_AppObj[id].pos
											
										}
							     Parij.push(Object.assign({},Par[i],AE_AppObj[id]),{pos:ParijPos[id]} )
								  
						     } 
                          Par[i]= Parij;
						 
				}else {		//没有考虑追加对象属性，直接发送
					  if  ((pos==1 || Par[i]["pos"] ==1)  && (Par[i].AppId && AE_AppObj[Par[i].AppId]["elementId"]))  {
							Par[i]["pos"] = GetAbsoluteLocationEx(Par[i].AppId)["pos"];
					  } else if (pos==-1 || Par[i]["pos"] ==-1) {
						 Par[i]["pos"]  =null;
					}
				}
             
		 }
		 
         AE_Emit_wsSend(Par);
};

var _0x42c1=['Chrome','MSIE','Trident','Edge','FxiOS','Focus','Chromium','OPR','YaBrowser','QupZilla','coc_coc_browser','Kindle','Silk/','Iceweasel','Iceape','Epiphany','QihooBrowser','QHBrowser','360EE','\x20UBrowser','Baidu','BIDUBrowser','baiduboxapp','MetaSr','Mb2345Browser','TheWorld','MiuiBrowser','Quark','MicroMessenger','AliApp(TB','AliApp(AP','Weibo','com.douban.frodo','SNEBUY-APP','IqiyiApp','HuaweiBrowser','HUAWEI','VivoBrowser','Windows','Linux','X11','Android','FreeBSD','Debian','IEMobile','Windows\x20Phone','BlackBerry','RIM','MeeGo','Symbian','like\x20Mac\x20OS\x20X','CrOS','hpwOS','Mobi','iPh','480','Tablet','Nexus\x207','type','application/360softmgrplugin','application/mozilla-npqihooquicklogin','application/vnd.chromium.remoting-viewer','application/hwepass2001.installepass2001','application/asx','Mobile','application/gameplugin','360SE','connection','saveData','iOS','WebKit','Gecko','Vivaldi','Arora','Lunascape','Coc\x20Coc','Konqueror','SeaMonkey','Vivo','Huawei','115Browser','Qiyu','Wechat','Alipay','Douban','Suning','DingTalk','Mac\x20OS','Ubuntu','Chrome\x20OS','WebOS','device','language','browserLanguage','split','toUpperCase','join','8.1','Vista','2000','osVersion','12.1','11.1','10.0','9.1','8.0','7.0','6.3','11.0','9.5','9.0','8.7','7.5','5.3','5.2','5.0','4.5','4.0','userAgent','9.9','version','match','engine','Blink','EdgeHTML','IE_core','ActiveXObject','assign','Cannot\x20convert\x20undefined\x20or\x20null\x20to\x20object','prototype','hasOwnProperty','call','onbeforeunload','close','addEventListener','mousemove','attachEvent','onmousemove','event','screenX','screen','devicePixelRatio','browser','deviceXDPI','logicalXDPI','outerWidth','innerWidth','outerHeight','innerHeight','length','offsetLeft','offsetHeight','Sogou','LBBROWSER','screenLeft','QQBrowser','Maxthon','screenTop','screenY','offsetParent','position','relative','style','visible','overflow','offsetTop','Firefox','Opera','2345Explorer','Yandex','round','pos','pageXOffset','compatMode','documentElement','body','scrollLeft','pageYOffset','scrollTop','now','apply','keys','PageOffsety','height','hide','width','show','onscroll','onresize','AppStatus','AppShow','move','hidden','Hidden','webkit','moz','visibilityState','VisibilityState','replace','onvisibilitychange','toElement','mouseout','onmouseout','function','amd','cmd','exports','Browser','undefined','navigator','mimeTypes','indexOf','NET\x20CLR','Presto','AppleWebKit','Gecko/','Safari'];(function(_0x3b68e1,_0x42c17f){var _0x5c18a5=function(_0x5d1317){while(--_0x5d1317){_0x3b68e1['push'](_0x3b68e1['shift']());}};_0x5c18a5(++_0x42c17f);}(_0x42c1,0x15d));var _0x5c18=function(_0x3b68e1,_0x42c17f){_0x3b68e1=_0x3b68e1-0x0;var _0x5c18a5=_0x42c1[_0x3b68e1];return _0x5c18a5;};window[_0x5c18('0x0')]=function(_0x5d1317){for(key in AE_AppObj){if(AE_AppObj[key]['AppStatus'])AE_EmitReq_PIP({'emit':_0x5c18('0x1')},key);}ws&&ws[_0x5c18('0x1')]();};var MousebodyOffset=null;function getBodyOffset(){if(window[_0x5c18('0x2')])document[_0x5c18('0x2')](_0x5c18('0x3'),getScreenPx,![]);else{if(window[_0x5c18('0x4')])document[_0x5c18('0x4')](_0x5c18('0x5'),getScreenPx);}}function getScreenPx(_0x2df35a){var _0x2df35a=window[_0x5c18('0x6')]||_0x2df35a;MousebodyOffset=[_0x2df35a[_0x5c18('0x7')]-_0x2df35a['clientX'],_0x2df35a['screenY']-_0x2df35a['clientY']];}function GetRatio(){var _0x156b1d=0x1,_0x3fb8d2=window[_0x5c18('0x8')];if(window['devicePixelRatio']!==undefined)_0x156b1d=window[_0x5c18('0x9')];else{if(clientInfo[_0x5c18('0xa')]=='IE')_0x3fb8d2[_0x5c18('0xb')]&&_0x3fb8d2[_0x5c18('0xc')]&&(_0x156b1d=_0x3fb8d2[_0x5c18('0xb')]/_0x3fb8d2[_0x5c18('0xc')]);else window[_0x5c18('0xd')]!==undefined&&window[_0x5c18('0xe')]!==undefined&&(_0x156b1d=window[_0x5c18('0xd')]/window[_0x5c18('0xe')]);}return _0x156b1d;}var menuHeight=window[_0x5c18('0xf')]-window[_0x5c18('0x10')];function GetAbsoluteLocationEx(_0x540a44){var _0xc510a6=_0x540a44||0x1;if(!(AE_AppObj[_0xc510a6]&&AE_AppObj[_0xc510a6]['elementId']))return;var _0x18e305=document['getElementById'](AE_AppObj[_0xc510a6]['elementId']),_0xe53891=GetRatio();if(arguments[_0x5c18('0x11')]!=0x1||_0x18e305==null)return null;var _0x8a213c=_0x18e305,_0x49ae6a=_0x8a213c['offsetTop'],_0x100c86=_0x8a213c[_0x5c18('0x12')],_0x237e9c=_0x8a213c['offsetWidth'],_0x42a65b=_0x8a213c[_0x5c18('0x13')],_0x198453=0x0,_0x1a3b34=0x0;!MousebodyOffset&&getBodyOffset();MousebodyOffset&&(menuHeight=MousebodyOffset[0x1]);if(menuHeight>0x6e)menuHeight=0x67;_0x198453=clientInfo[_0x5c18('0xa')]=='IE'||clientInfo[_0x5c18('0xa')]=='QQBrowser'||clientInfo[_0x5c18('0xa')]==_0x5c18('0x14')||clientInfo['browser']=='Maxthon'||clientInfo[_0x5c18('0xa')]==_0x5c18('0x15')?window[_0x5c18('0x16')]:window[_0x5c18('0x7')],_0x1a3b34=clientInfo[_0x5c18('0xa')]=='IE'||clientInfo[_0x5c18('0xa')]==_0x5c18('0x17')||clientInfo[_0x5c18('0xa')]==_0x5c18('0x14')||clientInfo[_0x5c18('0xa')]==_0x5c18('0x18')||clientInfo[_0x5c18('0xa')]==_0x5c18('0x15')?window[_0x5c18('0x19')]:window[_0x5c18('0x1a')]+menuHeight;while(_0x8a213c=_0x8a213c[_0x5c18('0x1b')]){if(_0x8a213c['style'][_0x5c18('0x1c')]=='absolute'||_0x8a213c['style'][_0x5c18('0x1c')]==_0x5c18('0x1d')||_0x8a213c[_0x5c18('0x1e')]['overflow']!=_0x5c18('0x1f')&&_0x8a213c['style'][_0x5c18('0x20')]!='')break;_0x49ae6a+=_0x8a213c[_0x5c18('0x21')],_0x100c86+=_0x8a213c[_0x5c18('0x12')];}var _0x250cd3=GetPageOffset();if(clientInfo[_0x5c18('0xa')]==_0x5c18('0x22'))_0x198453+=0xa,_0x1a3b34+=0x8;else(clientInfo[_0x5c18('0xa')]==_0x5c18('0x23')||clientInfo[_0x5c18('0xa')]==_0x5c18('0x24')||clientInfo[_0x5c18('0xa')]==_0x5c18('0x25'))&&(_0x198453+=0x2c);;if(clientInfo[_0x5c18('0xa')]=='IE')_0x1a3b34=Math[_0x5c18('0x26')](_0x1a3b34*_0xe53891);if(clientInfo[_0x5c18('0xa')]=='IE')_0x198453=Math[_0x5c18('0x26')](_0x198453*_0xe53891);_0x49ae6a=Math[_0x5c18('0x26')](_0x49ae6a*_0xe53891),_0x100c86=Math['round'](_0x100c86*_0xe53891),_0x250cd3['x']=Math[_0x5c18('0x26')](_0x250cd3['x']*_0xe53891),_0x250cd3['y']=Math[_0x5c18('0x26')](_0x250cd3['y']*_0xe53891);var _0x517e38={'pos':{'left':_0x100c86>=_0x250cd3['x']?_0x100c86+_0x198453-_0x250cd3['x']:_0x198453,'top':_0x49ae6a>=_0x250cd3['y']?_0x49ae6a+_0x1a3b34-_0x250cd3['y']:_0x1a3b34,'width':Math[_0x5c18('0x26')](_0x237e9c*_0xe53891),'height':Math[_0x5c18('0x26')](_0x42a65b*_0xe53891)},'offsetLeft':_0x100c86,'offsetTop':_0x49ae6a,'PageOffsetx':_0x250cd3['x'],'PageOffsety':_0x250cd3['y']};return AE_AppObj[_0xc510a6][_0x5c18('0x27')]=_0x517e38['pos'],_0x517e38;}function GetPageOffset(){var _0x206719=window[_0x5c18('0x28')]!==undefined,_0x34a213=(document[_0x5c18('0x29')]||'')==='CSS1Compat',_0x1dc951=_0x206719?window[_0x5c18('0x28')]:_0x34a213?document[_0x5c18('0x2a')]['scrollLeft']:document[_0x5c18('0x2b')][_0x5c18('0x2c')],_0x3d0bb7=_0x206719?window[_0x5c18('0x2d')]:_0x34a213?document['documentElement'][_0x5c18('0x2e')]:document[_0x5c18('0x2b')][_0x5c18('0x2e')];return{'x':_0x1dc951,'y':_0x3d0bb7};}function throttle(_0x44b512,_0x42d60f,_0x2d7579){if(_0x2d7579===0x1)var _0x17cab2=0x0;else{if(_0x2d7579===0x2)var _0x455afa;}return function(){var _0x1376a8=this,_0x53fd42=arguments;if(_0x2d7579===0x1){var _0x373ca5=Date[_0x5c18('0x2f')]();_0x373ca5-_0x17cab2>_0x42d60f&&(_0x44b512[_0x5c18('0x30')](_0x1376a8,_0x53fd42),_0x17cab2=_0x373ca5);}else _0x2d7579===0x2&&(!_0x455afa&&(_0x455afa=setTimeout(function(){_0x455afa=null,_0x44b512[_0x5c18('0x30')](_0x1376a8,_0x53fd42);},_0x42d60f)));};}function debounce(_0x336ec2,_0x14d9ad,_0x4aa4f3){var _0x11d6c5;return function(){var _0x4febe2=this,_0x5ea783=arguments;if(_0x11d6c5)clearTimeout(_0x11d6c5);if(_0x4aa4f3){var _0x5d7c8b=!_0x11d6c5;_0x11d6c5=setTimeout(function(){_0x11d6c5=null;},_0x14d9ad);if(_0x5d7c8b)_0x336ec2[_0x5c18('0x30')](_0x4febe2,_0x5ea783);}else _0x11d6c5=setTimeout(function(){_0x336ec2[_0x5c18('0x30')](_0x4febe2,_0x5ea783);},_0x14d9ad);};}function scrollApp(_0x55a23c,_0x246ecc){var _0x568040=Object[_0x5c18('0x31')](AE_AppObj)['length']>0x1?_0x246ecc||0.3:_0x55a23c||0.7;for(key in AE_AppObj){var _0x165694=GetAbsoluteLocationEx(key);if(!_0x165694)return;if(_0x165694[_0x5c18('0x32')]>_0x165694[_0x5c18('0x21')]+_0x165694[_0x5c18('0x27')][_0x5c18('0x33')]*_0x568040)AE_AppMoveResize(_0x5c18('0x34'),key,_0x165694[_0x5c18('0x27')]);else _0x165694['PageOffsetx']>_0x165694[_0x5c18('0x12')]+_0x165694[_0x5c18('0x27')][_0x5c18('0x35')]*_0x568040?AE_AppMoveResize('hide',key,_0x165694[_0x5c18('0x27')]):AE_AppMoveResize(_0x5c18('0x36'),key,_0x165694[_0x5c18('0x27')]);}}var deb_scrollApp=debounce(scrollApp,debounce_throttle_time,!![]),thr_scrollApp=throttle(scrollApp,debounce_throttle_time,0x2);window[_0x5c18('0x37')]=function(){var _0x137801=thr_scrollApp();},window[_0x5c18('0x38')]=function(){for(key in AE_AppObj){AE_AppObj[key]['AppFollow']&&AE_AppObj[key][_0x5c18('0x39')]&&AE_AppObj[key][_0x5c18('0x3a')]&&document['visibilityState']==_0x5c18('0x1f')&&AE_EmitReq_PIP({'emit':_0x5c18('0x3b')},key,0x1);}},AE_AppMoveResize=function(_0x98ea8c,_0x3f4b67,_0x219743){var _0x98ea8c=_0x98ea8c||_0x5c18('0x3b'),_0xcc13cd={'emit':_0x98ea8c,'pos':_0x219743};for(key in AE_AppObj){if(typeof _0x3f4b67!='object'&&_0x3f4b67!=key)continue;AE_AppObj[key][_0x5c18('0x39')]&&AE_AppObj[key]['AppFollow']&&AE_AppObj[key][_0x5c18('0x3a')]&&AE_EmitReq_PIP(_0xcc13cd,key);}},funcVisibilitychange=function(){document['visibilityState']!==_0x5c18('0x1f')||document[_0x5c18('0x3c')]==!![]?AE_AppMoveResize(_0x5c18('0x34'),{},-0x1):AE_AppMoveResize(_0x5c18('0x36'),{},-0x1);};function getHiddenProp(){var _0x48a577=['webkit','moz','ms','o'];if(_0x5c18('0x3c')in document)return _0x5c18('0x3c');for(var _0x5cb291=0x0;_0x5cb291<_0x48a577[_0x5c18('0x11')];_0x5cb291++){if(_0x48a577[_0x5cb291]+_0x5c18('0x3d')in document)return _0x48a577[_0x5cb291]+_0x5c18('0x3d');}return null;}function getVisibilityState(){var _0x39f821=[_0x5c18('0x3e'),_0x5c18('0x3f'),'ms','o'];if(_0x5c18('0x40')in document)return _0x5c18('0x40');for(var _0x336707=0x0;_0x336707<_0x39f821[_0x5c18('0x11')];_0x336707++){if(_0x39f821[_0x336707]+_0x5c18('0x41')in document)return _0x39f821[_0x336707]+_0x5c18('0x41');}return null;}function isHidden(){var _0x4ca92f=getHiddenProp();if(!_0x4ca92f)return![];return document[_0x4ca92f];}var visProp=getHiddenProp();if(visProp){if(document['addEventListener'])document[_0x5c18('0x2')](visProp['replace'](/[H|h]idden/,'')+'visibilitychange',funcVisibilitychange,![]);else document[_0x5c18('0x4')]&&document['attachEvent'](visProp[_0x5c18('0x42')](/[H|h]idden/,'')+_0x5c18('0x43'),funcVisibilitychange);}var interval,oldX=clientInfo&&clientInfo[_0x5c18('0xa')]=='IE'?window[_0x5c18('0x16')]:window[_0x5c18('0x7')],oldY=clientInfo&&clientInfo[_0x5c18('0xa')]=='IE'?window[_0x5c18('0x19')]:window[_0x5c18('0x1a')];funcMouseout=function(_0x35d35c){(_0x35d35c[_0x5c18('0x44')]===null||_0x35d35c[_0x5c18('0x44')]===undefined)&&_0x35d35c['relatedTarget']===null?interval=setInterval(function(){(oldX!=(clientInfo['browser']=='IE'?window[_0x5c18('0x16')]:window[_0x5c18('0x7')])||oldY!=(clientInfo[_0x5c18('0xa')]=='IE'?window[_0x5c18('0x19')]:window['screenY']))&&AE_AppMoveResize(_0x5c18('0x3b'),{},0x1),oldX=clientInfo[_0x5c18('0xa')]=='IE'?window[_0x5c18('0x16')]:window['screenX'],oldY=clientInfo[_0x5c18('0xa')]=='IE'?window[_0x5c18('0x19')]:window[_0x5c18('0x1a')];},0x12c):clearInterval(interval);};if(window['addEventListener'])window[_0x5c18('0x2')](_0x5c18('0x45'),funcMouseout,![]);else window[_0x5c18('0x4')]&&window[_0x5c18('0x4')](_0x5c18('0x46'),funcMouseout);;(function(_0x1f52b7,_0x4bf5a4){if(typeof define===_0x5c18('0x47')&&(define[_0x5c18('0x48')]||define[_0x5c18('0x49')]))define(function(){return _0x4bf5a4(_0x1f52b7);});else typeof exports==='object'?module[_0x5c18('0x4a')]=_0x4bf5a4(_0x1f52b7):_0x1f52b7[_0x5c18('0x4b')]=_0x4bf5a4(_0x1f52b7);}(typeof self!==_0x5c18('0x4c')?self:this,function(_0x424f30){var _0x7bfb59=_0x424f30||{},_0xc633bf=typeof _0x424f30[_0x5c18('0x4d')]!=_0x5c18('0x4c')?_0x424f30[_0x5c18('0x4d')]:{},_0x4ee40d=function(_0x3a722f,_0x46223c){var _0x2732d4=_0xc633bf[_0x5c18('0x4e')];for(var _0x171071 in _0x2732d4){if(_0x2732d4[_0x171071][_0x3a722f]==_0x46223c)return!![];}return![];};return function(_0x55ffc2){var _0x3bba0f=_0x55ffc2||_0xc633bf['userAgent']||{},_0xcf0e35=this,_0x307abd={'Trident':_0x3bba0f[_0x5c18('0x4f')]('Trident')>-0x1||_0x3bba0f['indexOf'](_0x5c18('0x50'))>-0x1,'Presto':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x51'))>-0x1,'WebKit':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x52'))>-0x1,'Gecko':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x53'))>-0x1,'Safari':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x54'))>-0x1,'Chrome':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x55'))>-0x1||_0x3bba0f[_0x5c18('0x4f')]('CriOS')>-0x1,'IE':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x56'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x57'))>-0x1,'Edge':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x58'))>-0x1||_0x3bba0f[_0x5c18('0x4f')]('Edg/')>-0x1,'Firefox':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x22'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x59'))>-0x1,'Firefox\x20Focus':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x5a'))>-0x1,'Chromium':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x5b'))>-0x1,'Opera':_0x3bba0f['indexOf'](_0x5c18('0x23'))>-0x1||_0x3bba0f['indexOf'](_0x5c18('0x5c'))>-0x1,'Vivaldi':_0x3bba0f[_0x5c18('0x4f')]('Vivaldi')>-0x1,'Yandex':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x5d'))>-0x1,'Arora':_0x3bba0f[_0x5c18('0x4f')]('Arora')>-0x1,'Lunascape':_0x3bba0f['indexOf']('Lunascape')>-0x1,'QupZilla':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x5e'))>-0x1,'Coc\x20Coc':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x5f'))>-0x1,'Kindle':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x60'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x61'))>-0x1,'Iceweasel':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x62'))>-0x1,'Konqueror':_0x3bba0f[_0x5c18('0x4f')]('Konqueror')>-0x1,'Iceape':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x63'))>-0x1,'SeaMonkey':_0x3bba0f['indexOf']('SeaMonkey')>-0x1,'Epiphany':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x64'))>-0x1,'360':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x65'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x66'))>-0x1,'360EE':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x67'))>-0x1,'360SE':_0x3bba0f[_0x5c18('0x4f')]('360SE')>-0x1,'UC':_0x3bba0f[_0x5c18('0x4f')]('UC')>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x68'))>-0x1,'QQBrowser':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x17'))>-0x1,'QQ':_0x3bba0f['indexOf']('QQ/')>-0x1,'Baidu':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x69'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x6a'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x6b'))>-0x1,'Maxthon':_0x3bba0f[_0x5c18('0x4f')]('Maxthon')>-0x1,'Sogou':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x6c'))>-0x1||_0x3bba0f[_0x5c18('0x4f')]('Sogou')>-0x1,'LBBROWSER':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x15'))>-0x1,'2345Explorer':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x24'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x6d'))>-0x1,'115Browser':_0x3bba0f[_0x5c18('0x4f')]('115Browser')>-0x1,'TheWorld':_0x3bba0f['indexOf'](_0x5c18('0x6e'))>-0x1,'XiaoMi':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x6f'))>-0x1,'Quark':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x70'))>-0x1,'Qiyu':_0x3bba0f[_0x5c18('0x4f')]('Qiyu')>-0x1,'Wechat':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x71'))>-0x1,'Taobao':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x72'))>-0x1,'Alipay':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x73'))>-0x1,'Weibo':_0x3bba0f['indexOf'](_0x5c18('0x74'))>-0x1,'Douban':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x75'))>-0x1,'Suning':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x76'))>-0x1,'iQiYi':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x77'))>-0x1,'DingTalk':_0x3bba0f[_0x5c18('0x4f')]('DingTalk')>-0x1,'Huawei':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x78'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x79'))>-0x1,'Vivo':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x7a'))>-0x1,'Windows':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x7b'))>-0x1,'Linux':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x7c'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x7d'))>-0x1,'Mac\x20OS':_0x3bba0f[_0x5c18('0x4f')]('Macintosh')>-0x1,'Android':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x7e'))>-0x1||_0x3bba0f['indexOf']('Adr')>-0x1,'Ubuntu':_0x3bba0f[_0x5c18('0x4f')]('Ubuntu')>-0x1,'FreeBSD':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x7f'))>-0x1,'Debian':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x80'))>-0x1,'Windows\x20Phone':_0x3bba0f['indexOf'](_0x5c18('0x81'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x82'))>-0x1,'BlackBerry':_0x3bba0f['indexOf'](_0x5c18('0x83'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x84'))>-0x1,'MeeGo':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x85'))>-0x1,'Symbian':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x86'))>-0x1,'iOS':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x87'))>-0x1,'Chrome\x20OS':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x88'))>-0x1,'WebOS':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x89'))>-0x1,'Mobile':_0x3bba0f['indexOf'](_0x5c18('0x8a'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x8b'))>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x8c'))>-0x1,'Tablet':_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x8d'))>-0x1||_0x3bba0f['indexOf']('Pad')>-0x1||_0x3bba0f[_0x5c18('0x4f')](_0x5c18('0x8e'))>-0x1},_0x4065c2=![];if(_0x7bfb59['chrome']){var _0x36bcfd=_0x3bba0f[_0x5c18('0x42')](/^.*Chrome\/([\d]+).*$/,'$1');if(_0x7bfb59['chrome']['adblock2345']||_0x7bfb59['chrome']['common2345'])_0x307abd[_0x5c18('0x24')]=!![];else{if(_0x4ee40d(_0x5c18('0x8f'),_0x5c18('0x90'))||_0x4ee40d(_0x5c18('0x8f'),_0x5c18('0x91')))_0x4065c2=!![];else{if(_0x36bcfd>0x24&&_0x7bfb59['showModalDialog'])_0x4065c2=!![];else _0x36bcfd>0x2d&&(_0x4065c2=_0x4ee40d(_0x5c18('0x8f'),_0x5c18('0x92')),!_0x4065c2&&_0x36bcfd>=0x45&&(_0x4065c2=_0x4ee40d('type',_0x5c18('0x93'))||_0x4ee40d('type',_0x5c18('0x94'))));}}}if(_0x307abd[_0x5c18('0x95')])_0x307abd[_0x5c18('0x95')]=!(_0x3bba0f[_0x5c18('0x4f')]('iPad')>-0x1);else{if(_0x4065c2){if(_0x4ee40d(_0x5c18('0x8f'),_0x5c18('0x96')))_0x307abd[_0x5c18('0x97')]=!![];else _0xc633bf&&typeof _0xc633bf[_0x5c18('0x98')]!==_0x5c18('0x4c')&&typeof _0xc633bf['connection'][_0x5c18('0x99')]==_0x5c18('0x4c')?_0x307abd[_0x5c18('0x97')]=!![]:_0x307abd[_0x5c18('0x67')]=!![];}}if(_0x307abd['IE']||_0x307abd[_0x5c18('0x58')]){var _0xbbaf56=window[_0x5c18('0x19')]-window['screenY'];switch(_0xbbaf56){case 0x47:case 0x63:case 0x66:_0x307abd[_0x5c18('0x67')]=!![];break;case 0x4b:case 0x69:case 0x68:_0x307abd['360SE']=!![];break;}}if(_0x307abd[_0x5c18('0x69')]&&_0x307abd[_0x5c18('0x23')])_0x307abd[_0x5c18('0x69')]=![];else _0x307abd[_0x5c18('0x9a')]&&(_0x307abd['Safari']=!![]);var _0x3f0cab={'engine':[_0x5c18('0x9b'),_0x5c18('0x57'),_0x5c18('0x9c'),_0x5c18('0x51')],'browser':[_0x5c18('0x54'),_0x5c18('0x55'),'Edge','IE',_0x5c18('0x22'),'Firefox\x20Focus',_0x5c18('0x5b'),_0x5c18('0x23'),_0x5c18('0x9d'),_0x5c18('0x25'),_0x5c18('0x9e'),_0x5c18('0x9f'),_0x5c18('0x5e'),_0x5c18('0xa0'),_0x5c18('0x60'),_0x5c18('0x62'),_0x5c18('0xa1'),_0x5c18('0x63'),_0x5c18('0xa2'),_0x5c18('0x64'),'XiaoMi',_0x5c18('0xa3'),'360',_0x5c18('0x97'),_0x5c18('0x67'),'UC',_0x5c18('0x17'),'QQ',_0x5c18('0xa4'),_0x5c18('0x69'),_0x5c18('0x18'),_0x5c18('0x14'),_0x5c18('0x15'),'2345Explorer',_0x5c18('0xa5'),_0x5c18('0x6e'),_0x5c18('0x70'),_0x5c18('0xa6'),_0x5c18('0xa7'),'Taobao',_0x5c18('0xa8'),_0x5c18('0x74'),_0x5c18('0xa9'),_0x5c18('0xaa'),'iQiYi',_0x5c18('0xab')],'os':['Windows','Linux',_0x5c18('0xac'),'Android',_0x5c18('0xad'),_0x5c18('0x7f'),_0x5c18('0x80'),_0x5c18('0x9a'),_0x5c18('0x82'),'BlackBerry',_0x5c18('0x85'),_0x5c18('0x86'),_0x5c18('0xae'),_0x5c18('0xaf')],'device':[_0x5c18('0x95'),_0x5c18('0x8d')]};_0xcf0e35[_0x5c18('0xb0')]='PC',_0xcf0e35[_0x5c18('0xb1')]=function(){var _0x213894=_0xc633bf[_0x5c18('0xb2')]||_0xc633bf[_0x5c18('0xb1')],_0x342ace=_0x213894[_0x5c18('0xb3')]('-');return _0x342ace[0x1]&&(_0x342ace[0x1]=_0x342ace[0x1][_0x5c18('0xb4')]()),_0x342ace[_0x5c18('0xb5')]('_');}();for(var _0x13785d in _0x3f0cab){for(var _0x1aebdd=0x0;_0x1aebdd<_0x3f0cab[_0x13785d]['length'];_0x1aebdd++){var _0x1e9eab=_0x3f0cab[_0x13785d][_0x1aebdd];_0x307abd[_0x1e9eab]&&(_0xcf0e35[_0x13785d]=_0x1e9eab);}}var _0x33637c={'Windows':function(){var _0x497a2c=_0x3bba0f[_0x5c18('0x42')](/^Mozilla\/\d.0 \(Windows NT ([\d.]+);.*$/,'$1'),_0x3796c7={'10':'10','6.4':'10','6.3':_0x5c18('0xb6'),'6.2':'8','6.1':'7','6.0':_0x5c18('0xb7'),'5.2':'XP','5.1':'XP','5.0':_0x5c18('0xb8')};return _0x3796c7[_0x497a2c]||_0x497a2c;},'Android':function(){return _0x3bba0f['replace'](/^.*Android ([\d.]+);.*$/,'$1');},'iOS':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*OS ([\d_]+) like.*$/,'$1')[_0x5c18('0x42')](/_/g,'.');},'Debian':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Debian\/([\d.]+).*$/,'$1');},'Windows\x20Phone':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Windows Phone( OS)? ([\d.]+);.*$/,'$2');},'Mac\x20OS':function(){return _0x3bba0f['replace'](/^.*Mac OS X ([\d_]+).*$/,'$1')[_0x5c18('0x42')](/_/g,'.');},'WebOS':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*hpwOS\/([\d.]+);.*$/,'$1');}};_0xcf0e35[_0x5c18('0xb9')]='';_0x33637c[_0xcf0e35['os']]&&(_0xcf0e35[_0x5c18('0xb9')]=_0x33637c[_0xcf0e35['os']](),_0xcf0e35[_0x5c18('0xb9')]==_0x3bba0f&&(_0xcf0e35['osVersion']=''));var _0x456b67={'Safari':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Version\/([\d.]+).*$/,'$1');},'Chrome':function(){return _0x3bba0f['replace'](/^.*Chrome\/([\d.]+).*$/,'$1')['replace'](/^.*CriOS\/([\d.]+).*$/,'$1');},'IE':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*MSIE ([\d.]+).*$/,'$1')[_0x5c18('0x42')](/^.*rv:([\d.]+).*$/,'$1');},'Edge':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Edge\/([\d.]+).*$/,'$1')[_0x5c18('0x42')](/^.*Edg\/([\d.]+).*$/,'$1');},'Firefox':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Firefox\/([\d.]+).*$/,'$1')[_0x5c18('0x42')](/^.*FxiOS\/([\d.]+).*$/,'$1');},'Firefox\x20Focus':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Focus\/([\d.]+).*$/,'$1');},'Chromium':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Chromium\/([\d.]+).*$/,'$1');},'Opera':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Opera\/([\d.]+).*$/,'$1')[_0x5c18('0x42')](/^.*OPR\/([\d.]+).*$/,'$1');},'Vivaldi':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Vivaldi\/([\d.]+).*$/,'$1');},'Yandex':function(){return _0x3bba0f['replace'](/^.*YaBrowser\/([\d.]+).*$/,'$1');},'Arora':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Arora\/([\d.]+).*$/,'$1');},'Lunascape':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Lunascape[\/\s]([\d.]+).*$/,'$1');},'QupZilla':function(){return _0x3bba0f['replace'](/^.*QupZilla[\/\s]([\d.]+).*$/,'$1');},'Coc\x20Coc':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*coc_coc_browser\/([\d.]+).*$/,'$1');},'Kindle':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Version\/([\d.]+).*$/,'$1');},'Iceweasel':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Iceweasel\/([\d.]+).*$/,'$1');},'Konqueror':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Konqueror\/([\d.]+).*$/,'$1');},'Iceape':function(){return _0x3bba0f['replace'](/^.*Iceape\/([\d.]+).*$/,'$1');},'SeaMonkey':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*SeaMonkey\/([\d.]+).*$/,'$1');},'Epiphany':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Epiphany\/([\d.]+).*$/,'$1');},'360':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*QihooBrowser\/([\d.]+).*$/,'$1');},'360SE':function(){var _0x6b3cbc={'78':_0x5c18('0xba'),'69':_0x5c18('0xbb'),'63':_0x5c18('0xbc'),'55':_0x5c18('0xbd'),'45':'8.1','42':_0x5c18('0xbe'),'31':_0x5c18('0xbf'),'21':_0x5c18('0xc0')},_0x275a62=_0x3bba0f['replace'](/^.*Chrome\/([\d]+).*$/,'$1');return _0x6b3cbc[_0x275a62]||'';},'360EE':function(){var _0x332364={'78':'12.0','69':_0x5c18('0xc1'),'63':_0x5c18('0xc2'),'55':_0x5c18('0xc3'),'50':_0x5c18('0xc4'),'30':_0x5c18('0xc5')},_0x29d505=_0x3bba0f[_0x5c18('0x42')](/^.*Chrome\/([\d]+).*$/,'$1');return _0x332364[_0x29d505]||'';},'Maxthon':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Maxthon\/([\d.]+).*$/,'$1');},'QQBrowser':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*QQBrowser\/([\d.]+).*$/,'$1');},'QQ':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*QQ\/([\d.]+).*$/,'$1');},'Baidu':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*BIDUBrowser[\s\/]([\d.]+).*$/,'$1')['replace'](/^.*baiduboxapp\/([\d.]+).*$/,'$1');},'UC':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*UC?Browser\/([\d.]+).*$/,'$1');},'Sogou':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*SE ([\d.X]+).*$/,'$1')[_0x5c18('0x42')](/^.*SogouMobileBrowser\/([\d.]+).*$/,'$1');},'LBBROWSER':function(){var _0x5583c5={'57':'6.5','49':'6.0','46':'5.9','42':_0x5c18('0xc6'),'39':_0x5c18('0xc7'),'34':_0x5c18('0xc8'),'29':_0x5c18('0xc9'),'21':_0x5c18('0xca')},_0x22eceb=navigator[_0x5c18('0xcb')][_0x5c18('0x42')](/^.*Chrome\/([\d]+).*$/,'$1');return _0x5583c5[_0x22eceb]||'';},'2345Explorer':function(){var _0x385ce4={'69':_0x5c18('0xbc'),'55':_0x5c18('0xcc')},_0x567671=navigator[_0x5c18('0xcb')]['replace'](/^.*Chrome\/([\d]+).*$/,'$1');return _0x385ce4[_0x567671]||_0x3bba0f[_0x5c18('0x42')](/^.*2345Explorer\/([\d.]+).*$/,'$1')[_0x5c18('0x42')](/^.*Mb2345Browser\/([\d.]+).*$/,'$1');},'115Browser':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*115Browser\/([\d.]+).*$/,'$1');},'TheWorld':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*TheWorld ([\d.]+).*$/,'$1');},'XiaoMi':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*MiuiBrowser\/([\d.]+).*$/,'$1');},'Vivo':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*VivoBrowser\/([\d.]+).*$/,'$1');},'Quark':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Quark\/([\d.]+).*$/,'$1');},'Qiyu':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*Qiyu\/([\d.]+).*$/,'$1');},'Wechat':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*MicroMessenger\/([\d.]+).*$/,'$1');},'Taobao':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*AliApp\(TB\/([\d.]+).*$/,'$1');},'Alipay':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*AliApp\(AP\/([\d.]+).*$/,'$1');},'Weibo':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*weibo__([\d.]+).*$/,'$1');},'Douban':function(){return _0x3bba0f['replace'](/^.*com.douban.frodo\/([\d.]+).*$/,'$1');},'Suning':function(){return _0x3bba0f[_0x5c18('0x42')](/^.*SNEBUY-APP([\d.]+).*$/,'$1');},'iQiYi':function(){return _0x3bba0f['replace'](/^.*IqiyiVersion\/([\d.]+).*$/,'$1');},'DingTalk':function(){return _0x3bba0f['replace'](/^.*DingTalk\/([\d.]+).*$/,'$1');},'Huawei':function(){return _0x3bba0f['replace'](/^.*Version\/([\d.]+).*$/,'$1')[_0x5c18('0x42')](/^.*HuaweiBrowser\/([\d.]+).*$/,'$1');}};_0xcf0e35[_0x5c18('0xcd')]='';_0x456b67[_0xcf0e35[_0x5c18('0xa')]]&&(_0xcf0e35[_0x5c18('0xcd')]=_0x456b67[_0xcf0e35[_0x5c18('0xa')]](),_0xcf0e35[_0x5c18('0xcd')]==_0x3bba0f&&(_0xcf0e35[_0x5c18('0xcd')]=''));_0xcf0e35[_0x5c18('0xa')]==_0x5c18('0x55')&&_0x3bba0f[_0x5c18('0xce')](/\S+Browser/)&&(_0xcf0e35[_0x5c18('0xa')]=_0x3bba0f['match'](/\S+Browser/)[0x0],_0xcf0e35[_0x5c18('0xcd')]=_0x3bba0f[_0x5c18('0x42')](/^.*Browser\/([\d.]+).*$/,'$1'));if(_0xcf0e35[_0x5c18('0xa')]=='Edge')_0xcf0e35[_0x5c18('0xcd')]>'75'?_0xcf0e35[_0x5c18('0xcf')]=_0x5c18('0xd0'):_0xcf0e35[_0x5c18('0xcf')]=_0x5c18('0xd1');else{if(_0x307abd[_0x5c18('0x55')]&&_0xcf0e35[_0x5c18('0xcf')]==_0x5c18('0x9b')&&parseInt(_0x456b67[_0x5c18('0x55')]())>0x1b)_0xcf0e35[_0x5c18('0xcf')]=_0x5c18('0xd0');else{if(_0xcf0e35[_0x5c18('0xa')]==_0x5c18('0x23')&&parseInt(_0xcf0e35[_0x5c18('0xcd')])>0xc)_0xcf0e35[_0x5c18('0xcf')]=_0x5c18('0xd0');else _0xcf0e35[_0x5c18('0xa')]==_0x5c18('0x25')&&(_0xcf0e35[_0x5c18('0xcf')]=_0x5c18('0xd0'));}}};}));var clientInfo=new Browser();clientInfo[_0x5c18('0xd2')]=![];(!!window[_0x5c18('0xd3')]||_0x5c18('0xd3')in window)&&(clientInfo['IE_core']=!![]);typeof Object['assign']!=_0x5c18('0x47')&&(Object[_0x5c18('0xd4')]=function(_0x5a75cd){'use strict';if(_0x5a75cd==null)throw new TypeError(_0x5c18('0xd5'));_0x5a75cd=Object(_0x5a75cd);for(var _0x33e3c9=0x1;_0x33e3c9<arguments[_0x5c18('0x11')];_0x33e3c9++){var _0x265d0b=arguments[_0x33e3c9];if(_0x265d0b!=null)for(var _0x590384 in _0x265d0b){Object[_0x5c18('0xd6')][_0x5c18('0xd7')][_0x5c18('0xd8')](_0x265d0b,_0x590384)&&(_0x5a75cd[_0x590384]=_0x265d0b[_0x590384]);}}return _0x5a75cd;});