import { useState, useEffect } from "react";
import { TextField, Button, Stack, MenuItem } from "@mui/material";
import Center from "./_Center";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { loadState, saveState } from "../utils/persist";

export default function Blender() {
  const [code, setCode] = useState("import bpy\n\n# example cube\nbpy.ops.mesh.primitive_cube_add()");
  const [status, setStatus] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ name: string; code: string }[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    loadState<{ name: string; code: string }[]>("blenderTemplates").then((data) => {
      if (data) setTemplates(data);
    });
  }, []);

  useEffect(() => {
    loadState<string>("blenderOutputDir").then((data) => {
      if (data) setOutputDir(data);
    });
  }, []);

  useEffect(() => {
    saveState("blenderTemplates", templates).catch(() => {});
  }, [templates]);

  useEffect(() => {
    if (outputDir !== null) {
      saveState("blenderOutputDir", outputDir).catch(() => {});
    }
  }, [outputDir]);

  const selectOutput = async () => {
    const selected = await open({ directory: true });
    if (typeof selected === "string") {
      setOutputDir(selected);
    }
  };

  const run = async () => {
    setStatus("Running...");
    try {
      const script =
        outputDir
          ? `${code}\n\nbpy.ops.wm.save_mainfile(filepath='${outputDir.replace(/\\/g, "/")}/output.blend')`
          : code;
      await invoke("blender_run_script", { code: script });
      setStatus("Blender finished running");
    } catch (e) {
      setStatus("Error: " + e);
    }
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;
    setTemplates((prev) => {
      const existing = prev.find((t) => t.name === templateName);
      if (existing) {
        return prev.map((t) =>
          t.name === templateName ? { name: templateName, code } : t
        );
      }
      return [...prev, { name: templateName, code }];
    });
    setSelectedTemplate(templateName);
  };

  const selectTemplate = (name: string) => {
    setSelectedTemplate(name);
    const t = templates.find((t) => t.name === name);
    if (t) {
      setCode(t.code);
      setTemplateName(t.name);
    }
  };

  const deleteTemplate = (name: string) => {
    setTemplates((prev) => prev.filter((t) => t.name !== name));
    if (selectedTemplate === name) {
      setSelectedTemplate("");
    }
    if (templateName === name) {
      setTemplateName("");
    }
  };

  return (
    <Center>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 600 }}>
        <TextField
          label="Template Name"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
        <Button variant="outlined" onClick={saveTemplate}>
          Save Template
        </Button>
        <TextField
          select
          label="Templates"
          value={selectedTemplate}
          onChange={(e) => selectTemplate(e.target.value)}
        >
          {templates.map((t) => (
            <MenuItem key={t.name} value={t.name}>
              {t.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          onClick={() => deleteTemplate(selectedTemplate)}
          disabled={!selectedTemplate}
        >
          Delete Template
        </Button>
        <TextField
          label="Blender bpy code"
          multiline
          minRows={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button variant="outlined" onClick={selectOutput}>
          Select Output Folder
        </Button>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="contained" onClick={run}>
            Run in Blender
          </Button>
          <div>
            Output Folder: {outputDir ?? "Not selected"}
          </div>
        </Stack>
        {status && <div>{status}</div>}
      </Stack>
    </Center>
  );
}
