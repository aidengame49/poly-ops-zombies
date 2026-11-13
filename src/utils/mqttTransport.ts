const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface MqttWillOptions {
  topic: string;
  payload: string;
  retain?: boolean;
}

function encodeString(str: string): Uint8Array {
  const utf8 = textEncoder.encode(str);
  const out = new Uint8Array(2 + utf8.length);
  out[0] = (utf8.length >> 8) & 0xff;
  out[1] = utf8.length & 0xff;
  out.set(utf8, 2);
  return out;
}

function encodeRemainingLength(len: number): number[] {
  const bytes: number[] = [];
  let x = len;
  do {
    let encodedByte = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) encodedByte |= 128;
    bytes.push(encodedByte);
  } while (x > 0);
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function buildPacket(headerByte: number, payloadParts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const body = concatBytes(payloadParts);
  const remLen = encodeRemainingLength(body.length);
  const header = new Uint8Array(new ArrayBuffer(1 + remLen.length));
  header[0] = headerByte;
  for (let i = 0; i < remLen.length; i++) {
    header[1 + i] = remLen[i];
  }
  return concatBytes([header, body]);
}

export class MqttWsClient {
  private ws: WebSocket | null = null;
  private rxBuf: Uint8Array = new Uint8Array(0);
  private packetId = 1;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private closedManually = false;

  public onConnect?: () => void;
  public onMessage?: (topic: string, payload: string, retain: boolean) => void;
  public onClose?: (reason: string) => void;

  public get isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public connect(brokerUrl: string, clientId: string, will?: MqttWillOptions, keepAliveSec = 25) {
    this.disconnect(true);
    this.closedManually = false;
    this.rxBuf = new Uint8Array(0);

    try {
      const socket = new WebSocket(brokerUrl, 'mqtt');
      socket.binaryType = 'arraybuffer';
      this.ws = socket;

      this.connectTimer = setTimeout(() => {
        if (this.ws === socket && !this.connected) {
          try {
            socket.close();
          } catch {
            // Ignore
          }
        }
      }, 6500);

      socket.onopen = () => {
        if (this.ws !== socket) return;
        let connectFlags = 0x02; // Clean Session
        if (will) {
          connectFlags |= 0x04; // Will Flag
          if (will.retain) connectFlags |= 0x20; // Will Retain
        }
        const varHeader = new Uint8Array([
          0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, // "MQTT"
          0x04, // Protocol level 4 (3.1.1)
          connectFlags,
          (keepAliveSec >> 8) & 0xff,
          keepAliveSec & 0xff,
        ]);
        const parts: Uint8Array[] = [varHeader, encodeString(clientId)];
        if (will) {
          parts.push(encodeString(will.topic), encodeString(will.payload));
        }
        socket.send(buildPacket(0x10, parts));
      };

      socket.onmessage = (ev) => {
        if (this.ws !== socket) return;
        if (ev.data instanceof ArrayBuffer) {
          this.appendAndParse(new Uint8Array(ev.data));
        } else if (typeof Blob !== 'undefined' && ev.data instanceof Blob) {
          ev.data.arrayBuffer().then((buf) => {
            if (this.ws === socket) {
              this.appendAndParse(new Uint8Array(buf));
            }
          });
        }
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        // Handled cleanly in onclose
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.cleanupTimers();
        const wasManual = this.closedManually;
        this.connected = false;
        this.ws = null;
        if (!wasManual) {
          this.onClose?.('Relay socket closed');
        }
      };
    } catch (err) {
      this.cleanupTimers();
      this.connected = false;
      this.ws = null;
      this.onClose?.(err instanceof Error ? err.message : 'Relay connection error');
    }
  }

  public disconnect(silent = false) {
    this.closedManually = true;
    this.cleanupTimers();
    const s = this.ws;
    this.ws = null;
    const wasConnected = this.connected;
    this.connected = false;
    if (s) {
      if (s.readyState === WebSocket.OPEN) {
        try {
          s.send(new Uint8Array([0xe0, 0x00])); // MQTT DISCONNECT
        } catch {
          // Ignore
        }
      }
      try {
        s.close();
      } catch {
        // Ignore
      }
    }
    if (!silent && wasConnected) {
      this.onClose?.('Disconnected');
    }
  }

  public subscribe(topicFilter: string) {
    if (!this.isConnected || !this.ws) return;
    const pid = this.packetId;
    this.packetId = (this.packetId % 65534) + 1;
    const header = new Uint8Array([(pid >> 8) & 0xff, pid & 0xff]);
    const topicBytes = encodeString(topicFilter);
    const qos = new Uint8Array([0x00]);
    this.ws.send(buildPacket(0x82, [header, topicBytes, qos]));
  }

  public unsubscribe(topicFilter: string) {
    if (!this.isConnected || !this.ws) return;
    const pid = this.packetId;
    this.packetId = (this.packetId % 65534) + 1;
    const header = new Uint8Array([(pid >> 8) & 0xff, pid & 0xff]);
    this.ws.send(buildPacket(0xa2, [header, encodeString(topicFilter)]));
  }

  public publish(topic: string, payload: string, retain = false) {
    if (!this.isConnected || !this.ws) return;
    const flags = retain ? 0x01 : 0x00;
    const topicBytes = encodeString(topic);
    const payloadBytes = textEncoder.encode(payload);
    this.ws.send(buildPacket(0x30 | flags, [topicBytes, payloadBytes]));
  }

  private cleanupTimers() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private appendAndParse(chunk: Uint8Array) {
    if (this.rxBuf.length === 0) {
      this.rxBuf = chunk;
    } else {
      const merged = new Uint8Array(this.rxBuf.length + chunk.length);
      merged.set(this.rxBuf, 0);
      merged.set(chunk, this.rxBuf.length);
      this.rxBuf = merged;
    }

    let offset = 0;
    while (offset < this.rxBuf.length) {
      if (offset + 2 > this.rxBuf.length) break;

      const fixedHeader = this.rxBuf[offset];
      let multiplier = 1;
      let remLen = 0;
      let lenIdx = offset + 1;
      let lenComplete = false;

      while (lenIdx < this.rxBuf.length) {
        const encodedByte = this.rxBuf[lenIdx];
        remLen += (encodedByte & 127) * multiplier;
        lenIdx++;
        if ((encodedByte & 128) === 0) {
          lenComplete = true;
          break;
        }
        multiplier *= 128;
        if (multiplier > 128 * 128 * 128) {
          // Malformed packet
          this.rxBuf = new Uint8Array(0);
          return;
        }
      }

      if (!lenComplete) break;
      const packetEnd = lenIdx + remLen;
      if (packetEnd > this.rxBuf.length) break;

      this.handlePacket(fixedHeader, this.rxBuf.subarray(lenIdx, packetEnd));
      offset = packetEnd;
    }

    if (offset > 0) {
      this.rxBuf = offset >= this.rxBuf.length ? new Uint8Array(0) : this.rxBuf.slice(offset);
    }
  }

  private handlePacket(fixedHeader: number, body: Uint8Array) {
    const packetType = fixedHeader >> 4;
    if (packetType === 2) {
      // CONNACK
      if (body.length >= 2 && body[1] === 0) {
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        this.connected = true;
        this.pingTimer = setInterval(() => {
          if (this.isConnected && this.ws) {
            try {
              this.ws.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
            } catch {
              // Ignore
            }
          }
        }, 20000);
        this.onConnect?.();
      } else {
        this.onClose?.(`Broker rejected connection (${body[1] ?? 'unknown'})`);
        this.disconnect(true);
      }
      return;
    }

    if (packetType === 3) {
      // PUBLISH
      const qos = (fixedHeader >> 1) & 0x03;
      const retain = (fixedHeader & 0x01) !== 0;
      if (body.length < 2) return;
      const topicLen = (body[0] << 8) | body[1];
      let pos = 2;
      if (pos + topicLen > body.length) return;
      const topic = textDecoder.decode(body.subarray(pos, pos + topicLen));
      pos += topicLen;

      if (qos > 0) {
        if (pos + 2 > body.length) return;
        const pidHi = body[pos];
        const pidLo = body[pos + 1];
        pos += 2;
        if (qos === 1 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(new Uint8Array([0x40, 0x02, pidHi, pidLo])); // PUBACK
        }
      }

      const payload = textDecoder.decode(body.subarray(pos));
      this.onMessage?.(topic, payload, retain);
    }
  }
}
