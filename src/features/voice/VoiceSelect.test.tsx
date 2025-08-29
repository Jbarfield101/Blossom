import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VoiceSelect from "./VoiceSelect";
import { useVoices } from "../../store/voices";

describe("VoiceSelect", () => {
  beforeEach(() => {
    useVoices.setState({ voices: [], filter: () => true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits selected voice id", async () => {
    // @ts-expect-error mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: "belinda", name: "Belinda" }]),
      })
    );
    const onSelect = vi.fn();
    render(<VoiceSelect onSelect={onSelect} />);
    const item = await screen.findByText("Belinda");
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith("belinda");
  });
});
