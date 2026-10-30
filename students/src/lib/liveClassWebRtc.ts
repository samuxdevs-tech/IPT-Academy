/**
 * liveClassWebRtc.ts (Students / Subscriber)
 * Receptor WebRTC nativo para transmisión magistral en vivo (1 Host Docente -> N Espectadores Alumnos).
 * Señalización P2P en tiempo real a través de Firebase Realtime Database.
 */

import { db } from "@/lib/firebase";
import {
  ref,
  set,
  update,
  onValue,
  remove,
  push,
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

export class WebRtcViewerSubscriber {
  private sessionId: string;
  private studentUid: string;
  private studentName: string;
  private pc: RTCPeerConnection | null = null;
  private offerUnsub: (() => void) | null = null;
  private iceUnsub: (() => void) | null = null;
  private hostStateUnsub: (() => void) | null = null;
  private whiteboardUnsub: (() => void) | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onHostStateCallback: ((state: HostLiveState | null) => void) | null = null;
  private onWhiteboardStrokeCallback: ((stroke: WhiteboardStroke) => void) | null = null;
  private onWhiteboardClearCallback: (() => void) | null = null;

  constructor(sessionId: string, studentUid: string, studentName: string) {
    this.sessionId = sessionId;
    this.studentUid = studentUid;
    this.studentName = studentName;
  }

  public async join(callbacks: {
    onStream: (stream: MediaStream) => void;
    onHostState: (state: HostLiveState | null) => void;
    onWhiteboardStroke?: (stroke: WhiteboardStroke) => void;
    onWhiteboardClear?: () => void;
  }) {
    this.onStreamCallback = callbacks.onStream;
    this.onHostStateCallback = callbacks.onHostState;
    this.onWhiteboardStrokeCallback = callbacks.onWhiteboardStroke || null;
    this.onWhiteboardClearCallback = callbacks.onWhiteboardClear || null;

    // 1. Registrar presencia activa del espectador
    const viewerRef = ref(db, `live_rooms/${this.sessionId}/viewers/${this.studentUid}`);
    await set(viewerRef, {
      uid: this.studentUid,
      name: this.studentName,
      status: "active",
      joinedAt: new Date().toISOString(),
    });

    // 2. Escuchar estado del profesor
    const hostRef = ref(db, `live_rooms/${this.sessionId}/host`);
    this.hostStateUnsub = onValue(hostRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as HostLiveState;
        if (this.onHostStateCallback) this.onHostStateCallback(val);
      } else {
        if (this.onHostStateCallback) this.onHostStateCallback(null);
      }
    });

    // 3. Escuchar oferta SDP del docente
    const offerRef = ref(db, `live_rooms/${this.sessionId}/signals/${this.studentUid}/offer`);
    this.offerUnsub = onValue(offerRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const offer = snapshot.val();
      if (!offer || !offer.sdp) return;

      await this.handleOffer(offer);
    });

    // 4. Escuchar trazos de pizarra si se proporcionan callbacks
    if (this.onWhiteboardStrokeCallback || this.onWhiteboardClearCallback) {
      const strokesRef = ref(db, `live_rooms/${this.sessionId}/whiteboard/strokes`);
      this.whiteboardUnsub = onValue(strokesRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const strokes: WhiteboardStroke[] = Array.isArray(val)
            ? val
            : Object.values(val);
          strokes.forEach((s) => {
            if (this.onWhiteboardStrokeCallback) this.onWhiteboardStrokeCallback(s);
          });
        }
      });

      const clearRef = ref(db, `live_rooms/${this.sessionId}/whiteboard/clearedAt`);
      onValue(clearRef, (snapshot) => {
        if (snapshot.exists() && this.onWhiteboardClearCallback) {
          this.onWhiteboardClearCallback();
        }
      });
    }
  }

  private async handleOffer(offer: { type: RTCSdpType; sdp: string }) {
    if (this.pc) {
      this.pc.close();
    }

    const pc = new RTCPeerConnection(RTC_ICE_SERVERS);
    this.pc = pc;

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (this.onStreamCallback) {
          this.onStreamCallback(event.streams[0]);
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candRef = push(
          ref(db, `live_rooms/${this.sessionId}/signals/${this.studentUid}/ice_viewer`)
        );
        set(candRef, event.candidate.toJSON()).catch(() => {});
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Enviar respuesta SDP al docente
      await set(
        ref(db, `live_rooms/${this.sessionId}/signals/${this.studentUid}/answer`),
        {
          type: answer.type,
          sdp: answer.sdp,
        }
      );

      // Escuchar candidatos ICE del host
      const hostIceRef = ref(
        db,
        `live_rooms/${this.sessionId}/signals/${this.studentUid}/ice_host`
      );
      this.iceUnsub = onValue(hostIceRef, async (snapshot) => {
        if (!snapshot.exists()) return;
        const candidates = snapshot.val();
        const candList = Array.isArray(candidates)
          ? candidates
          : Object.values(candidates);

        for (const c of candList as any[]) {
          if (c && !c._applied) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
              c._applied = true;
            } catch {}
          }
        }
      });
    } catch (err) {
      console.warn("Error handling WebRTC offer on student:", err);
    }
  }

  public async setHandRaised(raised: boolean) {
    const handRef = ref(db, `live_rooms/${this.sessionId}/hands/${this.studentUid}`);
    if (raised) {
      await set(handRef, {
        name: this.studentName,
        raisedAt: new Date().toISOString(),
      });
    } else {
      await remove(handRef);
    }
  }

  public async leave() {
    if (this.offerUnsub) this.offerUnsub();
    if (this.iceUnsub) this.iceUnsub();
    if (this.hostStateUnsub) this.hostStateUnsub();
    if (this.whiteboardUnsub) this.whiteboardUnsub();

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    try {
      await update(ref(db, `live_rooms/${this.sessionId}/viewers/${this.studentUid}`), {
        status: "left",
        leftAt: new Date().toISOString(),
      });
      await remove(ref(db, `live_rooms/${this.sessionId}/hands/${this.studentUid}`));
      await remove(ref(db, `live_rooms/${this.sessionId}/signals/${this.studentUid}`));
    } catch {}
  }
}
