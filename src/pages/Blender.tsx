import { useState, useEffect } from "react";
import { TextField, Button, Stack, MenuItem, Box, Typography } from "@mui/material";
import Editor from "@monaco-editor/react";
import Center from "./_Center";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { loadState, saveState } from "../utils/persist";
import SystemInfoWidget from "../components/SystemInfoWidget";
import { systemInfoWidgetSx } from "./homeStyles";

export default function Blender() {
  const [code, setCode] = useState("import bpy\n\n# example cube\nbpy.ops.mesh.primitive_cube_add()");
  const [status, setStatus] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ name: string; code: string }[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    (async () => {
      const loadedTemplates = await loadState<{ name: string; code: string }[]>(
        "blenderTemplates"
      );
      if (loadedTemplates) setTemplates(loadedTemplates);
      const loadedOutput = await loadState<string>("blenderOutputDir");
      if (loadedOutput) setOutputDir(loadedOutput);
    })();
  }, []);

  useEffect(() => {
    if (outputDir !== null) {
      (async () => {
        const ok = await saveState("blenderOutputDir", outputDir);
        if (!ok) setStatus("Failed to save output directory");
      })();
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

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const existing = templates.find((t) => t.name === templateName);
    const updated = existing
      ? templates.map((t) =>
          t.name === templateName ? { name: templateName, code } : t
        )
      : [...templates, { name: templateName, code }];
    const ok = await saveState("blenderTemplates", updated);
    if (ok) {
      setTemplates(updated);
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
    const updated = templates.filter((t) => t.name !== name);
    const ok = await saveState("blenderTemplates", updated);
    if (ok) {
      setTemplates(updated);
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
    <>
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
        <Typography variant="subtitle1">Blender bpy code</Typography>
        <Editor
          height="200px"
          defaultLanguage="python"
          value={code}
          onChange={(value) => setCode(value ?? "")}
          options={{
            lineNumbers: "on",
            minimap: { enabled: false },
            automaticLayout: true,
          }}
          onMount={(editor, monaco) => {
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
              () => run()
            );
          }}
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
      <Box sx={systemInfoWidgetSx}>
        <SystemInfoWidget />
      </Box>
    </>
  );
}
