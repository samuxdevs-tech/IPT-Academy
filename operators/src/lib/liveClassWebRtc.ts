/**
 * liveClassWebRtc.ts (Operators / Host)
 * Motor WebRTC nativo para transmisión magistral en vivo (1 Host Docente -> N Espectadores Alumnos).
 * Señalización P2P en tiempo real a través de Firebase Realtime Database.
 */

import { rtdb } from "@/lib/firebase";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  push,
  serverTimestamp,
  DatabaseReference,
} from "firebase/database";

export const RTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export interface HostLiveState {
  isLive: boolean;
  sessionId: string;
  sessionTitle: string;
  instructorName: string;
  streamMode: "camera" | "screen" | "whiteboard";
  micMuted: boolean;
  cameraOff: boolean;
  viewerCount: number;
  startedAt: string;
}

export interface WhiteboardStroke {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

/**
 * Crea una pista de audio silenciosa usando la Web Audio API.
 * Permite que las conexiones WebRTC negocien audio aunque el micrófono físico esté ocupado.
 */
export function createSilentAudioTrack(): MediaStreamTrack | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const track = dst.stream.getAudioTracks()[0];
    if (track) {
      track.enabled = false;
      return track;
    }
  } catch (err) {
    console.warn("No se pudo sintetizar pista de audio:", err);
  }
  return null;
}

/**
 * Crea una pista de video sintética elegante si la cámara web física no está disponible.
 */
export function createPlaceholderVideoTrack(title = "IPT Academy Live"): MediaStreamTrack | null {
  if (typeof window === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "rgba(99, 102, 241, 0.2)");
      grad.addColorStop(1, "rgba(168, 85, 247, 0.1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "20px sans-serif";
      ctx.fillText("Modo transmisión en vivo • Pizarra y pantalla disponibles", canvas.width / 2, canvas.height / 2 + 30);
    }
    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
    return stream ? stream.getVideoTracks()[0] : null;
  } catch (err) {
    console.warn("No se pudo sintetizar pista de video:", err);
  }
  return null;
}

export interface AcquireMediaResult {
  stream: MediaStream;
  hasRealVideo: boolean;
  hasRealAudio: boolean;
  warningNotice?: string;
}

/**
 * Adquiere el stream de medios con degradación progresiva inteligente.
 * Previene que errores como "Could not start audio source" o bloqueos de cámara detengan la clase.
 */
export async function acquireMediaStreamWithFallbacks(): Promise<AcquireMediaResult> {
  // 1. Intento completo: Video + Audio
  try {
    const fullStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    return {
      stream: fullStream,
      hasRealVideo: true,
      hasRealAudio: true,
    };
  } catch (err1: any) {
    console.warn("Fallo intento 1 (Audio+Video simultáneos):", err1?.message || err1);
  }

  // 2. Intento secundario: Solo Video (el micrófono está ocupado por otra app o bloqueado)
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const silentTrack = createSilentAudioTrack();
    if (silentTrack) videoStream.addTrack(silentTrack);
    return {
      stream: videoStream,
      hasRealVideo: true,
      hasRealAudio: false,
      warningNotice: "Tu micrófono está en uso por otra app o en modo exclusivo de Windows. La transmisión inició con cámara web en directo.",
    };
  } catch (err2: any) {
    console.warn("Fallo intento 2 (Solo video):", err2?.message || err2);
  }

  // 3. Intento terciario: Solo Audio (la cámara está ocupada o no disponible)
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
    const placeholderVideo = createPlaceholderVideoTrack("IPT Academy • Modo Solo Voz");
    if (placeholderVideo) audioStream.addTrack(placeholderVideo);
    return {
      stream: audioStream,
      hasRealVideo: false,
      hasRealAudio: true,
      warningNotice: "La cámara no está disponible. La clase inició en modo solo voz con pizarra y chat activos.",
    };
  } catch (err3: any) {
    console.warn("Fallo intento 3 (Solo audio):", err3?.message || err3);
  }

  // 4. Intento virtual: Sin hardware disponible (pantalla, pizarra y chat)
  const tracks: MediaStreamTrack[] = [];
  const placeholderVideo = createPlaceholderVideoTrack("IPT Academy • Sala Magistral");
  if (placeholderVideo) tracks.push(placeholderVideo);
  const silentTrack = createSilentAudioTrack();
  if (silentTrack) tracks.push(silentTrack);

  return {
    stream: new MediaStream(tracks),
    hasRealVideo: false,
    hasRealAudio: false,
    warningNotice: "No se detectó cámara ni micrófono activos. La sala inició en modo virtual para pizarra, diapositivas y chat.",
  };
}

/**
 * Intenta adquirir un track de micrófono real en caliente para reactivar audio sin detener el vivo.
 */
export async function tryAcquireMicrophoneTrack(): Promise<MediaStreamTrack | null> {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    return audioStream.getAudioTracks()[0] || null;
  } catch (err) {
    console.warn("No se pudo reactivar el micrófono:", err);
    return null;
  }
}

export class WebRtcHostBroadcaster {
  private sessionId: string;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private viewersUnsub: (() => void) | null = null;
  private answersUnsub: (() => void) | null = null;
  private candidateUnsub: (() => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  public setStream(stream: MediaStream) {
    this.localStream = stream;
    // Actualizar tracks en conexiones activas
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch((err) => console.warn("replaceTrack error:", err));
        } else {
          pc.addTrack(track, stream);
        }
      });
    });
  }

  public async publishHostState(state: Partial<HostLiveState>) {
    try {
      await update(ref(rtdb, `live_rooms/${this.sessionId}/host`), {
        ...state,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Error publishing host state to RTDB:", err);
    }
  }

  public listenForViewers(onViewerChange?: (viewers: Record<string, any>) => void) {
    const viewersRef = ref(rtdb, `live_rooms/${this.sessionId}/viewers`);
    this.viewersUnsub = onValue(viewersRef, (snapshot) => {
      const viewers = snapshot.exists() ? snapshot.val() : {};
      if (onViewerChange) onViewerChange(viewers);

      // Iniciar negociación WebRTC para cada nuevo espectador que no tenga conexión
      Object.keys(viewers).forEach((viewerUid) => {
        if (!this.peerConnections.has(viewerUid) && viewers[viewerUid]?.status === "active") {
          this.initiateConnectionWithViewer(viewerUid);
        }
      });

      // Limpiar conexiones de espectadores que salieron
      const activeUids = new Set(Object.keys(viewers));
      this.peerConnections.forEach((pc, uid) => {
        if (!activeUids.has(uid) || viewers[uid]?.status !== "active") {
          pc.close();
          this.peerConnections.delete(uid);
        }
      });
    });

    // Escuchar respuestas (answers) de espectadores
    const signalsRef = ref(rtdb, `live_rooms/${this.sessionId}/signals`);
    this.answersUnsub = onValue(signalsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      Object.keys(data).forEach(async (viewerUid) => {
        const viewerSignals = data[viewerUid];
        const pc = this.peerConnections.get(viewerUid);
        if (pc && viewerSignals?.answer && pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(viewerSignals.answer));
          } catch (err) {
            console.warn(`Error setting remote answer for ${viewerUid}:`, err);
          }
        }

        // Manejar candidatos ICE enviados por el espectador
        if (pc && viewerSignals?.ice_viewer) {
          const candidates = Array.isArray(viewerSignals.ice_viewer)
            ? viewerSignals.ice_viewer
            : Object.values(viewerSignals.ice_viewer);
          for (const cand of candidates as any[]) {
            if (cand && !cand._processed) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
                cand._processed = true;
              } catch (iceErr) {
                // ignorar si el candidato ya fue agregado
              }
            }
          }
        }
      });
    });
  }

  private async initiateConnectionWithViewer(viewerUid: string) {
    if (!this.localStream) return;

    try {
      const pc = new RTCPeerConnection(RTC_ICE_SERVERS);
      this.peerConnections.set(viewerUid, pc);

      // Añadir tracks del host a la conexión
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) pc.addTrack(track, this.localStream);
      });

      // Recoger y enviar candidatos ICE del host
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candRef = push(ref(rtdb, `live_rooms/${this.sessionId}/signals/${viewerUid}/ice_host`));
          set(candRef, event.candidate.toJSON()).catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          this.peerConnections.delete(viewerUid);
        }
      };

      // Crear oferta SDP
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      // Enviar oferta a Firebase
      await set(ref(rtdb, `live_rooms/${this.sessionId}/signals/${viewerUid}/offer`), {
        type: offer.type,
        sdp: offer.sdp,
      });
    } catch (err) {
      console.warn(`Failed to negotiate WebRTC with viewer ${viewerUid}:`, err);
    }
  }

  public async broadcastWhiteboardStroke(stroke: WhiteboardStroke) {
    try {
      const strokeRef = push(ref(rtdb, `live_rooms/${this.sessionId}/whiteboard/strokes`));
      await set(strokeRef, stroke);
    } catch (err) {
      console.warn("Error broadcasting stroke:", err);
    }
  }

  public async clearWhiteboard() {
    try {
      await set(ref(rtdb, `live_rooms/${this.sessionId}/whiteboard/clearedAt`), new Date().toISOString());
      await remove(ref(rtdb, `live_rooms/${this.sessionId}/whiteboard/strokes`));
    } catch (err) {
      console.warn("Error clearing whiteboard:", err);
    }
  }

  public async cleanup() {
    if (this.viewersUnsub) this.viewersUnsub();
    if (this.answersUnsub) this.answersUnsub();
    if (this.candidateUnsub) this.candidateUnsub();

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    try {
      await update(ref(rtdb, `live_rooms/${this.sessionId}/host`), {
        isLive: false,
        endedAt: new Date().toISOString(),
      });
      await remove(ref(rtdb, `live_rooms/${this.sessionId}/signals`));
    } catch {}
  }
}
