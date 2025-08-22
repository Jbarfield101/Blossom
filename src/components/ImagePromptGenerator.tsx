import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
} from "@mui/material";

interface Props {
  onGenerate: (prompt: string) => void;
}

const cameraOptions = [
  "Shot on Kodak Portra 400 (warm, soft film aesthetic)",
  "Shot on Polaroid (vintage, instant photo look)",
  "Shot on Fujifilm XT3 with 56mm f/1.2 lens (vivid, portrait-focused)",
  "Shot on Leica M10 (sharp, premium detail with soft tones)",
  "Captured with DSLR, shallow depth of field",
  "Medium format photography",
  "Shot on CineStill 800T (moody, film-like with strong blues and halogens)",
  // 💅 Editorial / Styled / Trendy - Use for stylized, design-focused, or aesthetic-heavy compositions.
  "Vogue cover portrait",
  "Shot for Architectural Digest",
  "Instagram aesthetic",
  "Apple product ad lighting",
  "Clean studio backdrop",
  "Polaroid border style",
  "CineStill 800T color grading",
  "Euphoria lighting",
  "Wes Anderson symmetry and palette",
  "Pinterest decor angle",
];

const lensOptions = [
  "Wide-angle lens, 24mm",
  "Tilt-shift lens effect",
  "Macro lens photography",
];

const effectOptions = [
  "Bokeh-rich background",
  "Low ISO, high aperture",
  "Long exposure",
];

const lofiOptions = [
  "Studio Ghibli–inspired framing",
  "soft depth of field",
  "dreamy pastel tones",
  "cinematic lighting",
  "light film grain",
  "sunset golden hour",
  "bokeh background",
  "ambient haze",
  "tilt-shift lens effect",
  "whimsical color grading",
  "cozy cottagecore",
  "16:9 ratio, soft vignette",
];

const cosmicOptions = [
  "shot like NASA Hubble imagery",
  "cosmic lens flare",
  "nebula-inspired palette",
  "high dynamic range",
  "glowing atmosphere",
  "starlit gradient",
  "astronomical contrast",
  "Nat Geo meets Moebius style",
  "deep space photography aesthetic",
  "shot with a telephoto lens from orbit",
  "space documentary realism",
  "galactic dust haze",
];

export default function ImagePromptGenerator({ onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [camera, setCamera] = useState<string | null>(null);
  const [lens, setLens] = useState<string | null>(null);
  const [effects, setEffects] = useState<string[]>([]);
  const [lofi, setLofi] = useState<string[]>([]);
  const [cosmic, setCosmic] = useState<string[]>([]);

  const toggleCamera = (opt: string) => {
    setCamera((prev) => (prev === opt ? null : opt));
  };

  const toggleLens = (opt: string) => {
    setLens((prev) => (prev === opt ? null : opt));
  };

  const toggleEffect = (opt: string) => {
    setEffects((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const toggleLofi = (opt: string) => {
    setLofi((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const toggleCosmic = (opt: string) => {
    setCosmic((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleSend = () => {
    let prompt = text;
    if (camera) prompt += ` ${camera}`;
    if (lens) prompt += ` ${lens}`;
    if (effects.length) prompt += ` ${effects.join(" ")}`;
    if (lofi.length) prompt += ` ${lofi.join(" ")}`;
    if (cosmic.length) prompt += ` ${cosmic.join(" ")}`;
    onGenerate(prompt.trim());
    setOpen(false);
    setText("");
    setCamera(null);
    setLens(null);
    setEffects([]);
    setLofi([]);
    setCosmic([]);
  };

  return (
    <Box>
      <Button variant="outlined" onClick={() => setOpen((o) => !o)}>
        Image Prompt
      </Button>
      {open && (
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            multiline
            placeholder="Describe the image"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Typography sx={{ mt: 2, mb: 1 }}>
            📸 Camera Style / Photographic Aesthetic
          </Typography>
          <FormGroup>
            {cameraOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={camera === opt}
                    onChange={() => toggleCamera(opt)}
                    disabled={!!camera && camera !== opt}
                  />
                }
                label={opt}
              />
            ))}
          </FormGroup>
          <Typography sx={{ mt: 2, mb: 1 }}>Lens Options</Typography>
          <FormGroup>
            {lensOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={lens === opt}
                    onChange={() => toggleLens(opt)}
                    disabled={!!lens && lens !== opt}
                  />
                }
                label={opt}
              />
            ))}
          </FormGroup>
          <Typography sx={{ mt: 2, mb: 1 }}>Effects</Typography>
          <FormGroup>
            {effectOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={effects.includes(opt)}
                    onChange={() => toggleEffect(opt)}
                  />
                }
                label={opt}
              />
            ))}
          </FormGroup>
          <Typography sx={{ mt: 2, mb: 1 }}>🌅 LOFI / DREAMY / RELAXED</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Use for cozy, anime-style, soft-vibe loops and stills.
          </Typography>
          <FormGroup>
            {lofiOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={lofi.includes(opt)}
                    onChange={() => toggleLofi(opt)}
                  />
                }
                label={opt}
              />
            ))}
          </FormGroup>
          <Typography sx={{ mt: 2, mb: 1 }}>🚀 SPACE / COSMIC / SURREAL</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Use for psychedelic, surreal, or space-themed visuals.
          </Typography>
          <FormGroup>
            {cosmicOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={cosmic.includes(opt)}
                    onChange={() => toggleCosmic(opt)}
                  />
                }
                label={opt}
              />
            ))}
          </FormGroup>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button onClick={handleSend} disabled={!text.trim()}>
              Generate
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

