import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  RadioGroup,
  Radio,
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

const cinematicOptions = [
  "cinematography by Roger Deakins",
  "2.35:1 aspect ratio",
  "shot on 35mm film",
  "color graded like Blade Runner 2049",
  "natural bounce lighting",
  "low-key lighting setup",
  "moody shadows",
  "subtle lens distortion",
  "slow zoom composition",
  "wide shot with soft focus",
  "introspective framing",
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
  "Tilt-shift miniature effect",
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
  const [basePrompt, setBasePrompt] = useState("");
  const [camera, setCamera] = useState<string | null>(null);
  const [lens, setLens] = useState<string | null>(null);
  const [effects, setEffects] = useState<string[]>([]);
  const [cinematic, setCinematic] = useState<string[]>([]);
  const [lofi, setLofi] = useState<string[]>([]);
  const [cosmic, setCosmic] = useState<string[]>([]);

  const preview = useMemo(() => {
    let prompt = basePrompt;
    if (camera) prompt += ` ${camera}`;
    if (lens) prompt += ` ${lens}`;
    if (effects.length) prompt += ` ${effects.join(" ")}`;
    if (cinematic.length) prompt += ` ${cinematic.join(" ")}`;
    if (lofi.length) prompt += ` ${lofi.join(" ")}`;
    if (cosmic.length) prompt += ` ${cosmic.join(" ")}`;
    return prompt.trim();
  }, [basePrompt, camera, lens, effects, cinematic, lofi, cosmic]);

  const toggleCamera = (opt: string) => {
    setCamera(opt);
  };

  const toggleLens = (opt: string) => {
    setLens(opt);
  };

  const toggleEffect = (opt: string) => {
    setEffects((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const toggleCinematic = (opt: string) => {
    setCinematic((prev) =>
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
    let prompt = basePrompt;
    if (camera) prompt += ` ${camera}`;
    if (lens) prompt += ` ${lens}`;
    if (effects.length) prompt += ` ${effects.join(" ")}`;
    if (cinematic.length) prompt += ` ${cinematic.join(" ")}`;
    if (lofi.length) prompt += ` ${lofi.join(" ")}`;
    if (cosmic.length) prompt += ` ${cosmic.join(" ")}`;
    onGenerate(prompt.trim());
  };

  const handleClear = () => {
    setBasePrompt("");
    setCamera(null);
    setLens(null);
    setEffects([]);
    setCinematic([]);
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
            placeholder="Base prompt"
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
          />
          <Typography sx={{ mt: 2, mb: 1 }}>
            📸 Camera Style / Photographic Aesthetic
          </Typography>
          <RadioGroup
            value={camera ?? ""}
            onChange={(_, value) => toggleCamera(value)}
          >
            {cameraOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio />}
                label={opt}
              />
            ))}
          </RadioGroup>
          <Typography sx={{ mt: 2, mb: 1 }}>Lens Options</Typography>
          <RadioGroup value={lens ?? ""} onChange={(_, value) => toggleLens(value)}>
            {lensOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio />}
                label={opt}
              />
            ))}
          </RadioGroup>
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
          <Typography sx={{ mt: 2, mb: 1 }}>🎬 CINEMATIC / FILMIC</Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Use for storytelling or mood-heavy scenes — horror, drama, romance,
            etc.
          </Typography>
          <FormGroup>
            {cinematicOptions.map((opt) => (
              <FormControlLabel
                key={opt}
                control={
                  <Checkbox
                    checked={cinematic.includes(opt)}
                    onChange={() => toggleCinematic(opt)}
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
          <TextField
            label="Preview"
            value={preview}
            fullWidth
            multiline
            InputProps={{ readOnly: true }}
            sx={{ mt: 2 }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button onClick={handleSend} disabled={!basePrompt.trim()}>
              Generate
            </Button>
            <Button variant="outlined" onClick={handleClear}>
              Reset
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

