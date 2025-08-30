/// <reference types="node" />

import { Client, GatewayIntentBits } from "discord.js";
import {
  EndBehaviorType,
  joinVoiceChannel,
  VoiceConnection,
} from "@discordjs/voice";
import { invoke } from "@tauri-apps/api/core";

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2; // 16-bit PCM
const CHUNK_TARGET = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * 2; // ~2s

function pcmToWav(pcm: Buffer) {
  const header = Buffer.alloc(44);
  const chunkSize = pcm.length + 36;
  const byteRate = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE;
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1 size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function sendWavForTranscription(userId: string, pcm: Buffer) {
  const wav = pcmToWav(pcm);
  try {
    const text = await invoke<string>("transcribe_audio", {
      data: Array.from(wav),
    });
    console.log(`[${userId}] ${text.trim()}`);
  } catch (err) {
    console.error("Transcription error", err);
  }
}

function setupReceiver(connection: VoiceConnection) {
  const receiver = connection.receiver;
  receiver.speaking.on("start", (userId) => {
    const stream = receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 100 },
      mode: "pcm",
    });

    const chunks: Buffer[] = [];
    let length = 0;

    function flush() {
      if (!length) return;
      const pcm = Buffer.concat(chunks, length);
      chunks.length = 0;
      length = 0;
      void sendWavForTranscription(userId, pcm);
    }

    stream.on("data", (data: Buffer) => {
      chunks.push(data);
      length += data.length;
      if (length >= CHUNK_TARGET) {
        flush();
      }
    });
    stream.once("end", flush);
  });
}

export async function startDiscordBot(token: string, guildId: string, channelId: string) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  async function connect() {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isVoiceBased()) {
      console.error("Voice channel not found");
      return;
    }
    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });
    setupReceiver(connection);
    connection.on("stateChange", (oldState, newState) => {
      if (newState.status === "disconnected") {
        setTimeout(connect, 5_000);
      }
    });
  }

  client.once("ready", () => {
    console.log(`Logged in as ${client.user?.tag ?? "bot"}`);
    void connect();
  });

  client.on("voiceStateUpdate", (oldState, newState) => {
    if (oldState.channelId !== newState.channelId) {
      const user = newState.member ?? oldState.member;
      const name = user?.user.tag ?? "unknown";
      if (newState.channelId === channelId) {
        console.log(`${name} joined voice`);
      } else if (oldState.channelId === channelId) {
        console.log(`${name} left voice`);
      }
    }
  });

  client.on("shardError", (err) => console.error("Websocket error", err));
  client.on("error", (err) => console.error("Client error", err));

  await client.login(token);
}

