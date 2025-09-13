/// <reference types="node" />

import { Client, GatewayIntentBits, type TextBasedChannel } from "discord.js";
import {
  EndBehaviorType,
  joinVoiceChannel,
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  type AudioPlayer,
  StreamType,
} from "@discordjs/voice";
import { Readable } from "stream";
import { invoke } from "@tauri-apps/api/core";

const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2; // 16-bit PCM
const CHUNK_TARGET = SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * 2; // ~2s
const NPC_SYSTEM_PROMPT = "You are an NPC in a fantasy world. Respond in-character.";
const NPC_VOICE_ID = "npc";
const INTENT_PROMPTS: Record<string, string> = {
  npc: "You are roleplaying a non-player character. Stay in character and use any provided context.",
  lore: "You are a lore expert. Use the provided context to answer questions about the world or setting.",
  rules: "You are a rules assistant. Provide answers based on official game mechanics.",
  notes: "You are a helpful assistant for personal or miscellaneous notes.",
};

interface BotState {
  npcEnabled: boolean;
  chatChannel: TextBasedChannel | null;
  player: AudioPlayer | null;
}

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

async function sendWavForTranscription(
  userId: string,
  pcm: Buffer,
  state: BotState,
) {
  const wav = pcmToWav(pcm);
  try {
    const text = await invoke<string>("transcribe_audio", {
      data: Array.from(wav),
    });
    const trimmed = text.trim();
    console.log(`[${userId}] ${trimmed}`);

    if (state.npcEnabled && state.chatChannel) {
      try {
        const intent = await invoke<string>("detect_intent", { query: trimmed });
        let messages = [
          { role: "system", content: NPC_SYSTEM_PROMPT },
          { role: "user", content: trimmed },
        ];
        if (intent === "npc" || intent === "lore") {
          const ctx = await invoke<string>("retrieve_context", {
            query: trimmed,
            intent,
          });
          if (ctx) {
            messages.unshift({ role: "system", content: ctx });
          }
        }
        const rolePrompt = INTENT_PROMPTS[intent];
        if (rolePrompt) {
          messages.unshift({ role: "system", content: rolePrompt });
        }
        const reply = await invoke<string>("general_chat", { messages });
        await state.chatChannel.send(reply);
        if (state.player) {
          try {
            const audio = (await invoke(
              "higgs_tts",
              { text: reply, speaker: NPC_VOICE_ID },
            )) as number[] | Uint8Array;
            const uint8 =
              audio instanceof Uint8Array ? audio : new Uint8Array(audio);
            const resource = createAudioResource(
              Readable.from(Buffer.from(uint8)),
              { inputType: StreamType.Arbitrary },
            );
            state.player.play(resource);
          } catch (ttsErr) {
            console.error("TTS error", ttsErr);
          }
        }
      } catch (chatErr) {
        console.error("Chat error", chatErr);
      }
    }
  } catch (err) {
    console.error("Transcription error", err);
  }
}

function setupReceiver(connection: VoiceConnection, state: BotState) {
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
      void sendWavForTranscription(userId, pcm, state);
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

export async function startDiscordBot(
  token: string,
  guildId: string,
  channelId: string,
) {
  const state: BotState = {
    npcEnabled: false,
    chatChannel: null,
    player: null,
  };
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
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
    const player = createAudioPlayer();
    connection.subscribe(player);
    state.player = player;
    setupReceiver(connection, state);
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

  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (!msg.content.startsWith("!npc")) return;
    const [, arg] = msg.content.trim().split(/\s+/);
    if (arg === "on" || arg === "enable") {
      state.npcEnabled = true;
      state.chatChannel = msg.channel;
      await msg.reply("NPC persona enabled");
    } else if (arg === "off" || arg === "disable") {
      state.npcEnabled = false;
      state.chatChannel = null;
      await msg.reply("NPC persona disabled");
    } else {
      await msg.reply("Usage: !npc on|off");
    }
  });

  client.on("shardError", (err) => console.error("Websocket error", err));
  client.on("error", (err) => console.error("Client error", err));

  await client.login(token);
}

