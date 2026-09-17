import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX, 
  Monitor, Settings, Maximize2, Minimize2, 
  UserPlus, MessageSquare, Video, VideoOff
} from 'lucide-react';
import { useAppStore } from '../store';
import { createCall, updateCall, addIceCandidate, subscribeToCall, deleteCall } from '../lib/db';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function CallOverlay() {
  const { isCalling, setIsCalling, callData, currentUser } = useAppStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteIsSpeaking, setRemoteIsSpeaking] = useState(false);
  
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCalling || !callData || !currentUser) return;

    const setupWebRTC = async () => {
      pc.current = new RTCPeerConnection(servers);
      remoteStream.current = new MediaStream();

      // Get local audio
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStream.current.getTracks().forEach((track) => {
          if (pc.current && localStream.current) {
            pc.current.addTrack(track, localStream.current);
          }
        });
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }

      // Handle remote stream
      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          if (remoteStream.current) {
            remoteStream.current.addTrack(track);
          }
        });
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream.current;
        }
      };

      // Determine if caller or receiver
      const isCaller = currentUser.id < callData.user.id;
      const callId = [currentUser.id, callData.user.id].sort().join('_');
      callIdRef.current = callId;

      if (isCaller) {
        // Create offer
        pc.current.onicecandidate = (event) => {
          if (event.candidate) {
            addIceCandidate(callId, 'caller', event.candidate.toJSON());
          }
        };

        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        await createCall(callId, currentUser.id, callData.user.id, {
          type: offerDescription.type,
          sdp: offerDescription.sdp,
        });

        // Listen for answer and candidates
        subscribeToCall(callId, async (data) => {
          if (!pc.current) return;
          if (data.answer && !pc.current.currentRemoteDescription) {
            const answerDescription = new RTCSessionDescription(data.answer);
            await pc.current.setRemoteDescription(answerDescription);
          }
          if (data.receiverCandidates) {
            data.receiverCandidates.forEach((candidate: any) => {
              pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
            });
          }
        });
      } else {
        // Receiver: Wait for offer
        subscribeToCall(callId, async (data) => {
          if (!pc.current) return;
          if (data.offer && !pc.current.currentRemoteDescription) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.current.setRemoteDescription(offerDescription);

            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            await updateCall(callId, {
              answer: {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
              },
              status: 'active'
            });
          }
          if (data.callerCandidates) {
            data.callerCandidates.forEach((candidate: any) => {
              pc.current?.addIceCandidate(new RTCIceCandidate(candidate));
            });
          }
        });

        pc.current.onicecandidate = (event) => {
          if (event.candidate) {
            addIceCandidate(callId, 'receiver', event.candidate.toJSON());
          }
        };
      }
    };

    setupWebRTC();

    return () => {
      localStream.current?.getTracks().forEach(track => track.stop());
      pc.current?.close();
      pc.current = null;
      if (callIdRef.current) {
        deleteCall(callIdRef.current);
      }
    };
  }, [isCalling, callData, currentUser]);

  // Handle Mute/Unmute
  useEffect(() => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Simulate speaking indicators (Visual only now, but can be improved with Web Audio API)
  useEffect(() => {
    if (!isCalling) return;
    const interval = setInterval(() => {
      if (!isMuted) setIsSpeaking(Math.random() > 0.7);
      setRemoteIsSpeaking(Math.random() > 0.8);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCalling, isMuted]);

  if (!isCalling || !callData) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] bg-[#1E1F22] flex flex-col overflow-hidden font-sans"
      >
        <audio ref={remoteAudioRef} autoPlay />
        
        {/* Top Header */}
        <div className="h-12 border-b border-black/20 flex items-center justify-between px-4 bg-[#313338]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#23A559] rounded-full animate-pulse" />
            <span className="text-white font-bold text-sm tracking-tight">Direct Call: {callData.user.username}</span>
          </div>
          <div className="flex items-center gap-3">
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><UserPlus size={20} /></button>
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><MessageSquare size={20} /></button>
             <button className="text-[#B5BAC1] hover:text-white transition-colors p-1"><Settings size={20} /></button>
          </div>
        </div>

        {/* Call Area */}
        <div className="flex-1 flex flex-col md:flex-row relative">
          
          {/* Main Video/Voice Grid */}
          <div className="flex-1 p-4 flex items-center justify-center bg-[#313338]">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-5xl h-full max-h-[70vh]">
               
               {/* Local User Card */}
               <div className="bg-[#1E1F22] rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
                 <motion.div 
                   animate={{ 
                     boxShadow: isSpeaking ? "0 0 0 4px #23A559" : "0 0 0 0px #23A559"
                   }}
                   className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#313338] relative z-10 transition-shadow duration-150"
                 >
                   {currentUser?.avatarUrl ? (
                     <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#B5BAC1]">
                       {currentUser?.username?.charAt(0)}
                     </div>
                   )}
                 </motion.div>
                 
                 <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                   {isMuted && <MicOff size={10} className="text-[#F23F42]" />}
                   You
                 </div>

                 {isSpeaking && (
                   <div className="absolute inset-0 border-[3px] border-[#23A559] rounded-lg pointer-events-none" />
                 )}
               </div>

               {/* Remote User Card */}
               <div className="bg-[#1E1F22] rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
                 <motion.div 
                   animate={{ 
                     boxShadow: remoteIsSpeaking ? "0 0 0 4px #23A559" : "0 0 0 0px #23A559"
                   }}
                   className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#313338] relative z-10 transition-shadow duration-150"
                 >
                   {callData.user.avatarUrl ? (
                     <img src={callData.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#B5BAC1]">
                       {callData.user.username.charAt(0)}
                     </div>
                   )}
                 </motion.div>

                 <div className="absolute bottom-4 left-4 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wide">
                   {callData.user.username}
                 </div>

                 {remoteIsSpeaking && (
                   <div className="absolute inset-0 border-[3px] border-[#23A559] rounded-lg pointer-events-none" />
                 )}
               </div>

             </div>
          </div>

          {/* Screen Share Layer (MOCKED FOR NOW AS WEB STREAMS) */}
          {isScreenSharing && (
            <div className="absolute inset-0 z-20 bg-[#313338] flex flex-col items-center justify-center p-8">
               <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border-4 border-[#23A559]">
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-[#B5BAC1]">
                    <Monitor size={64} className="opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest opacity-50">Sharing screen...</p>
                  </div>
                  <div className="absolute top-4 right-4">
                    <div className="bg-[#23A559] text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest shadow-lg">Live</div>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* Bottom Controls Dock */}
        <div className="h-20 bg-[#1E1F22] flex items-center justify-center px-8 relative z-30">
          <div className="flex items-center gap-3">
            
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOn ? 'bg-white text-black' : 'bg-[#4E5058] text-white hover:bg-[#6D6F78]'}`}
              title="Toggle Camera"
            >
              {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

            <button 
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-[#23A559] text-white' : 'bg-[#4E5058] text-white hover:bg-[#6D6F78]'}`}
              title="Share Your Screen"
            >
              <Monitor size={24} />
            </button>

            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-[#F23F42] text-white' : 'bg-[#4E5058] text-white hover:bg-[#6D6F78]'}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            <button 
              onClick={() => setIsDeafened(!isDeafened)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isDeafened ? 'bg-[#F23F42] text-white' : 'bg-[#4E5058] text-white hover:bg-[#6D6F78]'}`}
              title={isDeafened ? "Undeafen" : "Deafen"}
            >
              {isDeafened ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            <button 
              onClick={() => setIsCalling(false)}
              className="w-14 h-14 rounded-full bg-[#F23F42] hover:bg-[#DA373C] text-white flex items-center justify-center transition-all shadow-xl shadow-[#F23F42]/20"
              title="Disconnect"
            >
              <PhoneOff size={24} />
            </button>

          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
