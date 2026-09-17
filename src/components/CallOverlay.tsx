import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX, 
  Settings, Monitor, Camera, Grid, 
  UserPlus, MessageSquare, Video, VideoOff,
  Phone, X, Check
} from 'lucide-react';
import { useAppStore } from '../store';
import { createCall, updateCall, addIceCandidate, subscribeToCall, deleteCall, db } from '../lib/db';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function CallOverlay() {
  const { isCalling, setIsCalling, callData, currentUser, setCallData } = useAppStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteIsSpeaking, setRemoteIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'active'>('idle');
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<string | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'calls'), 
      where('receiverId', '==', currentUser.id),
      where('status', '==', 'initiating')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (!isCalling) {
            import('../lib/db').then(({ getUsers }) => {
              getUsers().then(users => {
                const caller = users.find(u => u.id === data.callerId);
                if (caller) {
                  setCallData({ user: caller, type: 'voice' });
                  setIsCalling(true);
                  setCallStatus('ringing');
                  callIdRef.current = data.id;
                }
              });
            });
          }
        }
      });
    });

    return () => unsub();
  }, [currentUser, isCalling, setCallData, setIsCalling]);

  // Handle Call Lifecycle
  useEffect(() => {
    if (!isCalling || !callData || !currentUser) return;

    if (callStatus === 'idle') {
      const isCaller = !callIdRef.current;
      if (isCaller) {
        setCallStatus('calling');
        startCall();
      }
    }

    async function startCall() {
      const callId = [currentUser!.id, callData!.user.id].sort().join('_');
      callIdRef.current = callId;
      
      pc.current = new RTCPeerConnection(servers);
      remoteStream.current = new MediaStream();

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStream.current.getTracks().forEach((track) => {
          pc.current?.addTrack(track, localStream.current!);
        });
      } catch (err) {
        console.error("Microphone error:", err);
      }

      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream.current;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream.current;
      };

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          addIceCandidate(callId, 'caller', event.candidate.toJSON());
        }
      };

      const offerDescription = await pc.current.createOffer();
      await pc.current.setLocalDescription(offerDescription);

      await createCall(callId, currentUser!.id, callData!.user.id, {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      });

      subscribeToCall(callId, async (data) => {
        if (!pc.current) return;
        if (data.status === 'ended') {
          handleEndCall(false);
          return;
        }
        if (data.status === 'active' && callStatus !== 'active') {
          setCallStatus('active');
        }
        if (data.answer && !pc.current.currentRemoteDescription) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        if (data.receiverCandidates) {
          data.receiverCandidates.forEach((candidate: any) => {
            pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
          });
        }
      });
    }
  }, [isCalling, callData, currentUser, callStatus]);

  const acceptCall = async () => {
    if (!callIdRef.current || !currentUser) return;
    setCallStatus('active');

    pc.current = new RTCPeerConnection(servers);
    remoteStream.current = new MediaStream();

    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: isCameraOn });
      localStream.current.getTracks().forEach((track) => {
        pc.current?.addTrack(track, localStream.current!);
      });
      if (localVideoRef.current && isCameraOn) localVideoRef.current.srcObject = localStream.current;
    } catch (err) {
      console.error("Media error:", err);
    }

    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current?.addTrack(track);
      });
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream.current;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream.current;
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addIceCandidate(callIdRef.current!, 'receiver', event.candidate.toJSON());
      }
    };

    subscribeToCall(callIdRef.current, async (data) => {
      if (!pc.current) return;
      if (data.status === 'ended') {
        handleEndCall(false);
        return;
      }
      if (data.offer && !pc.current.currentRemoteDescription) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        await updateCall(callIdRef.current!, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'active'
        });
      }
      if (data.callerCandidates) {
        data.callerCandidates.forEach((candidate: any) => {
          pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
        });
      }
    });
  };

  const handleEndCall = async (shouldUpdateDb = true) => {
    const currentId = callIdRef.current;
    if (shouldUpdateDb && currentId) {
      await updateCall(currentId, { status: 'ended' });
      setTimeout(() => deleteCall(currentId), 2000);
    }
    
    localStream.current?.getTracks().forEach(t => t.stop());
    pc.current?.close();
    pc.current = null;
    setIsCalling(false);
    setCallStatus('idle');
    callIdRef.current = null;
    setIsCameraOn(false);
    setIsScreenSharing(false);
  };

  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        if (localStream.current) {
          localStream.current.addTrack(videoTrack);
          if (pc.current) {
            const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
            else pc.current.addTrack(videoTrack, localStream.current);
          }
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
        }
        setIsCameraOn(true);
      } catch (err) {
        console.error("Camera error:", err);
      }
    } else {
      const videoTrack = localStream.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStream.current?.removeTrack(videoTrack);
        setIsCameraOn(false);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.onended = () => setIsScreenSharing(false);
        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
          else pc.current.addTrack(screenTrack, stream);
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screenshare error:", err);
      }
    } else {
      setIsScreenSharing(false);
      if (isCameraOn) toggleCamera();
    }
  };

  useEffect(() => {
    localStream.current?.getAudioTracks().forEach(t => t.enabled = !isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (callStatus !== 'active') return;
    const interval = setInterval(() => {
      setIsSpeaking(Math.random() > 0.7);
      setRemoteIsSpeaking(Math.random() > 0.8);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (!isCalling || !callData) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-0 z-[3000] bg-[#1E1F22] flex flex-col overflow-hidden font-sans"
      >
        <audio ref={remoteAudioRef} autoPlay />
        
        <div className="h-12 border-b border-black/20 flex items-center justify-between px-4 bg-[#313338]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${callStatus === 'active' ? 'bg-[#23A559]' : 'bg-yellow-500'} rounded-full animate-pulse`} />
            <span className="text-white font-bold text-sm tracking-tight">
              {callStatus === 'ringing' ? 'Incoming Call...' : callStatus === 'calling' ? 'Calling...' : `In Call: ${callData.user.username}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><UserPlus size={20} /></button>
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><MessageSquare size={20} /></button>
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><Grid size={20} /></button>
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><Settings size={20} /></button>
          </div>
        </div>

        <div className="flex-1 relative bg-[#2B2D31] flex items-center justify-center p-4">
          {callStatus === 'ringing' ? (
            <div className="flex flex-col items-center gap-8">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#23A559] shadow-2xl relative">
                <img src={callData.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callData.user.username}`} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 animate-pulse" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-black text-white mb-2">{callData.user.username}</h2>
                <p className="text-[#B5BAC1] font-medium uppercase tracking-widest text-xs">Incoming Voice Call</p>
              </div>
              <div className="flex gap-6">
                <button onClick={() => handleEndCall(true)} className="w-16 h-16 bg-[#F23F42] hover:bg-[#D83C3E] rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90">
                  <X size={32} />
                </button>
                <button onClick={acceptCall} className="w-16 h-16 bg-[#23A559] hover:bg-[#1A8344] rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90">
                  <Check size={32} />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl h-full items-center">
               <div className="flex flex-col items-center gap-4 group">
                 <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden bg-[#313338] relative transition-all duration-300 ${isSpeaking ? 'ring-4 ring-[#23A559] shadow-[0_0_20px_rgba(35,165,89,0.4)]' : 'ring-2 ring-transparent'}`}>
                   {isCameraOn ? <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" /> : <img src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} alt="" className="w-full h-full object-cover" />}
                   {isMuted && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><MicOff size={32} className="text-red-500" /></div>}
                 </div>
                 <div className="bg-[#1E1F22] px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-lg">You</div>
               </div>
               <div className="flex flex-col items-center gap-4 group">
                 <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden bg-[#313338] relative transition-all duration-300 ${remoteIsSpeaking ? 'ring-4 ring-[#23A559] shadow-[0_0_20px_rgba(35,165,89,0.4)]' : 'ring-2 ring-transparent'}`}>
                   <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   {/* Fallback image if no video stream yet */}
                   <div className="absolute inset-0 flex items-center justify-center bg-[#313338] -z-10">
                     <img src={callData.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${callData.user.username}`} alt="" className="w-full h-full object-cover" />
                   </div>
                 </div>
                 <div className="bg-[#1E1F22] px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-lg flex items-center gap-2">
                   {callData.user.username}
                   {callStatus === 'calling' && <span className="text-[10px] text-yellow-500 animate-pulse">Calling...</span>}
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="h-24 bg-[#1E1F22] flex items-center justify-center px-4 gap-4">
           <div className="flex items-center gap-2 bg-[#2B2D31] p-1.5 rounded-2xl shadow-xl">
             <button onClick={() => setIsMuted(!isMuted)} className={`p-3 rounded-xl transition-all ${isMuted ? 'bg-[#F23F42] text-white' : 'text-[#DBDEE1] hover:bg-[#35373C]'}`}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
             <button onClick={() => setIsDeafened(!isDeafened)} className={`p-3 rounded-xl transition-all ${isDeafened ? 'bg-[#F23F42] text-white' : 'text-[#DBDEE1] hover:bg-[#35373C]'}`}>{isDeafened ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>
           </div>
           <div className="flex items-center gap-2 bg-[#2B2D31] p-1.5 rounded-2xl shadow-xl">
             <button onClick={toggleCamera} className={`p-3 rounded-xl transition-all ${isCameraOn ? 'bg-white text-black' : 'text-[#DBDEE1] hover:bg-[#35373C]'}`}>{isCameraOn ? <VideoOff size={24} /> : <Camera size={24} />}</button>
             <button onClick={toggleScreenShare} className={`p-3 rounded-xl transition-all ${isScreenSharing ? 'bg-[#23A559] text-white' : 'text-[#DBDEE1] hover:bg-[#35373C]'}`}><Monitor size={24} /></button>
           </div>
           <button onClick={() => handleEndCall(true)} className="w-14 h-14 bg-[#F23F42] hover:bg-[#D83C3E] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-500/20 transition-all hover:scale-105 active:scale-95 ml-4"><PhoneOff size={28} /></button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
