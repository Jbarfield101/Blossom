import { describe, it, expect, beforeEach } from "vitest";
import { useAudioDefaults } from "./useAudioDefaults";

describe("useAudioDefaults microphone", () => {
  beforeEach(() => {
    useAudioDefaults.setState({
      bpm: 80,
      key: "Auto",
      hqStereo: true,
      hqReverb: true,
      hqSidechain: true,
      hqChorus: true,
      micEnabled: true,
    });
    useAudioDefaults.persist.clearStorage();
  });

  it("toggles micEnabled", () => {
    expect(useAudioDefaults.getState().micEnabled).toBe(true);
    useAudioDefaults.getState().toggleMicEnabled();
    expect(useAudioDefaults.getState().micEnabled).toBe(false);
  });
});
