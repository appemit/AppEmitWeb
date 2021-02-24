let stream = new MediaStream();

let suuid =null; //$('#suuid').val();

//urls
let config = {
  iceServers: [{
    urls: ["stun:stun.l.google.com:19302",'stun:stun.ekiga.net','stun:stunserver.org','stun:stun.voipstunt.com']
  }
  ],
  sdpSemantics: "unified-plan"
};

const pc = new RTCPeerConnection(config);
pc.onnegotiationneeded = handleNegotiationNeededEvent;

let log = msg => {
  document.getElementById('div').innerHTML += msg + '<br>'
}

pc.ontrack = function(event) {
  stream.addTrack(event.track);
   document.getElementById('rtspVideo').srcObject = stream;
  log(event.streams.length + ' track is delivered')
}

pc.oniceconnectionstatechange = e => log(pc.iceConnectionState)

async function handleNegotiationNeededEvent() {
  let offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  getRemoteSdp();
}

$(document).ready(function() {
	let pathname=window.location.pathname;
 
   let index = pathname.lastIndexOf("\/");
   suuid = pathname.substring(index + 1,pathname.length);
 console.log("suuid",suuid)
  if (suuid) $('#suuid' ).val(suuid);
  if (window.location.port) $('#port' ).val(window.location.port);
  $('#' + suuid).addClass('active');
 
  getCodecInfo();
});
 
 
function getCodecInfo() {
  $.get("../codec/" + suuid, function(data) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.log(e);
    } finally {
      $.each(data,function(index,value){
        pc.addTransceiver(value.Type, {
          'direction': 'sendrecv'
        })
      })
       
      sendChannel = pc.createDataChannel('foo');
      sendChannel.onclose = () => console.log('sendChannel has closed');
      sendChannel.onopen = () => {
        console.log('sendChannel has opened.');
        sendChannel.send('ping');
        setInterval(() => {
          sendChannel.send('ping');
        }, 1000)
      }
      sendChannel.onmessage = e => log(`Message from DataChannel '${sendChannel.label}' payload '${e.data}'`);
    }
  });
}

let sendChannel = null;

function getRemoteSdp() {
  $.post("../receiver/"+ suuid, {
    suuid: suuid,
    data: btoa(pc.localDescription.sdp)
  }, function(data) {
    try {
      pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: atob(data)
      }))
    } catch (e) {
      console.warn(e);
    }
  });
}