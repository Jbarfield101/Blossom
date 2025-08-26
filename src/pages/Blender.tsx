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
    (async () => {
      try {
        const data = await loadState<{ name: string; code: string }[]>(
          "blenderTemplates"
        );
        if (data) setTemplates(data);
      } catch (err) {
        console.error("Failed to load templates", err);
      }
    })();
  }, []);

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

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const newTemplates = (() => {
      const existing = templates.find((t) => t.name === templateName);
      if (existing) {
        return templates.map((t) =>
          t.name === templateName ? { name: templateName, code } : t
        );
      }
      return [...templates, { name: templateName, code }];
    })();
    const success = await saveState("blenderTemplates", newTemplates);
    if (success) {
      setTemplates(newTemplates);
      setSelectedTemplate(templateName);
    } else {
      setStatus("Failed to save template");
    }
  };

  const selectTemplate = (name: string) => {
    setSelectedTemplate(name);
    const t = templates.find((t) => t.name === name);
    if (t) {
      setCode(t.code);
      setTemplateName(t.name);
    }
  };

  const deleteTemplate = async (name: string) => {
    const newTemplates = templates.filter((t) => t.name !== name);
    const success = await saveState("blenderTemplates", newTemplates);
    if (success) {
      setTemplates(newTemplates);
      if (selectedTemplate === name) {
        setSelectedTemplate("");
      }
      if (templateName === name) {
        setTemplateName("");
      }
    } else {
      setStatus("Failed to delete template");
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
        <Button variant="contained" onClick={run}>Run in Blender</Button>
        {outputDir && <div>Selected Output Folder: {outputDir}</div>}
        {status && <div>{status}</div>}
      </Stack>
    </Center>
  );
}
