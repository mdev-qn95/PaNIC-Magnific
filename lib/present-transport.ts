/**
 * Transport trình chiếu (Phase 3): giữ nguyên protocol PresentMessage (mục 3),
 * chạy song song 2 kênh:
 *  - BroadcastChannel: 2 cửa sổ cùng máy (không cần mạng)
 *  - Supabase Realtime: điều khiển từ điện thoại (cần mạng + app đã deploy)
 * Message bọc trong envelope {id} để loại trùng khi cùng máy nhận qua cả 2 kênh.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { channelName, type PresentMessage } from './present';
import { supabase } from './supabase';

interface Envelope {
  id: string;
  msg: PresentMessage;
}

export interface PresentChannel {
  send: (msg: PresentMessage) => void;
  close: () => void;
}

export function createPresentChannel(
  massId: string,
  onMessage: (msg: PresentMessage) => void,
): PresentChannel {
  const name = channelName(massId);
  const seen: string[] = [];

  const receive = (env: Envelope) => {
    if (!env || typeof env.id !== 'string') return;
    if (seen.includes(env.id)) return;
    seen.push(env.id);
    if (seen.length > 100) seen.splice(0, 50);
    onMessage(env.msg);
  };

  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(name) : null;
  if (bc) bc.onmessage = (ev: MessageEvent<Envelope>) => receive(ev.data);

  let rt: RealtimeChannel | null = null;
  if (supabase) {
    rt = supabase.channel(name, { config: { broadcast: { self: false } } });
    rt.on('broadcast', { event: 'present' }, (p) => receive(p.payload as Envelope));
    rt.subscribe();
  }

  return {
    send(msg) {
      const env: Envelope = { id: crypto.randomUUID(), msg };
      seen.push(env.id); // không xử lý message của chính mình nếu echo
      bc?.postMessage(env);
      rt?.send({ type: 'broadcast', event: 'present', payload: env });
    },
    close() {
      bc?.close();
      if (rt && supabase) supabase.removeChannel(rt);
    },
  };
}
